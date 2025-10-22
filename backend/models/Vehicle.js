const admin = require("../config/firebase");
const { getByCompanyId } = require("./Driver");
const db = admin.firestore();

const Vehicle = {
  async create(vehicleData) {
    const vehicleId = vehicleData.vehicleId || db.collection('vehicles').doc().id; 
    const vehicle = {
      vehicleId,
      companyId: vehicleData.companyId,
      type: vehicleData.type || null,
      make: vehicleData.make || null, // Add make field
      vehicleRegistration: vehicleData.vehicleRegistration || null,
      bodyType: vehicleData.bodyType || null,
      year: vehicleData.year || null,
      color: vehicleData.color || null,
      capacity: vehicleData.capacity || null,
      driveType: vehicleData.driveType || null, // Add driveType field
      refrigerated: vehicleData.refrigerated || false,
      humidityControl: vehicleData.humidityControl || false,
      specialCargo: vehicleData.specialCargo || false,
      features: vehicleData.features || [],
      insurance: vehicleData.insurance || null,
      insuranceExpiry: vehicleData.insuranceExpiry || null,
      photos: vehicleData.photos || [],
      assignedDriverId: vehicleData.assignedDriverId || null,
      est: vehicleData.est || null,
      status: vehicleData.status || 'pending',
      rejectionReason: vehicleData.rejectionReason || null,
      availability: vehicleData.availability || false,
      active: vehicleData.active || false,
      deactivatedAt: vehicleData.deactivatedAt || null,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    };
    await db.collection('vehicles').doc(vehicleId).set(vehicle);
    return vehicle;
  },

  async get(vehicleId) {
    const doc = await db.collection('vehicles').doc(vehicleId).get();
    if (!doc.exists) throw new Error('Vehicle not found');
    return { id: doc.id, ...doc.data() };
  },

  async update( vehicleId, updates) {
    const updated = { ...updates, updatedAt: admin.firestore.Timestamp.now() };
    await db.collection('vehicles').doc(vehicleId).update(updated);
    return updated;
  },

  async getAll() {
    const snapshot = await db.collection('vehicles').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async assignDriver(vehicleId, driverId) {
    console.log(`Assigning driver ${driverId} to vehicle ${vehicleId}`);
    await db.collection('vehicles').doc(vehicleId).update({ assignedDriverId: driverId });
    console.log(`Driver ${driverId} assigned to vehicle ${vehicleId}`);
  },

  async unassignDriver(vehicleId) {
    await db.collection('vehicles').doc(vehicleId).update({ assignedDriverId: null });
  },

  async delete(vehicleId) {
    await db.collection('vehicles').doc(vehicleId).delete();
  },

  async updateAvailability(vehicleId, availability) {
    await db.collection('vehicles').doc(vehicleId).update({ availability });
  },

  async getByRegistration(reg) {
    const snapshot = await db.collection('vehicles').where('reg', '==', reg).get();
    // return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return snapshot.empty ? null : snapshot.docs[0].data();
  },

  async approve(vehicleId) {
    const updates = {
      availability: true,
      insuranceExpiry,
      status: 'approved',
      updatedAt: admin.firestore.Timestamp.now(),
    }
    await db.collection('vehicles').doc(vehicleId).update(updates);
    return updates;
  },

  async reject(vehicleId, reason) {
    const updates = {
      status: 'rejected',
      rejectionReason: reason || 'Not specified',
      updatedAt: admin.firestore.Timestamp.now(),
    }
    await db.collection('vehicles').doc(vehicleId).update(updates);
    return updates;
  },

  async getByCompanyId(companyId) {
    const snapshot = await db.collection('vehicles').where('companyId', '==', companyId).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
};

module.exports = Vehicle;