const admin = require("../config/firebase");
const db = admin.firestore();
const DriverSchema = require('../schemas/DriverSchema');

const Driver = {
  async create(driverData) {
    const driverId = driverData.driverId || db.collection('drivers').doc().id;
    const driver = {
      driverId,
      companyId: driverData.companyId || null,
      firstName: driverData.firstName || null,
      lastName: driverData.lastName || null,
      email: driverData.email || null,
      phone: driverData.phone || null,
      profileImage: driverData.profileImage || null,
      idDocumentUrl: driverData.idDocumentUrl || null,
      idExpiryDate: driverData.idExpiryDate ? admin.firestore.Timestamp.fromDate(new Date(driverData.idExpiryDate)) : null,
      idApproved: driverData.idApproved || false,
      driverLicense: driverData.driverLicense || null,
      driverLicenseUrl: driverData.driverLicenseUrl || null,
      driverLicenseExpiryDate: driverData.driverLicenseExpiryDate ? admin.firestore.Timestamp.fromDate(new Date(driverData.driverLicenseExpiryDate)) : null,
      driverLicenseApproved: driverData.driverLicenseApproved || false,
      goodConductCert: driverData.goodConductCert || null,
      goodConductCerturl: driverData.goodConductCerturl || null,
      goodConductCertApproved: driverData.goodConductCertApproved || false,
      goodConductCertExpiryDate: driverData.goodConductCertExpiryDate ? admin.firestore.Timestamp.fromDate(new Date(driverData.goodConductCertExpiryDate)) : null,
      goodsServiceLicense: driverData.goodsServiceLicense || null,
      goodsServiceLicenseUrl: driverData.goodsServiceLicenseUrl || null,
      goodsServiceLicenseApproved: driverData.goodsServiceLicenseApproved || false,
      goodsServiceLicenseExpiryDate: driverData.goodsServiceLicenseExpiryDate ? admin.firestore.Timestamp.fromDate(new Date(driverData.goodsServiceLicenseExpiryDate)) : null,
      status: driverData.status || 'pending',
      assignedVehicleId: driverData.assignedVehicleId || null,
      assignedVehicleDetails: driverData.assignedVehicleDetails || null,
      currentRoute: driverData.currentRoute || null,
      lastKnownLocation: driverData.lastKnownLocation || null,
      acceptedLoads: driverData.acceptedLoads || null,
      currentLoadStatus: driverData.currentLoadStatus || null,
      availability: driverData.availability || false,
      rejectionReason: driverData.rejectionReason || null,
      userId: driverData.userId || null,
      role: driverData.role || 'driver',
      isDefaultPassword: driverData.isDefaultPassword || false,
      deliveries: driverData.deliveries || null,
      rating: driverData.rating || null,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
      lastActiveAt: driverData.lastActiveAt || null,
    };
    await db.collection('drivers').doc(driverId).set(driver);
    return driver;
  },

  async get(driverId) {
    const doc = await db.collection('drivers').doc(driverId).get();
    if (!doc.exists) throw new Error('Driver not found');
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
    };
  },

  async getbyUserId(userId) {
    const snapshot = await db.collection('drivers').where('userId', '==', userId).limit(1).get();
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
  },

  async update(driverId, updates) {
    const updated = {
      ...updates,
      updatedAt: admin.firestore.Timestamp.now(),
      ...(updates.idExpiryDate ? { idExpiryDate: admin.firestore.Timestamp.fromDate(new Date(updates.idExpiryDate)) } : {}),
      ...(updates.driverLicenseExpiryDate ? { driverLicenseExpiryDate: admin.firestore.Timestamp.fromDate(new Date(updates.driverLicenseExpiryDate)) } : {}),
      ...(updates.goodConductCertExpiryDate ? { goodConductCertExpiryDate: admin.firestore.Timestamp.fromDate(new Date(updates.goodConductCertExpiryDate)) } : {}),
      ...(updates.goodsServiceLicenseExpiryDate ? { goodsServiceLicenseExpiryDate: admin.firestore.Timestamp.fromDate(new Date(updates.goodsServiceLicenseExpiryDate)) } : {}),
      ...(updates.lastActiveAt ? { lastActiveAt: admin.firestore.Timestamp.fromDate(new Date(updates.lastActiveAt)) } : {}),
      ...(updates.acceptedLoads ? { acceptedLoads: updates.acceptedLoads.map(load => ({
        ...load,
        acceptedAt: load.acceptedAt ? admin.firestore.Timestamp.fromDate(new Date(load.acceptedAt)) : null,
        pickUpDate: load.pickUpDate ? admin.firestore.Timestamp.fromDate(new Date(load.pickUpDate)) : null,
      })) } : {}),
    };
    await db.collection('drivers').doc(driverId).update(updated);
    return updated;
  },

  async getAll() {
    const snapshot = await db.collection('drivers').get();
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
       };
    });
  },

  async getByCompanyId(companyId) {
    const snapshot = await db.collection('drivers')
      .where('companyId', '==', companyId)
      .get();
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data
        // idExpiryDate: data.idExpiryDate ? data.idExpiryDate.toDate().toISOString() : null,
        // driverLicenseExpiryDate: data.driverLicenseExpiryDate ? data.driverLicenseExpiryDate.toDate().toISOString() : null,
        // createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null,
        // updatedAt: data.updatedAt ? data.updatedAt.toDate().toISOString() : null,
        // lastActiveAt: data.lastActiveAt ? data.lastActiveAt.toDate().toISOString() : null,
      };
    });
  },

  async getByEmail(email) {
    const querySnapshot = await db.collection('drivers')
      .where('email', '==', email)
      .limit(1)
      .get();
    return querySnapshot.empty ? null : {
      id: querySnapshot.docs[0].id,
      ...querySnapshot.docs[0].data(),
      idExpiryDate: querySnapshot.docs[0].data().idExpiryDate ? querySnapshot.docs[0].data().idExpiryDate.toDate().toISOString() : null,
      driverLicenseExpiryDate: querySnapshot.docs[0].data().driverLicenseExpiryDate ? querySnapshot.docs[0].data().driverLicenseExpiryDate.toDate().toISOString() : null,
      createdAt: querySnapshot.docs[0].data().createdAt ? querySnapshot.docs[0].data().createdAt.toDate().toISOString() : null,
      updatedAt: querySnapshot.docs[0].data().updatedAt ? querySnapshot.docs[0].data().updatedAt.toDate().toISOString() : null,
      lastActiveAt: querySnapshot.docs[0].data().lastActiveAt ? querySnapshot.docs[0].data().lastActiveAt.toDate().toISOString() : null,
      acceptedAt: querySnapshot.docs[0].data().acceptedLoads?.map(load => load.acceptedAt ? load.acceptedAt.toDate().toISOString() : null) || null,
      pickUpDate: querySnapshot.docs[0].data().acceptedLoads?.map(load => load.pickUpDate ? load.pickUpDate.toDate().toISOString() : null) || null,
    };
  },

  async getByPhone(phone) {
    const querySnapshot = await db.collection('drivers')
      .where('phone', '==', phone)
      .limit(1)
      .get();
    return querySnapshot.empty ? null : {
      id: querySnapshot.docs[0].id,
      ...querySnapshot.docs[0].data(),
      idExpiryDate: querySnapshot.docs[0].data().idExpiryDate ? querySnapshot.docs[0].data().idExpiryDate.toDate().toISOString() : null,
      driverLicenseExpiryDate: querySnapshot.docs[0].data().driverLicenseExpiryDate ? querySnapshot.docs[0].data().driverLicenseExpiryDate.toDate().toISOString() : null,
      createdAt: querySnapshot.docs[0].data().createdAt ? querySnapshot.docs[0].data().createdAt.toDate().toISOString() : null,
      updatedAt: querySnapshot.docs[0].data().updatedAt ? querySnapshot.docs[0].data().updatedAt.toDate().toISOString() : null,
      lastActiveAt: querySnapshot.docs[0].data().lastActiveAt ? querySnapshot.docs[0].data().lastActiveAt.toDate().toISOString() : null,
      acceptedAt: querySnapshot.docs[0].data().acceptedLoads?.map(load => load.acceptedAt ? load.acceptedAt.toDate().toISOString() : null) || null,
      pickUpDate: querySnapshot.docs[0].data().acceptedLoads?.map(load => load.pickUpDate ? load.pickUpDate.toDate().toISOString() : null) || null,
    };
  },

  async updateAvailability(driverId, availability) {
    await db.collection('drivers').doc(driverId).update({ availability, updatedAt: admin.firestore.Timestamp.now() });
  },

  async approve(driverId) {
    const updates = {
      status: 'approved',
      updatedAt: admin.firestore.Timestamp.now(),
    };
    await db.collection('drivers').doc(driverId).update(updates);
    return updates;
  },

  async reject(driverId, reason) {
    const updates = {
      status: 'rejected',
      rejectionReason: reason || 'Not specified',
      updatedAt: admin.firestore.Timestamp.now(),
    };
    await db.collection('drivers').doc(driverId).update(updates);
    return updates;
  },

  async updateFirebaseId(companyId, driverId, userId) {
    await db.collection('drivers').doc(driverId).update({ userId, updatedAt: admin.firestore.Timestamp.now() });
  },
  async acceptLoad(driverId, bookingId, bookingData) {
    const driverRef = db.collection('drivers').doc(driverId);
    const driverSnap = await driverRef.get();
    if (!driverSnap.exists) throw new Error('Driver not found');

    const driverData = driverSnap.data();
    if (!driverData.assignedVehicleId) throw new Error('No vehicle assigned to driver');

    // Fetch vehicle details
    const vehicleRef = db.collection('vehicles').doc(driverData.assignedVehicleId);
    const vehicleSnap = await vehicleRef.get();
    if (!vehicleSnap.exists) throw new Error('Vehicle not found');
    const vehicleData = vehicleSnap.data();

    // Validate capacity and compatibility
    if (bookingData.weightKg && bookingData.weightKg > vehicleData.capacityKg) {
      throw new Error('Booking weight exceeds vehicle capacity');
    }
    if (bookingData.needsRefrigeration && !vehicleData.refrigerated) {
      throw new Error('Vehicle does not support refrigeration');
    }
    if (bookingData.humidityControl && !vehicleData.humidityControl) {
      throw new Error('Vehicle does not support humidity control');
    }

    // Update currentRoute
    const updatedRoute = driverData.currentRoute || [];
    updatedRoute.push({
      location: bookingData.fromLocation,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      stopType: 'pickup'
    });
    updatedRoute.push({
      location: bookingData.toLocation,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      stopType: 'dropoff'
    });

    // Update acceptedLoads
    const updatedLoads = driverData.acceptedLoads || [];
    updatedLoads.push({
      bookingId,
      status: 'accepted',
      acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
      pickUpDate: bookingData.pickUpDate
    });

    // Update driver
    await driverRef.update({
      currentRoute: updatedRoute,
      acceptedLoads: updatedLoads,
      currentLoadStatus: 'inTransit',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Update vehicle status
    await vehicleRef.update({
      inUse: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Update booking status (e.g., mark as assigned)
    await db.collection('bookings').doc(bookingId).update({
      status: 'assigned',
      driverId,
      vehicleId: driverData.assignedVehicleId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true, driverId, bookingId };
  },

  async getDriverIdByUserId(userId) {
    const driverSnap = await db.collection('drivers').where('userId', '==', userId).limit(1).get();
    return driverSnap.docs[0]?.data() || null;
  },

  async getExpiringDocuments(docType, days) {
    const expiryFieldMap = {
      'id': 'idExpiryDate',
      'dl': 'driverLicenseExpiryDate',
      'goodconduct': 'goodConductCertExpiryDate',
      'gsl': 'goodsServiceLicenseExpiryDate'
    };
    const expiryField = expiryFieldMap[docType];
    if (!expiryField) throw new Error('Invalid document type');

    const targetDate = admin.firestore.Timestamp.fromDate(new Date());
    targetDate.seconds += days * 24 * 60 * 60; 

    const snapshot = await db.collection('drivers')
      .where(expiryField, '<=', targetDate)
      .get();
    return snapshot.docs.map(doc => ({ driverId: doc.id, ...doc.data() }));
  },

  isDriverLicenseExpired(driverData) {
    if (!driverData.driverLicenseExpiryDate) return true; 

    const expiryTimestamp = driverData.driverLicenseExpiryDate;
    const now = admin.firestore.Timestamp.now();

    return expiryTimestamp.toMillis() < now.toMillis();
  },

  isDocumentExpired(driverData, field) {
    const expiry = driverData[field];
    if (!expiry) return true;
    return expiry.toMillis() < admin.firestore.Timestamp.now().toMillis();
  },

   async assignDriver(driverId, vehicleId, vehicleDetails) {
    await db.collection('drivers').doc(driverId).update({ assignedVehicleId: vehicleId, assignedVehicleDetails: vehicleDetails});
  },

};

module.exports = Driver; 