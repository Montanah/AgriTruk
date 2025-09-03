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
};

module.exports = SubscriptionPlans;