// Chat service for in-app communication between transporters and clients
import { API_ENDPOINTS } from '../constants/api';
import { enhancedNotificationService } from './enhancedNotificationService';

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderType: 'transporter' | 'client';
  message: string;
  timestamp: Date;
  type: 'text' | 'image' | 'voice' | 'location';
  metadata?: any;
  read: boolean;
}

export interface ChatRoom {
  id: string;
  bookingId: string;
  transporterId: string;
  clientId: string;
  transporterName: string;
  clientName: string;
  transporterPhone?: string;
  clientPhone?: string;
  lastMessage?: ChatMessage;
  unreadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface VoiceCall {
  id: string;
  roomId: string;
  callerId: string;
  callerName: string;
  callerType: 'transporter' | 'client';
  status: 'initiated' | 'ringing' | 'answered' | 'ended' | 'missed';
  startTime: Date;
  endTime?: Date;
  duration?: number; // in seconds
}

class ChatService {
  private baseUrl = API_ENDPOINTS.CHATS;
  
  // Get or create a chat room for a booking
  async getOrCreateChatRoom(bookingId: string, transporterId: string, clientId: string): Promise<ChatRoom> {
    try {
      // Get Firebase auth token
      const { getAuth } = require('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      const token = await user.getIdToken();

      const response = await fetch(`${this.baseUrl}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          participant1Id: transporterId,
          participant1Type: 'transporter',
          participant2Id: clientId,
          participant2Type: 'client',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to create chat room: ${errorData.message || 'Unknown error'}`);
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error creating chat room:', error);
      throw error;
    }
  }

  // Get all chat rooms for a user
  async getChatRooms(userId: string, userType: 'transporter' | 'client'): Promise<ChatRoom[]> {
    try {
      const response = await fetch(`${this.baseUrl}/rooms?userId=${userId}&userType=${userType}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch chat rooms');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching chat rooms:', error);
      return [];
    }
  }

  // Get messages for a chat room
  async getMessages(roomId: string, page: number = 1, limit: number = 50): Promise<ChatMessage[]> {
    try {
      const response = await fetch(`${this.baseUrl}/rooms/${roomId}/messages?page=${page}&limit=${limit}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  }

  // Send a message
  async sendMessage(roomId: string, message: Omit<ChatMessage, 'id' | 'timestamp' | 'read'>): Promise<ChatMessage> {
    try {
      const response = await fetch(`${this.baseUrl}/rooms/${roomId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const sentMessage = await response.json();

      // Send notification to the recipient
      try {
        const isUrgent = message.message.toLowerCase().includes('urgent') || 
                        message.message.toLowerCase().includes('emergency') ||
                        message.message.toLowerCase().includes('asap');
        
        await enhancedNotificationService.sendNotification(
          isUrgent ? 'message_urgent' : 'chat_message_received',
          message.senderId === 'transporter-id' ? 'client-id' : 'transporter-id', // This should be the actual recipient ID
          {
            senderName: message.senderName,
            messagePreview: message.message.length > 50 ? 
              message.message.substring(0, 50) + '...' : 
              message.message,
            roomId,
          }
        );
      } catch (notificationError) {
        console.error('Error sending chat notification:', notificationError);
        // Don't fail the message send if notification fails
      }

      return sentMessage;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  // Mark messages as read
  async markMessagesAsRead(roomId: string, userId: string): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/rooms/${roomId}/read`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }

  // Initiate a voice call
  async initiateVoiceCall(roomId: string, callerId: string, callerName: string, callerType: 'transporter' | 'client'): Promise<VoiceCall> {
    try {
      const response = await fetch(`${this.baseUrl}/calls`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId,
          callerId,
          callerName,
          callerType,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to initiate voice call');
      }

      return await response.json();
    } catch (error) {
      console.error('Error initiating voice call:', error);
      throw error;
    }
  }

  // Update call status
  async updateCallStatus(callId: string, status: VoiceCall['status']): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/calls/${callId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
    } catch (error) {
      console.error('Error updating call status:', error);
    }
  }

  // Get call history for a room
  async getCallHistory(roomId: string): Promise<VoiceCall[]> {
    try {
      const response = await fetch(`${this.baseUrl}/rooms/${roomId}/calls`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch call history');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching call history:', error);
      return [];
    }
  }

  // Subscribe to real-time updates (WebSocket or polling)
  subscribeToRoom(roomId: string, onMessage: (message: ChatMessage) => void, onCall: (call: VoiceCall) => void): () => void {
    // In a real implementation, this would set up WebSocket connection
    // For now, we'll use polling as a fallback
    const interval = setInterval(async () => {
      try {
        const messages = await this.getMessages(roomId, 1, 1);
        if (messages.length > 0) {
          onMessage(messages[0]);
        }
      } catch (error) {
        console.error('Error polling for messages:', error);
      }
    }, 5000);

    return () => clearInterval(interval);
  }
}

export const chatService = new ChatService();