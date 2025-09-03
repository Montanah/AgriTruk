const admin = require("../config/firebase");

const requestMetadata = (req, res, next) => {
  req.metadata = {
    userAgent: req.headers['user-agent']
      ? req.headers['user-agent'].substring(0, 500).replace(/[^\x00-\x7F]/g, "")
      : 'unknown',
    ipAddress: req.ip || 'unknown',
    timestamp: admin.firestore.Timestamp.now()
  };
  next();
};

module.exports = requestMetadata;