const { Timestamp } = require('firebase-admin/firestore');
const { scheduleRecurringBookings } = require('../services/bookingService');
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');
const { logActivity } = require('../utils/activityLogger');
const { formatTimestamps } = require('../utils/formatData');
const geolib = require('geolib');
const Transporter = require('../models/Transporter');

exports.createBooking = async (req, res) => {
  try {
    const {
      bookingType = "Agri",
      bookingMode = "instant",
      weightKg,
      productType,
      specialRequest,
      perishable,
      needsRefrigeration,
      humidyControl,
      value,
      urgencyLevel,
      insured,
      priority,
      recurrence,
      fromLocation,
      toLocation,
      pickUpDate,
      additionalNotes,
      specialCargo = [], 
      consolidated
    } = req.body;

    const user = req.user?.uid || null;

    // Validate bookingType
    if (!['Agri', 'Cargo'].includes(bookingType)) {
      return res.status(400).json({ message: 'Invalid booking type. Use "Agri" or "Cargo"' });
    }

    //Validated bookingMode
    if (!['instant', 'booking'].includes(bookingMode)) {
      return res.status(400).json({ message: 'Invalid booking mode. Use "instant" or "booking"' });
    }

    // Validate required fields
    if (!fromLocation || !toLocation || !weightKg || !productType) {
      return res.status(400).json({ message: 'Required fields are missing' });
    }

    let validatedPickUpDate = null;
    if (bookingMode === 'booking') { 
      if (!pickUpDate) {
        return res.status(400).json({ message: 'pickUpDate is required for booking type' });
      }
      validatedPickUpDate = new Date(pickUpDate);
      if (isNaN(validatedPickUpDate.getTime())) {
        return res.status(400).json({ message: 'Invalid pickUpDate format' });
      }
    }

    // Validate urgencyLevel
    const validUrgencyLevels = ['Low', 'Medium', 'High'];
    if (urgencyLevel && !validUrgencyLevels.includes(urgencyLevel)) {
      return res.status(400).json({ message: 'Invalid urgency level' });
    }

    // Validate recurrence if provided
    let recurrenceData = {
      isRecurring: false,
      frequency: null,
      timeFrame: null,
      duration: null,
      startDate: null,
      endDate: null,
      interval:1,
      occurences: [],
      baseBookingId: null
    };
    if (recurrence && recurrence.isRecurring) {
      const { frequency, timeFrame, duration } = recurrence;
      if (!frequency || !timeFrame || !duration) {
        return res.status(400).json({ message: 'Frequency, timeFrame, and duration are required for recurring requests' });
      }
      recurrenceData = {
        isRecurring: true,
        frequency,
        timeFrame,
        duration,
        startDate: validatedPickUpDate ? Timestamp.fromDate(validatedPickUpDate) : Timestamp.now(),
        endDate: calculateEndDate(validatedPickUpDate || new Date(), duration),
        occurences: [],
        baseBookingId: null,
        interval: 1,
      };
    }

    // Validate specialCargo for Cargo type
    const validSpecialCargo = ['Fragile', 'Oversized', 'Hazardous', 'Temperature Controlled', 'High Value', 'Livestock/Animals', 'Bulk', 'Perishable', 'Other'];
    if (bookingType === 'Cargo' && specialCargo.length > 0) {
      const invalidItems = specialCargo.filter(item => !validSpecialCargo.includes(item));
      if (invalidItems.length > 0) {
        return res.status(400).json({ message: `Invalid special cargo types: ${invalidItems.join(', ')}` });
      }
    }

    // Generate requestId
    const requestId = req.body.requestId || 
      `${bookingType[0].toUpperCase()}-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;

    // Prepare booking data
    const bookingData = {
      requestId,
      bookingType,
      bookingMode,
      userId: user,
      weightKg,
      productType,
      specialRequest,
      perishable: !!perishable,
      needsRefrigeration: !!needsRefrigeration,
      humidyControl: !!humidyControl,
      urgencyLevel: urgencyLevel || 'Low',
      insured: !!insured,
      value,
      priority: !!priority,
      recurrence: recurrenceData,
      fromLocation,
      toLocation,
      status: 'pending',
      pickUpDate: validatedPickUpDate ? Timestamp.fromDate(validatedPickUpDate) : null,
      specialCargo: bookingType === 'Cargo' ? specialCargo : [],
      additionalNotes: additionalNotes || null,
      consolidated,
    };

    const booking = await Booking.create(bookingData); 

    // Schedule future bookings if recurring
    if (recurrenceData.isRecurring) {
      try { 
        await scheduleRecurringBookings(booking.bookingId, recurrenceData);
      } catch (error) {
        console.error("Error scheduling recurring bookings:", error);
      }
    }

    // Log activity
    await logActivity(req.user.uid, 'create_booking', req);

    // Send notification to admin
    await Notification.create({
      type: `New ${bookingType}TRUK Booking`,
      message: `A new booking has been created. Booking ID: ${booking.bookingId}`,
      userId: user,
      userType: "user",
    });

    res.status(201).json({
      success: true,
      message: `${bookingType}TRUK booking created successfully`,
      booking: formatTimestamps(booking),
    });
  } catch (error) {
    console.error("Create booking error:", error);
    res.status(500).json({
      code: "ERR_SERVER_ERROR",
      message: "Failed to create booking"
    });
  }
};

// Helper function to calculate end date (unchanged)
function calculateEndDate(startDate, duration) {
  const [value, unit] = duration.split(' ');
  const numValue = parseInt(value);
  switch (unit.toLowerCase()) {
    case 'months':
      return new Date(startDate.getFullYear(), startDate.getMonth() + numValue, startDate.getDate());
    case 'weeks':
      return new Date(startDate.getTime() + numValue * 7 * 24 * 60 * 60 * 1000);
    case 'year':
    case 'years':
      return new Date(startDate.getFullYear() + numValue, startDate.getMonth(), startDate.getDate());
    default:
      throw new Error('Invalid duration unit');
  }
};

exports.getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.getAll();
    // await logAdminActivity(req.user.uid, 'get_all_bookings', req);
    res.status(200).json({
      success: true,
      bookings: formatTimestamps(bookings),
      count: bookings.length
    });
  } catch (err) {
    console.error('Get all bookings error:', err);
    res.status(500).json({ message: 'Failed to fetch bookings' });
  }
};

exports.updateBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const updates = req.body;
    if (!bookingId || !updates) {
      return res.status(400).json({ message: 'Booking ID and updates are required' });
    }
    const updatedBooking = await Booking.update(bookingId, updates);
    if (!updatedBooking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    await logActivity(req.user.uid, 'update_booking', req);
    res.status(200).json({ message: 'Booking updated successfully', booking: formatTimestamps(updatedBooking) });
  } catch (err) {
    console.error('Update booking error:', err);
    res.status(500).json({ message: 'Failed to update booking' });
  }
};  

exports.getBookingById = async (req, res) => {
  try {
    const { bookingId } = req.params;
    if (!bookingId) {
      return res.status(400).json({ message: 'Booking ID is required' });
    }
    const booking = await Booking.get(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    // await logAdminActivity(req.user.uid, 'get_booking', req);
    res.status(200).json({ 
      message: 'Booking retrieved successfully', 
      booking: formatTimestamps(booking) 
    });
  } catch (err) {
    console.error('Get booking error:', err);
    res.status(500).json({ message: 'Failed to fetch booking' });
  }
}

exports.deleteBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    if (!bookingId) {
      return res.status(400).json({ message: 'Booking ID is required' });
    }
    await Booking.delete(bookingId);
    // await logAdminActivity(req.user.uid, 'delete_booking', req);
    res.status(200).json({ message: 'Booking deleted successfully' });
  } catch (err) {
    console.error('Delete booking error:', err);
    res.status(500).json({ message: 'Failed to delete booking' });
  }
};

exports.getBookingsByUserId = async (req, res) => {
  try {
    const userId = req.params.userId;
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const bookings = await Booking.getBookingForUser(userId);
    res.status(200).json({
      message: 'Bookings retrieved successfully', 
      bookings: formatTimestamps(bookings)
    });
  } catch (err) {
    console.error('Get bookings by user ID error:', err);
    res.status(500).json({ message: 'Failed to fetch bookings' });
  }
};

exports.getBookingsByTransporterId = async (req, res) => {
  try {
    const { transporterId } = req.params;
    
    if (!transporterId) {
      return res.status(400).json({ message: 'Transporter ID is required' });
    }
    const bookings = await Booking.getBookingsForTransporter(transporterId);
    // await logAdminActivity(req.user.uid, 'get_bookings_by_transporter_id', req);
    res.status(200).json({
      message: 'Bookings retrieved successfully', 
      bookings: formatTimestamps(bookings), 
      count: bookings});
  } catch (err) {
    console.error('Get bookings by transporter ID error:', err);
    res.status(500).json({ message: 'Failed to fetch bookings' });
  }
};

exports.getAllAvailableBookings = async (req, res) => {
  try {
    const availableBookings = await Booking.getAllAvailable();
    await logActivity(req.user.uid, 'get_all_available_bookings', req);
    res.status(200).json({
      message: 'Available bookings retrieved successfully', 
      availableBookings: formatTimestamps(availableBookings)
    });
  } catch (err) {
    console.error('Get all available bookings error:', err);
    res.status(500).json({ message: 'Failed to fetch available bookings' });
  }
};

exports.getTransporterRouteLoads = async (req, res) => {
  try {
    const userId = req.params.userId || req.user.uid;

    const transporter = await Transporter.get(userId); 
    if (!transporter) {
      return res.status(404).json({ message: 'Transporter not found' });
    }
    
    if (!transporter.currentRoute || !transporter.currentRoute.length === 0) {
      return res.status(404).json({ message: 'Transporter has no route' });
    }

    if (!transporter.vehicleCapacity) {
      return res.status(404).json({ message: 'Transporter has no vehicle capacity' });
    }

    const bookingsSnapshot = await Booking.getAllAvailable();

    const routeLoads = [];

    // Filter bookings based on route compatibility
    for (const doc of bookingsSnapshot) {
      const booking = doc;

      // Route compatibility check
      let isRouteCompatible = false;
      
      // Check if transporter has current route
      if (transporter.currentRoute && transporter.currentRoute.length > 0) {
        const lastKnownLocation = transporter.lastKnownLocation || 
          transporter.currentRoute[transporter.currentRoute.length - 1].location;
        
        // Calculate distance between transporter's last known location and booking pickup
        if (lastKnownLocation && booking.fromLocation) {
          const distance = geolib.getDistance(
            {
              latitude: lastKnownLocation.latitude,
              longitude: lastKnownLocation.longitude
            },
            {
              latitude: booking.fromLocation.latitude,
              longitude: booking.fromLocation.longitude
            }
          );
          
          // Consider routes within 50km as compatible
          isRouteCompatible = distance <= 50000;
        }
      } else {
        // If no current route, consider all bookings as potentially compatible
        isRouteCompatible = true;
      }

      // Capacity compatibility check
      const isCapacityCompatible = 
        (!booking.weightKg || !transporter.vehicleCapacity || 
         booking.weightKg <= transporter.vehicleCapacity) &&
        (!booking.needsRefrigeration || transporter.refrigerated) &&
        (!booking.humidyControl || transporter.humidityControl);

      // Schedule compatibility check
      let isScheduleCompatible = true;
      if (booking.pickUpDate) {
        const now = new Date();
        const pickupDate = booking.pickUpDate.toDate();
        // Check if pickup is within next 24 hours
        const timeDiff = pickupDate.getTime() - now.getTime();
        isScheduleCompatible = timeDiff >= 0 && timeDiff <= 24 * 60 * 60 * 1000;
      }

      // Add to routeLoads if all conditions met
      if (isRouteCompatible && isCapacityCompatible && isScheduleCompatible) {
        routeLoads.push({
          bookingId: booking.bookingId,
          fromLocation: booking.fromLocation,
          toLocation: booking.toLocation,
          weightKg: booking.weightKg,
          needsRefrigeration: booking.needsRefrigeration,
          humidyControl: booking.humidyControl,
          pickUpDate: booking.pickUpDate,
          productType: booking.productType,
          cost: booking.cost
        });
      }
    }
    await logActivity(req.user.uid, 'get_route_loads', req);
    return res.status(200).json({
      success: true,
      routeLoads: formatTimestamps(routeLoads)
    });

  } catch (error) {
    console.error('Error fetching route loads:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};