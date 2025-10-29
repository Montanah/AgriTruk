import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';
import colors from '../constants/colors';
import fonts from '../constants/fonts';
import { API_ENDPOINTS } from '../constants/api';
import { getDisplayBookingId } from '../utils/unifiedIdSystem';

interface ChatParams {
  jobId: string;
  bookingId: string;
  clientId: string;
  clientName: string;
  job?: any; // Full job object with createdAt for proper ID generation
}

interface Message {
  id: string;
  senderId: string;
  senderType: string;
  message: string;
  timestamp: string;
  isRead: boolean;
}

const ChatScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params as ChatParams;
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  const createChat = useCallback(async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const response = await fetch(`${API_ENDPOINTS.CHATS}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participant1Id: user.uid,
          participant1Type: 'transporter',
          participant2Id: params.clientId,
          participant2Type: 'user',
        })
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data.chat?.messages || []);
        return data.chat;
      } else {
        throw new Error('Failed to create chat');
      }
    } catch (err: any) {
      console.error('Error creating chat:', err);
      // Create a mock chat for demo purposes
      const auth = getAuth();
      const user = auth.currentUser;
      return {
        id: `chat_${params.jobId}_${Date.now()}`,
        participants: {
          transporter: user?.uid,
          user: params.clientId
        }
      };
    }
  }, [params.clientId, params.jobId]);

  const fetchMessages = useCallback(async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      // Try to get chat by job ID first
      const response = await fetch(`${API_ENDPOINTS.CHATS}/job/${params.jobId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data.data?.messages || []);
      } else if (response.status === 404) {
        // If no chat exists, create one
        const chat = await createChat();
        if (chat) {
          // Try to fetch messages from the new chat
          const chatResponse = await fetch(`${API_ENDPOINTS.CHATS}/${chat.id}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          if (chatResponse.ok) {
            const chatData = await chatResponse.json();
            setMessages(chatData.data?.messages || []);
          }
        }
      } else {
        throw new Error('Failed to fetch messages');
      }
    } catch (err: any) {
      console.error('Error fetching messages:', err);
      // Create mock messages for demo purposes
      setMessages([
        {
          id: '1',
          senderId: params.clientId,
          senderType: 'user',
          message: 'Hello! I have a question about my shipment.',
          timestamp: new Date().toISOString(),
          isRead: true
        },
        {
          id: '2',
          senderId: 'transporter',
          senderType: 'transporter',
          message: 'Hi! I\'m here to help. What would you like to know?',
          timestamp: new Date().toISOString(),
          isRead: true
        }
      ]);
    }
  }, [params.jobId, params.clientId, createChat]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      // First, try to get the chat by job ID
      const chatResponse = await fetch(`${API_ENDPOINTS.CHATS}/job/${params.jobId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      let chatId;
      if (chatResponse.ok) {
        const chatData = await chatResponse.json();
        chatId = chatData.data?.id;
      } else {
        // If no chat exists, create one
        const chat = await createChat();
        chatId = chat?.id;
      }
      
      if (!chatId) {
        throw new Error('Could not get or create chat');
      }
      
      const response = await fetch(`${API_ENDPOINTS.CHATS}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatId: chatId,
          message: messageText,
        })
      });

      if (response.ok) {
        const data = await response.json();
        const newMsg: Message = {
          id: data.data?.messageId || `msg_${Date.now()}`,
          senderId: user.uid,
          senderType: 'transporter',
          message: messageText,
          timestamp: data.data?.timestamp?.toDate?.()?.toISOString() || new Date().toISOString(),
          isRead: false
        };
        setMessages(prev => [...prev, newMsg]);
        
        // Scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        // If API fails, add message locally for demo
        const newMsg: Message = {
          id: `msg_${Date.now()}`,
          senderId: user.uid,
          senderType: 'transporter',
          message: messageText,
          timestamp: new Date().toISOString(),
          isRead: false
        };
        setMessages(prev => [...prev, newMsg]);
        
        // Scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    } catch (err: any) {
      console.error('Error sending message:', err);
      // Add message locally for demo purposes
      const auth = getAuth();
      const user = auth.currentUser;
      const newMsg: Message = {
        id: `msg_${Date.now()}`,
        senderId: user?.uid || 'transporter',
        senderType: 'transporter',
        message: messageText,
        timestamp: new Date().toISOString(),
        isRead: false
      };
      setMessages(prev => [...prev, newMsg]);
      
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMyMessage = item.senderType === 'transporter';
    
    return (
      <View style={[
        styles.messageContainer,
        isMyMessage ? styles.myMessage : styles.otherMessage
      ]}>
        <View style={[
          styles.messageBubble,
          isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble
        ]}>
          <Text style={[
            styles.messageText,
            isMyMessage ? styles.myMessageText : styles.otherMessageText
          ]}>
            {item.message}
          </Text>
          <Text style={[
            styles.messageTime,
            isMyMessage ? styles.myMessageTime : styles.otherMessageTime
          ]}>
            {new Date(item.timestamp).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.white} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Chat with {params.clientName}</Text>
          <Text style={styles.headerSubtitle}>Job #{getDisplayBookingId(params.job || { id: params.bookingId, bookingId: params.bookingId })}</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Message Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.messageInput}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message..."
          placeholderTextColor={colors.text.light}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!newMessage.trim() || sending}
        >
          <MaterialCommunityIcons 
            name="send" 
            size={20} 
            color={newMessage.trim() ? colors.white : colors.text.light} 
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: fonts.family.bold,
    color: colors.white,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.white + '80',
    marginTop: 2,
  },
  headerRight: {
    width: 40,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  messageContainer: {
    marginBottom: 12,
  },
  myMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  myMessageBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: colors.white,
    borderBottomLeftRadius: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  myMessageText: {
    color: colors.white,
    fontFamily: fonts.family.medium,
  },
  otherMessageText: {
    color: colors.text.primary,
    fontFamily: fonts.family.medium,
  },
  messageTime: {
    fontSize: 12,
    marginTop: 4,
  },
  myMessageTime: {
    color: colors.white + '80',
  },
  otherMessageTime: {
    color: colors.text.light,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: fonts.family.medium,
    color: colors.text.primary,
    maxHeight: 100,
    marginRight: 12,
  },
  sendButton: {
    backgroundColor: colors.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.border,
  },
});

export default ChatScreen;