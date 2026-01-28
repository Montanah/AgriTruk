// Enhanced real-time chat modal for drivers to chat with customers
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { realtimeChatService, ChatMessage, ChatRoom, TypingIndicator } from '../../services/realtimeChatService';
import colors from '../../constants/colors';
import fonts from '../../constants/fonts';
import { getAuth } from 'firebase/auth';

interface RealtimeChatModalProps {
  visible: boolean;
  onClose: () => void;
  chatRoom?: ChatRoom;
  bookingId?: string;
  participant1Id?: string;
  participant1Type?: string;
  participant2Id?: string;
  participant2Type?: string;
  participant2Name?: string;
  participant2Photo?: string;
  onChatCreated?: (chatRoom: ChatRoom) => void;
}

const RealtimeChatModal: React.FC<RealtimeChatModalProps> = ({
  visible,
  onClose,
  chatRoom,
  bookingId,
  participant1Id,
  participant1Type = 'driver',
  participant2Id,
  participant2Type = 'customer',
  participant2Name = 'Customer',
  participant2Photo,
  onChatCreated,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [currentChatRoom, setCurrentChatRoom] = useState<ChatRoom | null>(chatRoom || null);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize chat service and set up listeners
  useEffect(() => {
    if (visible) {
      initializeChat();
    }

    return () => {
      cleanupChat();
    };
  }, [visible]);

  // Set up message listener when chat room is available
  useEffect(() => {
    if (visible && currentChatRoom) {
      setupMessageListener();
      setupTypingListener();
      loadMessages();
    }
  }, [visible, currentChatRoom]);

  // Set up connection status listener
  useEffect(() => {
    const unsubscribe = realtimeChatService.onConnectionChange((connected) => {
      setIsConnected(connected);
    });

    return unsubscribe;
  }, []);

  const initializeChat = async () => {
    try {
      // Initialize Socket.IO connection
      await realtimeChatService.initialize();
      setIsConnected(realtimeChatService.getConnectionStatus());

      // Get or create chat room if not provided
      if (!currentChatRoom && participant1Id && participant2Id) {
        await createOrGetChat();
      } else if (currentChatRoom) {
        // Join existing room
        realtimeChatService.joinRoom(currentChatRoom.id);
      }
    } catch (error) {
      console.error('Error initializing chat:', error);
    }
  };

  const createOrGetChat = async () => {
    if (!participant1Id || !participant2Id) {
      console.error('❌ [RealtimeChatModal] Cannot create chat: missing participant IDs', {
        participant1Id,
        participant2Id,
      });
      Alert.alert(
        'Error',
        'Cannot create chat: Missing participant information. Please try again later.',
        [{ text: 'OK', onPress: onClose }]
      );
      return;
    }

    setLoading(true);
    try {
      console.log('📤 [RealtimeChatModal] Creating chat room with:', {
        bookingId: bookingId || 'none',
        participant1Id,
        participant1Type,
        participant2Id,
        participant2Type,
      });
      
      const room = await realtimeChatService.getOrCreateChatRoom(
        bookingId || '',
        participant1Id,
        participant1Type,
        participant2Id,
        participant2Type
      );
      
      console.log('✅ [RealtimeChatModal] Chat room created successfully:', room);
      setCurrentChatRoom(room);
      if (onChatCreated) {
        onChatCreated(room);
      }
    } catch (error: any) {
      console.error('❌ [RealtimeChatModal] Error creating chat:', error);
      const errorMessage = error?.message || 'Failed to create chat room';
      Alert.alert(
        'Chat Error',
        errorMessage.includes('Participant not found') 
          ? 'One of the participants could not be found. Please ensure both parties are registered users.'
          : errorMessage,
        [{ text: 'OK', onPress: onClose }]
      );
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    if (!currentChatRoom) return;

    setLoading(true);
    try {
      const chatMessages = await realtimeChatService.getMessages(currentChatRoom.id);
      // Sort messages by timestamp (oldest first)
      const sortedMessages = chatMessages.sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return timeA - timeB;
      });
      setMessages(sortedMessages);
      
      // Mark messages as read
      const unreadMessageIds = sortedMessages
        .filter(msg => !msg.read && msg.senderId !== getAuth().currentUser?.uid)
        .map(msg => msg.id);
      
      if (unreadMessageIds.length > 0) {
        await realtimeChatService.markAsRead(currentChatRoom.id, unreadMessageIds);
      }

      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupMessageListener = () => {
    if (!currentChatRoom) return;

    const unsubscribe = realtimeChatService.onMessage(currentChatRoom.id, (message: ChatMessage) => {
      setMessages(prev => {
        // Check if message already exists
        const exists = prev.find(msg => msg.id === message.id);
        if (exists) return prev;
        
        // Add new message
        const updated = [...prev, message];
        // Sort by timestamp
        return updated.sort((a, b) => {
          const timeA = new Date(a.timestamp).getTime();
          const timeB = new Date(b.timestamp).getTime();
          return timeA - timeB;
        });
      });

      // Mark as read if it's from the other user
      const auth = getAuth();
      if (message.senderId !== auth.currentUser?.uid) {
        realtimeChatService.markAsRead(currentChatRoom.id, [message.id]);
      }

      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    return unsubscribe;
  };

  const setupTypingListener = () => {
    if (!currentChatRoom) return;

    const unsubscribe = realtimeChatService.onTyping(currentChatRoom.id, (typing: TypingIndicator) => {
      const auth = getAuth();
      if (typing.userId !== auth.currentUser?.uid) {
        setOtherUserTyping(typing.isTyping);
        
        // Clear typing indicator after 3 seconds
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        
        typingTimeoutRef.current = setTimeout(() => {
          setOtherUserTyping(false);
        }, 3000);
      }
    });

    return unsubscribe;
  };

  const handleTyping = (text: string) => {
    setNewMessage(text);

    if (!currentChatRoom) return;

    // Send typing indicator
    if (!isTyping && text.length > 0) {
      setIsTyping(true);
      realtimeChatService.sendTyping(currentChatRoom.id, true);
    }

    // Clear existing timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    // Set new timeout to stop typing indicator
    const timeout = setTimeout(() => {
      setIsTyping(false);
      realtimeChatService.sendTyping(currentChatRoom.id, false);
    }, 1000);

    setTypingTimeout(timeout);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentChatRoom || sending) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setSending(true);

    // Stop typing indicator
    if (isTyping) {
      setIsTyping(false);
      realtimeChatService.sendTyping(currentChatRoom.id, false);
    }
    if (typingTimeout) {
      clearTimeout(typingTimeout);
      setTypingTimeout(null);
    }

    try {
      const sentMessage = await realtimeChatService.sendMessage(currentChatRoom.id, messageText);
      
      // Add message to local state immediately for instant feedback
      setMessages(prev => [...prev, sentMessage]);
      
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
      // Restore message on error
      setNewMessage(messageText);
    } finally {
      setSending(false);
    }
  };

  const cleanupChat = () => {
    if (currentChatRoom) {
      realtimeChatService.leaveRoom(currentChatRoom.id);
    }
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const auth = getAuth();
    const currentUserId = auth.currentUser?.uid;
    const isMyMessage = item.senderId === currentUserId;
    
    return (
      <View style={[
        styles.messageContainer,
        isMyMessage ? styles.myMessage : styles.otherMessage
      ]}>
        {!isMyMessage && participant2Photo && (
          <Image source={{ uri: participant2Photo }} style={styles.avatar} />
        )}
        <View style={[
          styles.messageBubble,
          isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble
        ]}>
          {!isMyMessage && (
            <Text style={styles.senderName}>{item.senderName || participant2Name}</Text>
          )}
          <Text style={[
            styles.messageText,
            isMyMessage ? styles.myMessageText : styles.otherMessageText
          ]}>
            {item.message}
          </Text>
          <View style={styles.messageFooter}>
            <Text style={[
              styles.messageTime,
              isMyMessage ? styles.myMessageTime : styles.otherMessageTime
            ]}>
              {new Date(item.timestamp).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </Text>
            {isMyMessage && (
              <Ionicons 
                name={item.read ? "checkmark-done" : "checkmark"} 
                size={14} 
                color={item.read ? colors.primary : colors.text.light} 
                style={styles.readIcon}
              />
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderTypingIndicator = () => {
    if (!otherUserTyping) return null;

    return (
      <View style={[styles.messageContainer, styles.otherMessage]}>
        {participant2Photo && (
          <Image source={{ uri: participant2Photo }} style={styles.avatar} />
        )}
        <View style={[styles.messageBubble, styles.otherMessageBubble, styles.typingBubble]}>
          <View style={styles.typingDots}>
            <View style={[styles.typingDot, styles.typingDot1]} />
            <View style={[styles.typingDot, styles.typingDot2]} />
            <View style={[styles.typingDot, styles.typingDot3]} />
          </View>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubbles-outline" size={48} color={colors.text.light} />
      <Text style={styles.emptyText}>Start a conversation</Text>
      <Text style={styles.emptySubtext}>Send a message to {participant2Name}</Text>
    </View>
  );

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.chatContainer}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={onClose} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
              </TouchableOpacity>
              <View style={styles.headerInfo}>
                {participant2Photo && (
                  <Image source={{ uri: participant2Photo }} style={styles.headerAvatar} />
                )}
                <View style={styles.headerText}>
                  <Text style={styles.headerTitle}>{participant2Name}</Text>
                  <View style={styles.headerStatus}>
                    <View style={[styles.statusDot, isConnected && styles.statusDotOnline]} />
                    <Text style={styles.headerSubtitle}>
                      {isConnected ? 'Online' : 'Offline'}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={styles.headerRight} />
            </View>

            {/* Messages */}
            <View style={styles.messagesContainer}>
              {loading && messages.length === 0 ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={styles.loadingText}>Loading messages...</Text>
                </View>
              ) : (
                <FlatList
                  ref={flatListRef}
                  data={messages}
                  keyExtractor={(item) => item.id}
                  renderItem={renderMessage}
                  ListEmptyComponent={renderEmptyState}
                  ListFooterComponent={renderTypingIndicator}
                  style={styles.messagesList}
                  contentContainerStyle={styles.messagesContent}
                  showsVerticalScrollIndicator={false}
                  onContentSizeChange={() => {
                    setTimeout(() => {
                      flatListRef.current?.scrollToEnd({ animated: true });
                    }, 100);
                  }}
                />
              )}
            </View>

            {/* Input */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                value={newMessage}
                onChangeText={handleTyping}
                placeholder={`Message ${participant2Name}...`}
                placeholderTextColor={colors.text.light}
                multiline
                maxLength={500}
                editable={!sending && !!currentChatRoom && isConnected}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!newMessage.trim() || sending || !currentChatRoom || !isConnected) && styles.sendButtonDisabled
                ]}
                onPress={sendMessage}
                disabled={!newMessage.trim() || sending || !currentChatRoom || !isConnected}
              >
                {sending ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Ionicons name="send" size={20} color={colors.white} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  chatContainer: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '85%',
    maxHeight: 700,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: fonts.size.lg,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  headerStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.text.light,
    marginRight: 6,
  },
  statusDotOnline: {
    backgroundColor: colors.success,
  },
  headerSubtitle: {
    fontSize: fonts.size.xs,
    color: colors.text.light,
  },
  headerRight: {
    width: 40,
  },
  messagesContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    color: colors.text.light,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: fonts.size.md,
    fontWeight: '600',
    color: colors.text.primary,
  },
  emptySubtext: {
    marginTop: 4,
    fontSize: fonts.size.sm,
    color: colors.text.light,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  myMessage: {
    justifyContent: 'flex-end',
  },
  otherMessage: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 4,
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  myMessageBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: colors.background,
    borderBottomLeftRadius: 4,
  },
  typingBubble: {
    paddingVertical: 12,
  },
  senderName: {
    fontSize: fonts.size.xs,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  messageText: {
    fontSize: fonts.size.md,
    lineHeight: 20,
  },
  myMessageText: {
    color: colors.white,
  },
  otherMessageText: {
    color: colors.text.primary,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  messageTime: {
    fontSize: fonts.size.xs,
  },
  myMessageTime: {
    color: colors.white + '80',
  },
  otherMessageTime: {
    color: colors.text.light,
  },
  readIcon: {
    marginLeft: 4,
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.text.light,
    marginHorizontal: 2,
  },
  typingDot1: {
    opacity: 0.4,
  },
  typingDot2: {
    opacity: 0.6,
  },
  typingDot3: {
    opacity: 0.8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    maxHeight: 100,
    fontSize: fonts.size.md,
    color: colors.text.primary,
  },
  sendButton: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.border,
  },
});

export default RealtimeChatModal;

