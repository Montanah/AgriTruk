const admin = require("../config/firebase");
const db = admin.firestore();
const { queryTransporters } = require("../jobs/transporterQuery"); 
function toFirestoreTimestamp(dateValue) {
  if (!dateValue) return null;
  const jsDate = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (isNaN(jsDate.getTime())) return null;
  return admin.firestore.Timestamp.fromDate(jsDate);
}

function getExpiryField(docType) {
  const fields = {
    insurance: "insuranceExpiryDate",
    driverLicense: "driverLicenseExpiryDate",
    id: "idExpiryDate",
  };
  return fields[docType];
}

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
      insuranceExpiryDate: toFirestoreTimestamp(transporterData.insuranceExpiryDate),
      driverLicenseExpiryDate: toFirestoreTimestamp(transporterData.driverLicenseExpiryDate),
      insuranceapproved: transporterData.insuranceapproved || false,
      driverLicenseapproved: transporterData.driverLicenseapproved || false,
      idExpiryDate: toFirestoreTimestamp(transporterData.idExpiryDate),
      idapproved: transporterData.idapproved || false,
      // Timestamps
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
      //expiry
      documentNotifications: {
        insurance: {
          expiring: [30, 15, 7, 3, 1], // [30, 15, 7, 3, 1]
          expired: false,
          grace_period: [1, 7, 14] // [1, 7, 14]
        },
        driverLicense: {
          expiring: [30, 15, 7, 3, 1],
          expired: false,
          grace_period: [1, 7, 14]
        },
        id: {
          expiring: [30, 15, 7, 3, 1],
          expired: false,
          grace_period: [1, 7, 14]
        }
      },
    };

    await db.collection('transporters').doc(transporterData.transporterId).set(transporter);
    return transporter;
  },
  async get(transporterId) {
    const doc = await db.collection('transporters').doc(transporterId).get();
    if (!doc.exists) throw new Error('Transporter not found');
    return doc.data();
  },
  // async update(transporterId, updates) {
  //   const updated = { ...updates, updatedAt: admin.firestore.Timestamp.now() };
  //   await db.collection('transporters').doc(transporterId).update(updated);
  //   return updated;
  // },
   async update(transporterId, updates) {
    const normalized = {
      ...updates,
      updatedAt: admin.firestore.Timestamp.now(),
    };

    // Normalize expiry fields if present in update
    if (updates.insuranceExpiryDate)
      normalized.insuranceExpiryDate = toFirestoreTimestamp(updates.insuranceExpiryDate);
    if (updates.driverLicenseExpiryDate)
      normalized.driverLicenseExpiryDate = toFirestoreTimestamp(updates.driverLicenseExpiryDate);
    if (updates.idExpiryDate)
      normalized.idExpiryDate = toFirestoreTimestamp(updates.idExpiryDate);

    await db.collection('transporters').doc(transporterId).update(normalized);
    return normalized;
  },

  async approve(transporterId) {
    const updates = {
      status: 'approved',
      rejectionReason: null,
      accountStatus: true,
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
async getExpiredDocuments(docType, today) {
  const expiryField = getExpiryField(docType);
  const snap = await queryTransporters(expiryField, "expired");
  return snap.docs.map(d => ({ transporterId: d.id, ...d.data() }));
},

async getGracePeriodDocuments(docType, days) {
  const expiryField = getExpiryField(docType);
  const snap = await queryTransporters(expiryField, "grace", days);
  return snap.docs.map(d => ({ transporterId: d.id, ...d.data() }));
},

async getExpiringDocuments(docType, days) {
  const expiryField = getExpiryField(docType);
  const snap = await queryTransporters(expiryField, "expiring", days);
  return snap.docs.map(d => ({ transporterId: d.id, ...d.data() }));
},

  async updateDocumentNotification(transporterId, docType, notificationType, value) {
    const transporterRef = db.collection('transporters').doc(transporterId);
    const transporterDoc = await transporterRef.get();

    if (!transporterDoc.exists) return;

    const currentNotifications = transporterDoc.data().documentNotifications || {};
    const docNotifications = currentNotifications[docType] || {};

    let updatedDocNotifications = { ...docNotifications };

    if (notificationType === 'expiring' || notificationType === 'grace_period') {
      if (!updatedDocNotifications[notificationType]) {
        updatedDocNotifications[notificationType] = [];
      }
      updatedDocNotifications[notificationType] = [
        ...new Set([...updatedDocNotifications[notificationType], value])
      ];
    } else {
      updatedDocNotifications[notificationType] = value;
    }

    await transporterRef.update({
      documentNotifications: {
        ...currentNotifications,
        [docType]: updatedDocNotifications
      },
      updatedAt: admin.firestore.Timestamp.now()
    });
  },

  async getNonCompliantTransporters(docType, cutoffDate) {
    const expiryField = this.getExpiryFieldName(docType);
    const cutoffTimestamp = admin.firestore.Timestamp.fromDate(cutoffDate);

    const snapshot = await db.collection('transporters')
      .where(expiryField, '<', cutoffTimestamp)
      .get();

    return snapshot.docs.map(doc => ({ transporterId: doc.id, ...doc.data() }));
  },

  getExpiryFieldName(docType) {
    const fields = {
      'insurance': 'insuranceExpiryDate',
      'driverLicense': 'driverLicenseExpiryDate',
      'id': 'idExpiryDate'
    };
    return fields[docType];
  },
};

module.exports = Transporter;