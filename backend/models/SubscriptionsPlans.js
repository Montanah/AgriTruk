const admin = require('../config/firebase');
const db = admin.firestore();

const SubscriptionPlans = {
    async createSubscriptionPlan(planData) {
        const planId = db.collection('subscriptionPlans').doc().id;
        //console.log("planId", planId);
        const plan =  {
            planId,
            name: planData.name,
            duration: planData.duration,
            price: planData.price,
            currency: planData.currency || "KES",
            features: Array.isArray(planData.features) ? planData.features : [planData.features],
            // features:
            // {
            //     name: planData.features.name,
            //     description: planData.features.description,
            //     isPremium: planData.features.isPremium
            // },
            isActive: planData.isActive || false,
            savingsAmount: planData.savingsAmount,
            savingsPercentage: planData.savingsPercentage,
            createdAt: admin.firestore.Timestamp.now(),
            updatedAt: admin.firestore.Timestamp.now()
        }
        await db.collection('subscriptionPlans').doc(planId).set(plan);
        return plan;
    },

    async updateSubscriptionPlan(planId, updates) {
        const updated = { ...updates, updatedAt: admin.firestore.Timestamp.now() };
        await db.collection('subscriptionPlans').doc(planId).update(updated);
        return updated;
    },

    async getSubscriptionPlan(planId) {
        const doc = await db.collection('subscriptionPlans').doc(planId).get();
        if (!doc.exists) return [];
        return { id: doc.id, ...doc.data() };
    },

    async getAllSubscriptionPlans() {
        const snapshot = await db.collection('subscriptionPlans').get();
        const plans = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return plans;
    },

    async deleteSubscriptionPlan(planId) {
        await db.collection('subscriptionPlans').doc(planId).delete();
    },

    async getAllPlans() {
    const snapshot = await db.collection('subscriptionPlans')
      .where('isActive', '==', true)
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async getActivePlans() {
    const snapshot = await db.collection('subscriptionPlans')
      .where('isActive', '==', true)
      .where('billingCycle', '!=', 'trial')
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async getTrialPlan() {
    const snapshot = await db.collection('subscriptionPlans')
      .where('billingCycle', '==', 'trial')
      .where('isActive', '==', true)
      .limit(1)
      .get();
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
  },

  async updatePlan(planId, updates) {
    const updated = { 
      ...updates, 
      updatedAt: admin.firestore.Timestamp.now() 
    };
    await db.collection('subscriptionPlans').doc(planId).update(updated);
    return updated;
  },

  // Helper to check if feature is available in plan
  hasFeature(plan, featureName) {
    return plan.features && plan.features[featureName];
  },

  // Helper to get limit value
  getLimit(plan, limitName) {
    return plan.features && plan.features[limitName];
  },

  // Check if limit is unlimited (-1)
  isUnlimited(limit) {
    return limit === -1;
  },

};

module.exports = SubscriptionPlans;