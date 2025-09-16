const admin = require('../config/firebase');
const { getAll } = require('./Subscribers');
const db = admin.firestore();

const Client = {
  async create(clientData) {
    const clientRef = await db.collection('clients').add({
      brokerId: clientData.brokerId,
      email: clientData.email,
      name: clientData.name,
      type: clientData.type, // 'business' or 'individual'
      region: clientData.region,
      status: clientData.status || 'active',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    });
    const token = await admin.auth().createCustomToken(clientRef.id);
    return { id: clientRef.id, signInLink: `https://yourapp.com/signin?token=${token}`, ...clientData };
  },

  async get(clientId) {
    const doc = await db.collection('clients').doc(clientId).get();
    if (!doc.exists) throw new Error('Client not found');
    return { id: doc.id, ...doc.data() };
  },

  async getClients(brokerId) {
    const snapshot = await db
      .collection('clients')
      .where('brokerId', '==', brokerId)
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async softDelete(clientId) {
    return await this.update(clientId, {
      status: 'inactive',
      deactivatedAt: admin.firestore.Timestamp.now(),
    });
  },

  async update(clientId, updates) {
    const updated = { ...updates, updatedAt: admin.firestore.Timestamp.now() };
    await db.collection('clients').doc(clientId).update(updated);
    return updated;
  },

  async restore(clientId) {
    const updates = {
      status: 'active',
    };
    await db.collection('clients').doc(clientId).update({
      ...updates,
      updatedAt: admin.firestore.Timestamp.now(),
      deactivatedAt: admin.firestore.FieldValue.delete(),
    });
    return updates;
  },

  async hardDelete(clientId) {
    await db.collection('clients').doc(clientId).delete();
    return { deleted: true };
  },

  async countByStatus(status = null) {
    let query = db.collection('clients');
    if (status) query = query.where('status', '==', status);
    const snapshot = await query.get();
    return snapshot.size;
  },

  async getByEmail(email) {
    const querySnapshot = await db.collection('clients')
      .where('email', '==', email)
      .limit(1)
      .get();
    return querySnapshot.empty ? null : querySnapshot.docs[0].data();
  },

  async getAll() {
    const snapshot = await db.collection('clients').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
};

module.exports = Client;