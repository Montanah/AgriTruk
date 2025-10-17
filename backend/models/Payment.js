const admin = require("../config/firebase");
const { getAll } = require("./Subscribers");
const db = admin.firestore(); 

// PAYMENTS Model
const Payment = {
  async create(paymentData) {
    const payment = {
      paymentId: paymentData.paymentId || db.collection('payments').doc().id,
      requestId: paymentData.requestId || null,
      payerId: paymentData.payerId,
      subscriberId: paymentData.subscriberId || null,
      planId: paymentData.planId || null,
      amount: paymentData.amount || 0,
      phone: paymentData.phone || null,
      email: paymentData.email || null,
      currency: paymentData.currency || 'KES',
      method: paymentData.method || 'mpesa',
      transDate: paymentData.transDate || null,
      mpesaReference: paymentData.mpesaReference || null,
      status: paymentData.status || 'pending',
      failureReason: paymentData.failureReason || null,
      receiptUrl: paymentData.receiptUrl || null,
      disputeId: paymentData.disputeId || null,
      createdAt: admin.firestore.Timestamp.now(),
      paidAt: paymentData.paidAt || null
    };
    await db.collection('payments').doc(payment.paymentId).set(payment);
    return payment;
  },
  async get(paymentId) {
    const doc = await db.collection('payments').doc(paymentId).get();
    if (!doc.exists) throw new Error('Payment not found');
    return doc.data();
  },
  async update(paymentId, updates) {
    console.log('Updating payment:', paymentId, updates);
    const updated = { ...updates, updatedAt: admin.firestore.Timestamp.now() };
    await db.collection('payments').doc(paymentId).update(updated);
    return updated;
  }, 

  async getByRequestID(requestId) {
    const querySnapshot = await db.collection('payments').where('requestId', '==', requestId).get();
    if (querySnapshot.empty) return null;
    return querySnapshot.docs[0].data();
  },

  async getAll() {
    const snapshot = await db.collection('payments').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

   async updateStatus(paymentId, status, additionalData = {}) {
    const updates = {
      status,
      updatedAt: admin.firestore.Timestamp.now(),
      ...additionalData,
    };
    
    if (status === 'completed' || status === 'success') {
      updates.paidAt = admin.firestore.Timestamp.now();
    }
    
    await db.collection('payments').doc(paymentId).update(updates);
    return updates;
  },

  async getBySubscriber(subscriberId) {
    const snapshot = await db.collection('payments')
      .where('subscriberId', '==', subscriberId)
      .orderBy('createdAt', 'desc')
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async getByPayer(payerId) {
    const snapshot = await db.collection('payments')
      .where('payerId', '==', payerId)
      .orderBy('createdAt', 'desc')
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async getByStatus(status) {
    const snapshot = await db.collection('payments')
      .where('status', '==', status)
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async getByReference(mpesaReference) {
    const snapshot = await db.collection('payments')
      .where('mpesaReference', '==', mpesaReference)
      .limit(1)
      .get();
    return snapshot.empty ? null : { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
  },

};

module.exports = Payment;