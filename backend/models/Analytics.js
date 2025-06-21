const admin = require("../config/firebase");
const db = admin.firestore(); 

const Analytics = {
  async create(analyticsData) {
    const analytics = {
      date: analyticsData.date,
      dailyActiveUsers: analyticsData.dailyActiveUsers || 0,
      bookingCompletionRate: analyticsData.bookingCompletionRate || 0,
      totalRevenue: analyticsData.totalRevenue || 0,
      failedPayments: analyticsData.failedPayments || 0,
      activeTransporters: analyticsData.activeTransporters || 0,
      pendingRequests: analyticsData.pendingRequests || 0,
      createdAt: admin.firestore.Timestamp.now()
    };
    await db.collection('analytics').doc(analytics.date).set(analytics);
    return analytics;
  },
  async get(date) {
    const doc = await db.collection('analytics').doc(date).get();
    if (!doc.exists) throw new Error('Analytics not found');
    return doc.data();
  },
  async update(date, updates) {
    const updated = { ...updates, updatedAt: admin.firestore.Timestamp.now() };
    await db.collection('analytics').doc(date).update(updated);
    return updated;
  }
};

module.exports = Analytics;