const admin = require("../config/firebase");
const db = admin.firestore(); 

const Admin = {
  async create(adminData) {
    const admin = {
      adminId: adminData.adminId || db.collection('admins').doc().id,
      userId: adminData.userId,
      name: adminData.name || '',
      email: adminData.email || null,
      phone: adminData.phone || null,
      permissions: adminData.permissions || [],
      status: adminData.status || 'active',
      lastLogin: adminData.lastLogin || admin.firestore.Timestamp.now(),
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    };
    await db.collection('admins').doc(admin.adminId).set(admin);
    return admin;
  },
  async get(adminId) {
    const doc = await db.collection('admins').doc(adminId).get();
    if (!doc.exists) throw new Error('Admin not found');
    return doc.data();
  },
  async update(adminId, updates) {
    const updated = { ...updates, updatedAt: admin.firestore.Timestamp.now() };
    await db.collection('admins').doc(adminId).update(updated);
    return updated;
  }
};

module.exports = Admin;