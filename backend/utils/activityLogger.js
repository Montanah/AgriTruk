const admin = require("../config/firebase");
const ActivityLog = require("../models/ActivityLog");
const AdminActivityLog = require("../models/AdminActivityLog");

// Shared metadata extraction
const getRequestMetadata = (req) => {
  return {
    userAgent: req.headers['user-agent']
      ? req.headers['user-agent'].substring(0, 500).replace(/[^\x00-\x7F]/g, "")
      : 'unknown',
    ipAddress: req.ip || 'unknown',
    timestamp: admin.firestore.Timestamp.now()
  };
};

const logActivity = async (uid, event, req) => {
  try {
    const metadata = req.metadata || getRequestMetadata(req);
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

const logAdminActivity = async (adminId, event, req, target = null) => {
  try {
    const metadata = req.metadata || getRequestMetadata(req);
   
    await AdminActivityLog.log(adminId, {
      action: event,
      target, 
      device: metadata.userAgent,
      ip: metadata.ipAddress,
      timestamp: metadata.timestamp
    });
    
  } catch (error) {
    console.warn('Admin activity log error:', error);
    throw error; // Re-throw if you want calling code to handle it
  }
};

// Export both functions properly
module.exports = {
  logActivity,
  logAdminActivity
};