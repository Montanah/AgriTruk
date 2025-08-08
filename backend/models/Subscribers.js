const admin = require('../config/firebase');
const db = admin.firestore();

const Subscribers = {
    async create(subscriberData) {
        const { userId, planId, startDate, endDate, isActive, autoRenew, paymentStatus, transactionId } = subscriberData;
            if (!userId || !planId || !startDate || !endDate) {
            throw new Error('userId, planId, startDate, and endDate are required');
        }
        const subscriber = {
            subscriberId: db.collection('subscribers').doc().id,
            userId,
            planId,
            startDate: admin.firestore.Timestamp.fromDate(new Date(startDate)),
            endDate: admin.firestore.Timestamp.fromDate(new Date(endDate)),
            isActive,
            autoRenew: autoRenew || false,
            paymentStatus: paymentStatus || 'pending',
            transactionId: transactionId || null,
            currentUsage: 0,
            createdAt: admin.firestore.Timestamp.now(),
            updatedAt: admin.firestore.Timestamp.now()
        },
        subscriberRef = db.collection('subscribers').doc(subscriberData.subscriberId);
        await subscriberRef.set(subscriber);
        return { id: subscriber.subscriberId, ...subscriber };
    },

    async update(subscriberId, updates) {
        const updated = { ...updates, updatedAt: admin.firestore.Timestamp.now() };
        await db.collection('subscribers').doc(subscriberId).update(updated);
        return updated;
    },

    async delete(subscriberId) {
        await db.collection('subscribers').doc(subscriberId).delete();
    },

    async get(subscriberId) {
        const subscriber = await db.collection('subscribers').doc(subscriberId).get();
        return subscriber.data();
    },

    async getAll() {
        const snapshot = await db.collection('subscribers').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    async getByUserId(userId) {
        const snapshot = await db.collection('subscribers')
        .where('userId', '==', userId)
        .where('isActive', '==', true)
        .limit(1)
        .get();
        if (snapshot.empty) return null;
        return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    },
    async incrementUsage(subscriberId) {
        const subscriberRef = db.collection('subscribers').doc(subscriberId);
        const doc = await subscriberRef.get();
        if (!doc.exists) throw new Error('Subscriber not found');
        const currentUsage = (doc.data().currentUsage || 0) + 1;
        await subscriberRef.update({ currentUsage, updatedAt: admin.firestore.Timestamp.now() });
        return currentUsage;
    }
};

module.exports = Subscribers;