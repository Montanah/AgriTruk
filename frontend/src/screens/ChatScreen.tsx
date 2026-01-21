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
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getAuth } from 'firebase/auth';
import colors from '../constants/colors';
import fonts from '../constants/fonts';
import { getDisplayBookingId } from '../utils/unifiedIdSystem';
import { realtimeChatService } from '../services/realtimeChatService';

interface ChatParams {
  jobId: string;
  bookingId: string;
  clientId: string;
  clientName: string;
  job?: any; // Full job object with createdAt for proper ID generation
  participant1Type?: string; // Current user's role (driver, transporter, etc.)
  participant2Type?: string; // Other user's role (shipper, broker, business, etc.)
}

interface Message {
  id: string;
  senderId: string;
  senderType: string;
  message: string;
  timestamp: string;
  isRead: boolean;
}

// Helper function to parse Firestore Timestamp or ISO string to ISO string
const parseTimestamp = (timestamp: any): string => {
  if (!timestamp) {
    // If no timestamp, return current time (shouldn't happen for saved messages)
    return new Date().toISOString();
  }
  
  // If it's already a string (ISO format), return it
  if (typeof timestamp === 'string') {
    return timestamp;
  }
  
  // If it's a Date object, convert to ISO string
  if (timestamp instanceof Date) {
    return timestamp.toISOString();
  }
  
  // If it has toISOString method, use it
  if (typeof timestamp.toISOString === 'function') {
    return timestamp.toISOString();
  }
  
  // If it's a Firestore Timestamp object with _seconds property
  if (timestamp._seconds !== undefined) {
    // Convert Firestore Timestamp to Date, then to ISO string
    const date = new Date(timestamp._seconds * 1000 + (timestamp._nanoseconds || 0) / 1000000);
    return date.toISOString();
  }
  
  // If it's an object with seconds property (alternative Firestore format)
  if (timestamp.seconds !== undefined) {
    const date = new Date(timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000);
    return date.toISOString();
  }
  
  // If it's a number (Unix timestamp in milliseconds or seconds)
  if (typeof timestamp === 'number') {
    // If it's less than 1e12, it's in seconds, otherwise milliseconds
    const date = timestamp < 1e12 ? new Date(timestamp * 1000) : new Date(timestamp);
    return date.toISOString();
  }
  
  // Last resort: try to parse as date
  try {
    const date = new Date(timestamp);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  } catch (e) {
    // Ignore parsing errors
  }
  
  // If all else fails, return current time (shouldn't happen)
  console.warn('Unable to parse timestamp:', timestamp);
  return new Date().toISOString();
};

const ChatScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params as ChatParams;
  const flatListRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [currentChatRoom, setCurrentChatRoom] = useState<any>(null);

  // Determine participant types
  const getParticipantTypes = useCallback(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return { participant1Type: 'driver', participant2Type: 'shipper' };

    // Get current user's role from displayName or determine from context
    const userRole = user.displayName || '';
    let participant1Type = 'driver'; // Default for ChatScreen (usually called from driver screens)
    
    if (userRole.includes('transporter')) {
      participant1Type = 'transporter';
    } else if (userRole.includes('driver')) {
      participant1Type = 'driver';
    }

    // Get other participant's type from params or job
    let participant2Type = params.participant2Type || 'shipper';
    if (!participant2Type && params.job?.userType) {
      participant2Type = params.job.userType; // shipper, broker, or business
    }

    return { participant1Type, participant2Type };
  }, [params]);

  // Initialize chat
  useEffect(() => {
    const initializeChat = async () => {
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) return;

        // Initialize realtime chat service
        await realtimeChatService.initialize();

        const { participant1Type, participant2Type } = getParticipantTypes();

        // Get or create chat room
        const chatRoom = await realtimeChatService.getOrCreateChatRoom(
          params.bookingId || params.jobId,
          user.uid,
          participant1Type,
          params.clientId,
          participant2Type
        );

        setCurrentChatRoom(chatRoom);

        // Load messages
        const loadedMessages = await realtimeChatService.getMessages(chatRoom.id);
        setMessages(loadedMessages.map((msg: any, index: number) => ({
          id: msg.id || msg.messageId || `msg_${index}_${msg.timestamp || Date.now()}`,
          senderId: msg.senderId,
          senderType: msg.senderRole || msg.senderType,
          message: msg.message,
          timestamp: parseTimestamp(msg.timestamp),
          isRead: msg.read || false,
        })));

        // Setup message listener
        realtimeChatService.onMessage(chatRoom.id, (message: any) => {
          setMessages(prev => {
            const newMessage = {
              id: message.id || message.messageId || `msg_${prev.length}_${message.timestamp || Date.now()}`,
              senderId: message.senderId,
              senderType: message.senderRole || message.senderType,
              message: message.message,
              timestamp: parseTimestamp(message.timestamp),
              isRead: message.read || false,
            };
            // Check for duplicates before adding
            if (prev.some(msg => msg.id === newMessage.id)) {
              return prev;
            }
            return [...prev, newMessage];
          });
        });

        // Scroll to bottom when new messages arrive
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } catch (error) {
        console.error('Error initializing chat:', error);
      }
    };

    initializeChat();
  }, [params.bookingId, params.jobId, params.clientId, getParticipantTypes]);

  // Periodic refresh of messages every 5 seconds to catch any missed messages
  useEffect(() => {
    if (!currentChatRoom?.id) return;

    const refreshInterval = setInterval(async () => {
      try {
        const loadedMessages = await realtimeChatService.getMessages(currentChatRoom.id);
        setMessages(loadedMessages.map((msg: any, index: number) => ({
          id: msg.id || msg.messageId || `msg_${index}_${msg.timestamp || Date.now()}`,
          senderId: msg.senderId,
          senderType: msg.senderRole || msg.senderType,
          message: msg.message,
          timestamp: parseTimestamp(msg.timestamp),
          isRead: msg.read || false,
        })));
      } catch (error) {
        console.error('Error refreshing messages:', error);
      }
    }, 5000);

    return () => {
      clearInterval(refreshInterval);
    };
  }, [currentChatRoom?.id]);

  const sendMessage = async () => {
    if (!newMessage.trim() || sending || !currentChatRoom) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      // Optimistically add message to UI
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const tempMessage: Message = {
        id: `temp_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        senderId: user.uid,
        senderType: getParticipantTypes().participant1Type,
        message: messageText,
        timestamp: new Date().toISOString(),
        isRead: false,
      };
      setMessages(prev => [...prev, tempMessage]);
      setSending(false); // Stop spinner immediately

      // Send message via realtime chat service
      const sentMessage = await realtimeChatService.sendMessage(
        currentChatRoom.id,
        messageText
      );

      // Replace temp message with real message
      setMessages(prev => prev.map(msg => 
        msg.id === tempMessage.id ? {
          id: sentMessage.id || sentMessage.messageId || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
          senderId: sentMessage.senderId,
          senderType: sentMessage.senderRole || sentMessage.senderType,
          message: sentMessage.message,
          timestamp: parseTimestamp(sentMessage.timestamp),
          isRead: sentMessage.read || false,
        } : msg
      ));

      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);

      // Reload messages from server to verify persistence
      setTimeout(async () => {
        try {
          const loadedMessages = await realtimeChatService.getMessages(currentChatRoom.id);
        setMessages(loadedMessages.map((msg: any, index: number) => ({
          id: msg.id || msg.messageId || `msg_${index}_${msg.timestamp || Date.now()}`,
          senderId: msg.senderId,
          senderType: msg.senderRole || msg.senderType,
          message: msg.message,
          timestamp: parseTimestamp(msg.timestamp),
          isRead: msg.read || false,
        })));
        } catch (error) {
          console.error('Error reloading messages:', error);
        }
      }, 500);
    } catch (err: any) {
      console.error('Error sending message:', err);
      // Remove temp message on error
      setMessages(prev => prev.filter(msg => !msg.id.startsWith('temp_')));
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const auth = getAuth();
    const user = auth.currentUser;
    const { participant1Type } = getParticipantTypes();
    const isMyMessage = item.senderId === user?.uid || item.senderType === participant1Type;
    
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
          <Text style={styles.headerTitle} numberOfLines={1} adjustsFontSizeToFit={true} minimumFontScale={0.8}>Chat with {params.clientName}</Text>
          <Text style={styles.headerSubtitle}>Job #{getDisplayBookingId(params.job || { id: params.bookingId, bookingId: params.bookingId })}</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item, index) => item.id || `msg_${index}_${item.timestamp}`}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Message Input */}
      <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom + 16, 20) }]}>
        <TextInput
          style={styles.messageInput}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message..."
          placeholderTextColor={colors.text.light}
          multiline
          maxLength={500}
          editable={!sending}
        />
        <TouchableOpacity
          style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!newMessage.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <MaterialCommunityIcons 
              name="send" 
              size={20} 
              color={newMessage.trim() ? colors.white : colors.text.light} 
            />
          )}
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
    paddingTop: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    zIndex: 1000,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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