const ActivityLog = require("../models/ActivityLog");

const logActivity = async (uid, event, req) => {
  try {
    const metadata = req.metadata || {
      userAgent: req.headers['user-agent']
        ? req.headers['user-agent'].substring(0, 500).replace(/[^\x00-\x7F]/g, "")
        : 'unknown',
      ipAddress: req.ip || 'unknown',
      timestamp: admin.firestore.Timestamp.now()
    };
    await ActivityLog.log(uid, {
      event,
      device: metadata.userAgent,
      ip: metadata.ipAddress,
      timestamp: metadata.timestamp
    });
  } catch (error) {
    console.warn('Activity log error:', error);
  }
};

module.exports = logActivity;