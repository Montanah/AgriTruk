// Description: User model for managing user data in Firestore
const admin = require("../config/firebase");
const db = admin.firestore(); 

const USERS_COLLECTION = 'users';

// USERS Model
const User = {
  async create(userData) {
    const user = {
      uid: userData.uid,
      name: userData.name || '',
      email: userData.email || null,
      phone: userData.phone || null,
      role: userData.role || 'user',
      userType: userData.userType || 'individual',
      languagePreference: userData.languagePreference || 'en',
      location: userData.location || null,
      profilePhotoUrl: userData.profilePhotoUrl || null,
      status: userData.status || 'active',
      verificationCode: userData.verificationCode || null,
      verificationExpires: userData.verificationExpires || null,
      fcmToken: userData.fcmToken || null,
      loginVerification: userData.loginVerification || false,
      isVerified: userData.isVerified || false,
      emailVerified: userData.isVerified || false,
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
  }
};

module.exports = User;