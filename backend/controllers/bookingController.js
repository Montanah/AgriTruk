const { Timestamp } = require('firebase-admin/firestore');
const { scheduleRecurringBookings } = require('../services/bookingService');
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');
const { logActivity } = require('../utils/activityLogger');
const { formatTimestamps } = require('../utils/formatData');
const geolib = require('geolib');
const Transporter = require('../models/Transporter');
const MatchingService = require('../services/matchingService');
const { calculateDistance } = require('../utils/geoUtils');
const User = require('../models/User');

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
    
    const actualDistance = calculateDistance(fromLocation, toLocation);
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
      actualDistance
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
    console.log(`New ${bookingType}TRUK Booking: ${booking.bookingId}`);

    if (bookingMode === 'instant') {
      const matchedTransporter = await MatchingService.matchBooking(booking.bookingId);
      return res.status(201).json({
        success: true,
        message: `${bookingType}TRUK booking created successfully`,
        booking: formatTimestamps(booking),
        matchedTransporter
      });
    } else {

      res.status(201).json({
        success: true,
        message: `${bookingType}TRUK booking created successfully`,
        booking: formatTimestamps(booking),
      });
    }
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

exports.getFleetStatus = async (req, res) => {
  try {
    const { status } = req.query; // Optional status filter
    
    // Get all transporters with their vehicles
    const transporters = await Transporter.getAll();
    
    // Get all active bookings
    const activeBookings = await Booking.getActiveBookings();
    
    // Get all users (for driver information)
    const users = await User.getAllUsers();
    
    // Create a map for quick user lookup
    const userMap = users.reduce((map, user) => {
      map[user.uid] = user;
      return map;
    }, {});
    
    // Create a map for booking lookup by transporterId
    const bookingMap = activeBookings.reduce((map, booking) => {
      if (booking.transporterId) {
        map[booking.transporterId] = booking;
      }
      return map;
    }, {});
    
    // Process each transporter to determine status
    const fleetStatus = transporters.map(transporter => {
      const booking = bookingMap[transporter.transporterId];
      const user = userMap[transporter.userId];
      
      return {
        transporterId: transporter.transporterId,
        vehicleId: transporter.vehicleId,
        registration: transporter.vehicleRegistration,
        vehicleType: transporter.vehicleType,
        capacity: transporter.vehicleCapacity,
        driver: {
          userId: transporter.userId,
          name: user ? transporter.displayName || `${user.name}` : 'Unknown Driver',
          phone: transporter.phoneNumber || (user ? user.phoneNumber : null),
          rating: transporter.rating
        },
        status: this.determineVehicleStatus(transporter, booking),
        booking: booking ? this.formatBookingInfo(booking) : null,
        location: transporter.lastKnownLocation,
        lastUpdated: transporter.updatedAt,
        features: {
          refrigerated: transporter.refrigerated,
          humidityControl: transporter.humidityControl,
          perishable: transporter.perishable
        }
      };
    });
    
    // Filter by status if provided
    let filteredFleet = fleetStatus;
    if (status) {
      filteredFleet = fleetStatus.filter(vehicle => 
        vehicle.status.toLowerCase() === status.toLowerCase()
      );
    }
    
    // Get counts for dashboard
    const statusCounts = this.calculateStatusCounts(fleetStatus);
    
    res.status(200).json({
      success: true,
      data: {
        fleet: filteredFleet,
        summary: {
          total: fleetStatus.length,
          ...statusCounts
        }
      }
    });
    
  } catch (error) {
    console.error('Error getting fleet status:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Helper method to determine vehicle status
exports.determineVehicleStatus = (transporter, booking) => {
  // Check if transporter account is active
  if (!transporter.accountStatus) {
    return 'inactive';
  }
  
  // Check if documents are expired (insurance, license, ID)
  if (this.hasExpiredDocuments(transporter)) {
    return 'non-compliant';
  }
  
  // Check if vehicle has an active booking
  if (booking) {
    if (booking.status === 'in-progress' || booking.status === 'picked-up') {
      return 'active';
    } else if (booking.status === 'accepted') {
      return 'assigned';
    }
  }
  
  // Check if transporter is accepting bookings
  if (transporter.acceptingBooking) {
    return 'available';
  }
  
  return 'idle';
};

// Helper method to check for expired documents
exports.hasExpiredDocuments = (transporter) => {
  const now = new Date();
  
  // Check insurance expiry
  if (transporter.insuranceExpiryDate && 
      transporter.insuranceExpiryDate.toDate() < now) {
    return true;
  }
  
  // Check driver license expiry
  if (transporter.driverLicenseExpiryDate && 
      transporter.driverLicenseExpiryDate.toDate() < now) {
    return true;
  }
  
  // Check ID expiry
  if (transporter.idExpiryDate && 
      transporter.idExpiryDate.toDate() < now) {
    return true;
  }
  
  return false;
};

// Helper method to format booking information
exports.formatBookingInfo = (booking) => {
  return {
    bookingId: booking.bookingId,
    requestId: booking.requestId,
    status: booking.status,
    fromLocation: booking.fromLocation,
    toLocation: booking.toLocation,
    productType: booking.productType,
    weightKg: booking.weightKg,
    estimatedDuration: booking.estimatedDuration,
    cost: booking.cost,
    pickUpDate: booking.pickUpDate,
    urgencyLevel: booking.urgencyLevel,
    specialRequirements: {
      perishable: booking.perishable,
      refrigeration: booking.needsRefrigeration,
      humidityControl: booking.humidyControl,
      insured: booking.insured
    }
  };
};

// Helper method to calculate status counts
exports.calculateStatusCounts = (fleet) => {
  const counts = {
    active: 0,
    assigned: 0,
    available: 0,
    idle: 0,
    inactive: 0,
    'non-compliant': 0
  };
  
  fleet.forEach(vehicle => {
    counts[vehicle.status] = (counts[vehicle.status] || 0) + 1;
  });
  
  return counts;
};