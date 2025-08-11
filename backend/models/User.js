// Description: User model for managing user data in Firestore
const admin = require("../config/firebase");
const db = admin.firestore(); 

const USERS_COLLECTION = 'users';

// USERS Model
const User = {
  async create(userData) {
    const user = {
      uid: userData.uid,
      name: userData.name,
      email: userData.email,
      phone: userData.phone,
      role: userData.role || 'shipper',
      profilePhotoUrl: userData.profilePhotoUrl || null,
      languagePreference: userData.languagePreference || 'en',
      location: userData.location || null,
      status: userData.status || 'active',
      emailVerificationCode: userData.emailVerificationCode || null,
      verificationExpires: userData.verificationExpires || null,
      phoneVerificationCode: userData.phoneVerificationCode || null,
      phoneVerificationExpires: userData.phoneVerificationExpires || null,
      loginVerification: userData.loginVerification || false,
      isVerified: userData.isVerified || false,
      emailVerified: userData.isEmailVerified || false,
      phoneVerified: userData.isPhoneVerified || false,
      //searchable fields
      name_lower: userData.name ? userData.name.toLowerCase() : null,
      email_lower: userData.email ? userData.email.toLowerCase() : null,
      phone_lower: userData.phone ? userData.phone.toLowerCase().replace(/[^\d]/g, '') : null,
      notificationPreferences: userData.notificationPreferences || { method: 'both' },
      lastActive: userData.lastActive || admin.firestore.Timestamp.now(),
      lastLogin: userData.lastLogin || admin.firestore.Timestamp.now(),
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    };
    await db.collection(USERS_COLLECTION).doc(userData.uid).set(user);
    return user;
  },
  /**
   * Fetch a user document by UID
   */
  async get(uid) {
    const doc = await db.collection(USERS_COLLECTION).doc(uid).get();
    if (!doc.exists) throw new Error('User not found');
    return doc.data();
  },
  /**
   * Update a user document by UID
   */
  async update(uid, updates) {
     if (updates.name) updates.name_lower = updates.name.toLowerCase();
    if (updates.email) updates.email_lower = updates.email.toLowerCase();
    if (updates.phone) updates.phone_clean = updates.phone.replace(/[^\d]/g, '');
    const updated = { ...updates, updatedAt: admin.firestore.Timestamp.now() };
    await db.collection(USERS_COLLECTION).doc(uid).update(updated);
    return updated;
  },

  /**
   * Delete a user document by UID
   */
  async delete(uid) {
    await db.collection(USERS_COLLECTION).doc(uid).delete();
    return true;
  },
  async getPermissions(uid) {
    const user = await this.get(uid);
    const permissionIds = user.permissionIds || [];
    const permissionsSnapshot = await db.collection('permissions')
      .where('permissionId', 'in', permissionIds)
      .get();
    return permissionsSnapshot.docs.map(doc => ({ permissionId: doc.id, ...doc.data() }));
  },
  async search(query, limit = 20) {
    if (!query || query.trim() === '') {
      throw new Error('Search query cannot be empty');
    }

    const searchTerm = query.toLowerCase().trim();
    const phoneSearch = query.replace(/[^\d]/g, '');
    const usersRef = db.collection(USERS_COLLECTION);
    
    // Create queries for each searchable field
    const queries = [
      // Name search (partial match)
      usersRef.where('name_lower', '>=', searchTerm)
              .where('name_lower', '<=', searchTerm + '\uf8ff'),
      
      // Email search (partial match)
      usersRef.where('email_lower', '>=', searchTerm)
              .where('email_lower', '<=', searchTerm + '\uf8ff'),
      
      // Phone search (starts with)
      usersRef.where('phone_clean', '>=', phoneSearch)
              .where('phone_clean', '<=', phoneSearch + '\uf8ff')
    ];

    // Execute all queries in parallel
    const snapshots = await Promise.all(
      queries.map(q => q.limit(limit).get())
    );

    // Combine and deduplicate results
    const results = new Map();
    
    snapshots.forEach(snapshot => {
      snapshot.docs.forEach(doc => {
        results.set(doc.id, { id: doc.id, ...doc.data() });
      });
    });

    return Array.from(results.values()).slice(0, limit);
  },

  async getAllUsers() {
    const snapshot = await db.collection(USERS_COLLECTION).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
  
  async getUserByEmail(email) {
    const snapshot = await db.collection(USERS_COLLECTION).where('email', '==', email).get();
    return snapshot.empty ? null : snapshot.docs[0].data();
  },

  async getUserByPhone(phone) {
    const snapshot = await db.collection(USERS_COLLECTION).where('phone', '==', phone).get();
    return snapshot.empty ? null : snapshot.docs[0].data();
  },
};

module.exports = User;