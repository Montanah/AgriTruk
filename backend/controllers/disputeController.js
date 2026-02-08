const Dispute = require('../models/Dispute');
const User = require('../models/User');
const Transporter = require('../models/Transporter');
const { logActivity, logAdminActivity } = require('../utils/activityLogger');
const Notification = require('../models/Notification');
const Booking = require('../models/Booking');
const { formatTimestamps } = require('../utils/formatData');
const Action = require('../models/Action');
const sendEmail = require('../utils/sendEmail');
const Driver = require('../models/Driver');
const { adminNotification } = require('../utils/sendMailTemplate');

exports.createDispute = async (req, res) => {
  try {
    const {
      bookingId,
      transporterId,
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

    const booking = await Booking.get(bookingId).catch(() => null);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    // Try transporter or driver
    let transporterSnap = null;
    let driverSnap = null;

    try { transporterSnap = await Transporter.get(transporterId); } catch {}
    try { driverSnap = await Driver.getDriverIdByUserId(transporterId); } catch {}

    if (!transporterSnap && !driverSnap) {
      return res.status(404).json({ message: 'Transporter or driver not found' });
    }

    const userId = req.user.uid;

    const userSnap = await User.get(userId).catch(() => null);
    if (!userSnap) return res.status(404).json({ message: 'User not found' });

    const transporterType = transporterSnap ? 'transporter' : 'driver';

    const disputeData = {
      bookingId,
      openedBy: req.user.uid,
      transporterId,
      transporterType,
      userId,
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

    await Action.create({
      type: "dispute_created",
      entityId: dispute.disputeId,
      priority: "high",
      metadata: {
        userId: req.user.uid,
        transporterId,
        bookingId,
      },
      status: 'open',
      message: `Dispute created successfully. Dispute ID: ${dispute.disputeId}`,
    });

    await sendEmail({
      to: "support@trukafrica.com",
      subject: 'Dispute Created',
      html: adminNotification(
        "Dispute Created",
        `A new dispute has been created. Dispute ID: ${dispute.disputeId}`,
        "Check Disputes"
      ),
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
    const userId = req.user.uid;
    const dispute = await Dispute.get(disputeId);
    if (!dispute) {
      return res.status(404).json({ message: 'Dispute not found' });
    }

    // Security: Users can only access their own disputes unless they're admin
    // Check if user is admin or if they opened the dispute or are the transporter
    const userRole = req.user.role || (await User.get(userId).catch(() => null))?.role;
    const isAdmin = userRole === 'admin';
    const isOpener = dispute.openedBy === userId;
    const isTransporter = dispute.transporterId === userId;
    
    if (!isAdmin && !isOpener && !isTransporter) {
      return res.status(403).json({ 
        message: 'Access denied. You can only view disputes you are involved in.' 
      });
    }

    // Fetch the user who opened the dispute
    try {
      const user = await User.get(dispute.openedBy);
      dispute.openedBy = user;
    } catch (err) {
      dispute.openedBy = { error: 'User not found', id: dispute.openedBy };
    }

    // Fetch the transporter (if any) - try driver first if transporterType is 'driver'
    if (dispute.transporterId) {
      try {
        if (dispute.transporterType === 'driver') {
          const driver = await Driver.get(dispute.transporterId);
          dispute.transporter = driver;
        } else {
          const transporter = await Transporter.get(dispute.transporterId);
          dispute.transporter = transporter;
        }
      } catch (err) {
        // If one fails, try the other
        try {
          if (dispute.transporterType === 'driver') {
            const transporter = await Transporter.get(dispute.transporterId);
            dispute.transporter = transporter;
          } else {
            const driver = await Driver.get(dispute.transporterId);
            dispute.transporter = driver;
          }
        } catch (err2) {
          dispute.transporter = { error: 'Transporter/Driver not found', id: dispute.transporterId };
        }
      }
    }

    await logActivity(userId, 'get_dispute', req);

    res.status(200).json(dispute);
  } catch (err) {
    console.error('Get dispute error:', err);
    res.status(500).json({ message: 'Failed to fetch dispute' });
  }
};

exports.updateDispute = async (req, res) => {
  try {
    const { disputeId } = req.params;
    const userId = req.user.uid;
    const updates = req.body;
    
    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No updates provided' });
    }
    
    // Get the dispute first to check permissions
    const dispute = await Dispute.get(disputeId);
    if (!dispute) {
      return res.status(404).json({ message: 'Dispute not found' });
    }
    
    // Security: Only admin, opener, or transporter can update
    const userRole = req.user.role || (await User.get(userId).catch(() => null))?.role;
    const isAdmin = userRole === 'admin';
    const isOpener = dispute.openedBy === userId;
    const isTransporter = dispute.transporterId === userId;
    
    if (!isAdmin && !isOpener && !isTransporter) {
      return res.status(403).json({ 
        message: 'Access denied. You can only update disputes you are involved in.' 
      });
    }
    
    // Prevent non-admins from changing certain fields
    if (!isAdmin) {
      delete updates.status; // Only admin can change status
      delete updates.resolution; // Only admin can resolve
      delete updates.amountRefunded; // Only admin can set refunds
      delete updates.resolvedBy; // Only admin can set resolver
      delete updates.resolvedAt; // Only admin can set resolution date
    }
    
    const updatedDispute = await Dispute.update(disputeId, updates);

    await logActivity(userId, 'update_dispute', req);
   
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
    await logAdminActivity(req.user.uid, 'resolve_dispute', req);

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
    const userId = req.user.uid;
    
    // Verify user has access to this booking
    try {
      const booking = await Booking.get(bookingId);
      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }
      
      // Check if user is involved in the booking (client, transporter, driver, or admin)
      const userRole = req.user.role || (await User.get(userId).catch(() => null))?.role;
      const isAdmin = userRole === 'admin';
      const isClient = booking.clientId === userId || booking.userId === userId || booking.shipperId === userId;
      const isTransporter = booking.transporterId === userId;
      const isDriver = booking.driverId === userId || booking.assignedDriverId === userId;
      
      if (!isAdmin && !isClient && !isTransporter && !isDriver) {
        return res.status(403).json({ 
          message: 'Access denied. You can only view disputes for bookings you are involved in.' 
        });
      }
    } catch (err) {
      // If booking check fails, still allow admin to proceed
      const userRole = req.user.role || (await User.get(userId).catch(() => null))?.role;
      if (userRole !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Booking verification failed.' });
      }
    }
    
    const disputes = await Dispute.getByBookingId(bookingId);

    await logActivity(userId, 'get_disputes_by_booking_id', req);
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

    await logAdminActivity(req.user.uid, 'get_disputes_by_status', req);
    res.status(200).json(disputes);
  } catch (err) {
    console.error('Get disputes by status error:', err);
    res.status(500).json({ message: 'Failed to fetch disputes' });
  }
};

exports.getDisputesByOpenedBy = async (req, res) => {
  try {
    const { openedBy } = req.params;
    const userId = req.user.uid;
    
    // Security: Users can only access their own disputes unless they're admin
    // Check if user is admin or if openedBy matches the authenticated user
    const userRole = req.user.role || (await User.get(userId).catch(() => null))?.role;
    const isAdmin = userRole === 'admin';
    
    if (!isAdmin && openedBy !== userId) {
      return res.status(403).json({ 
        message: 'Access denied. You can only view your own disputes.' 
      });
    }
    
    const disputes = await Dispute.getByOpenedBy(openedBy);

    await logActivity(userId, 'get_disputes_by_opened_by', req);
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
    await logAdminActivity(req.user.uid, 'delete_dispute', req);
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

    for (const dispute of disputes) {
      // Fetch the user who opened the dispute
      try {
        const user = await User.get(dispute.openedBy);
        dispute.openedBy = user;
      } catch (err) {
        dispute.openedBy = { error: 'User not found', id: dispute.openedBy };
      }

      // Fetch the transporter (if any)
      if (dispute.transporterId) {
        try {
          const transporter = await Transporter.get(dispute.transporterId); // ✅ correct model
          dispute.transporter = transporter;
        } catch (err) {
          dispute.transporter = { error: 'Transporter not found', id: dispute.transporterId };
        }
      }
    }

    await logAdminActivity(req.user.uid, 'get_all_disputes', req);

    res.status(200).json({
      message: 'All disputes fetched successfully',
      data: formatTimestamps(disputes),
      count: disputes.length
    });
  } catch (err) {
    console.error('Get all disputes error:', err);
    res.status(500).json({ message: 'Failed to fetch disputes' });
  }
};

exports.getDisputeAdmin = async (req, res) => {
  try {
    const { disputeId } = req.params;
    const userId = req.user.uid;
    const dispute = await Dispute.get(disputeId);

    if (!dispute) {
      return res.status(404).json({ message: 'Dispute not found' });
    }

    // Security: Only admins or participants can view the dispute
    const userRecord = await User.get(userId).catch(() => null);
    const userRole = req.user.role || userRecord?.role;
    const isAdmin = userRole === 'admin';
    const isOpener = dispute.openedBy === userId;
    const isTransporter = dispute.transporterId === userId;

    if (!isAdmin && !isOpener && !isTransporter) {
      return res.status(403).json({
        message: 'Access denied. You can only view disputes you are involved in.',
      });
    }

    let user = null;
    let transporter = null;
    let driver = null;

    // Fetch the user who opened the dispute
    try {
      user = await User.get(dispute.openedBy);
      dispute.openedBy = user;
    } catch (err) {
      dispute.openedBy = { error: 'User not found', id: dispute.openedBy };
    }

    // Fetch the transporter/driver
    if (dispute.transporterId) {
      try {
        if (dispute.transporterType === 'driver') {
          driver = await Driver.get(dispute.transporterId);
          dispute.transporter = driver;
        } else {
          transporter = await Transporter.get(dispute.transporterId);
          dispute.transporter = transporter;
        }
      } catch (err) {
        try {
          // Fallback: try alternate lookup
          if (dispute.transporterType === 'driver') {
            transporter = await Transporter.get(dispute.transporterId);
            dispute.transporter = transporter;
          } else {
            driver = await Driver.getDriverIdByUserId(dispute.transporterId);
            dispute.transporter = driver;
          }
        } catch (err2) {
          dispute.transporter = { error: 'Transporter/Driver not found', id: dispute.transporterId };
        }
      }
    }

    await logAdminActivity(userId, 'get_dispute', req);

    res.status(200).json({
      message: 'Dispute fetched successfully',
      dispute: formatTimestamps(dispute),
      user: user ? formatTimestamps(user) : null,
      transporter: transporter
        ? formatTimestamps(transporter)
        : driver
        ? formatTimestamps(driver)
        : null,
    });
  } catch (err) {
    console.error('Get dispute error:', err);
    res.status(500).json({ message: 'Failed to fetch dispute' });
  }
};


