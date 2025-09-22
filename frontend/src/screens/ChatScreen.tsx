import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors, fonts, spacing } from '../constants';
import { chatService, ChatMessage, ChatRoom, VoiceCall } from '../services/chatService';

interface ChatScreenProps {
  route: {
    params: {
      roomId: string;
      bookingId: string;
      transporterName: string;
      clientName: string;
      transporterPhone?: string;
      clientPhone?: string;
      userType: 'transporter' | 'client';
    };
  };
}

const ChatScreen: React.FC<ChatScreenProps> = ({ route }) => {
  const navigation = useNavigation();
  const { roomId, bookingId, transporterName, clientName, transporterPhone, clientPhone, userType } = route.params;
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [activeCall, setActiveCall] = useState<VoiceCall | null>(null);
  
  const flatListRef = useRef<FlatList>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    loadMessages();
    
    // Subscribe to real-time updates
    unsubscribeRef.current = chatService.subscribeToRoom(
      roomId,
      (message) => {
        setMessages(prev => [...prev, message]);
        scrollToBottom();
      },
      (call) => {
        setActiveCall(call);
        if (call.status === 'ringing' && call.callerType !== userType) {
          showIncomingCallAlert(call);
        }
      }
    );

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [roomId]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const fetchedMessages = await chatService.getMessages(roomId);
      setMessages(fetchedMessages);
      scrollToBottom();
    } catch (error) {
      console.error('Error loading messages:', error);
      Alert.alert('Error', 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      const message: Omit<ChatMessage, 'id' | 'timestamp' | 'read'> = {
        senderId: 'current-user-id', // This should come from auth context
        senderName: userType === 'transporter' ? transporterName : clientName,
        senderType: userType,
        message: messageText,
        type: 'text',
        read: false,
      };

      await chatService.sendMessage(roomId, message);
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
      setNewMessage(messageText); // Restore the message
    } finally {
      setSending(false);
    }
  };

  const initiateCall = async () => {
    if (isCalling) return;

    try {
      setIsCalling(true);
      const call = await chatService.initiateVoiceCall(
        roomId,
        'current-user-id', // This should come from auth context
        userType === 'transporter' ? transporterName : clientName,
        userType
      );
      
      setActiveCall(call);
      // In a real implementation, you would start the actual voice call here
      Alert.alert('Call Initiated', 'Voice call is being initiated...');
    } catch (error) {
      console.error('Error initiating call:', error);
      Alert.alert('Error', 'Failed to initiate call');
    } finally {
      setIsCalling(false);
    }
  };

  const showIncomingCallAlert = (call: VoiceCall) => {
    Alert.alert(
      'Incoming Call',
      `${call.callerName} is calling you`,
      [
        { text: 'Decline', style: 'cancel' },
        { text: 'Answer', onPress: () => answerCall(call.id) },
      ]
    );
  };

  const answerCall = async (callId: string) => {
    try {
      await chatService.updateCallStatus(callId, 'answered');
      // In a real implementation, you would start the actual voice call here
      Alert.alert('Call Answered', 'Voice call is now active');
    } catch (error) {
      console.error('Error answering call:', error);
    }
  };

  const endCall = async () => {
    if (!activeCall) return;

    try {
      await chatService.updateCallStatus(activeCall.id, 'ended');
      setActiveCall(null);
    } catch (error) {
      console.error('Error ending call:', error);
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isOwnMessage = item.senderType === userType;
    
    return (
      <View style={[styles.messageContainer, isOwnMessage ? styles.ownMessage : styles.otherMessage]}>
        <View style={[styles.messageBubble, isOwnMessage ? styles.ownBubble : styles.otherBubble]}>
          <Text style={[styles.messageText, isOwnMessage ? styles.ownMessageText : styles.otherMessageText]}>
            {item.message}
          </Text>
          <Text style={[styles.messageTime, isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime]}>
            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <MaterialCommunityIcons name="arrow-left" size={24} color={colors.white} />
      </TouchableOpacity>
      
      <View style={styles.headerInfo}>
        <Text style={styles.headerName}>
          {userType === 'transporter' ? clientName : transporterName}
        </Text>
        <Text style={styles.headerSubtitle}>
          {userType === 'transporter' ? 'Client' : 'Transporter'}
        </Text>
      </View>
      
      <TouchableOpacity 
        onPress={initiateCall} 
        style={[styles.callButton, isCalling && styles.callButtonDisabled]}
        disabled={isCalling}
      >
        <MaterialCommunityIcons 
          name={isCalling ? "phone-hangup" : "phone"} 
          size={24} 
          color={colors.white} 
        />
      </TouchableOpacity>
    </View>
  );

  const renderCallStatus = () => {
    if (!activeCall) return null;

    return (
      <View style={styles.callStatusContainer}>
        <View style={styles.callStatus}>
          <MaterialCommunityIcons 
            name="phone" 
            size={20} 
            color={colors.white} 
          />
          <Text style={styles.callStatusText}>
            {activeCall.status === 'ringing' ? 'Calling...' : 
             activeCall.status === 'answered' ? 'Call Active' : 
             activeCall.status}
          </Text>
          {activeCall.status === 'answered' && (
            <TouchableOpacity onPress={endCall} style={styles.endCallButton}>
              <MaterialCommunityIcons name="phone-hangup" size={20} color={colors.error} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {renderHeader()}
      {renderCallStatus()}
      
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={scrollToBottom}
        onLayout={scrollToBottom}
      />
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message..."
          placeholderTextColor={colors.text.light}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity 
          onPress={sendMessage} 
          style={[styles.sendButton, (!newMessage.trim() || sending) && styles.sendButtonDisabled]}
          disabled={!newMessage.trim() || sending}
        >
          <MaterialCommunityIcons 
            name="send" 
            size={20} 
            color={colors.white} 
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    paddingTop: spacing.lg,
  },
  backButton: {
    marginRight: spacing.sm,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 18,
    fontFamily: fonts.family.bold,
    color: colors.white,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: fonts.family.regular,
    color: colors.white,
    opacity: 0.8,
  },
  callButton: {
    padding: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.success,
  },
  callButtonDisabled: {
    backgroundColor: colors.text.light,
  },
  callStatusContainer: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  callStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callStatusText: {
    color: colors.white,
    marginLeft: spacing.sm,
    fontFamily: fonts.family.medium,
  },
  endCallButton: {
    marginLeft: spacing.md,
    padding: spacing.sm,
    borderRadius: 15,
    backgroundColor: colors.white,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: spacing.md,
  },
  messageContainer: {
    marginBottom: spacing.sm,
  },
  ownMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
  },
  ownBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 5,
  },
  otherBubble: {
    backgroundColor: colors.white,
    borderBottomLeftRadius: 5,
    borderWidth: 1,
    borderColor: colors.border,
  },
  messageText: {
    fontSize: 16,
    fontFamily: fonts.family.regular,
    lineHeight: 20,
  },
  ownMessageText: {
    color: colors.white,
  },
  otherMessageText: {
    color: colors.text.primary,
  },
  messageTime: {
    fontSize: 12,
    fontFamily: fonts.family.regular,
    marginTop: 4,
  },
  ownMessageTime: {
    color: colors.white,
    opacity: 0.8,
  },
  otherMessageTime: {
    color: colors.text.secondary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    maxHeight: 100,
    fontSize: 16,
    fontFamily: fonts.family.regular,
    color: colors.text.primary,
  },
  sendButton: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    padding: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 40,
  },
  sendButtonDisabled: {
    backgroundColor: colors.text.light,
  },
});

export default ChatScreen;

