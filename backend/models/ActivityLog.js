const admin = require('../config/firebase');
const db = admin.firestore();

const ActivityLog = {
  async log(uid, data) {
    const entry = {
      action: data.event || data.action,
      device: data.device || 'unknown',
      ip: data.ip || 'unknown',
      createdAt: admin.firestore.Timestamp.now(),
      ...data,
    };
    await db.collection('users').doc(uid).collection('activity_logs').add(entry);
    return entry;
  },

  async getRecent(uid, limit = 10) {
    const snapshot = await db
      .collection('users')
      .doc(uid)
      .collection('activity_logs')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => doc.data());
  },
};

module.exports = ActivityLog;
