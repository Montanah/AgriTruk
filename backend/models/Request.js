const admin = require('../config/firebase');
const db = admin.firestore();

const Request = {
  async create(requestData, clientId) {
    const requestRef = await db.collection('requests').add({
      clientId,
      category: requestData.category,
      type: requestData.type, // 'instant' or other
      pickUpLocation: requestData.pickUpLocation,
      dropOffLocation: requestData.dropOffLocation,
      productType: requestData.productType,
      weightKg: requestData.weightKg,
      value: requestData.value || 0,
      additionalRequest: requestData.additionalRequest || '',
      status: 'pending', // 'pending', 'completed'
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    });
    return { id: requestRef.id, ...requestData };
  },

  async consolidate(requestIds) {
    const batch = db.batch();
    const consolidatedRequests = [];
    requestIds.forEach(requestId => {
      const ref = db.collection('requests').doc(requestId);
      batch.update(ref, { status: 'consolidated', updatedAt: admin.firestore.Timestamp.now() });
      consolidatedRequests.push(ref.get());
    });
    await batch.commit();
    return consolidatedRequests.map(doc => ({ id: doc.id, ...doc.data() }));
  },
  async consolidateRequests(requestIds) {
  // 1. Create a new transport document
  const transportRef = db.collection('broker_transports').doc();
  const transportData = {
    status: 'pending',
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now()
  };
  
  // 2. Prepare batch for all updates
  const batch = db.batch();
  
  // Create the transport document
  batch.set(transportRef, transportData);
  
  // Update each request to reference this transport
  requestIds.forEach(requestId => {
    const requestRef = db.collection('requests').doc(requestId);
    batch.update(requestRef, {
      transportId: transportRef.id,
      status: 'consolidated',
      updatedAt: admin.firestore.Timestamp.now()
    });
  });
  
  // 3. Execute all operations atomically
  await batch.commit();
  
  // 4. Return the updated requests and transport info
  const updatedRequests = await Promise.all(
    requestIds.map(id => db.collection('requests').doc(id).get())
  );
  
  return {
    transportId: transportRef.id,
    requests: updatedRequests.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  };
},
  async getByClient(clientId) {
    const snapshot = await db
      .collection('requests')
      .where('clientId', '==', clientId)
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async getRequestById(requestId) {
    const doc = await db.collection('requests').doc(requestId).get();
    if (!doc.exists) throw new Error('Request not found');
    return { id: doc.id, ...doc.data() };
  },

  async getRequestByIds(requestIds) {
    const requests = await Promise.all(
      requestIds.map(id => db.collection('requests').doc(id).get())
    );
    return requests.map(doc => ({ id: doc.id, ...doc.data() }));
  },
};

module.exports = Request;