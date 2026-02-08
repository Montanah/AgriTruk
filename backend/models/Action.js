const admin = require("../config/firebase");
const db = admin.firestore();

const ACTION_TYPES = {
    TRANSPORTER_REVIEW: 'transporter_review',
    COMPANY_REVIEW: 'company_review',
    BOOKING_DISPUTE: 'booking_dispute',
    PAYMENT_DISPUTE: 'payment_dispute',
    SYSTEM_ALERT: 'system_alert'
};

const ACTION_PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium', 
  HIGH: 'high',
  CRITICAL: 'critical'
};

const Action = {
  async create(data) {
    const docRef = await db.collection('actions').add({
      ...data,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return { id: docRef.id, ...data };
  },

  async getAll() {
    const snapshot = await db.collection('actions')
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async markResolved(actionId, resolvedBy) {
    await db.collection('actions').doc(actionId).update({
      status: 'resolved',
      resolvedBy,
      resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  },
  async getById(actionId) {
    const doc = await db.collection('actions').doc(actionId).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  },

  async update(actionId, updates) {
    await db.collection('actions').doc(actionId).update({
      ...updates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  },
  async getPending() {
   const snapshot = await db.collection('actions')
      .where('status', '==', 'pending')
      .get();
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
};

module.exports = Action;
