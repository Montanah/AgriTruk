// controllers/chatController.js
const Chat = require('../models/Chat');
const Notification = require('../models/Notification');
const sendEmail = require('../utils/sendEmail');
const { uploadFile, deleteFile } = require('../utils/upload');
const { sendChatNotificationMail } = require('../utils/sendMailTemplate');
const e = require('express');

exports.createChat = async (req, res) => {
  try {
    const { participant2Id, participant2Type, jobId } = req.body;
    const participant1Id = req.user.uid;
    const participant1Type = req.user.role || 'user';

    if (!participant2Id || !participant2Type) {
      return res.status(400).json({ 
        success: false, 
        message: 'Participant details are required' 
      });
    }

    const participant2 = await getUserData(participant2Id, participant2Type);
    if (!participant2 || !participant2.email) {
      return res.status(404).json({ 
        success: false, 
        message: 'Participant not found' 
      });
    }

    const existingChat = await Chat.findExistingChat(
      participant1Id, 
      participant1Type, 
      participant2Id, 
      participant2Type,
      jobId
    );

    if (existingChat) {
      return res.status(200).json({
        success: true,
        message: 'Chat already exists',
        data: existingChat,
      });
    }

    const chat = await Chat.createChat(
      participant1Id, 
      participant1Type, 
      participant2Id, 
      participant2Type,
      jobId
    );

    const currentUser = await getUserData(participant1Id, participant1Type);
    
    const notificationData = {
      userId: participant2Id,
      userType: participant2Type,
      type: 'new_chat',
      message: `${currentUser.name || participant1Type} started a chat with you${jobId ? ' about a job' : ''}.`,
      metadata: {
        chatId: chat.id,
        jobId: jobId || null
      }
    };
    
    await Notification.create(notificationData);
    
    if (participant2.notificationPreferences?.method === 'email' || 
        participant2.notificationPreferences?.method === 'both') {
      
      const emailData = sendChatNotificationMail({
          type: 'chatRequest',
          senderName: currentUser.name || currentUser.firstName || participant1Type,
          senderType: participant1Type,
          receiverName: participant2.name,
          message: notificationData.message,
          chatUrl: `${process.env.FRONTEND_URL}/chats/${chat.id}`
      });

      await sendEmail({
        to: participant2.email,
        subject: emailData.subject || 'New Chat Request',
        html: emailData.html
        // text: notificationData.message,
        // html: `<p>${notificationData.message}</p>`
      });
    }

    res.status(201).json({
      success: true,
      message: 'Chat created successfully',
      data: chat,
    });
  } catch (error) {
    console.error('Error creating chat:', error);
    res.status(500).json({
      success: false,
      message: `Error creating chat: ${error.message}`,
    });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { chatId, message } = req.body;
    const senderId = req.user.uid;
    const senderType = req.user.role || 'user';
    const file = req.file; // Uploaded file from multer

    if (!chatId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Chat ID is required' 
      });
    }

    if (!message && !file) {
      return res.status(400).json({ 
        success: false, 
        message: 'Message or file is required' 
      });
    }

    // Verify user is a participant
    const chat = await Chat.getChat(chatId);
    const isParticipant = Object.entries(chat.participants).some(
      ([type, id]) => type === senderType && id === senderId
    );

    if (!isParticipant) {
      return res.status(403).json({ 
        success: false, 
        message: 'You are not a participant in this chat' 
      });
    }

    // Check if chat is blocked
    if (chat.blockedBy && chat.blockedBy.includes(senderId)) {
      return res.status(403).json({ 
        success: false, 
        message: 'You have blocked this chat' 
      });
    }

    let fileUrl = null;
    let fileName = null;
    let fileType = null;

    // Upload file if present
    if (file) {
      const uploadResult = await uploadFile(file, `chats/${chatId}`);
      fileUrl = uploadResult.url;
      fileName = file.originalname;
      fileType = file.mimetype.split('/')[0]; // 'image', 'video', 'application', etc.
    }

    const messageData = await Chat.sendMessage(
      chatId, 
      senderId, 
      senderType, 
      message || '', 
      fileUrl, 
      fileName, 
      fileType
    );

    // Emit Socket.IO event for real-time updates
    // const io = req.app.get('io');
    // if (io) {
    //   const formattedMessage = {
    //     id: messageData.messageId,
    //     chatId,
    //     senderId,
    //     senderName: senderId, 
    //     senderRole: senderType,
    //     message: message || '',
    //     timestamp: messageData.timestamp?.toDate?.() ? messageData.timestamp.toDate().toISOString() : new Date().toISOString(),
    //     type: fileType || 'text',
    //     read: false,
    //     fileUrl,
    //     fileName,
    //   };
      
    //   // Emit to all users in the chat room
    //   io.to(chatId).emit('new_message', messageData);
    //   io.to(chatId).emit('message', formattedMessage);
    // }

    // Find the other participant
    const otherParticipant = Object.entries(chat.participants).find(
      ([type, id]) => !(type === senderType && id === senderId)
    );

    if (otherParticipant) {
      const [otherType, otherId] = otherParticipant;
      const otherUser = await getUserData(otherId, otherType);
      const sender = await getUserData(senderId, senderType);

      // Check if chat is muted by other user
      const isMuted = chat.mutedBy && chat.mutedBy.includes(otherId);

      if (!isMuted) {
        const notificationData = {
          userId: otherId,
          userType: otherType,
          type: 'new_message',
          message: `New message from ${sender.name || senderType}`,
          metadata: {
            chatId: chatId,
            messageId: messageData.messageId,
            preview: message ? message.substring(0, 50) : 'Sent a file'
          }
        };

        await Notification.create(notificationData);

        if (otherUser.notificationPreferences?.method === 'email' || 
            otherUser.notificationPreferences?.method === 'both') {
          
          const emailData = sendChatNotificationMail({
            type: 'message',
            senderName: sender.name,
            senderType,
            receiverName: otherUser.name,
            message,
            chatUrl: `${process.env.FRONTEND_URL}/chats/${chatId}`
          });
          await sendEmail({
            to: otherUser.email,
            subject: emailData.subject || 'New Message',
            // text: `${sender.name || senderType} sent you a message`,
            html: emailData.html // `<p><strong>${sender.name || senderType}</strong> sent you a message${message ? ': ' + message : ''}</p>`
          });
        }
      }
    }

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: messageData,
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      message: `Error sending message: ${error.message}`,
    });
  }
};

exports.getChat = async (req, res) => {
  try {
    const chatId = req.params.chatId;
    const userId = req.user.uid;
    const userType = req.user.role || 'user';
    const limit = parseInt(req.query.limit) || 50;
    const lastMessageTimestamp = req.query.lastMessageTimestamp 
      ? admin.firestore.Timestamp.fromMillis(parseInt(req.query.lastMessageTimestamp))
      : null;

    if (!chatId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Chat ID is required' 
      });
    }

    const chat = await Chat.getChat(chatId, limit, lastMessageTimestamp);

    // Verify user is a participant
    const isParticipant = Object.entries(chat.participants).some(
      ([type, id]) => type === userType && id === userId
    );

    if (!isParticipant) {
      return res.status(403).json({ 
        success: false, 
        message: 'You are not authorized to view this chat' 
      });
    }

    res.status(200).json({
      success: true,
      message: 'Chat retrieved successfully',
      data: chat,
    });
  } catch (error) {
    console.error('Error retrieving chat:', error);
    res.status(500).json({
      success: false,
      message: `Error retrieving chat: ${error.message}`,
    });
  }
};

exports.loadMoreMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.uid;
    const userType = req.user.role || 'user';
    const limit = parseInt(req.query.limit) || 50;
    const lastMessageTimestamp = admin.firestore.Timestamp.fromMillis(
      parseInt(req.query.lastMessageTimestamp)
    );

    const chat = await Chat.getChat(chatId);
    
    // Verify user is a participant
    const isParticipant = Object.entries(chat.participants).some(
      ([type, id]) => type === userType && id === userId
    );

    if (!isParticipant) {
      return res.status(403).json({ 
        success: false, 
        message: 'Unauthorized' 
      });
    }

    const result = await Chat.loadMoreMessages(chatId, lastMessageTimestamp, limit);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error loading more messages:', error);
    res.status(500).json({
      success: false,
      message: `Error loading messages: ${error.message}`,
    });
  }
};

exports.searchMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { query } = req.query;
    const userId = req.user.uid;
    const userType = req.user.role || 'user';

    if (!query || query.trim().length < 2) {
      return res.status(400).json({ 
        success: false, 
        message: 'Search query must be at least 2 characters' 
      });
    }

    const chat = await Chat.getChat(chatId);
    
    // Verify user is a participant
    const isParticipant = Object.entries(chat.participants).some(
      ([type, id]) => type === userType && id === userId
    );

    if (!isParticipant) {
      return res.status(403).json({ 
        success: false, 
        message: 'Unauthorized' 
      });
    }

    const messages = await Chat.searchMessages(chatId, query.trim());

    res.status(200).json({
      success: true,
      data: messages,
    });
  } catch (error) {
    console.error('Error searching messages:', error);
    res.status(500).json({
      success: false,
      message: `Error searching messages: ${error.message}`,
    });
  }
};

exports.editMessage = async (req, res) => {
  try {
    const { chatId, messageId, message } = req.body;
    const userId = req.user.uid;

    if (!chatId || !messageId || !message || !message.trim()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Chat ID, message ID, and new message are required' 
      });
    }

    const updatedMessage = await Chat.editMessage(chatId, messageId, userId, message.trim());

    res.status(200).json({
      success: true,
      message: 'Message edited successfully',
      data: updatedMessage,
    });
  } catch (error) {
    console.error('Error editing message:', error);
    res.status(500).json({
      success: false,
      message: `Error editing message: ${error.message}`,
    });
  }
};

exports.deleteMessage = async (req, res) => {
  try {
    const { chatId, messageId } = req.params;
    const userId = req.user.uid;

    await Chat.deleteMessage(chatId, messageId, userId);

    res.status(200).json({
      success: true,
      message: 'Message deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({
      success: false,
      message: `Error deleting message: ${error.message}`,
    });
  }
};

exports.getChats = async (req, res) => {
  try {
    const participantId = req.user.uid;
    const participantType = req.user.role || 'user';
    
    const chats = await Chat.getChatsByParticipant(participantId, participantType);
    
    const chatsWithUnread = await Promise.all(
      chats.map(async (chat) => {
        const unreadCount = await Chat.getUnreadCount(chat.id, participantId);
        return { ...chat, unreadCount };
      })
    );

    res.status(200).json({
      success: true,
      message: 'Chats retrieved successfully',
      data: chatsWithUnread,
    });
  } catch (error) {
    console.error('Error retrieving chats:', error);
    res.status(500).json({
      success: false,
      message: `Error retrieving chats: ${error.message}`,
    });
  }
};

exports.getChatByJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const participantId = req.user.uid;
    const participantType = req.user.role || 'user';
    
    if (!jobId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Job ID is required' 
      });
    }
    
    const chat = await Chat.getChatByJob(jobId, participantId, participantType);
    
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'No chat found for this job',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Chat retrieved successfully',
      data: chat,
    });
  } catch (error) {
    console.error('Error retrieving chat by job:', error);
    res.status(500).json({
      success: false,
      message: `Error retrieving chat by job: ${error.message}`,
    });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { chatId, messageId } = req.body;
    const userId = req.user.uid;
    const userType = req.user.role || 'user';

    if (!chatId || !messageId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Chat ID and message ID are required' 
      });
    }

    const chat = await Chat.getChat(chatId);
    const isParticipant = Object.entries(chat.participants).some(
      ([type, id]) => type === userType && id === userId
    );

    if (!isParticipant) {
      return res.status(403).json({ 
        success: false, 
        message: 'Unauthorized' 
      });
    }

    await Chat.markMessageAsRead(chatId, messageId, userId);

    res.status(200).json({
      success: true,
      message: 'Message marked as read',
    });
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({
      success: false,
      message: `Error marking message as read: ${error.message}`,
    });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.uid;
    const userType = req.user.role || 'user';

    if (!chatId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Chat ID is required' 
      });
    }

    const chat = await Chat.getChat(chatId);
    const isParticipant = Object.entries(chat.participants).some(
      ([type, id]) => type === userType && id === userId
    );

    if (!isParticipant) {
      return res.status(403).json({ 
        success: false, 
        message: 'Unauthorized' 
      });
    }

    await Chat.markAllMessagesAsRead(chatId, userId);

    res.status(200).json({
      success: true,
      message: 'All messages marked as read',
    });
  } catch (error) {
    console.error('Error marking all messages as read:', error);
    res.status(500).json({
      success: false,
      message: `Error marking messages as read: ${error.message}`,
    });
  }
};

exports.muteChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.uid;

    await Chat.muteChat(chatId, userId);

    res.status(200).json({
      success: true,
      message: 'Chat muted successfully',
    });
  } catch (error) {
    console.error('Error muting chat:', error);
    res.status(500).json({
      success: false,
      message: `Error muting chat: ${error.message}`,
    });
  }
};

exports.unmuteChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.uid;

    await Chat.unmuteChat(chatId, userId);

    res.status(200).json({
      success: true,
      message: 'Chat unmuted successfully',
    });
  } catch (error) {
    console.error('Error unmuting chat:', error);
    res.status(500).json({
      success: false,
      message: `Error unmuting chat: ${error.message}`,
    });
  }
};

exports.blockChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.uid;

    await Chat.blockChat(chatId, userId);

    res.status(200).json({
      success: true,
      message: 'Chat blocked successfully',
    });
  } catch (error) {
    console.error('Error blocking chat:', error);
    res.status(500).json({
      success: false,
      message: `Error blocking chat: ${error.message}`,
    });
  }
};

exports.unblockChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.uid;

    await Chat.unblockChat(chatId, userId);

    res.status(200).json({
      success: true,
      message: 'Chat unblocked successfully',
    });
  } catch (error) {
    console.error('Error unblocking chat:', error);
    res.status(500).json({
      success: false,
      message: `Error unblocking chat: ${error.message}`,
    });
  }
};

// Helper function
async function getUserData(userId, userType) {
  try {
    switch (userType) {
      case 'broker':
        return await require('../models/User').get(userId);
      case 'user':
      case 'Hr':
      case 'shipper':
        return await require('../models/User').get(userId);
      case 'transporter':
        return await require('../models/User').get(userId);
      case 'driver':
        return await require('../models/User').get(userId);
      default:
        console.warn(`Unknown user type: ${userType}, defaulting to user`);
        return await require('../models/User').get(userId);
    }
  } catch (error) {
    console.error(`Error fetching user data for ${userType} ${userId}:`, error);
    return {
      id: userId,
      email: 'unknown@example.com',
      name: 'Unknown User',
      notificationPreferences: { method: 'in-app' }
    };
  }
}