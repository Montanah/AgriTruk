const admin = require("../config/firebase");
const db = admin.firestore();

const RecruiterPlans = {
  
  async create(planData) {
    try {   
      const planId = db.collection('recruiter_plans').doc().id;
      
      const plan = {
        planId,
        name: planData.name,
        description: planData.description,
        price: planData.price,
        currency: planData.currency || 'KES',
        billingCycle: planData.billingCycle, // '24-hours', '7-days', '30-days', 'trial'
        duration: planData.duration, // in days: 1, 7, 30
        trialDays: planData.trialDays || null,
        features: {
          accessDuration: planData.features?.accessDuration, // "24 hours", "7 days", "30 days"
          maxDriverContacts: planData.features?.maxDriverContacts, // 5, 20, or "unlimited"
          maxActiveJobPosts: planData.features?.maxActiveJobPosts, // 1, 3, or "unlimited"
          driverProfileViewing: planData.features?.driverProfileViewing || true,
          documentsAccess: planData.features?.documentsAccess || true,
          featuredListings: planData.features?.featuredListings || false,
          supportLevel: planData.features?.supportLevel || 'basic', // 'basic', 'priority', 'dedicated'
        },
        isActive: planData.isActive !== undefined ? planData.isActive : true,
        isPopular: planData.isPopular || false,
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
      };

      await db.collection('recruiter_plans').doc(planId).set(plan);
      return plan;
    } catch (error) {
      console.error('Error creating recruiter plan:', error);
      throw error;
    }
  },

  async get(planId) {
    const doc = await db.collection('recruiter_plans').doc(planId).get();
    if (!doc.exists) throw new Error('Plan not found');
    return { id: doc.id, ...doc.data() };
  },

  async getAll() {
    const snapshot = await db.collection('recruiter_plans')
      .where('isActive', '==', true)
      .orderBy('price', 'asc')
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async update(planId, updates) {
    const updated = { ...updates, updatedAt: admin.firestore.Timestamp.now() };
    await db.collection('recruiter_plans').doc(planId).update(updated);
    return updated;
  },

  async delete(planId) {
    await db.collection('recruiter_plans').doc(planId).update({ 
      isActive: false, 
      updatedAt: admin.firestore.Timestamp.now() 
    });
  },

  isUnlimited(value) {
    return value === 'unlimited' || value === -1;
  },

  async getTrialPlan() {
    const snapshot = await db.collection('recruiter_plans')
      .where('billingCycle', '==', 'trial')
      .where('isActive', '==', true)
      .limit(1)
      .get();
    
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
  },
};

module.exports = RecruiterPlans;