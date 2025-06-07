const admin = require("../config/firebase");
const db = admin.firestore(); 

// NOTIFICATIONS Model
const Notification = {
  async create(notificationData) {
    const notification = {
      notificationId: notificationData.notificationId || db.collection('notifications').doc().id,
      userId: notificationData.userId,
      type: notificationData.type || '',
      message: notificationData.message || '',
      read: notificationData.read || false,
      createdAt: admin.firestore.Timestamp.now()
    };
    await db.collection('notifications').doc(notification.notificationId).set(notification);
    return notification;
  },
  async get(notificationId) {
    const doc = await db.collection('notifications').doc(notificationId).get();
    if (!doc.exists) throw new Error('Notification not found');
    return doc.data();
  },
  async update(notificationId, updates) {
    const updated = { ...updates, updatedAt: admin.firestore.Timestamp.now() };
    await db.collection('notifications').doc(notificationId).update(updated);
    return updated;
  }
};

module.exports = Notification;