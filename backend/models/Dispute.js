const admin = require("../config/firebase");
const db = admin.firestore();

const Dispute = {
  async create(disputeData) {
    const disputeId = disputeData.disputeId || db.collection('disputes').doc().id;
    const dispute = {
      disputeId,
      bookingId: disputeData.bookingId,
      openedBy: disputeData.openedBy,
      transporterId: disputeData.transporterId || null,
      userId: disputeData.userId || null,
      reason: disputeData.reason,
      status: disputeData.status || 'open',
      resolution: disputeData.resolution || null,
      amountRefunded: disputeData.amountRefunded || 0,
      priority: disputeData.priority || 'medium',
      comments: disputeData.comments || [],
      evidence: disputeData.evidence || [],
      openedAt: disputeData.openedAt || admin.firestore.Timestamp.now(),
      resolvedBy: disputeData.resolvedBy || null,
      resolvedAt: disputeData.resolvedAt || null,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    };
    await db.collection('disputes').doc(disputeId).set(dispute);
    return dispute;
  },
  async get(disputeId) {
    const doc = await db.collection('disputes').doc(disputeId).get();
    if (!doc.exists) throw new Error('Dispute not found');
    return { disputeId: doc.id, ...doc.data() };
  },
  async update(disputeId, updates) {
    const updated = { ...updates, updatedAt: admin.firestore.Timestamp.now() };
    await db.collection('disputes').doc(disputeId).update(updated);
    return this.get(disputeId); // Return the full updated document
  },
  async resolve(disputeId, resolutionData) {
    const { resolution, amountRefunded, comments } = resolutionData;
    if (!resolution) throw new Error('Resolution details are required');
    const updates = {
      status: 'resolved',
      resolution,
      amountRefunded: amountRefunded || 0,
      resolvedAt: admin.firestore.Timestamp.now(),
      comments: comments ? [...(await this.get(disputeId)).comments, comments] : (await this.get(disputeId)).comments,
      updatedAt: admin.firestore.Timestamp.now()
    };
    await db.collection('disputes').doc(disputeId).update(updates);
    return this.get(disputeId);
  },
  async getByBookingId(bookingId) {
    const snapshot = await db.collection('disputes')
      .where('bookingId', '==', bookingId)
      .get();
    return snapshot.empty ? [] : snapshot.docs.map(doc => ({ disputeId: doc.id, ...doc.data() }));
  },
  async getByStatus(status) {
    const snapshot = await db.collection('disputes')
      .where('status', '==', status)
      .get();
    return snapshot.empty ? [] : snapshot.docs.map(doc => ({ disputeId: doc.id, ...doc.data() }));
  },
  async getByOpenedBy(openedBy) {
    const snapshot = await db.collection('disputes')
      .where('openedBy', '==', openedBy)
      .get();
    return snapshot.empty ? [] : snapshot.docs.map(doc => ({ disputeId: doc.id, ...doc.data() }));
  },
  async delete(disputeId) {
    const updates = { isDeleted: true, updatedAt: admin.firestore.Timestamp.now() };
    await db.collection('disputes').doc(disputeId).update(updates);
    return { message: 'Dispute marked as deleted' };
  },
  async getAll() {
    const snapshot = await db.collection("disputes").get();
    return snapshot.docs.map(doc => ({ disputeId: doc.id, ...doc.data() }));
  }
};

module.exports = Dispute;