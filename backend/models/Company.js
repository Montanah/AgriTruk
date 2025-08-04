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
      companyContact: data.contact || '',
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
};

module.exports = Company;