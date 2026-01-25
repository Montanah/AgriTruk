const admin = require('../config/firebase');
const db = admin.firestore();

const RecruiterSubscribers = {

  async create(subscriberData) {
    try {
      const { userId, planId, startDate, isActive, autoRenew, paymentStatus, transactionId, endDate } = subscriberData;
      if (!userId || !planId || !startDate) {
        throw new Error('userId, planId, startDate are required');
      }

      // Generate a new document ID
      const subscriberId = db.collection('recruiter_subscribers').doc().id;
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
        currentUsage: {
          driverContacts: 0,
          activeJobPosts: 0,
        },
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
        // Upgrade/downgrade tracking
        previousPlanId: subscriberData.previousPlanId || null,
        lastChange: subscriberData.lastChange || null,
        changeType: subscriberData.changeType || null,
        proratedAmount: subscriberData.proratedAmount || null,
        cancellationDate: subscriberData.cancellationDate || null,
        cancellationReason: subscriberData.cancellationReason || null,
        refundAmount: subscriberData.refundAmount || null,
        // Notifications
        notifications: {
          trialExpiring: [],
          subscriptionExpiring: [],
          subscriptionExpired: false,
          renewalFailed: false,
          trialStarted: false,
          subscriptionActivated: false
        },
      };

      await db.collection('recruiter_subscribers').doc(subscriberId).set(subscriber);

      // Return response with date objects
      const response = {
        id: subscriberId,
        ...subscriber,
        startDate: subscriber.startDate.toDate(),
        endDate: subscriber.endDate.toDate(),
        createdAt: subscriber.createdAt.toDate(),
        updatedAt: subscriber.updatedAt.toDate(),
      };
     
      return response;
    } catch (error) {
      console.error('Recruiter subscription creation error:', error);
      throw error;
    }
  },

  async update(subscriberId, updates) {
    const updated = { ...updates, updatedAt: admin.firestore.Timestamp.now() };
    await db.collection('recruiter_subscribers').doc(subscriberId).update(updated);
    return updated;
  },

  async delete(subscriberId) {
    await db.collection('recruiter_subscribers').doc(subscriberId).delete();
  },

  async get(subscriberId) {
    const subscriber = await db.collection('recruiter_subscribers').doc(subscriberId).get();
    return subscriber.data();
  },

  async getAll() {
    const snapshot = await db.collection('recruiter_subscribers').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async getByUserId(userId) {
    const snapshot = await db.collection('recruiter_subscribers')
      .where('userId', '==', userId)
      .where('isActive', '==', true)
      .limit(1)
      .get();
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
  },

  async incrementUsage(subscriberId, usageType) {
    const subscriberRef = db.collection('recruiter_subscribers').doc(subscriberId);
    const doc = await subscriberRef.get();
    if (!doc.exists) throw new Error('Subscriber not found');
    
    const currentUsage = doc.data().currentUsage || { driverContacts: 0, activeJobPosts: 0 };
    currentUsage[usageType] = (currentUsage[usageType] || 0) + 1;
    
    await subscriberRef.update({ 
      currentUsage, 
      updatedAt: admin.firestore.Timestamp.now() 
    });
    return currentUsage;
  },

  async decrementUsage(subscriberId, usageType) {
    const subscriberRef = db.collection('recruiter_subscribers').doc(subscriberId);
    const doc = await subscriberRef.get();
    if (!doc.exists) throw new Error('Subscriber not found');
    
    const currentUsage = doc.data().currentUsage || { driverContacts: 0, activeJobPosts: 0 };
    currentUsage[usageType] = Math.max((currentUsage[usageType] || 0) - 1, 0);
    
    await subscriberRef.update({ 
      currentUsage, 
      updatedAt: admin.firestore.Timestamp.now() 
    });
    return currentUsage;
  },

  async hasAnySubscription(userId) {
    const snapshot = await db.collection('recruiter_subscribers')
      .where('userId', '==', userId)
      .where('isActive', '==', true)
      .limit(1)
      .get();
    return !snapshot.empty;
  },

  async getAllByUserId(userId) {
    const snapshot = await db.collection('recruiter_subscribers').where('userId', '==', userId).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async getExpiredSubscriptions() {
    try {
      const allDocs = await db.collection('recruiter_subscribers')
        .where('isActive', '==', true)
        .get();
        const now = new Date();
        const expired = allDocs.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(sub => new Date(sub.endDate) < now);
        return expired;

    } catch (error) {
      console.error('Error getting expired subscriptions:', error);
      return [];
    }
  },

  async updateNotification(subscriberId, notificationType, value) {
    try {
      const subscriberRef = db.collection('recruiter_subscribers').doc(subscriberId);
      const subscriberDoc = await subscriberRef.get();

      if (!subscriberDoc.exists) {
        throw new Error('Subscriber not found');
      }

      const currentNotifications = subscriberDoc.data().notifications || {};
      let updatedNotifications = { ...currentNotifications };

      if (Array.isArray(value)) {
        if (!updatedNotifications[notificationType]) {
          updatedNotifications[notificationType] = [];
        }
        updatedNotifications[notificationType] = [
          ...new Set([...updatedNotifications[notificationType], ...value])
        ];
      } else {
        updatedNotifications[notificationType] = value;
      }

      await subscriberRef.update({
        notifications: updatedNotifications,
        updatedAt: admin.firestore.Timestamp.now()
      });

      return updatedNotifications;
    } catch (error) {
      console.error('Error updating notification:', error);
      throw error;
    }
  },

  async hasUsedTrial(userId) {
    try {
      const RecruiterPlans = require('./RecruiterPlans');
      
      const snapshot = await db.collection('recruiter_subscribers')
        .where('userId', '==', userId)
        .get();
      
      if (snapshot.empty) {
        return false;
      }
      
      // Check if any subscription was a trial (price = 0 or billingCycle = 'trial')
      for (const doc of snapshot.docs) {
        const subscription = { id: doc.id, ...doc.data() };
        try {
          const plan = await RecruiterPlans.get(subscription.planId);
          if (plan && (plan.price === 0 || plan.billingCycle === 'trial')) {
            return true;
          }
        } catch (error) {
          console.error(`Error checking plan for subscription ${subscription.id}:`, error);
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error checking if user has used trial:', error);
      return false;
    }
  },
};

module.exports = RecruiterSubscribers;