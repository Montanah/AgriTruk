const Chat = require('../models/Chat');
const Notification = require('../models/Notification');
const { sendEmail } = require('../utils/sendEmail');

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
        await sendEmail(user.email, 'New Chat', notificationData.message);
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
      await sendEmail(user.email, 'New Message', notificationData.message);
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

// Helper function (implement based on your models)
async function getUserData(userId, userType) {
  switch (userType) {
    case 'broker':
      return await require('../models/Broker').get(userId);
    case 'user':
      return await require('../models/User').get(userId);
    case 'transporter':
      return await require('../models/Transporter').get(userId);
    default:
      throw new Error('Unknown user type');
  }
};