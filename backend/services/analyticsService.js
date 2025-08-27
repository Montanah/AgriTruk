const admin = require("firebase-admin");
const db = admin.firestore();

/**
 * Compute analytics for a given date range
 */
async function computeMetrics(startDate, endDate) {
  // ---- Active Users ----
  const userActivitySnapshot = await db
    .collection("userActivity")
    .where("timestamp", ">=", admin.firestore.Timestamp.fromDate(startDate))
    .where("timestamp", "<=", admin.firestore.Timestamp.fromDate(endDate))
    .get();

  const uniqueUserIds = new Set(userActivitySnapshot.docs.map(doc => doc.data().userId));
  const activeUsers = uniqueUserIds.size;

  // ---- Cargo Bookings ----
  const cargoBookingsSnapshot = await db
    .collection("cargoBookings")
    .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(startDate))
    .where("createdAt", "<=", admin.firestore.Timestamp.fromDate(endDate))
    .get();

  const totalCargoBookings = cargoBookingsSnapshot.size;
  const completedCargo = cargoBookingsSnapshot.docs.filter(doc => doc.data().status === "completed").length;
  const cargoCompletionRate = totalCargoBookings > 0 ? (completedCargo / totalCargoBookings) : 0;

  const allTimeCargoBookings = await db.collection("cargoBookings").get();
  const totalCargoBookingsAllTime = allTimeCargoBookings.size;
  const completedCargoAllTime = allTimeCargoBookings.docs.filter(doc => doc.data().status === "completed").length;
  const cargoCompletionRateAllTime = totalCargoBookingsAllTime > 0 ? (completedCargoAllTime / totalCargoBookingsAllTime) : 0;

  // ---- Agri Bookings ----
  const agriBookingsSnapshot = await db
    .collection("agriBookings")
    .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(startDate))
    .where("createdAt", "<=", admin.firestore.Timestamp.fromDate(endDate))
    .get();

  const totalAgriBookings = agriBookingsSnapshot.size;
  const completedAgri = agriBookingsSnapshot.docs.filter(doc => doc.data().status === "completed").length;
  const agriCompletionRate = totalAgriBookings > 0 ? (completedAgri / totalAgriBookings) : 0;

  // ---- Avg Completion Time ----
  const allCompleted = [
    ...cargoBookingsSnapshot.docs.filter(doc => doc.data().status === "completed"),
    ...agriBookingsSnapshot.docs.filter(doc => doc.data().status === "completed"),
  ];
  let avgCompletionTime = 0;
  if (allCompleted.length > 0) {
    const totalTime = allCompleted.reduce((sum, doc) => {
      const data = doc.data();
      if (data.completedAt && data.createdAt) {
        const duration = data.completedAt.toDate() - data.createdAt.toDate();
        return sum + duration;
      }
      return sum;
    }, 0);
    avgCompletionTime = totalTime / allCompleted.length / (1000 * 60 * 60); // in hours
  }
  
  const allTimeAgriBookings = await db.collection("agriBookings").get();
  const totalAgriBookingsAllTime = allTimeAgriBookings.size;
  
  // ---- Transporters ----
  const transportersSnapshot = await db.collection("transporters").where("status", "==", "approved").get();
  const activeTransporters = transportersSnapshot.size;

  // ---- Users ----
  const usersSnapshot = await db.collection("users").get();
  const totalUsers = usersSnapshot.size;
  const newUsers = usersSnapshot.docs.filter(doc =>
    doc.data().createdAt.toDate() >= startDate && doc.data().createdAt.toDate() <= endDate
  ).length;

  // ---- Subscribers ----
  const subsSnapshot = await db.collection("subscribers").get();
  const totalSubscribers = subsSnapshot.size;
  const activeSubscribers = subsSnapshot.docs.filter(doc => doc.data().isActive).length;

  // ---- Payments ----
  const paymentsSnapshot = await db
    .collection("payments")
    .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(startDate))
    .where("createdAt", "<=", admin.firestore.Timestamp.fromDate(endDate))
    .get();

  let mpesaSuccess = 0, mpesaTotal = 0;
  let airtelSuccess = 0, airtelTotal = 0;
  let paystackSuccess = 0, paystackTotal = 0;
  let cardSuccess = 0, cardTotal = 0;
  let totalRevenue = 0, failedPayments = 0;

  paymentsSnapshot.docs.forEach(doc => {
    const data = doc.data();
    if (!data.method || !data.status) return;

    if (data.status === "success" && data.amount) {
      totalRevenue += data.amount;
    }
    if (data.status === "failed") failedPayments++;

    switch (data.method.toLowerCase()) {
      case "mpesa":
        mpesaTotal++;
        if (data.status === "success") mpesaSuccess++;
        break;
      case "airtel":
        airtelTotal++;
        if (data.status === "success") airtelSuccess++;
        break;
      case "paystack":
        paystackTotal++;
        if (data.status === "success") paystackSuccess++;
        break;
      case "card":
        cardTotal++;
        if (data.status === "success") cardSuccess++;
        break;
    }
  });

  const mpesaSuccessRate = mpesaTotal > 0 ? (mpesaSuccess / mpesaTotal) * 100 : 0;
  const airtelSuccessRate = airtelTotal > 0 ? (airtelSuccess / airtelTotal) * 100 : 0;
  const paystackSuccessRate = paystackTotal > 0 ? (paystackSuccess / paystackTotal) * 100 : 0;
  const cardSuccessRate = cardTotal > 0 ? (cardSuccess / cardTotal) * 100 : 0;

  // ---- Brokers ----
  const brokersSnapshot = await db.collection("brokers").where("status", "==", "approved").get();
  const activeBrokers = brokersSnapshot.size;


  return {
    activeUsers,
    activeBrokers,
    totalCargoBookings,
    totalAgriBookings,
    cargoCompletionRate,
    agriCompletionRate,
    avgCompletionTime,
    totalRevenue,
    failedPayments,
    totalUsers,
    activeTransporters,
    activeBookings: totalCargoBookings + totalAgriBookings,
    totalSubscribers,
    activeSubscribers,
    newUsers,
    mpesaSuccessRate,
    airtelSuccessRate,
    paystackSuccessRate,
    cardSuccessRate,
    totalCargoBookingsAllTime,
    totalAgriBookingsAllTime
  };
}

module.exports = { computeMetrics };
