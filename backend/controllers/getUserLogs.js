const ActivityLog = require("../models/ActivityLog");
// controller
exports.getUserLogs = async (req, res) => {
  try {
    const logs = await ActivityLog.getRecent(req.user.uid, Number(req.query.limit) || 20);
    res.status(200).json({ count: logs.length, logs });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch logs" });
  }
};

exports.createUserLog = async (req, res) => {
  try {
    const data = req.body;
    if (!data || !data.action) {
      return res.status(400).json({ message: "Invalid log data" });
    }
    
    const logEntry = await ActivityLog.log(req.user.uid, data);
    res.status(201).json({ message: "Log created successfully", log: logEntry });
  } catch (err) {
    res.status(500).json({ message: "Failed to create log" });
  }
}
