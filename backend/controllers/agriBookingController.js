const AgriBooking = require('../models/AgriBooking');
const ActivityLog = require('../models/ActivityLog');
const admin = require('../config/firebase');

exports.createAgriBooking = async (req, res) => {
  try {
    const {
      weightKg,
      productType,
      specialRequest,
      perishable,
      needsRefrigeration,
      urgentDelivery,
      fromLocation,
      toLocation,
    } = req.body;

    const user = req.user?.uid || null;

    if (!fromLocation || !toLocation || !weightKg || !productType) {
      return res.status(400).json({ message: 'Required fields are missing' });
    }

    const requestId =
      req.body.requestId ||
      `AGR-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;

    const bookingData = {
      requestId,
      userId: user,
      weightKg,
      productType,
      specialRequest,
      perishable: !!perishable,
      needsRefrigeration: !!needsRefrigeration,
      urgentDelivery: !!urgentDelivery,
      fromLocation,
      toLocation,
      status: 'pending',
    };

    const booking = await AgriBooking.create(bookingData);

    // Log activity
    const userAgent = req.headers['user-agent']
      ? req.headers['user-agent'].substring(0, 500).replace(/[^\x00-\x7F]/g, '')
      : 'unknown';
    await ActivityLog.log(req.user.uid, {
      event: 'create_agri_booking',
      device: userAgent,
      ip: req.ip || 'unknown',
      timestamp: admin.firestore.Timestamp.now(),
    });

    res.status(201).json({
      message: 'AgriTRUK booking created successfully',
      booking,
    });
  } catch (error) {
    console.error('Create agri booking error:', error);
    res.status(500).json({
      code: 'ERR_SERVER_ERROR',
      message: 'Failed to create agriTRUK booking',
    });
  }
};

exports.acceptAgriBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { transporterId, vehicleId } = req.body;
    const driverId = req.user.uid;

    if (!transporterId || !vehicleId) {
      return res.status(400).json({ message: 'Transporter and vehicle IDs are required' });
    }

    const updates = await AgriBooking.acceptBooking(bookingId, transporterId, vehicleId);

    // Log the acceptance
    const userAgent = req.headers['user-agent']
      ? req.headers['user-agent'].substring(0, 500).replace(/[^\x00-\x7F]/g, '')
      : 'unknown';
    await ActivityLog.log(driverId, {
      event: 'accept_agri_booking',
      bookingId,
      device: userAgent,
      ip: req.ip || 'unknown',
    });

    res.status(200).json({
      message: 'Booking accepted successfully',
      booking: updates,
    });
  } catch (error) {
    console.error('Accept booking error:', error);
    res.status(500).json({
      code: 'ERR_SERVER_ERROR',
      message: 'Failed to accept booking',
    });
  }
};
