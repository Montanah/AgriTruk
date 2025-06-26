const admin = require('../config/firebase');
const db = admin.firestore();

// disputeS Model
const Dispute = {
  async create(disputeData) {
    const dispute = {
      disputeId: disputeData.disputeId || db.collection('disputes').doc().id,
      bookingId: disputeData.bookingId,
      openedBy: disputeData.openedBy,
      reason: disputeData.reason,
      status: disputeData.status || 'open',
      resolution: disputeData.resolution || null,
      amountRefunded: disputeData.amountRefunded || 0,
      resolvedAt: disputeData.resolvedAt || null,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    };
    await db.collection('disputes').doc(dispute.disputeId).set(dispute);
    return dispute;
  },
  async get(disputeId) {
    const doc = await db.collection('disputes').doc(disputeId).get();
    if (!doc.exists) throw new Error('dispute not found');
    return doc.data();
  },
  async update(disputeId, updates) {
    const updated = { ...updates, updatedAt: admin.firestore.Timestamp.now() };
    await db.collection('disputes').doc(disputeId).update(updated);
    return updated;
  },
};

module.exports = Dispute;
