const admin = require("../config/firebase");
const db = admin.firestore();

const AdminActivityLog = {
  async log(adminId, data) {
    const entry = {
      action: data.action || data.event,
      device: data.device || 'unknown',
      ip: data.ip || 'unknown',
      adminId: adminId, 
      createdAt: admin.firestore.Timestamp.now(),
      ...data,
    };
    
    // Store in both admin-specific collection and global admin logs
    await Promise.all([
      db.collection("admins").doc(adminId).collection("activity_logs").add(entry),
      db.collection("admin_activity_logs").add({
        ...entry,
        target: data.target || null 
      })
    ]);
    
    return entry;
  },

  async getAdminLogs(adminId, limit = 10) {
    const snapshot = await db
      .collection("admins")
      .doc(adminId)
      .collection("activity_logs")
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async getAllAdminLogs(limit = 50) {
    const snapshot = await db
      .collection("admin_activity_logs")
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
};

module.exports = AdminActivityLog;