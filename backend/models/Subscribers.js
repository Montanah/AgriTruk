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
        //downgrade/upgrade
        previousPlanId: subscriberData.previousPlanId || null,
        lastChange: subscriberData.lastChange || null,
        changeType: subscriberData.changeType || null,
        proratedAmount: subscriberData.proratedAmount || null,
        cancellationDate: subscriberData.cancellationDate || null,
        cancellationReason: subscriberData.cancellationReason || null,
        refundAmount: subscriberData.refundAmount || null,
        //notifications
        notifications: {
          trialExpiring: [], // Array of daysBefore values that notifications were sent
          subscriptionExpiring: [], // Array of daysBefore values
          subscriptionExpired: false,
          renewalFailed: false,
          trialStarted: false,
          subscriptionActivated: false
        },
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
  },
  async hasAnySubscription(userId) {
    const snapshot = await db.collection('subscribers')
      .where('userId', '==', userId)
      .where('isActive', '==', true)
      .limit(1)
      .get();
    return !snapshot.empty;
  },
  async getAllByUserId(userId) {
    const snapshot = await db.collection('subscribers').where('userId', '==', userId).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
  async getExpiringTrials(targetDate) {
    try {
      // First get all active subscriptions expiring around target date
      const snapshot = await db.collection('subscribers')
        .where('isActive', '==', true)
        .where('endDate', '>=', admin.firestore.Timestamp.fromDate(new Date(targetDate.getTime() - 86400000))) // 1 day before
        .where('endDate', '<=', admin.firestore.Timestamp.fromDate(new Date(targetDate.getTime() + 86400000))) // 1 day after
        .get();

      if (snapshot.empty) return [];

      // Filter for trials (price = 0) by checking each plan
      const trialSubscribers = [];

      for (const doc of snapshot.docs) {
        const subscriber = { id: doc.id, ...doc.data() };
        try {
          const plan = await SubscriptionPlans.getSubscriptionPlan(subscriber.planId);
          if (plan && plan.price === 0) {
            trialSubscribers.push(subscriber);
          }
        } catch (error) {
          console.error(`Error checking plan for subscriber ${subscriber.id}:`, error);
        }
      }

      return trialSubscribers;
    } catch (error) {
      console.error('Error getting expiring trials:', error);
      return [];
    }
  },

  async getExpiringSubscriptions(targetDate) {
    try {
      // First get all active subscriptions expiring around target date
      const snapshot = await db.collection('subscribers')
        .where('isActive', '==', true)
        .where('endDate', '>=', admin.firestore.Timestamp.fromDate(new Date(targetDate.getTime() - 86400000))) // 1 day before
        .where('endDate', '<=', admin.firestore.Timestamp.fromDate(new Date(targetDate.getTime() + 86400000))) // 1 day after
        .get();

      if (snapshot.empty) return [];

      // Filter for paid subscriptions (price > 0) by checking each plan
      const paidSubscribers = [];

      for (const doc of snapshot.docs) {
        const subscriber = { id: doc.id, ...doc.data() };
        try {
          const plan = await SubscriptionPlans.getSubscriptionPlan(subscriber.planId);
          if (plan && plan.price > 0) {
            paidSubscribers.push(subscriber);
          }
        } catch (error) {
          console.error(`Error checking plan for subscriber ${subscriber.id}:`, error);
        }
      }

      return paidSubscribers;
    } catch (error) {
      console.error('Error getting expiring subscriptions:', error);
      return [];
    }
  },

  async getExpiredSubscriptions() {
    try {
      const now = admin.firestore.Timestamp.now();
      const snapshot = await db.collection('subscribers')
        .where('isActive', '==', true)
        .where('endDate', '<', now)
        .get();

      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting expired subscriptions:', error);
      return [];
    }
  },

  // async getFailedRenewals(sinceDate) {
  //   try {
  //     const sinceTimestamp = admin.firestore.Timestamp.fromDate(sinceDate);
  //     const snapshot = await db.collection('subscribers')
  //       .where('paymentStatus', '==', 'failed')
  //       .where('updatedAt', '>=', sinceTimestamp)
  //       .get();

  //     return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  //   } catch (error) {
  //     console.error('Error getting failed renewals:', error);
  //     return [];
  //   }
  // },

  async getNewTrials(startDate) {
    try {
      const startTimestamp = admin.firestore.Timestamp.fromDate(startDate);
      const endOfDay = new Date(startDate);
      endOfDay.setHours(23, 59, 59, 999);
      const endTimestamp = admin.firestore.Timestamp.fromDate(endOfDay);

      const snapshot = await db.collection('subscribers')
        .where('isActive', '==', true)
        .where('startDate', '>=', startTimestamp)
        .where('startDate', '<=', endTimestamp)
        .get();

      if (snapshot.empty) return [];

      // Filter for trials (price = 0)
      const newTrials = [];

      for (const doc of snapshot.docs) {
        const subscriber = { id: doc.id, ...doc.data() };
        try {
          const plan = await SubscriptionPlans.getSubscriptionPlan(subscriber.planId);
          if (plan && plan.price === 0) {
            newTrials.push(subscriber);
          }
        } catch (error) {
          console.error(`Error checking plan for subscriber ${subscriber.id}:`, error);
        }
      }

      return newTrials;
    } catch (error) {
      console.error('Error getting new trials:', error);
      return [];
    }
  },

  async getNewSubscriptions(startDate) {
    try {
      const startTimestamp = admin.firestore.Timestamp.fromDate(startDate);
      const endOfDay = new Date(startDate);
      endOfDay.setHours(23, 59, 59, 999);
      const endTimestamp = admin.firestore.Timestamp.fromDate(endOfDay);

      const snapshot = await db.collection('subscribers')
        .where('isActive', '==', true)
        .where('createdAt', '>=', startTimestamp)
        .where('createdAt', '<=', endTimestamp)
        .get();

      if (snapshot.empty) return [];

      // Filter for paid subscriptions (price > 0)
      const newSubscriptions = [];

      for (const doc of snapshot.docs) {
        const subscriber = { id: doc.id, ...doc.data() };
        try {
          const plan = await SubscriptionPlans.getSubscriptionPlan(subscriber.planId);
          if (plan && plan.price > 0) {
            newSubscriptions.push(subscriber);
          }
        } catch (error) {
          console.error(`Error checking plan for subscriber ${subscriber.id}:`, error);
        }
      }

      return newSubscriptions;
    } catch (error) {
      console.error('Error getting new subscriptions:', error);
      return [];
    }
  },

  async updateNotification(subscriberId, notificationType, value) {
    try {
      const subscriberRef = db.collection('subscribers').doc(subscriberId);
      const subscriberDoc = await subscriberRef.get();

      if (!subscriberDoc.exists) {
        throw new Error('Subscriber not found');
      }

      const currentNotifications = subscriberDoc.data().notifications || {};
      let updatedNotifications = { ...currentNotifications };

      if (Array.isArray(value)) {
        // For array types (like trialExpiring, subscriptionExpiring)
        if (!updatedNotifications[notificationType]) {
          updatedNotifications[notificationType] = [];
        }
        updatedNotifications[notificationType] = [
          ...new Set([...updatedNotifications[notificationType], ...value])
        ];
      } else {
        // For boolean types
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

  // In Subscribers model
async getFailedRenewals(sinceDate) {
  try {
    const sinceTimestamp = admin.firestore.Timestamp.fromDate(sinceDate);
    
    // First get all subscribers with failed payment status
    const failedPaymentsSnapshot = await db.collection('subscribers')
      .where('paymentStatus', '==', 'failed')
      .get();

    if (failedPaymentsSnapshot.empty) return [];

    // Then filter in memory for those updated since the target date
    const failedRenewals = [];
    
    for (const doc of failedPaymentsSnapshot.docs) {
      const subscriber = { id: doc.id, ...doc.data() };
      
      // Convert Firestore timestamp to Date for comparison
      const updatedAt = subscriber.updatedAt ? subscriber.updatedAt.toDate() : null;
      const sinceDateObj = sinceDate instanceof Date ? sinceDate : new Date(sinceDate);
      
      if (updatedAt && updatedAt >= sinceDateObj) {
        failedRenewals.push(subscriber);
      }
    }

    return failedRenewals;
  } catch (error) {
    console.error('Error getting failed renewals:', error);
    return [];
  }
},

async hasUsedTrial(userId) {
  try {
    const subscriber = await this.getByUserId(userId);
    if (!subscriber) {
      return false;
    }
    
    // Check if user has ever had a trial subscription
    const snapshot = await db.collection('subscribers')
      .where('userId', '==', userId)
      .get();
    
    if (snapshot.empty) {
      return false;
    }
    
    // Check if any subscription was a trial (price = 0)
    for (const doc of snapshot.docs) {
      const subscription = { id: doc.id, ...doc.data() };
      try {
        const plan = await SubscriptionPlans.getSubscriptionPlan(subscription.planId);
        if (plan && plan.price === 0) {
          return true; // User has used a trial before
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

module.exports = Subscribers;