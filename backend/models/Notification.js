const admin = require("../config/firebase");
const db = admin.firestore();

const Notification = {
  async create(notificationData) {
    const notification = {
      notificationId: notificationData.notificationId || db.collection('notifications').doc().id,
      userId: notificationData.userId,
      userType: notificationData.userType || 'user', // 'broker', 'user', 'transporter'
      type: notificationData.type || '', // e.g., 'new_request', 'request_consolidated'
      message: notificationData.message || '',
      read: notificationData.read || false,
      createdAt: admin.firestore.Timestamp.now(),
    };
    await db.collection('notifications').doc(notification.notificationId).set(notification);
    return notification;
  },

  async get(notificationId) {
    const doc = await db.collection('notifications').doc(notificationId).get();
    if (!doc.exists) throw new Error('Notification not found');
    return { id: doc.id, ...doc.data() };
  },

  async update(notificationId, updates) {
    const updated = { ...updates, updatedAt: admin.firestore.Timestamp.now() };
    await db.collection('notifications').doc(notificationId).update(updated);
    return updated;
  },

  async getByUser(userId, userType) {
    const snapshot = await db
      .collection('notifications')
      .where('userId', '==', userId)
      .where('userType', '==', userType)
      .orderBy('createdAt', 'desc')
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async markAsRead(notificationId) {
    const updated = { read: true, updatedAt: admin.firestore.Timestamp.now() };
    await db.collection('notifications').doc(notificationId).update(updated);
    return updated;
  },
};

module.exports = Notification;