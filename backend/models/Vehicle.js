const admin = require("../config/firebase");
const db = admin.firestore();

const Vehicle = {
  async create(companyId, vehicleData) {
    const vehicleId = vehicleData.vehicleId || db.collection('companies').doc(companyId).collection('vehicles').doc().id;
    console.log('Generating vehicleId:', vehicleId); // Debug vehicleId
    console.log('Document path:', `companies/${companyId}/vehicles/${vehicleId}`);
    const vehicle = {
      vehicleId,
      type: vehicleData.type || null,
      reg: vehicleData.reg || null,
      bodyType: vehicleData.bodyType || null,
      year: vehicleData.year || null,
      color: vehicleData.color || null,
      model: vehicleData.model || null,
      capacity: vehicleData.capacity || null,
      refrigeration: vehicleData.refrigeration || false,
      humidityControl: vehicleData.humidityControl || false,
      specialCargo: vehicleData.specialCargo || false,
      features: vehicleData.features || [],
      insurance: vehicleData.insurance || null,
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
    await db.collection('companies').doc(companyId).collection('vehicles').doc(vehicleId).set(vehicle);
    return vehicle;
  },

  async get(companyId, vehicleId) {
    const doc = await db.collection('companies').doc(companyId).collection('vehicles').doc(vehicleId).get();
    if (!doc.exists) throw new Error('Vehicle not found');
    return { id: doc.id, ...doc.data() };
  },

  async update(companyId, vehicleId, updates) {
    const updated = { ...updates, updatedAt: admin.firestore.Timestamp.now() };
    await db.collection('companies').doc(companyId).collection('vehicles').doc(vehicleId).update(updated);
    return updated;
  },

  async getAll(companyId) {
    const snapshot = await db.collection('companies').doc(companyId).collection('vehicles').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async assignDriver(companyId, vehicleId, driverId) {
    await db.collection('companies').doc(companyId).collection('vehicles').doc(vehicleId).update({ assignedDriverId: driverId });
  },

  async unassignDriver(companyId, vehicleId) {
    await db.collection('companies').doc(companyId).collection('vehicles').doc(vehicleId).update({ assignedDriverId: null });
  },

  async delete(companyId, vehicleId) {
    await db.collection('companies').doc(companyId).collection('vehicles').doc(vehicleId).delete();
  },

  async updateAvailability(companyId, vehicleId, availability) {
    await db.collection('companies').doc(companyId).collection('vehicles').doc(vehicleId).update({ availability });
  },

  async getByRegistration(companyId, reg) {
    const snapshot = await db.collection('companies').doc(companyId).collection('vehicles').where('reg', '==', reg).get();
    // return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return snapshot.empty ? null : snapshot.docs[0].data();
  },
};

module.exports = Vehicle;