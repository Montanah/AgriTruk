const admin = require("../config/firebase");
const db = admin.firestore(); 

// TRANSPORTERS Model
const Transporter = {
  async create(transporterData) {
    const transporter = {
      transporterId: transporterData.userId || db.collection('transporters').doc().id,
      userId: transporterData.transporterId,
      transporterType: transporterData.transporterType || 'individual',
      displayName: transporterData.displayName || 'Unnamed Transporter', 
      phoneNumber: transporterData.phoneNumber || null,
      driverProfileImage: transporterData.driverProfileImage || null,
      email: transporterData.email || null,
      // Vehicle details
      vehicleType: transporterData.vehicleType || null,
      vehicleRegistration: transporterData.vehicleRegistration || null,
      vehicleColor: transporterData.vehicleColor || null,
      vehicleMake: transporterData.vehicleMake || null,
      vehicleModel: transporterData.vehicleModel || null,
      vehicleYear: transporterData.vehicleYear || null,
      vehicleCapacity: transporterData.vehicleCapacity || null,
      driveType: transporterData.driveType || null,
      bodyType: transporterData.bodyType || null,
      vehicleFeatures: transporterData.vehicleFeatures || null,
      humidityControl: transporterData.humidityControl, // || false,
      refrigerated: transporterData.refrigerated, // || false,
      // documents
      vehicleImagesUrl: transporterData.vehicleImagesUrl || [],
      driverLicense: transporterData.driverLicense || null,
      logbookUrl: transporterData.logbookUrl || null,
      insuranceUrl: transporterData.insuranceUrl || null,
      driverIdUrl: transporterData.driverIdUrl || null, // Added fallback
      // Trip details
      acceptingBooking: transporterData.acceptingBooking || false,
      status: transporterData.status || 'pending',
      rejectionReason: transporterData.rejectionReason || null,
      totalTrips: transporterData.totalTrips || 0,
      rating: transporterData.rating || 0,
      accountStatus: transporterData.accountStatus || true,
      // Geo details
      currentRoute: transporterData.currentRoute || [], // Array of { location, timestamp }
      lastKnownLocation: transporterData.lastKnownLocation || null,
      notificationPreferences: transporterData.notificationPreferences || { method: 'both' },
      // Payment details
      paymentMethod: transporterData.paymentMethod || 'cash',
      paymentAccount: transporterData.paymentAccount || null,
      totalRevenue: transporterData.totalRevenue || 0,
      // Admin details
      insuranceExpiryDate: transporterData.insuranceExpiryDate || null,
      driverLicenseExpiryDate: transporterData.driverLicenseExpiryDate || null,
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
  async softDelete(transporterId) {
    const updates = {
      accountStatus: false,
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