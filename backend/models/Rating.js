const admin = require("../config/firebase");
const db = admin.firestore();

const Rating = {
  async create(data) {
    const rating = {
      ratingId: db.collection("ratings").doc().id,
      bookingId: data.bookingId,
      transporterId: data.transporterId,
      userId: data.userId,
      rating: data.rating,
      comment: data.comment || '',
      createdAt: admin.firestore.Timestamp.now()
    };
    await db.collection("ratings").doc(rating.ratingId).set(rating);
    return rating;
  },

  async getAllForTransporter(transporterId) {
    const snapshot = await db.collection("ratings")
      .where("transporterId", "==", transporterId)
      .get();

    return snapshot.docs.map(doc => doc.data());
  },

  async getAverageForTransporter(transporterId) {
    const ratings = await this.getAllForTransporter(transporterId);
    if (ratings.length === 0) return 0;
    const total = ratings.reduce((sum, r) => sum + r.rating, 0);
    return (total / ratings.length).toFixed(1);
  }
};

module.exports = Rating;
