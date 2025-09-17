const admin = require("../config/firebase");
const db = admin.firestore();

const Chat = {
  async createChat(participant1Id, participant1Type, participant2Id, participant2Type) {
    const chatId = `${participant1Id}_${participant1Type}_${participant2Id}_${participant2Type}`.replace(/[^a-zA-Z0-9]/g, '_');
    const chatData = {
      participants: {
        [participant1Type]: participant1Id,
        [participant2Type]: participant2Id,
      },
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    };
    await db.collection('chats').doc(chatId).set(chatData);
    return { id: chatId, ...chatData };
  },

  async sendMessage(chatId, senderId, senderType, message) {
    const messageData = {
      messageId: db.collection('chats').doc(chatId).collection('messages').doc().id,
      senderId,
      senderType, // 'user', 'broker', 'transporter'
      message,
      timestamp: admin.firestore.Timestamp.now(),
      readBy: [senderId], // Track who has read the message
    };
    await db.collection('chats').doc(chatId).collection('messages').doc(messageData.messageId).set(messageData);
    await db.collection('chats').doc(chatId).update({ updatedAt: admin.firestore.Timestamp.now() });
    return messageData;
  },

  async getChat(chatId) {
    const doc = await db.collection('chats').doc(chatId).get();
    if (!doc.exists) throw new Error('Chat not found');
    const messagesSnapshot = await db.collection('chats').doc(chatId).collection('messages').orderBy('timestamp', 'asc').get();
    const messages = messagesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return { id: doc.id, ...doc.data(), messages };
  },

  async getChatsByParticipant(participantId, participantType) {
    const snapshot = await db
      .collection('chats')
      .where(`participants.${participantType}`, '==', participantId)
      .get();
    const chats = [];
    for (const doc of snapshot.docs) {
      const messagesSnapshot = await db.collection('chats').doc(doc.id).collection('messages').orderBy('timestamp', 'desc').limit(1).get();
      const lastMessage = messagesSnapshot.docs[0] ? { id: messagesSnapshot.docs[0].id, ...messagesSnapshot.docs[0].data() } : null;
      chats.push({ id: doc.id, ...doc.data(), lastMessage });
    }
    return chats;
  },

  async markMessageAsRead(chatId, messageId, readerId) {
    const messageRef = db.collection('chats').doc(chatId).collection('messages').doc(messageId);
    await db.runTransaction(async (transaction) => {
      const messageDoc = await transaction.get(messageRef);
      if (!messageDoc.exists) throw new Error('Message not found');
      const messageData = messageDoc.data();
      const readBy = new Set(messageData.readBy || []);
      if (!readBy.has(readerId)) {
        readBy.add(readerId);
        transaction.update(messageRef, { readBy: Array.from(readBy) });
      }
    });
    return { success: true };
  },
};

module.exports = Chat;