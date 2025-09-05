import { API_ENDPOINTS } from '../constants/api';

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderType: 'user' | 'broker' | 'transporter';
  message: string;
  timestamp: string;
  isRead: boolean;
}

export interface Chat {
  id: string;
  participant1Id: string;
  participant1Type: 'user' | 'broker' | 'transporter';
  participant2Id: string;
  participant2Type: 'user' | 'broker' | 'transporter';
  lastMessage?: ChatMessage;
  lastMessageTime?: string;
  createdAt: string;
  updatedAt: string;
  messages?: ChatMessage[];
}

export interface ChatResponse {
  success: boolean;
  message: string;
  data?: Chat | Chat[];
}

export interface MessageResponse {
  success: boolean;
  message: string;
  data?: ChatMessage;
}

class ChatService {
  private async getAuthToken(): Promise<string> {
    const { getAuth } = await import('firebase/auth');
    const { auth } = await import('../firebaseConfig');
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }
    return await user.getIdToken();
  }

  /**
   * Create a new chat between two participants
   */
  async createChat(
    participant1Id: string,
    participant1Type: 'user' | 'broker' | 'transporter',
    participant2Id: string,
    participant2Type: 'user' | 'broker' | 'transporter'
  ): Promise<ChatResponse> {
    try {
      const token = await this.getAuthToken();

      const response = await fetch(API_ENDPOINTS.CHATS, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participant1Id,
          participant1Type,
          participant2Id,
          participant2Type,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create chat');
      }

      return { success: true, message: 'Chat created successfully', data };
    } catch (error) {
      console.error('Error creating chat:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Send a message in a chat
   */
  async sendMessage(chatId: string, message: string): Promise<MessageResponse> {
    try {
      const token = await this.getAuthToken();

      const response = await fetch(`${API_ENDPOINTS.CHATS}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatId,
          message,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send message');
      }

      return { success: true, message: 'Message sent successfully', data };
    } catch (error) {
      console.error('Error sending message:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Get all chats for the authenticated user
   */
  async getChats(): Promise<ChatResponse> {
    try {
      const token = await this.getAuthToken();

      const response = await fetch(API_ENDPOINTS.CHATS, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to get chats');
      }

      return { success: true, message: 'Chats retrieved successfully', data };
    } catch (error) {
      console.error('Error getting chats:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Get a specific chat with messages
   */
  async getChat(chatId: string): Promise<ChatResponse> {
    try {
      const token = await this.getAuthToken();

      const response = await fetch(`${API_ENDPOINTS.CHATS}/${chatId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to get chat');
      }

      return { success: true, message: 'Chat retrieved successfully', data };
    } catch (error) {
      console.error('Error getting chat:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Get or create a chat between current user and another user
   */
  async getOrCreateChat(
    otherUserId: string,
    otherUserType: 'user' | 'broker' | 'transporter'
  ): Promise<ChatResponse> {
    try {
      // First, try to get existing chats
      const chatsResponse = await this.getChats();
      
      if (chatsResponse.success && chatsResponse.data) {
        const chats = Array.isArray(chatsResponse.data) ? chatsResponse.data : [chatsResponse.data];
        
        // Look for existing chat with this user
        const existingChat = chats.find(chat => 
          (chat.participant1Id === otherUserId && chat.participant1Type === otherUserType) ||
          (chat.participant2Id === otherUserId && chat.participant2Type === otherUserType)
        );

        if (existingChat) {
          return { success: true, message: 'Existing chat found', data: existingChat };
        }
      }

      // If no existing chat, create a new one
      const { getAuth } = await import('firebase/auth');
      const { auth } = await import('../firebaseConfig');
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Determine current user type (this would need to be passed or determined)
      // For now, we'll assume the current user type based on context
      const currentUserType: 'user' | 'broker' | 'transporter' = 'user'; // This should be determined from user profile

      return await this.createChat(
        currentUser.uid,
        currentUserType,
        otherUserId,
        otherUserType
      );
    } catch (error) {
      console.error('Error getting or creating chat:', error);
      return { success: false, message: error.message };
    }
  }
}

export default new ChatService();
