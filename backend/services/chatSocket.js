// chatSocket.js
const socketIO = require('socket.io');
const Chat = require('../models/Chat');
const Notification = require('../models/Notification');

const activeUsers = new Map(); // userId -> socketId
const typingUsers = new Map(); // chatId -> Set of userIds

function initializeSocket(server) {
  const io = socketIO(server, {
    path: '/socket.io',
    cors: {
      origin: process.env.CLIENT_URL || '*',
      methods: ['GET', 'POST'],
      credentials: true,
      allowedHeaders: ['Authorization', 'Content-Type']
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
    allowEIO3: true
  });

  // Authentication middleware for socket
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      // Verify token (adjust based on your auth system)
      const admin = require('../config/firebase');
      const decodedToken = await admin.auth().verifyIdToken(token);
      
      socket.userId = decodedToken.uid;
      socket.userType = decodedToken.role || 'user';
      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId}`);
    
    // Track active user
    activeUsers.set(socket.userId, socket.id);
    
    // Emit user online status to their chats
    socket.broadcast.emit('user_online', { userId: socket.userId });

    // Join user's personal room for notifications
    socket.join(`user:${socket.userId}`);

    // Join a specific chat room
    // Support both 'join_chat' and 'join_room' for compatibility
    const handleJoinChat = async (chatId) => {
      try {
        // Verify user is participant in this chat
        const chat = await Chat.getChat(chatId);
        const isParticipant = Object.entries(chat.participants).some(
          ([type, id]) => type === socket.userType && id === socket.userId
        );

        if (!isParticipant) {
          socket.emit('error', { message: 'Unauthorized to join this chat' });
          return;
        }

        socket.join(chatId);
        console.log(`User ${socket.userId} joined chat ${chatId}`);
        
        // Notify others that user is online in this chat
        socket.to(chatId).emit('user_joined_chat', {
          userId: socket.userId,
          userType: socket.userType
        });
        
        // Emit confirmation
        socket.emit('joined_room', { chatId });
      } catch (error) {
        console.error('Error joining chat:', error);
        socket.emit('error', { message: 'Failed to join chat' });
      }
    };

    socket.on('join_chat', handleJoinChat);
    socket.on('join_room', (data) => {
      const chatId = typeof data === 'string' ? data : data?.chatId;
      if (chatId) handleJoinChat(chatId);
    });

    // Leave a chat room
    // Support both 'leave_chat' and 'leave_room' for compatibility
    const handleLeaveChat = (chatId) => {
      socket.leave(chatId);
      socket.to(chatId).emit('user_left_chat', {
        userId: socket.userId,
        userType: socket.userType
      });
      socket.emit('left_room', { chatId });
    };

    socket.on('leave_chat', handleLeaveChat);
    socket.on('leave_room', (data) => {
      const chatId = typeof data === 'string' ? data : data?.chatId;
      if (chatId) handleLeaveChat(chatId);
    });

    // Send message
    socket.on('send_message', async (data, callback) => {
      try {
        const { chatId, message, fileUrl, fileName, fileType, type } = data;

        if (!chatId || !message) {
          if (callback) callback({ success: false, error: 'Chat ID and message are required' });
          return;
        }

        // Verify chat exists and user is participant
        let chat;
        try {
          chat = await Chat.getChat(chatId);
        } catch (error) {
          console.error(`[Socket.send_message] Error getting chat ${chatId}:`, error);
          if (callback) callback({ success: false, error: `Chat not found: ${error.message}` });
          socket.emit('error', { message: 'Chat not found' });
          return;
        }

        const isParticipant = Object.entries(chat.participants).some(
          ([type, id]) => type === socket.userType && id === socket.userId
        );

        if (!isParticipant) {
          if (callback) callback({ success: false, error: 'Unauthorized' });
          socket.emit('error', { message: 'Unauthorized' });
          return;
        }

        // Save message to database
        console.log(`[Socket.send_message] Saving message to chat ${chatId} from user ${socket.userId}`);
        let messageData;
        try {
          messageData = await Chat.sendMessage(
            chatId,
            socket.userId,
            socket.userType,
            message,
            fileUrl,
            fileName,
            fileType || type || 'text'
          );
          console.log(`[Socket.send_message] Message saved successfully: ${messageData.messageId}`);
        } catch (error) {
          console.error(`[Socket.send_message] Error saving message:`, error);
          if (callback) callback({ success: false, error: error.message || 'Failed to save message' });
          socket.emit('error', { message: 'Failed to save message' });
          return;
        }

        // Emit to all users in the chat
        // Support both 'new_message' and 'message' for compatibility
        const formattedMessage = {
          id: messageData.messageId,
          chatId,
          senderId: socket.userId,
          senderName: socket.userId, // Can be enhanced by fetching user name
          senderRole: socket.userType,
          message: message || '',
          timestamp: messageData.timestamp?.toDate?.() ? messageData.timestamp.toDate().toISOString() : new Date().toISOString(),
          type: fileType || type || 'text',
          read: false,
          fileUrl,
          fileName,
        };
        
        io.to(chatId).emit('new_message', messageData);
        io.to(chatId).emit('message', formattedMessage);

        // Send callback response to sender
        if (callback) {
          callback({ 
            success: true, 
            message: formattedMessage 
          });
        }

        // Send push notification to offline users
        const otherParticipant = Object.entries(chat.participants).find(
          ([type, id]) => !(type === socket.userType && id === socket.userId)
        );

        if (otherParticipant) {
          const [otherType, otherId] = otherParticipant;
          
          // Check if other user is online
          if (!activeUsers.has(otherId)) {
            // User is offline, send notification
            const notificationData = {
              userId: otherId,
              userType: otherType,
              type: 'new_message',
              message: `New message from ${socket.userType}`,
              metadata: {
                chatId: chatId,
                messageId: messageData.messageId,
                preview: message ? message.substring(0, 50) : 'Sent a file'
              }
            };
            await Notification.create(notificationData);
          }
        }

        // Clear typing indicator
        const typingSet = typingUsers.get(chatId);
        if (typingSet) {
          typingSet.delete(socket.userId);
          socket.to(chatId).emit('stop_typing', {
            userId: socket.userId,
            userType: socket.userType
          });
        }

      } catch (error) {
        console.error('Error sending message:', error);
        if (callback) {
          callback({ success: false, error: error.message || 'Failed to send message' });
        }
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Typing indicator
    // Support both 'typing' with isTyping and 'user_typing' for compatibility
    socket.on('typing', (data) => {
      const { chatId, isTyping } = data;
      
      if (!chatId) return;
      
      if (isTyping) {
        if (!typingUsers.has(chatId)) {
          typingUsers.set(chatId, new Set());
        }
        
        typingUsers.get(chatId).add(socket.userId);
        
        // Emit in both formats for compatibility
        socket.to(chatId).emit('user_typing', {
          userId: socket.userId,
          userType: socket.userType,
          chatId
        });
        
        socket.to(chatId).emit('typing', {
          chatId,
          userId: socket.userId,
          userName: socket.userId,
          isTyping: true
        });

        // Auto-clear typing after 3 seconds
        setTimeout(() => {
          const typingSet = typingUsers.get(chatId);
          if (typingSet) {
            typingSet.delete(socket.userId);
            socket.to(chatId).emit('stop_typing', {
              userId: socket.userId,
              userType: socket.userType
            });
            
            socket.to(chatId).emit('typing', {
              chatId,
              userId: socket.userId,
              userName: socket.userId,
              isTyping: false
            });
          }
        }, 3000);
      } else {
        // Stop typing
        const typingSet = typingUsers.get(chatId);
        if (typingSet) {
          typingSet.delete(socket.userId);
          socket.to(chatId).emit('stop_typing', {
            userId: socket.userId,
            userType: socket.userType
          });
        }
      }
    });

    // Stop typing
    socket.on('stop_typing', (data) => {
      const { chatId } = data;
      const typingSet = typingUsers.get(chatId);
      
      if (typingSet) {
        typingSet.delete(socket.userId);
        socket.to(chatId).emit('stop_typing', {
          userId: socket.userId,
          userType: socket.userType
        });
      }
    });

    // Mark message as read
    // Support both 'message_read' and 'mark_read' for compatibility
    socket.on('message_read', async (data) => {
      try {
        const { chatId, messageId } = data;
        await Chat.markMessageAsRead(chatId, messageId, socket.userId);
        
        // Notify sender that message was read
        socket.to(chatId).emit('message_read_receipt', {
          chatId,
          messageId,
          readBy: socket.userId
        });
        
        // Also emit in frontend format
        socket.to(chatId).emit('message_read', {
          chatId,
          messageIds: [messageId],
          readBy: socket.userId
        });
      } catch (error) {
        console.error('Error marking message as read:', error);
      }
    });
    
    socket.on('mark_read', async (data) => {
      try {
        const { chatId, messageIds, userId } = data;
        const readerId = userId || socket.userId;
        
        if (!chatId || !messageIds || !Array.isArray(messageIds)) {
          socket.emit('error', { message: 'Invalid read request' });
          return;
        }
        
        // Mark messages as read in database
        for (const messageId of messageIds) {
          await Chat.markMessageAsRead(chatId, messageId, readerId);
        }
        
        // Broadcast read receipt
        socket.to(chatId).emit('message_read', {
          chatId,
          messageIds,
          readBy: readerId
        });
      } catch (error) {
        console.error('Error marking messages as read:', error);
        socket.emit('error', { message: 'Failed to mark messages as read' });
      }
    });

    // Edit message
    socket.on('edit_message', async (data) => {
      try {
        const { chatId, messageId, newMessage } = data;
        const updatedMessage = await Chat.editMessage(
          chatId,
          messageId,
          socket.userId,
          newMessage
        );
        
        io.to(chatId).emit('message_edited', updatedMessage);
      } catch (error) {
        console.error('Error editing message:', error);
        socket.emit('error', { message: 'Failed to edit message' });
      }
    });

    // Delete message
    socket.on('delete_message', async (data) => {
      try {
        const { chatId, messageId } = data;
        await Chat.deleteMessage(chatId, messageId, socket.userId);
        
        io.to(chatId).emit('message_deleted', {
          chatId,
          messageId
        });
      } catch (error) {
        console.error('Error deleting message:', error);
        socket.emit('error', { message: 'Failed to delete message' });
      }
    });

    // Get online status
    socket.on('check_online_status', (userIds) => {
      const onlineStatus = {};
      userIds.forEach(userId => {
        onlineStatus[userId] = activeUsers.has(userId);
      });
      socket.emit('online_status', onlineStatus);
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
      activeUsers.delete(socket.userId);
      
      // Clear typing indicators
      typingUsers.forEach((typingSet, chatId) => {
        if (typingSet.has(socket.userId)) {
          typingSet.delete(socket.userId);
          io.to(chatId).emit('stop_typing', {
            userId: socket.userId,
            userType: socket.userType
          });
        }
      });

      // Notify others user is offline
      socket.broadcast.emit('user_offline', { userId: socket.userId });
    });
  });

  return io;
}

module.exports = { initializeSocket };