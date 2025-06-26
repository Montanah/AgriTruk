const CargoBooking = require('../models/CargoBooking');
const ActivityLog = require('../models/ActivityLog');
const admin = require('../config/firebase');

exports.createCargoBooking = async (req, res) => {
  try {
    const { fromLocation, toLocation, weightKg, cargoType, cargoValue, specialRequest, special } =
      req.body;

    const userId = req.user?.uid || null;
    if (!fromLocation || !toLocation || !weightKg || !cargoType || !cargoValue) {
      return res.status(400).json({
        code: 'ERR_MISSING_FIELDS',
        message: 'Required fields are missing',
      });
    }
    const requestId =
      req.body.requestId ||
      `AGR-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;
    const bookingData = {
      requestId,
      userId,
      fromLocation,
      toLocation,
      weightKg,
      cargoType,
      cargoValue,
      specialRequest,
      special: !!special,
    };

    const booking = await CargoBooking.create(bookingData);

    // Log activity
    const userAgent = req.headers['user-agent']
      ? req.headers['user-agent'].substring(0, 500).replace(/[^\x00-\x7F]/g, '')
      : 'unknown';
    await ActivityLog.log(req.user.uid, {
      event: 'create_cargo_booking',
      device: userAgent,
      ip: req.ip || 'unknown',
      timestamp: admin.firestore.Timestamp.now(),
    });

    res.status(201).json({
      message: 'CargoTRUK booking created successfully',
      booking,
    });
  } catch (error) {
    console.error('Create cargo booking error:', error);
    res.status(500).json({
      code: 'ERR_SERVER_ERROR',
      message: 'Failed to create cargoTRUK booking',
    });
  }
};
