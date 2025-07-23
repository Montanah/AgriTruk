const admin = require('../config/firebase');
const db = admin.firestore();

const Analytics = {
  async create(date) {
    try {
      // Define start and end of the day for the given date
      const startOfDay = new Date(`${date}T00:00:00.000Z`);
      const endOfDay = new Date(`${date}T23:59:59.999Z`);

      // Compute dailyActiveUsers by querying userActivity collection
      const userActivitySnapshot = await db
        .collection('userActivity')
        .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(startOfDay))
        .where('timestamp', '<=', admin.firestore.Timestamp.fromDate(endOfDay))
        .get();

      const uniqueUserIds = new Set(userActivitySnapshot.docs.map(doc => doc.data().userId));
      const dailyActiveUsers = uniqueUserIds.size;

      // Example: Compute other metrics (you can add similar logic for other fields)
      const bookingsSnapshot = await db
        .collection('bookings')
        .where('date', '==', date)
        .get();
      const totalBookings = bookingsSnapshot.size;
      const completedBookings = bookingsSnapshot.docs.filter(
        doc => doc.data().status === 'completed'
      ).length;
      const bookingCompletionRate = totalBookings > 0 ? (completedBookings / totalBookings) : 0;

      // Construct analytics data
      const analytics = {
        date,
        dailyActiveUsers,
        bookingCompletionRate,
        totalRevenue: 0, // Add logic to compute from payments collection if needed
        failedPayments: 0, // Add logic to compute
        activeTransporters: 0, // Add logic to compute
        pendingRequests: 0, // Add logic to compute
        activeBookings: totalBookings,
        activeSubscribers: 0, // Add logic to compute
        newUsers: 0, // Add logic to compute
        mpesaSuccessRate: 0, // Add logic to compute
        airtelSuccessRate: 0, // Fixed typo from AirtelSuccessRate
        paystackSuccessRate: 0, // Add logic to compute
        avgCompletionTime: 0, // Add logic to compute
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
      };

      // Save to analytics collection
      await db.collection('analytics').doc(date).set(analytics);
      return analytics;
    } catch (error) {
      throw new Error(`Failed to create analytics: ${error.message}`);
    }
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
  },

  async getRange(startDate, endDate) {
    const snapshot = await db
      .collection('analytics')
      .where('date', '>=', startDate)
      .where('date', '<=', endDate)
      .orderBy('date')
      .get();
    return snapshot.docs.map(doc => doc.data());
  },
};

module.exports = Analytics;