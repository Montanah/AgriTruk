const admin = require("../config/firebase");
const db = admin.firestore(); 

// TRANSPORTERS Model
const Transporter = {
  async create(transporterData) {
    const transporter = {
      transporterId: transporterData.transporterId,
      documents : {
        licenseUrl: transporterData.documents?.license || null,
        insuranceUrl: transporterData.documents?.insurance || null
      },
      vehicles: {
        vehicleId: transporterData.vehicles?.vehicleId || null,
        plateNumber: transporterData.vehicles?.plateNumber || null,
        make: transporterData.vehicles?.make || null,
        model: transporterData.vehicles?.model || null,
        capacity: transporterData.vehicles?.capacity || null,
        features: transporterData.vehicles?.features || null,
        imageUrl: transporterData.vehicles?.imageUrl || null, 
        availability: transporterData.vehicles?.availability || null,
        location: {
          county: transporterData.vehicles?.location?.county || null,
          subcounty: transporterData.vehicles?.location?.subcounty || null,
          ward: transporterData.vehicles?.location?.ward || null,
          lat: transporterData.vehicles?.location?.lat || null,
          lng: transporterData.vehicles?.location?.lng || null
        },
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now()
      },
      acceptingBooking: transporterData.acceptingBooking || false,
      status: transporterData.status || 'active',
      totalTrips: transporterData.totalTrips || 0,
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
  }
};

module.exports = Transporter;