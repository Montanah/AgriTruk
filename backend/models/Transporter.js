const admin = require("../config/firebase");
const db = admin.firestore(); 

// TRANSPORTERS Model
const Transporter = {
  async create(transporterData) {
    const transporter = {
      transporterId: transporterData.transporterId || db.collection('transporters').doc().id,
      // transporterId: transporterData.transporterId,
      driverName: transporterData.driverName || null,
      phoneNumber: transporterData.phoneNumber || null,
      driverProfileImage: transporterData.driverProfileImage || null,
      driverIdUrl: transporterData.driverIdUrl,
      email: transporterData.email || null,
      driverLicense: transporterData.driverLicense || null,
      vehicleType: transporterData.vehicleType || null,
      vehicleRegistration: transporterData.vehicleRegistration || null,
      vehicleMake: transporterData.vehicleMake || null,
      vehicleModel: transporterData.vehicleModel || null,
      vehicleCapacity: transporterData.vehicleCapacity || null,
      vehicleImagesUrl: transporterData.vehicleImagesUrl || [],
      humidityControl: transporterData.vehicleFeatures || false,
      refrigerated: transporterData.refrigerated || false,
      logbookUrl: transporterData.logbookUrl || null,
      insuranceUrl: transporterData.insuranceUrl || null,
      acceptingBooking: transporterData.acceptingBooking || false,
      status: transporterData.status || 'pending',
      totalTrips: transporterData.totalTrips || 0,
      rating: transporterData.rating || 0,
      rejectionReason: transporterData.rejectionReason || null,
      businessType: transporterData.businessType || 'individual', // Default to 'individual'
      currentRoute: transporterData.currentRoute || [], // Array of { location, timestamp }
      lastKnownLocation: transporterData.lastKnownLocation || null,
      notificationPreferences: transporterData.notificationPreferences || { method: 'both' },
      // Timestamps
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    };
    await db.collection('transporters').doc(transporterData.transporterId).set(transporter);
    return transporter;
  },
  async get(transporterId) {
    const doc = await db.collection('transporters').doc(transporterId).get();
    if (!doc.exists) throw new Error('Transporter not found');
    return doc.data();
  },
  async update(transporterId, updates) {
    const updated = { ...updates, updatedAt: admin.firestore.Timestamp.now() };
    await db.collection('transporters').doc(transporterId).update(updated);
    return updated;
  },
  async approve(transporterId) {
  const updates = {
    status: 'approved',
    updatedAt: admin.firestore.Timestamp.now()
  };
  await db.collection('transporters').doc(transporterId).update(updates);
  return updates;
},
async reject(transporterId, reason) {
  const updates = {
    status: 'rejected',
    rejectionReason: reason || 'Not specified',
    updatedAt: admin.firestore.Timestamp.now()
  };
  await db.collection('transporters').doc(transporterId).update(updates);
  return updates;
},
  async delete(transporterId) {
    await db.collection('transporters').doc(transporterId).delete();
    return { message: 'Transporter deleted successfully' };
  },
  async getAll() {
    const snapshot = await db.collection('transporters').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
  async getByAvailability(status) {
    const snapshot = await db.collection('transporters')
      .where('acceptingBooking', '==', status)
      .where('status', '==', 'approved')
      .get();

    if (snapshot.empty) return [];
      return snapshot.docs.map(doc => ({ transporterId: doc.id, ...doc.data() }));
  },
  async setLocation(transporterId, location) {
    const updates = {
      lastKnownLocation: location,
      updatedAt: admin.firestore.Timestamp.now(),
    };
    await db.collection('transporters').doc(transporterId).update(updates);
    return updates;
  },
};

module.exports = Transporter;