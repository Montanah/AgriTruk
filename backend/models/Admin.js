const admin = require("../config/firebase");
const db = admin.firestore(); 

const Admin = {
  async create(adminData) {
    const newadmin = {
      adminId: adminData.adminId || db.collection('admins').doc().id,
      userId: adminData.userId,
      name: adminData.name || '',
      email: adminData.email || null,
      phone: adminData.phone || null,
      role: adminData.role || 'admin',
      permissions: adminData.permissions || [],
      avatar: adminData.avatar || null,
      status: adminData.status || 'active',
      accountStatus: adminData.accountStatus || true,
      notifications: adminData.notifications || true,
      lastLogin: adminData.lastLogin || admin.firestore.Timestamp.now(),
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
      deactivatedAt: null
    };
    await db.collection('admins').doc(newadmin.adminId).set(newadmin);
    return newadmin;
  },
  async get(adminId) {
    const doc = await db.collection('admins').doc(adminId).get();
    if (!doc.exists) return null;
    return doc.data();
  },
  async update(adminId, updates) {
    const updated = { ...updates, updatedAt: admin.firestore.Timestamp.now() };
    await db.collection('admins').doc(adminId).update(updated);
    return updated;
  },
  
  // Get admin by email
  async getByEmail(email) {
    const querySnapshot = await db.collection('admins')
      .where('email', '==', email)
      .limit(1)
      .get();
    
    if (querySnapshot.empty) {
      throw new Error('Admin not found');
    }
    
    return querySnapshot.docs[0].data();
  },

  // Get admin by userId (Firebase UID)
  async getByUserId(userId) {
    const querySnapshot = await db.collection('admins')
      .where('userId', '==', userId)
      .limit(1)
      .get();
    
    if (querySnapshot.empty) {
      throw new Error('Admin not found');
    }
    
    return querySnapshot.docs[0].data();
  },

  // Update admin
  async update(adminId, updates) {
    const updated = { 
      ...updates, 
      updatedAt: admin.firestore.Timestamp.now() 
    };
    
    await db.collection('admins').doc(adminId).update(updated);
    return updated;
  },

  // Get all admins with optional filters
  async getAll(filters = {}) {
    let query = db.collection('admins');
    
    // Apply status filter
    if (filters.status) {
      query = query.where('status', '==', filters.status);
    }
    
    // Apply ordering
    if (filters.orderBy) {
      const direction = filters.orderDirection || 'asc';
      query = query.orderBy(filters.orderBy, direction);
    } else {
      query = query.orderBy('createdAt', 'desc');
    }
    
    // Apply limit
    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  },

  // Check if admin exists by email
  async existsByEmail(email) {
    const querySnapshot = await db.collection('admins')
      .where('email', '==', email)
      .limit(1)
      .get();
    
    return !querySnapshot.empty;
  },

  // Check if admin exists by userId
  async existsByUserId(userId) {
    const querySnapshot = await db.collection('admins')
      .where('userId', '==', userId)
      .limit(1)
      .get();
    
    return !querySnapshot.empty;
  },

  // Soft delete admin
  async softDelete(adminId) {
    return await this.update(adminId, {
      status: 'inactive',
      deactivatedAt: admin.firestore.Timestamp.now()
    });
  },

  // Restore soft deleted admin
  async restore(adminId) {
    const updates = {
      status: 'active'
    };
    
    // Remove deactivatedAt field
    await db.collection('admins').doc(adminId).update({
      ...updates,
      updatedAt: admin.firestore.Timestamp.now(),
      deactivatedAt: admin.firestore.FieldValue.delete()
    });
    
    return updates;
  },

  // Hard delete admin (permanent)
  async hardDelete(adminId) {
    await db.collection('admins').doc(adminId).delete();
    return { deleted: true };
  },

  // Count admins by status
  async countByStatus(status = null) {
    let query = db.collection('admins');
    
    if (status) {
      query = query.where('status', '==', status);
    }
    
    const snapshot = await query.get();
    return snapshot.size;
  },

  // Get admins by permission
  async getByPermission(permission) {
    const snapshot = await db.collection('admins')
      .where('permissions', 'array-contains', permission)
      .where('status', '==', 'active')
      .get();
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  },

  // Update last login
  async updateLastLogin(adminId) {
    return await this.update(adminId, {
      lastLogin: admin.firestore.Timestamp.now()
    });
  },

  // Get admin statistics
  async getStats() {
    const [total, active, inactive, suspended] = await Promise.all([
      this.countByStatus(),
      this.countByStatus('active'),
      this.countByStatus('inactive'),
      this.countByStatus('suspended')
    ]);
    
    return {
      total,
      active,
      inactive,
      suspended,
      activationRate: total > 0 ? ((active / total) * 100).toFixed(2) : 0
    };
  },

  // Search admins
  async search(searchTerm, filters = {}) {
    // Note: Firestore doesn't support full-text search natively
    // This is a basic implementation. For better search, consider using Algolia or Elasticsearch
    
    let query = db.collection('admins');
    
    // Apply status filter if provided
    if (filters.status) {
      query = query.where('status', '==', filters.status);
    }
    
    const snapshot = await query.get();
    const searchTermLower = searchTerm.toLowerCase();
    
    const results = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(admin => {
        return (
          admin.name?.toLowerCase().includes(searchTermLower) ||
          admin.email?.toLowerCase().includes(searchTermLower) ||
          admin.phone?.includes(searchTerm)
        );
      });
    
    return results;
  },

  // Batch update admins
  async batchUpdate(updates) {
    const batch = db.batch();
    const timestamp = admin.firestore.Timestamp.now();
    
    updates.forEach(({ adminId, data }) => {
      const adminRef = db.collection('admins').doc(adminId);
      batch.update(adminRef, {
        ...data,
        updatedAt: timestamp
      });
    });
    
    await batch.commit();
    return { success: true, updatedCount: updates.length };
  },

  // Get recently active admins
  async getRecentlyActive(days = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const snapshot = await db.collection('admins')
      .where('lastLogin', '>=', admin.firestore.Timestamp.fromDate(cutoffDate))
      .where('status', '==', 'active')
      .orderBy('lastLogin', 'desc')
      .get();
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  },

  // Validate admin permissions
  hasPermission(adminData, requiredPermission) {
    const permissions = adminData.permissions || [];
    return permissions.includes('super_admin') || permissions.includes(requiredPermission);
  },

  // Validate multiple permissions (admin needs at least one)
  hasAnyPermission(adminData, requiredPermissions = []) {
    const permissions = adminData.permissions || [];
    
    if (permissions.includes('super_admin')) {
      return true;
    }
    
    return requiredPermissions.some(permission => permissions.includes(permission));
  },

  // Validate all permissions (admin needs all)
  hasAllPermissions(adminData, requiredPermissions = []) {
    const permissions = adminData.permissions || [];
    
    if (permissions.includes('super_admin')) {
      return true;
    }
    
    return requiredPermissions.every(permission => permissions.includes(permission));
  },
  
  getNotified(adminId, value) {
    return db.collection('admins').doc(adminId).update({ notifications: value });
  },
};

module.exports = Admin;