// Real-time chat modal component
import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { chatService, ChatMessage, ChatRoom } from '../../services/chatService';
import colors from '../../constants/colors';
import fonts from '../../constants/fonts';

interface ChatModalProps {
  visible: boolean;
  onClose: () => void;
  chatRoom?: ChatRoom;
  participantIds?: string[];
  onChatCreated?: (chatRoom: ChatRoom) => void;
}

const ChatModal: React.FC<ChatModalProps> = ({
  visible,
  onClose,
  chatRoom,
  participantIds,
  onChatCreated,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [currentChatRoom, setCurrentChatRoom] = useState<ChatRoom | null>(chatRoom || null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (visible && currentChatRoom) {
      loadMessages();
      setupMessageListener();
    }

    return () => {
      // Cleanup message listener when component unmounts or modal closes
    };
  }, [visible, currentChatRoom]);

  useEffect(() => {
    if (visible) {
      // Initialize chat service when modal opens
      chatService.initialize();
    }
  }, [visible]);

  useEffect(() => {
    if (visible && !currentChatRoom && participantIds) {
      createOrGetChat();
    }
  }, [visible, participantIds]);

  const createOrGetChat = async () => {
    if (!participantIds) return;

    setLoading(true);
    try {
      const chat = await chatService.createOrGetChat(participantIds);
      setCurrentChatRoom(chat);
      if (onChatCreated) {
        onChatCreated(chat);
      }
    } catch (error) {
      console.error('Error creating chat:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    if (!currentChatRoom) return;

    setLoading(true);
    try {
      const chatMessages = await chatService.getChatMessages(currentChatRoom.id);
      setMessages(chatMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupMessageListener = () => {
    if (!currentChatRoom) return;

    const unsubscribe = chatService.onMessage((message: ChatMessage) => {
      if (message.chatId === currentChatRoom.id) {
        setMessages(prev => [message, ...prev]);
      }
    });

    return unsubscribe;
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentChatRoom || sending) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      await chatService.sendMessage(currentChatRoom.id, messageText);
    } catch (error) {
      console.error('Error sending message:', error);
      // Restore message on error
      setNewMessage(messageText);
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isCurrentUser = item.senderRole === 'customer' || item.senderRole === 'broker';
    
    return (
      <View style={[
        styles.messageContainer,
        isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage
      ]}>
        <View style={[
          styles.messageBubble,
          isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble
        ]}>
          <Text style={[
            styles.messageText,
            isCurrentUser ? styles.currentUserText : styles.otherUserText
          ]}>
            {item.message}
          </Text>
          <Text style={[
            styles.messageTime,
            isCurrentUser ? styles.currentUserTime : styles.otherUserTime
          ]}>
            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubbles-outline" size={48} color={colors.text.light} />
      <Text style={styles.emptyText}>Start a conversation</Text>
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
              <View style={styles.headerLeft}>
                <Ionicons name="chatbubbles" size={24} color={colors.primary} />
                <Text style={styles.headerTitle}>
                  {currentChatRoom ? 'Chat' : 'Loading...'}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            {/* Messages */}
            <View style={styles.messagesContainer}>
              {loading ? (
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
                  style={styles.messagesList}
                  inverted
                  showsVerticalScrollIndicator={false}
                />
              )}
            </View>

            {/* Input */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                value={newMessage}
                onChangeText={setNewMessage}
                placeholder="Type a message..."
                placeholderTextColor={colors.text.light}
                multiline
                maxLength={500}
                editable={!sending && !!currentChatRoom}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!newMessage.trim() || sending || !currentChatRoom) && styles.sendButtonDisabled
                ]}
                onPress={sendMessage}
                disabled={!newMessage.trim() || sending || !currentChatRoom}
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
    height: '80%',
    maxHeight: 600,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fonts.size.lg,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginLeft: 8,
  },
  closeButton: {
    padding: 4,
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
    paddingHorizontal: 16,
  },
  messageContainer: {
    marginVertical: 4,
  },
  currentUserMessage: {
    alignItems: 'flex-end',
  },
  otherUserMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  currentUserBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  otherUserBubble: {
    backgroundColor: colors.background,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: fonts.size.md,
    lineHeight: 20,
  },
  currentUserText: {
    color: colors.white,
  },
  otherUserText: {
    color: colors.text.primary,
  },
  messageTime: {
    fontSize: fonts.size.xs,
    marginTop: 4,
  },
  currentUserTime: {
    color: colors.white + '80',
    textAlign: 'right',
  },
  otherUserTime: {
    color: colors.text.light,
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
    color: colors.text.light,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.background,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
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
    backgroundColor: colors.text.light,
  },
});

export default ChatModal;
