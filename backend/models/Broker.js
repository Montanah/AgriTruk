const admin = require('../config/firebase');
const db = admin.firestore();

const Broker = {
  async create(brokerData) {
    const newBroker = {
      userId: brokerData.userId,
      brokerIdUrl: brokerData.brokerIdUrl || null,
      rejectionReason: brokerData.rejectionReason || null,
      status: brokerData.status || 'pending',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    };
    await db.collection('brokers').doc().set(newBroker);
    return newBroker;
  },

  async get(brokerId) {
    const doc = await db.collection('brokers').doc(brokerId).get();
    if (!doc.exists) throw new Error('Broker not found');
    return { id: doc.id, ...doc.data() };
  },

  async update(brokerId, updates) {
    const updated = { ...updates, updatedAt: admin.firestore.Timestamp.now() };
    await db.collection('brokers').doc(brokerId).update(updated);
    return updated;
  },

  async approve(brokerId) {
    const updates = {
      status: 'approved',
      updatedAt: admin.firestore.Timestamp.now(),
    };
    await db.collection('brokers').doc(brokerId).update(updates);
    return updates;
  },

  async reject(brokerId, reason) {
    const updates = {
      status: 'rejected',
      rejectionReason: reason || 'Not specified',
      updatedAt: admin.firestore.Timestamp.now(),
    };
    await db.collection('brokers').doc(brokerId).update(updates);
    return updates;
  },

  async delete(brokerId) {
    await db.collection('brokers').doc(brokerId).delete();
    return { message: 'Broker deleted successfully' };
  },

  async getAll() {
    const snapshot = await db.collection('brokers').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async getClients(brokerId) {
    const snapshot = await db
      .collection('clients')
      .where('brokerId', '==', brokerId)
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
  async getByUserId(userId) {
    const snapshot = await db.collection('brokers').where('userId', '==', userId.trim()).limit(1).get();
    
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
 },

};

module.exports = Broker;