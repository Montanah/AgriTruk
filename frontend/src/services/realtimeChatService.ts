// Real-time chat service using Socket.IO for instant messaging
import { io, Socket } from 'socket.io-client';
import { getAuth } from 'firebase/auth';
import { API_ENDPOINTS } from '../constants/api';

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderRole: 'driver' | 'customer' | 'shipper' | 'broker' | 'business';
  message: string;
  timestamp: Date | string;
  type: 'text' | 'image' | 'location' | 'system';
  read: boolean;
  readAt?: Date | string;
  metadata?: any;
}

export interface ChatRoom {
  id: string;
  bookingId?: string;
  participant1Id: string;
  participant1Type: string;
  participant2Id: string;
  participant2Type: string;
  lastMessage?: ChatMessage;
  unreadCount: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface TypingIndicator {
  chatId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
}

class RealtimeChatService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private messageListeners: Map<string, (message: ChatMessage) => void> = new Map();
  private typingListeners: Map<string, (typing: TypingIndicator) => void> = new Map();
  private connectionListeners: Array<(connected: boolean) => void> = [];
  private currentUserId: string | null = null;
  private currentChatRooms: Set<string> = new Set();

  // Initialize Socket.IO connection
  async initialize(): Promise<void> {
    if (this.socket?.connected) {
      return;
    }

    try {
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      this.currentUserId = user.uid;
      const token = await user.getIdToken();

      // Extract base URL from API_ENDPOINTS
      const baseUrl = API_ENDPOINTS.CHATS.replace('/api/chats', '');
      
      // Connect to Socket.IO server
      this.socket = io(baseUrl, {
        auth: {
          token,
          userId: user.uid,
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });

      this.setupSocketListeners();
    } catch (error) {
      console.error('Error initializing chat service:', error);
      throw error;
    }
  }

  private setupSocketListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Chat service connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.notifyConnectionListeners(true);
      
      // Rejoin all chat rooms
      this.currentChatRooms.forEach(roomId => {
        this.joinRoom(roomId);
      });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Chat service disconnected:', reason);
      this.isConnected = false;
      this.notifyConnectionListeners(false);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Chat connection error:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
      }
    });

    this.socket.on('message', (message: ChatMessage) => {
      // Notify all listeners for this chat room
      const listener = this.messageListeners.get(message.chatId);
      if (listener) {
        listener(message);
      }
    });

    this.socket.on('typing', (typing: TypingIndicator) => {
      const listener = this.typingListeners.get(typing.chatId);
      if (listener) {
        listener(typing);
      }
    });

    this.socket.on('message_read', (data: { chatId: string; messageId: string; readBy: string }) => {
      // Handle read receipts
      console.log('Message read:', data);
    });
  }

  // Join a chat room
  joinRoom(chatId: string): void {
    if (!this.socket?.connected) {
      console.warn('Socket not connected, cannot join room');
      return;
    }

    this.socket.emit('join_room', { chatId });
    this.currentChatRooms.add(chatId);
  }

  // Leave a chat room
  leaveRoom(chatId: string): void {
    if (!this.socket?.connected) return;

    this.socket.emit('leave_room', { chatId });
    this.currentChatRooms.delete(chatId);
  }

  // Get or create a chat room
  async getOrCreateChatRoom(
    bookingId: string,
    participant1Id: string,
    participant1Type: string,
    participant2Id: string,
    participant2Type: string
  ): Promise<ChatRoom> {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const token = await user.getIdToken();
      const response = await fetch(`${API_ENDPOINTS.CHATS}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          bookingId,
          participant1Id,
          participant1Type,
          participant2Id,
          participant2Type,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(`Failed to create chat room: ${errorData.message || 'Unknown error'}`);
      }

      const result = await response.json();
      const chatRoom = result.data || result;

      // Join the room for real-time updates
      if (chatRoom.id) {
        this.joinRoom(chatRoom.id);
      }

      return chatRoom;
    } catch (error) {
      console.error('Error creating chat room:', error);
      throw error;
    }
  }

  // Get messages for a chat room
  async getMessages(chatId: string, page: number = 1, limit: number = 50): Promise<ChatMessage[]> {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const token = await user.getIdToken();
      const response = await fetch(
        `${API_ENDPOINTS.CHATS}/${chatId}/messages?page=${page}&limit=${limit}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }

      const result = await response.json();
      return result.data || result.messages || [];
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  }

  // Send a message (real-time via Socket.IO)
  async sendMessage(chatId: string, message: string, type: 'text' | 'image' | 'location' = 'text'): Promise<ChatMessage> {
    if (!this.socket?.connected) {
      // Fallback to HTTP if Socket.IO is not connected
      return this.sendMessageViaHTTP(chatId, message, type);
    }

    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not initialized'));
        return;
      }

      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        reject(new Error('User not authenticated'));
        return;
      }

      const messageData = {
        chatId,
        message,
        type,
        senderId: user.uid,
        timestamp: new Date().toISOString(),
      };

      this.socket.emit('send_message', messageData, (response: { success: boolean; message?: ChatMessage; error?: string }) => {
        if (response.success && response.message) {
          resolve(response.message);
        } else {
          // Fallback to HTTP
          this.sendMessageViaHTTP(chatId, message, type)
            .then(resolve)
            .catch(reject);
        }
      });
    });
  }

  // Fallback HTTP method for sending messages
  private async sendMessageViaHTTP(chatId: string, message: string, type: 'text' | 'image' | 'location' = 'text'): Promise<ChatMessage> {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const token = await user.getIdToken();
      const response = await fetch(`${API_ENDPOINTS.CHATS}/${chatId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          chatId,
          message,
          type,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Error sending message via HTTP:', error);
      throw error;
    }
  }

  // Send typing indicator
  sendTyping(chatId: string, isTyping: boolean): void {
    if (!this.socket?.connected) return;

    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;

    this.socket.emit('typing', {
      chatId,
      userId: user.uid,
      isTyping,
    });
  }

  // Mark messages as read
  async markAsRead(chatId: string, messageIds: string[]): Promise<void> {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      
      // Send via Socket.IO if connected
      if (this.socket?.connected) {
        this.socket.emit('mark_read', {
          chatId,
          messageIds,
          userId: user.uid,
        });
      }

      // Also update via HTTP for reliability
      await fetch(`${API_ENDPOINTS.CHATS}/${chatId}/read`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          messageIds,
          userId: user.uid,
        }),
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }

  // Subscribe to new messages
  onMessage(chatId: string, callback: (message: ChatMessage) => void): () => void {
    this.messageListeners.set(chatId, callback);
    
    // Return unsubscribe function
    return () => {
      this.messageListeners.delete(chatId);
    };
  }

  // Subscribe to typing indicators
  onTyping(chatId: string, callback: (typing: TypingIndicator) => void): () => void {
    this.typingListeners.set(chatId, callback);
    
    return () => {
      this.typingListeners.delete(chatId);
    };
  }

  // Subscribe to connection status
  onConnectionChange(callback: (connected: boolean) => void): () => void {
    this.connectionListeners.push(callback);
    
    return () => {
      const index = this.connectionListeners.indexOf(callback);
      if (index > -1) {
        this.connectionListeners.splice(index, 1);
      }
    };
  }

  private notifyConnectionListeners(connected: boolean): void {
    this.connectionListeners.forEach(callback => callback(connected));
  }

  // Disconnect from Socket.IO
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    this.currentChatRooms.clear();
    this.messageListeners.clear();
    this.typingListeners.clear();
  }

  // Get connection status
  getConnectionStatus(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }
}

export const realtimeChatService = new RealtimeChatService();

