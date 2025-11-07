// chatSocket.js
const socketIO = require('socket.io');
const Chat = require('../models/Chat');
const Notification = require('../models/Notification');

const activeUsers = new Map(); // userId -> socketId
const typingUsers = new Map(); // chatId -> Set of userIds

function initializeSocket(server) {
  const io = socketIO(server, {
    cors: {
      origin: process.env.CLIENT_URL || '*',
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
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
    socket.on('join_chat', async (chatId) => {
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
      } catch (error) {
        console.error('Error joining chat:', error);
        socket.emit('error', { message: 'Failed to join chat' });
      }
    });

    // Leave a chat room
    socket.on('leave_chat', (chatId) => {
      socket.leave(chatId);
      socket.to(chatId).emit('user_left_chat', {
        userId: socket.userId,
        userType: socket.userType
      });
    });

    // Send message
    socket.on('send_message', async (data) => {
      try {
        const { chatId, message, fileUrl, fileName, fileType } = data;

        // Verify user is participant
        const chat = await Chat.getChat(chatId);
        const isParticipant = Object.entries(chat.participants).some(
          ([type, id]) => type === socket.userType && id === socket.userId
        );

        if (!isParticipant) {
          socket.emit('error', { message: 'Unauthorized' });
          return;
        }

        // Save message to database
        const messageData = await Chat.sendMessage(
          chatId,
          socket.userId,
          socket.userType,
          message,
          fileUrl,
          fileName,
          fileType
        );

        // Emit to all users in the chat
        io.to(chatId).emit('new_message', messageData);

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
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Typing indicator
    socket.on('typing', (data) => {
      const { chatId } = data;
      
      if (!typingUsers.has(chatId)) {
        typingUsers.set(chatId, new Set());
      }
      
      typingUsers.get(chatId).add(socket.userId);
      
      socket.to(chatId).emit('user_typing', {
        userId: socket.userId,
        userType: socket.userType,
        chatId
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
        }
      }, 3000);
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
      } catch (error) {
        console.error('Error marking message as read:', error);
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