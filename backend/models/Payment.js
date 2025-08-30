const admin = require("../config/firebase");
const db = admin.firestore(); 

// PAYMENTS Model
const Payment = {
  async create(paymentData) {
    const payment = {
      paymentId: paymentData.paymentId || db.collection('payments').doc().id,
      requestId: paymentData.requestId,
      payerId: paymentData.payerId,
      subscriberId: paymentData.subscriberId || null,
      payeeId: paymentData.payeeId,
      amount: paymentData.amount || 0,
      phone: paymentData.phone || null,
      email: paymentData.email || null,
      currency: paymentData.currency || 'KES',
      method: paymentData.method || 'mpesa',
      transDate: paymentData.transDate || null,
      mpesaReference: paymentData.mpesaReference || null,
      status: paymentData.status || 'pending',
      failureReason: paymentData.failureReason || null,
      feeBreakdown: {
        platformFee: paymentData.feeBreakdown?.platformFee || 0,
        transporterFee: paymentData.feeBreakdown?.transporterFee || 0,
        tax: paymentData.feeBreakdown?.tax || 0
      },
      receiptUrl: paymentData.receiptUrl || null,
      escrowReleased: paymentData.escrowReleased || false,
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
    const updated = { ...updates, updatedAt: admin.firestore.Timestamp.now() };
    await db.collection('payments').doc(paymentId).update(updated);
    return updated;
  }, 

  async getByRequestID(requestId) {
    console.log(`Getting payments for request ID: ${requestId}`);
    const querySnapshot = await db.collection('payments').where('requestId', '==', requestId).get();
    const payments = [];
    querySnapshot.forEach((doc) => {
      payments.push(doc.data());
    });
    return payments;
  }
};

module.exports = Payment;