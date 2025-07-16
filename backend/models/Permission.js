const admin = require("../config/firebase");
const db = admin.firestore();

const Permission = {
  async create(permissionData) {
    const permissionId = permissionData.permissionId || db.collection('permissions').doc().id;
    const permission = {
      permissionId,
      name: permissionData.name,
      description: permissionData.description || '',
      status: permissionData.status || 'active',
      createdAt: admin.firestore.Timestamp.now()
    };
    await db.collection('permissions').doc(permissionId).set(permission);
    return permission;
  },
  async get(permissionId) {
    const doc = await db.collection('permissions').doc(permissionId).get();
    if (!doc.exists) throw new Error('Permission not found');
    return { permissionId: doc.id, ...doc.data() };
  },
  async getAll() {
    const snapshot = await db.collection('permissions').get();
    return snapshot.docs.map(doc => ({ permissionId: doc.id, ...doc.data() }));
  },
  async update(permissionId, updates) {
    const updated = { ...updates, updatedAt: admin.firestore.Timestamp.now() };
    await db.collection('permissions').doc(permissionId).update(updated);
    return this.get(permissionId);
  },
  async delete(permissionId) {
    await db.collection('permissions').doc(permissionId).update({ status: 'inactive', updatedAt: admin.firestore.Timestamp.now() });
    return { message: 'Permission marked as inactive' };
  }
};

module.exports = Permission;