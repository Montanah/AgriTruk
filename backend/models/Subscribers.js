const admin = require('../config/firebase');
const db = admin.firestore();

const Subscribers = {

  async create(subscriberData) {
    try {
      const { userId, planId, startDate, isActive, autoRenew, paymentStatus, transactionId, endDate } = subscriberData;
      if (!userId || !planId || !startDate) {
        throw new Error('userId, planId, startDate are required');
      }
    //   console.log('Subscriber Data:', subscriberData);

      // Generate a new document ID
      const subscriberId = db.collection('subscribers').doc().id;
      if (!subscriberId) {
        throw new Error('Failed to generate subscriber ID');
      }

      // Construct subscriber object
      const subscriber = {
        subscriberId,
        userId,
        planId,
        status: subscriberData.status || 'active',
        startDate: admin.firestore.Timestamp.fromDate(new Date(startDate)),
        endDate: admin.firestore.Timestamp.fromDate(new Date(endDate)),
        isActive: isActive !== undefined ? isActive : true,
        autoRenew: autoRenew || false,
        paymentStatus: paymentStatus || 'pending',
        paymentId: null,
        transactionId: transactionId || null,
        currentUsage: 0,
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
      };

      const subscriberRef = db.collection('subscribers').doc(subscriberId).set(subscriber);

      // Save to Firestore with cleaned data
    //   await subscriberRef.set(cleanData(subscriber), { merge: true });

      // Return response with date objects
      const response = {
        id: subscriberId,
        ...subscriber,
        startDate: subscriber.startDate.toDate(),
        endDate: subscriber.endDate.toDate(),
        createdAt: subscriber.createdAt.toDate(),
        updatedAt: subscriber.updatedAt.toDate(),
      };
      console.log('Subscriber created successfully:', response);
      return response;
    } catch (error) {
      console.error('Subscription creation error:', error);
      throw error;
    }
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