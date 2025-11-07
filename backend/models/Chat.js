// models/Chat.js
const admin = require("../config/firebase");
const db = admin.firestore();

const Chat = {
  async createChat(participant1Id, participant1Type, participant2Id, participant2Type, jobId = null) {
    const participants = [
      { id: participant1Id, type: participant1Type },
      { id: participant2Id, type: participant2Type }
    ].sort((a, b) => `${a.type}_${a.id}`.localeCompare(`${b.type}_${b.id}`));

    const chatId = `${participants[0].id}_${participants[0].type}_${participants[1].id}_${participants[1].type}${jobId ? `_job_${jobId}` : ''}`.replace(/[^a-zA-Z0-9_]/g, '_');
    
    const chatData = {
      participants: {
        [participant1Type]: participant1Id,
        [participant2Type]: participant2Id,
      },
      jobId: jobId || null,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
      mutedBy: [], // Users who muted this chat
      blockedBy: [], // Users who blocked this chat
    };
    
    await db.collection('chats').doc(chatId).set(chatData);
    return { id: chatId, ...chatData };
  },

  async findExistingChat(participant1Id, participant1Type, participant2Id, participant2Type, jobId = null) {
    try {
      const participants = [
        { id: participant1Id, type: participant1Type },
        { id: participant2Id, type: participant2Type }
      ].sort((a, b) => `${a.type}_${a.id}`.localeCompare(`${b.type}_${b.id}`));

      const chatId = `${participants[0].id}_${participants[0].type}_${participants[1].id}_${participants[1].type}${jobId ? `_job_${jobId}` : ''}`.replace(/[^a-zA-Z0-9_]/g, '_');
      
      const doc = await db.collection('chats').doc(chatId).get();
      
      if (doc.exists) {
        return { id: doc.id, ...doc.data() };
      }
      
      return null;
    } catch (error) {
      console.error('Error finding existing chat:', error);
      return null;
    }
  },

  async sendMessage(chatId, senderId, senderType, message, fileUrl = null, fileName = null, fileType = null) {
    const messageRef = db.collection('chats').doc(chatId).collection('messages').doc();
    const messageData = {
      messageId: messageRef.id,
      senderId,
      senderType,
      message: message || '',
      fileUrl: fileUrl || null,
      fileName: fileName || null,
      fileType: fileType || null, // 'image', 'document', 'video', etc.
      timestamp: admin.firestore.Timestamp.now(),
      readBy: [senderId],
      edited: false,
      editedAt: null,
      deleted: false,
      deletedAt: null,
    };
    
    await messageRef.set(messageData);
    await db.collection('chats').doc(chatId).update({ 
      updatedAt: admin.firestore.Timestamp.now() 
    });
    
    return messageData;
  },

  async editMessage(chatId, messageId, userId, newMessage) {
    const messageRef = db.collection('chats').doc(chatId).collection('messages').doc(messageId);
    
    return await db.runTransaction(async (transaction) => {
      const messageDoc = await transaction.get(messageRef);
      
      if (!messageDoc.exists) {
        throw new Error('Message not found');
      }
      
      const messageData = messageDoc.data();
      
      // Only sender can edit their message
      if (messageData.senderId !== userId) {
        throw new Error('Unauthorized to edit this message');
      }
      
      // Can't edit deleted messages
      if (messageData.deleted) {
        throw new Error('Cannot edit deleted message');
      }
      
      // Can't edit messages with files (optional restriction)
      if (messageData.fileUrl) {
        throw new Error('Cannot edit messages with files');
      }
      
      const updates = {
        message: newMessage,
        edited: true,
        editedAt: admin.firestore.Timestamp.now(),
      };
      
      transaction.update(messageRef, updates);
      
      return { messageId, ...messageData, ...updates };
    });
  },

  async deleteMessage(chatId, messageId, userId) {
    const messageRef = db.collection('chats').doc(chatId).collection('messages').doc(messageId);
    
    return await db.runTransaction(async (transaction) => {
      const messageDoc = await transaction.get(messageRef);
      
      if (!messageDoc.exists) {
        throw new Error('Message not found');
      }
      
      const messageData = messageDoc.data();
      
      // Only sender can delete their message
      if (messageData.senderId !== userId) {
        throw new Error('Unauthorized to delete this message');
      }
      
      // Soft delete - keep record but mark as deleted
      transaction.update(messageRef, {
        deleted: true,
        deletedAt: admin.firestore.Timestamp.now(),
        message: '', // Clear message content
        fileUrl: null, // Remove file reference
      });
      
      return { success: true };
    });
  },

  async getChat(chatId, limit = 50, lastMessageTimestamp = null) {
    const doc = await db.collection('chats').doc(chatId).get();
    if (!doc.exists) throw new Error('Chat not found');
    
    let messagesQuery = db
      .collection('chats')
      .doc(chatId)
      .collection('messages')
      .orderBy('timestamp', 'desc')
      .limit(limit);
    
    // Pagination: if lastMessageTimestamp provided, get messages before it
    if (lastMessageTimestamp) {
      messagesQuery = messagesQuery.startAfter(lastMessageTimestamp);
    }
    
    const messagesSnapshot = await messagesQuery.get();
    
    const messages = messagesSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(msg => !msg.deleted) // Filter out deleted messages
      .reverse(); // Reverse to show oldest first
    
    return { 
      id: doc.id, 
      ...doc.data(), 
      messages,
      hasMore: messagesSnapshot.docs.length === limit 
    };
  },

  async loadMoreMessages(chatId, lastMessageTimestamp, limit = 50) {
    const messagesQuery = db
      .collection('chats')
      .doc(chatId)
      .collection('messages')
      .orderBy('timestamp', 'desc')
      .startAfter(lastMessageTimestamp)
      .limit(limit);
    
    const messagesSnapshot = await messagesQuery.get();
    
    const messages = messagesSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(msg => !msg.deleted)
      .reverse();
    
    return {
      messages,
      hasMore: messagesSnapshot.docs.length === limit
    };
  },

  async searchMessages(chatId, searchQuery, limit = 20) {
    const messagesSnapshot = await db
      .collection('chats')
      .doc(chatId)
      .collection('messages')
      .orderBy('timestamp', 'desc')
      .limit(100) // Search in last 100 messages
      .get();
    
    const messages = messagesSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(msg => 
        !msg.deleted && 
        msg.message && 
        msg.message.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .slice(0, limit);
    
    return messages;
  },

  async getChatsByParticipant(participantId, participantType, includeBlocked = false) {
    const snapshot = await db
      .collection('chats')
      .where(`participants.${participantType}`, '==', participantId)
      .orderBy('updatedAt', 'desc')
      .get();
    
    const chats = [];
    for (const doc of snapshot.docs) {
      const chatData = doc.data();
      
      // Skip blocked chats unless explicitly requested
      if (!includeBlocked && chatData.blockedBy && chatData.blockedBy.includes(participantId)) {
        continue;
      }
      
      const messagesSnapshot = await db
        .collection('chats')
        .doc(doc.id)
        .collection('messages')
        .where('deleted', '==', false)
        .orderBy('timestamp', 'desc')
        .limit(1)
        .get();
      
      const lastMessage = messagesSnapshot.docs[0] ? { 
        id: messagesSnapshot.docs[0].id, 
        ...messagesSnapshot.docs[0].data() 
      } : null;
      
      const isMuted = chatData.mutedBy && chatData.mutedBy.includes(participantId);
      const isBlocked = chatData.blockedBy && chatData.blockedBy.includes(participantId);
      
      chats.push({ 
        id: doc.id, 
        ...chatData, 
        lastMessage,
        isMuted,
        isBlocked
      });
    }
    
    return chats;
  },

  async getChatByJob(jobId, participantId, participantType) {
    const snapshot = await db
      .collection('chats')
      .where('jobId', '==', jobId)
      .where(`participants.${participantType}`, '==', participantId)
      .limit(1)
      .get();
    
    if (snapshot.empty) return null;
    
    const doc = snapshot.docs[0];
    const messagesSnapshot = await db
      .collection('chats')
      .doc(doc.id)
      .collection('messages')
      .where('deleted', '==', false)
      .orderBy('timestamp', 'asc')
      .limit(50)
      .get();
    
    const messages = messagesSnapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    }));
    
    return { id: doc.id, ...doc.data(), messages };
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

  async markAllMessagesAsRead(chatId, readerId) {
    const messagesSnapshot = await db
      .collection('chats')
      .doc(chatId)
      .collection('messages')
      .where('deleted', '==', false)
      .get();
    
    const batch = db.batch();
    
    messagesSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const readBy = new Set(data.readBy || []);
      
      if (!readBy.has(readerId)) {
        readBy.add(readerId);
        batch.update(doc.ref, { readBy: Array.from(readBy) });
      }
    });
    
    await batch.commit();
    return { success: true };
  },

  async getUnreadCount(chatId, userId) {
    const messagesSnapshot = await db
      .collection('chats')
      .doc(chatId)
      .collection('messages')
      .where('senderId', '!=', userId)
      .where('deleted', '==', false)
      .get();
    
    let unreadCount = 0;
    messagesSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const readBy = data.readBy || [];
      if (!readBy.includes(userId)) {
        unreadCount++;
      }
    });
    
    return unreadCount;
  },

  async muteChat(chatId, userId) {
    const chatRef = db.collection('chats').doc(chatId);
    
    return await db.runTransaction(async (transaction) => {
      const chatDoc = await transaction.get(chatRef);
      
      if (!chatDoc.exists) {
        throw new Error('Chat not found');
      }
      
      const chatData = chatDoc.data();
      const mutedBy = new Set(chatData.mutedBy || []);
      mutedBy.add(userId);
      
      transaction.update(chatRef, { mutedBy: Array.from(mutedBy) });
      
      return { success: true, muted: true };
    });
  },

  async unmuteChat(chatId, userId) {
    const chatRef = db.collection('chats').doc(chatId);
    
    return await db.runTransaction(async (transaction) => {
      const chatDoc = await transaction.get(chatRef);
      
      if (!chatDoc.exists) {
        throw new Error('Chat not found');
      }
      
      const chatData = chatDoc.data();
      const mutedBy = new Set(chatData.mutedBy || []);
      mutedBy.delete(userId);
      
      transaction.update(chatRef, { mutedBy: Array.from(mutedBy) });
      
      return { success: true, muted: false };
    });
  },

  async blockChat(chatId, userId) {
    const chatRef = db.collection('chats').doc(chatId);
    
    return await db.runTransaction(async (transaction) => {
      const chatDoc = await transaction.get(chatRef);
      
      if (!chatDoc.exists) {
        throw new Error('Chat not found');
      }
      
      const chatData = chatDoc.data();
      const blockedBy = new Set(chatData.blockedBy || []);
      blockedBy.add(userId);
      
      transaction.update(chatRef, { blockedBy: Array.from(blockedBy) });
      
      return { success: true, blocked: true };
    });
  },

  async unblockChat(chatId, userId) {
    const chatRef = db.collection('chats').doc(chatId);
    
    return await db.runTransaction(async (transaction) => {
      const chatDoc = await transaction.get(chatRef);
      
      if (!chatDoc.exists) {
        throw new Error('Chat not found');
      }
      
      const chatData = chatDoc.data();
      const blockedBy = new Set(chatData.blockedBy || []);
      blockedBy.delete(userId);
      
      transaction.update(chatRef, { blockedBy: Array.from(blockedBy) });
      
      return { success: true, blocked: false };
    });
  },

  async deleteChat(chatId) {
    // Delete all messages in the chat
    const messagesSnapshot = await db
      .collection('chats')
      .doc(chatId)
      .collection('messages')
      .get();
    
    const batch = db.batch();
    messagesSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Delete the chat document
    batch.delete(db.collection('chats').doc(chatId));
    
    await batch.commit();
    return { success: true };
  },
};

module.exports = Chat;