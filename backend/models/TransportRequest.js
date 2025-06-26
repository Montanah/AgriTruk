const admin = require('../config/firebase');
const db = admin.firestore();

// TRANSPORT_REQUESTS Model
const TransportRequest = {
  async create(requestData) {
    const request = {
      requestId: requestData.requestId || db.collection('transport_requests').doc().id,
      requestType: requestData.requestType || 'agricultural' || 'general_goods' || '',
      farmerId: requestData.farmerId,
      productType: requestData.productType || '',
      perishability: requestData.perishability || '',
      allowedVehicleTypes: requestData.allowedVehicleTypes || '',
      timeWindows: {
        earliestPickup: requestData.timeWindows?.earliestPickup || null,
        latestDropoff: requestData.timeWindows?.latestDropoff || null,
      },
      quantity: requestData.quantity || '',
      description: requestData.description || '',
      pickupLocation: {
        address: requestData.pickupLocation?.address || '',
        county: requestData.pickupLocation?.county || '',
        lat: requestData.pickupLocation?.lat || null,
        lng: requestData.pickupLocation?.lng || null,
      },
      dropoffLocation: {
        address: requestData.dropoffLocation?.address || '',
        county: requestData.dropoffLocation?.county || '',
        lat: requestData.dropoffLocation?.lat || null,
        lng: requestData.dropoffLocation?.lng || null,
      },
      preferredDate: requestData.preferredDate || null,
      photoUrl: requestData.photoUrl || null,
      status: requestData.status || 'pending',
      matchedTransporterId: requestData.matchedTransporterId || null,
      estimatedCost: requestData.estimatedCost || 0,
      urgency: requestData.urgency || false,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    };
    await db.collection('transport_requests').doc(request.requestId).set(request);
    return request;
  },
  async get(requestId) {
    const doc = await db.collection('transport_requests').doc(requestId).get();
    if (!doc.exists) throw new Error('Transport request not found');
    return doc.data();
  },
  async update(requestId, updates) {
    const updated = { ...updates, updatedAt: admin.firestore.Timestamp.now() };
    await db.collection('transport_requests').doc(requestId).update(updated);
    return updated;
  },
};

module.exports = TransportRequest;
