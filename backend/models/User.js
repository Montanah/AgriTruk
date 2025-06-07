const admin = require("../config/firebase");
const db = admin.firestore(); 

// USERS Model
const User = {
  async create(userData) {
    const user = {
      uid: userData.uid,
      name: userData.name || '',
      email: userData.email || null,
      phone: userData.phone || null,
      userType: userData.userType || 'individual' || 'organization' || 'business',
      role: userData.role || 'user' || 'farmer'|| 'transporter' || 'admin' ,
      location: {
        county: userData.location?.county || '',
        subcounty: userData.location?.subcounty || '',
        ward: userData.location?.ward || '',
        lat: userData.location?. seizing?.lat || null,
        lng: userData.location?.lng || null
      },
      profilePhotoUrl: userData.profilePhotoUrl || null,
      status: userData.status || 'active',
      languagePreference: userData.languagePreference || 'en' || 'swahili',
      fcmToken: userData.fcmToken || null,
      lastLogin: userData.lastLogin || admin.firestore.Timestamp.now(),
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    };
    await db.collection('users').doc(userData.uid).set(user);
    return user;
  },
  async get(uid) {
    const doc = await db.collection('users').doc(uid).get();
    if (!doc.exists) throw new Error('User not found');
    return doc.data();
  },
  async update(uid, updates) {
    const updated = { ...updates, updatedAt: admin.firestore.Timestamp.now() };
    await db.collection('users').doc(uid).update(updated);
    return updated;
  }
};

module.exports = User;