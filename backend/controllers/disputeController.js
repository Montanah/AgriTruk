const AgriBooking = require('../models/AgriBooking');
const CargoBooking = require('../models/CargoBooking');
const Dispute = require('../models/Dispute');
const Transporter = require('../models/Transporter');
const User = require('../models/User');
const { logActivity, logAdminActivity } = require('../utils/activityLogger');
const Notification = require('../models/Notification');

exports.createDispute = async (req, res) => {
  try {
    const {
      bookingId,
      transporterId,
      userId,
      reason,
      status,
      priority,
      comments,
      evidence
    } = req.body;

    if (!bookingId || !transporterId || !reason) {
      return res.status(400).json({
        message: "bookingId, transporterId, and reason are required"
      });
    }

    // Try Agri or Cargo booking
    let booking = null;
    try {
      booking = await AgriBooking.get(bookingId);
    } catch (e1) {
      try {
        booking = await CargoBooking.get(bookingId);
      } catch (e2) {
        return res.status(404).json({ message: 'Booking not found' });
      }
    }

    const transporterSnap = await Transporter.get(transporterId);
    if (!transporterSnap) {
      return res.status(404).json({ message: 'Transporter not found' });
    }

    const userSnap = await User.get(userId);
    if (!userSnap) {
      return res.status(404).json({ message: 'User not found' });
    }

    const disputeData = {
      bookingId,
      openedBy: req.user.uid,
      transporterId,
      userId: userId,
      reason,
      status: status || 'open',
      priority: priority || 'medium',
      comments: comments || '',
      evidence: evidence || []
    };

    const dispute = await Dispute.create(disputeData);
    await logActivity(req.user.uid, 'create_dispute', req);

    await Notification.create({
      type: "Create Dispute",
      message: `You created a new dispute. Dispute ID: ${dispute.disputeId}`,
      userId: req.user.uid,
      userType: "business",
    });

    res.status(201).json({ message: 'Dispute created successfully', dispute });
  } catch (err) {
    console.error('Create dispute error:', err);
    res.status(500).json({ message: 'Failed to create dispute' });
  }
};


exports.getDispute = async (req, res) => {
  try {
    const { disputeId } = req.params;
    const dispute = await Dispute.get(disputeId);
    if (!dispute) return res.status(404).json({ message: 'Dispute not found' });

    await logAdminActivity(req.admin.adminId, 'get_dispute', req);

    res.status(200).json(dispute);
  } catch (err) {
    console.error('Get dispute error:', err);
    res.status(500).json({ message: 'Failed to fetch dispute' });
  }
};

exports.updateDispute = async (req, res) => {
  try {
    const { disputeId } = req.params;
    const updates = req.body;
    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No updates provided' });
    }
    const updatedDispute = await Dispute.update(disputeId, updates);

    await logAdminActivity(req.admin.adminId, 'update_dispute', req);
   
    res.status(200).json({ message: 'Dispute updated successfully', dispute: updatedDispute });
  } catch (err) {
    console.error('Update dispute error:', err);
    if (err.message === 'Dispute not found') {
      res.status(404).json({ message: err.message });
    } else {
      res.status(500).json({ message: 'Failed to update dispute' });
    }
  }
};

exports.resolveDispute = async (req, res) => {
  try {
    const { disputeId } = req.params;
    const resolutionData = {
      resolution: req.body.resolution,
      amountRefunded: req.body.amountRefunded,
      comments: req.body.comments,
      resolvedBy: req.user.uid,
    };
    const resolvedDispute = await Dispute.resolve(disputeId, resolutionData);
    await logAdminActivity(req.admin.adminId, 'resolve_dispute', req);

    res.status(200).json({ message: 'Dispute resolved successfully', dispute: resolvedDispute });
  } catch (err) {
    console.error('Resolve dispute error:', err);
    if (err.message === 'Dispute not found') {
      res.status(404).json({ message: err.message });
    } else if (err.message === 'Resolution details are required') {
      res.status(400).json({ message: err.message });
    } else {
      res.status(500).json({ message: 'Failed to resolve dispute' });
    }
  }
};

exports.getDisputesByBookingId = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const disputes = await Dispute.getByBookingId(bookingId);

    await logAdminActivity(req.admin.adminId, 'get_disputes_by_booking_id', req);
    res.status(200).json(disputes);
  } catch (err) {
    console.error('Get disputes by booking ID error:', err);
    res.status(500).json({ message: 'Failed to fetch disputes' });
  }
};

exports.getDisputesByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    const disputes = await Dispute.getByStatus(status);

    await logAdminActivity(req.admin.adminId, 'get_disputes_by_status', req);
    res.status(200).json(disputes);
  } catch (err) {
    console.error('Get disputes by status error:', err);
    res.status(500).json({ message: 'Failed to fetch disputes' });
  }
};

exports.getDisputesByOpenedBy = async (req, res) => {
  try {
    const { openedBy } = req.params;
    const disputes = await Dispute.getByOpenedBy(openedBy);

    await logAdminActivity(req.admin.adminId, 'get_disputes_by_opened_by', req);
    res.status(200).json(disputes);
  } catch (err) {
    console.error('Get disputes by openedBy error:', err);
    res.status(500).json({ message: 'Failed to fetch disputes' });
  }
};

exports.deleteDispute = async (req, res) => {
  try {
    const { disputeId } = req.params;
    await Dispute.delete(disputeId);
    await logAdminActivity(req.admin.adminId, 'delete_dispute', req);
    res.status(200).json({ message: 'Dispute marked as deleted successfully' });
  } catch (err) {
    console.error('Delete dispute error:', err);
    if (err.message === 'Dispute not found') {
      res.status(404).json({ message: err.message });
    } else {
      res.status(500).json({ message: 'Failed to delete dispute' });
    }
  }
};

exports.getAllDisputes = async (req, res) => {
  try {
    const disputes = await Dispute.getAll();
    await logAdminActivity(req.admin.adminId, 'get_all_disputes', req);
    res.status(200).json(disputes);
  } catch (err) {
    console.error('Get all disputes error:', err);
    res.status(500).json({ message: 'Failed to fetch disputes' });
  }
};