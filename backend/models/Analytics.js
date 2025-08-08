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
        .collection('cargoBookings')
        .where('date', '==', date)
        .get();
      const totalBookings = await db.collection('cargoBookings').get();
      const totalCargoBookings = totalBookings.size;
      const completedBookings = bookingsSnapshot.docs.filter(
        doc => doc.data().status === 'completed'
      ).length;
      const bookingCompletionRate = totalBookings > 0 ? (completedBookings / totalBookings) : 0;

      const agriBookingsSnapshot = await db
        .collection('agriBookings')
        .where('date', '==', date)
        .get();
      const totalAgri = await db.collection('agriBookings').get();
      const totalAgriBookings = totalAgri.size;
      const completedAgriBookings = agriBookingsSnapshot.docs.filter(
        doc => doc.data().status === 'completed'
      ).length;
      const agriBookingCompletionRate = totalAgriBookings > 0 ? (completedAgriBookings / totalAgriBookings) : 0;  

      const transportersSnapshot = await db
        .collection('transporters')
        .where('status', '==', 'approved')
        .get();
      const activeTransporters = transportersSnapshot.size;

      const usersSnapshot = await db.collection('users').get();
      const totalUsers = usersSnapshot.size;
      const newUsers = usersSnapshot.docs.filter(doc => doc.data().createdAt.toDate() >= startOfDay).length;

      // Construct analytics data
      const analytics = {
        date,
        dailyActiveUsers,
        totalCargoBookings,
        totalAgriBookings,
        bookingCompletionRate,
        agriBookingCompletionRate,
        totalRevenue: 0, // Add logic to compute from payments collection if needed
        failedPayments: 0, // Add logic to compute
        totalUsers,
        activeTransporters, 
        pendingRequests: 0, // Add logic to compute
        activeBookings: totalBookings + totalAgriBookings,
        activeSubscribers: 0, // Add logic to compute
        newUsers, // Add logic to compute
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