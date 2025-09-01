const admin = require("../config/firebase");
const { approve, reject } = require("./Transporter");
const { updateAvailability } = require("./Vehicle");
const db = admin.firestore();

const Driver = {
  async create(companyId, driverData) {
    const driverId = driverData.driverId || db.collection('companies').doc(companyId).collection('drivers').doc().id;
    const driver = {
      driverId,
      name: driverData.name || null,
      email: driverData.email || null,
      phone: driverData.phone || null,
      photo: driverData.photo || null,
      idDoc: driverData.idDoc || null,
      idExpiryDate: driverData.idExpiry || null,
      idapproved: driverData.idapproved || false,
      license: driverData.license || null,
      driverLicenseExpiryDate: driverData.licenseExpiry || null,
      driverLicenseapproved: driverData.driverLicenseapproved || false,
      status: driverData.status || 'pending',
      availability: driverData.availability || false,
      rejectionReason: driverData.rejectionReason || null,
      // auth
      userId: driverData.userId || null,
      role: driverData.role || 'driver',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    };
    await db.collection('companies').doc(companyId).collection('drivers').doc(driverId).set(driver);
    return driver;
  },

  async get(companyId, driverId) {
    const doc = await db.collection('companies').doc(companyId).collection('drivers').doc(driverId).get();
    if (!doc.exists) throw new Error('Driver not found');
    return { id: doc.id, ...doc.data() };
  },

  async update(companyId, driverId, updates) {
    console.log(updates);
    const updated = { ...updates, updatedAt: admin.firestore.Timestamp.now() };
    await db.collection('companies').doc(companyId).collection('drivers').doc(driverId).update(updated);
    return updated;
  },

  async getAll(companyId) {
    const snapshot = await db.collection('companies').doc(companyId).collection('drivers').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async getByEmail(companyId, email) {
    console.log(`Searching for email ${email} in company ${companyId}`); // Debug
    const querySnapshot = await db.collection('companies')
      .doc(companyId)
      .collection('drivers')
      .where('email', '==', email)
      .limit(1)
      .get();
    console.log('Query snapshot:', querySnapshot.empty); // Debug
    return querySnapshot.empty ? null : querySnapshot.docs[0].data();
  },

  async getByPhone(companyId, phone) {
    const querySnapshot = await db.collection('companies')
      .doc(companyId)
      .collection('drivers')
      .where('phone', '==', phone)
      .limit(1)
      .get();
    return querySnapshot.empty ? null : querySnapshot.docs[0].data();
  },

  async updateAvailability(companyId,driverId, availability) {
    await db.collection('companies').doc(companyId).collection('drivers').doc(driverId).update({ availability });
  },

  async approve(companyId, driverId) {
    const updates = {
      status: 'approved',
      updatedAt: admin.firestore.Timestamp.now(),
    };
    await db.collection('companies').doc(companyId).collection('drivers').doc(driverId).update(updates);
    return updates;
  },

  async reject(companyId, driverId, reason) {
    const updates = {
      status: 'rejected',
      rejectionReason: reason || 'Not specified',
      updatedAt: admin.firestore.Timestamp.now(),
    };
    await db.collection('companies').doc(companyId).collection('drivers').doc(driverId).update(updates);
    return updates;
  },

  async updateFirebaseId(companyId, driverId, userId) {
    await db.collection('companies').doc(companyId).collection('drivers').doc(driverId).update({ userId });
  },
};

module.exports = Driver;