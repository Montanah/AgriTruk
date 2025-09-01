const admin = require("../config/firebase");
const db = admin.firestore();

const Company = {
  async create(data) {
    const companyId = data.companyId || db.collection('companies').doc().id;
    const company = {
      companyId,
      transporterId: data.transporterId,
      companyName: data.name,
      companyRegistration: data.registration,
      companyEmail: data.email,
      companyContact: data.contact || '',
      companyAddress: data.address || '',
      companyLogo: data.logo || '',
      rating: data.rating || 0,
      status: data.status || 'pending',
      rejectionReason: data.rejectionReason || null,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),

    };
    await db.collection('companies').doc(companyId).set(company);
    return company;
  },

  async get(companyId) {
    const doc = await db.collection('companies').doc(companyId).get();
    if (!doc.exists) throw new Error('Company not found');
    return { id: doc.id, ...doc.data() };
  },

  async update(companyId, updates) {
    const updated = { ...updates, updatedAt: admin.firestore.Timestamp.now() };
    await db.collection('companies').doc(companyId).update(updated);
    return updated;
  },

  async approve(companyId) {
    const updates = {
      status: 'approved',
      updatedAt: admin.firestore.Timestamp.now(),
    };
    await db.collection('companies').doc(companyId).update(updates);
    return updates;
  },

  async reject(companyId, reason) {
    const updates = {
      status: 'rejected',
      rejectionReason: reason || 'Not specified',
      updatedAt: admin.firestore.Timestamp.now(),
    };
    await db.collection('companies').doc(companyId).update(updates);
    return updates;
  },

  async getByRegistration(reg) {
    const snapshot = await db.collection('companies').where('companyRegistration', '==', reg).limit(1).get();
    return snapshot.empty ? null : snapshot.docs[0].data();
  },

  async getByName(name) {
    const snapshot = await db.collection('companies').where('companyName', '==', name).limit(1).get();
    return snapshot.empty ? null : snapshot.docs[0].data();
  },

  async getAll() {
    const snapshot = await db.collection('companies').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async getByTransporter(transporterId) {
    const snapshot = await db.collection('companies').where('transporterId', '==', transporterId).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async getByTransporterAndStatus(transporterId, status) {
    const snapshot = await db.collection('companies').where('transporterId', '==', transporterId).where('status', '==', status).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
};

module.exports = Company;