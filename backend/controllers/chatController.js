const Chat = require('../models/Chat');
const Notification = require('../models/Notification');
const sendEmail = require('../utils/sendEmail');

exports.createChat = async (req, res) => {
  try {
    const { participant1Id, participant1Type, participant2Id, participant2Type } = req.body;
    if (!participant1Id || !participant2Id || !participant1Type || !participant2Type) {
      return res.status(400).json({ success: false, message: 'All participant details are required' });
    }
    const chat = await Chat.createChat(participant1Id, participant1Type, participant2Id, participant2Type);

    // Notify participants
    const participants = [
      { id: participant1Id, type: participant1Type },
      { id: participant2Id, type: participant2Type },
    ];
    for (const participant of participants) {
      const user = await getUserData(participant.id, participant.type); 
      const notificationData = {
        userId: participant.id,
        userType: participant.type,
        type: 'new_chat',
        message: `New chat started with ${participant.type === participant1Type ? participant2Type : participant1Type} ${participant.id === participant1Id ? participant2Id : participant1Id}.`,
      };
      await Notification.create(notificationData);
      if (user.notificationPreferences?.method === 'email' || user.notificationPreferences?.method === 'both') {
        await sendEmail({
          to: user.email,
          subject: 'New Chat',
          text: notificationData.message,
          html: `<p>${notificationData.message}</p>`
        });
      }
    }

    res.status(201).json({
      success: true,
      message: 'Chat created successfully',
      data: chat,
    });
  } catch (error) {
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
    if (!chatId || !message) {
      return res.status(400).json({ success: false, message: 'Chat ID and message are required' });
    }
    const messageData = await Chat.sendMessage(chatId, senderId, senderType, message);

    // Notify the other participant
    const chat = await Chat.getChat(chatId);
    const otherParticipantId = chat.participants[senderType] === senderId ? chat.participants[Object.keys(chat.participants).find(key => key !== senderType)] : chat.participants[senderType];
    const otherParticipantType = Object.keys(chat.participants).find(key => key !== senderType);
    const user = await getUserData(otherParticipantId, otherParticipantType);
    const notificationData = {
      userId: otherParticipantId,
      userType: otherParticipantType,
      type: 'new_message',
      message: `New message from ${senderType} ${senderId}: ${message}`,
    };
    await Notification.create(notificationData);
    if (user.notificationPreferences?.method === 'email' || user.notificationPreferences?.method === 'both') {
      await sendEmail({
        to: user.email,
        subject: 'New Message',
        text: notificationData.message,
        html: `<p>${notificationData.message}</p>`
      });
    }

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: messageData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Error sending message: ${error.message}`,
    });
  }
};

exports.getChat = async (req, res) => {
  try {
    const chatId = req.params.chatId;
    if (!chatId) return res.status(400).json({ success: false, message: 'Chat ID is required' });
    const chat = await Chat.getChat(chatId);
    res.status(200).json({
      success: true,
      message: 'Chat retrieved successfully',
      data: chat,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Error retrieving chat: ${error.message}`,
    });
  }
};

exports.getChats = async (req, res) => {
  try {
    const participantId = req.user.uid;
    const participantType = req.user.role || 'user'; // Adjust based on your auth setup
    const chats = await Chat.getChatsByParticipant(participantId, participantType);
    res.status(200).json({
      success: true,
      message: 'Chats retrieved successfully',
      data: chats,
    });
  } catch (error) {
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
      return res.status(400).json({ success: false, message: 'Job ID is required' });
    }
    
    // Get all chats for the user
    const chats = await Chat.getChatsByParticipant(participantId, participantType);
    
    // For now, return the first chat or create a new one
    // In a real implementation, you might want to store jobId in the chat document
    if (chats.length > 0) {
      const chat = await Chat.getChat(chats[0].id);
      res.status(200).json({
        success: true,
        message: 'Chat retrieved successfully',
        data: chat,
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'No chat found for this job',
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Error retrieving chat by job: ${error.message}`,
    });
  }
};

// Helper function (implement based on your models)
async function getUserData(userId, userType) {
  try {
    switch (userType) {
      case 'broker':
        return await require('../models/Broker').get(userId);
      case 'user':
        return await require('../models/User').get(userId);
      case 'transporter':
        return await require('../models/Transporter').get(userId);
      case 'client':
        return await require('../models/User').get(userId);
      default:
        console.warn(`Unknown user type: ${userType}, defaulting to user`);
        return await require('../models/User').get(userId);
    }
  } catch (error) {
    console.error(`Error fetching user data for ${userType} ${userId}:`, error);
    // Return a default user object to prevent crashes
    return {
      id: userId,
      email: 'unknown@example.com',
      notificationPreferences: { method: 'in-app' }
    };
  }
}