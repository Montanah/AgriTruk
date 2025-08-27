const admin = require('../config/firebase');
const db = admin.firestore();
const { computeMetrics } = require("../services/analyticsService");
const Analytics = {

async create(date, range = "day") {
  try {
    // Helpers
    const getRangeDates = (baseDate, range) => {
      let startDate, endDate;
      switch (range) {
        case "day":
          startDate = new Date(baseDate.setHours(0, 0, 0, 0));
          endDate = new Date(baseDate.setHours(23, 59, 59, 999));
          break;
        case "week":
          startDate = new Date(baseDate);
          startDate.setDate(baseDate.getDate() - baseDate.getDay() + 1);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(startDate);
          endDate.setDate(startDate.getDate() + 6);
          endDate.setHours(23, 59, 59, 999);
          break;
        case "month":
          startDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
          endDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0, 23, 59, 59, 999);
          break;
        case "year":
          startDate = new Date(baseDate.getFullYear(), 0, 1);
          endDate = new Date(baseDate.getFullYear(), 11, 31, 23, 59, 59, 999);
          break;
      }
      return { startDate, endDate };
    };

    const percentChange = (current, prev) => {
      if (prev === 0) return 0;
      return ((current - prev) / prev) * 100;
    };

    // Current period
    const baseDate = new Date(`${date}T00:00:00.000Z`);
    const { startDate, endDate } = getRangeDates(new Date(baseDate), range);
    const current = await computeMetrics(startDate, endDate);

    // Previous period
    let prevBase;
    switch (range) {
      case "day": prevBase = new Date(baseDate); prevBase.setDate(prevBase.getDate() - 1); break;
      case "week": prevBase = new Date(baseDate); prevBase.setDate(prevBase.getDate() - 7); break;
      case "month": prevBase = new Date(baseDate); prevBase.setMonth(prevBase.getMonth() - 1); break;
      case "year": prevBase = new Date(baseDate); prevBase.setFullYear(prevBase.getFullYear() - 1); break;
    }
    const { startDate: prevStart, endDate: prevEnd } = getRangeDates(prevBase, range);
    const previous = await computeMetrics(prevStart, prevEnd);

    // Add comparisons
    const comparisons = {};
    for (const key of Object.keys(current)) {
      comparisons[`${key}Change`] = percentChange(current[key], previous[key] || 0);
    }
    const analytics = {
      range,
      date,
      startDate,
      endDate,
      ...current,
      comparisons,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    };

    await db.collection("analytics").doc(`${range}_${date}`).set(analytics);
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

  async getDay(date) {
    const doc = await db.collection('analytics').where('date', '==', date).get();
    if (!doc.exists) return null;
    return doc.data();
  },

  async getWeek(date) {
    const doc = await db.collection('analytics').where('date', '==', date) && db.collection('analytics').where('range', '==', 'week').get();
    if (!doc.exists) return null;
    return doc.data();
  },
};

module.exports = Analytics;