// Real-time chat service with WebSocket support
import { API_ENDPOINTS } from '../constants/api';
import { getAuth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderRole: 'customer' | 'transporter' | 'broker' | 'admin';
  message: string;
  type: 'text' | 'image' | 'location' | 'file';
  timestamp: number;
  read: boolean;
  metadata?: any;
}

export interface ChatRoom {
  id: string;
  participants: {
    id: string;
    name: string;
    role: 'customer' | 'transporter' | 'broker' | 'admin';
    avatar?: string;
  }[];
  lastMessage?: ChatMessage;
  unreadCount: number;
  createdAt: number;
  updatedAt: number;
}

class ChatService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private messageHandlers: ((message: ChatMessage) => void)[] = [];
  private connectionHandlers: ((connected: boolean) => void)[] = [];

  constructor() {
    // Don't initialize WebSocket immediately, wait for user authentication
  }

  /**
   * Initialize chat service when user is authenticated
   */
  async initialize() {
    if (this.ws) return; // Already initialized
    
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        // No authenticated user, skipping chat initialization
        return;
      }

      await this.initializeWebSocket();
    } catch (error) {
      console.error('Error initializing chat service:', error);
    }
  }

  /**
   * Initialize WebSocket connection
   */
  private async initializeWebSocket() {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        // No authenticated user, skipping WebSocket initialization
        return;
      }

      const token = await user.getIdToken();
      const wsUrl = API_ENDPOINTS.CHATS.replace('https://', 'wss://').replace('http://', 'ws://');
      
      this.ws = new WebSocket(`${wsUrl}/ws?token=${token}`);
      
      this.ws.onopen = () => {
        // Chat WebSocket connected
        this.reconnectAttempts = 0;
        this.connectionHandlers.forEach(handler => handler(true));
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'message') {
            const message: ChatMessage = data.message;
            this.messageHandlers.forEach(handler => handler(message));
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        // Chat WebSocket disconnected
        this.connectionHandlers.forEach(handler => handler(false));
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('Chat WebSocket error:', error);
      };
    } catch (error) {
      console.error('Error initializing WebSocket:', error);
    }
  }

  /**
   * Attempt to reconnect WebSocket
   */
  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        // Attempting to reconnect WebSocket
        this.initializeWebSocket();
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  /**
   * Send message via WebSocket
   */
  async sendMessage(chatId: string, message: string, type: 'text' | 'image' | 'location' | 'file' = 'text', metadata?: any) {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        const messageData = {
          type: 'send_message',
          chatId,
          message,
          messageType: type,
          metadata,
        };
        this.ws.send(JSON.stringify(messageData));
      } else {
        // Fallback to HTTP API
        await this.sendMessageViaAPI(chatId, message, type, metadata);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Send message via HTTP API (fallback)
   */
  private async sendMessageViaAPI(chatId: string, message: string, type: string, metadata?: any) {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const token = await user.getIdToken();
      
      const response = await fetch(`${API_ENDPOINTS.CHATS}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatId,
          message,
          type,
          metadata,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.status}`);
      }

      const data = await response.json();
      return data.message;
    } catch (error) {
      console.error('Error sending message via API:', error);
      throw error;
    }
  }

  /**
   * Get chat rooms for current user
   */
  async getChatRooms(): Promise<ChatRoom[]> {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return [];

      const token = await user.getIdToken();
      
      const response = await fetch(`${API_ENDPOINTS.CHATS}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data.chats || [];
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching chat rooms:', error);
      return [];
    }
  }

  /**
   * Get messages for a specific chat
   */
  async getChatMessages(chatId: string, limit: number = 50, offset: number = 0): Promise<ChatMessage[]> {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return [];

      const token = await user.getIdToken();
      
      const response = await fetch(`${API_ENDPOINTS.CHATS}/${chatId}?limit=${limit}&offset=${offset}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data.messages || [];
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching chat messages:', error);
      return [];
    }
  }

  /**
   * Create or get existing chat room
   */
  async createOrGetChat(participantIds: string[]): Promise<ChatRoom> {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const token = await user.getIdToken();
      
      const response = await fetch(`${API_ENDPOINTS.CHATS}/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participants: participantIds,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.chat;
      }
      
      throw new Error(`Failed to create chat: ${response.status}`);
    } catch (error) {
      console.error('Error creating chat:', error);
      throw error;
    }
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(chatId: string, messageIds: string[]) {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      
      const response = await fetch(`${API_ENDPOINTS.CHATS}/${chatId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageIds,
        }),
      });

      if (!response.ok) {
        console.error('Failed to mark messages as read:', response.status);
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }

  /**
   * Subscribe to new messages
   */
  onMessage(handler: (message: ChatMessage) => void) {
    this.messageHandlers.push(handler);
    return () => {
      const index = this.messageHandlers.indexOf(handler);
      if (index > -1) {
        this.messageHandlers.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to connection status changes
   */
  onConnectionChange(handler: (connected: boolean) => void) {
    this.connectionHandlers.push(handler);
    return () => {
      const index = this.connectionHandlers.indexOf(handler);
      if (index > -1) {
        this.connectionHandlers.splice(index, 1);
      }
    };
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Disconnect WebSocket
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Reconnect WebSocket
   */
  reconnect() {
    this.disconnect();
    this.reconnectAttempts = 0;
    this.initializeWebSocket();
  }
}

export const chatService = new ChatService();
