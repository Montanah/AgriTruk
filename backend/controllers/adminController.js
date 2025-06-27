const Transporter = require("../models/Transporter");
const logActivity = require("../utils/activityLogger");

exports.approveTransporter = async (req, res) => {
  try {
    const updated = await Transporter.approve(req.params.transporterId);
    await logActivity(req.user.uid, 'approve_transporter', req);
    res.status(200).json({ message: 'Transporter approved', updated });
  } catch (error) {
    console.error('Approve transporter error:', error);
    res.status(500).json({ message: 'Failed to approve transporter' });
  }
};

exports.rejectTransporter = async (req, res) => {
  try {
    const reason = req.body.reason || 'Unqualified';
    const result = await Transporter.reject(req.params.transporterId, reason); 
    await logActivity(req.user.uid, 'reject_transporter', req);
    res.status(200).json({ message: 'Transporter rejected', result });
  } catch (err) {
    console.error('Reject transporter error:', err);
    res.status(500).json({ message: 'Failed to reject transporter' });
  }
};


exports.deleteTransporter = async (req, res) => {
  try {
    await Transporter.delete(req.params.transporterId);
    await logActivity(req.user.uid, 'delete_transporter', req);
    res.status(200).json({ message: 'Transporter deleted successfully' });
  } catch (error) {
    console.error('Delete transporter error:', error);
    res.status(500).json({ message: 'Failed to delete transporter' });
  }
};