const { Timestamp } = require('firebase-admin/firestore');
const { scheduleRecurringBookings } = require('../services/bookingService');
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');
const Action = require('../models/Action');
const { logActivity } = require('../utils/activityLogger');
const { formatTimestamps } = require('../utils/formatData');
const geolib = require('geolib');
const Transporter = require('../models/Transporter');
const MatchingService = require('../services/matchingService');
const { calculateDistance, calculateRoadDistanceAndDuration } = require('../utils/geoUtils');
const User = require('../models/User');
const calculateTransportCost = require('../utils/calculateCost');
require('dotenv').config();

const google_key = process.env.GOOGLE_MAPS_API_KEY;

// Generate readable ID for display purposes
const generateReadableId = (bookingType, bookingMode, isConsolidated = false) => {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const hour = now.getHours().toString().padStart(2, '0');
  const minute = now.getMinutes().toString().padStart(2, '0');
  
  const type = bookingType === 'Agri' ? 'AGR' : 'CRG';
  const mode = isConsolidated ? 'CONS' : (bookingMode === 'instant' ? 'INST' : 'BOOK');
  
  return `${year}${month}${day}-${hour}${minute}-${type}-${mode}`;
};

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
      pickUpDate,
      additionalNotes,
      specialCargo = [], 
      consolidated,
      bulkiness,
      lengthCm, 
      widthCm,
      heightCm,
      tolls = 0, 
      fuelSurchargePct = 0, 
      waitMinutes = 0, 
      nightSurcharge = false,
      vehicleType = 'truck', 
    } = req.body;

    // Extract location variables separately to allow reassignment
    let fromLocation = req.body.fromLocation;
    let toLocation = req.body.toLocation;

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

    // Validate and geocode locations if needed
    const validateAndGeocodeLocation = async (location, fieldName) => {
      // Check if location is an object
      if (!location || typeof location !== 'object') {
        throw new Error(`${fieldName} must be an object`);
      }

      // Check if address exists
      if (!location.address || typeof location.address !== 'string' || location.address.trim() === '') {
        throw new Error(`${fieldName}.address is required and must be a non-empty string`);
      }

      // If we have valid coordinates, use them
      if (location.latitude !== undefined && location.latitude !== null && 
          location.longitude !== undefined && location.longitude !== null &&
          typeof location.latitude === 'number' && !isNaN(location.latitude) &&
          typeof location.longitude === 'number' && !isNaN(location.longitude)) {
        return location;
      }

      // If no valid coordinates, geocode the address
      if (!google_key) {
        throw new Error('Google Maps API key is required for geocoding');
      }

      try {
        const { Client } = require('@googlemaps/google-maps-services-js');
        const client = new Client({});
        
        const geocodeResponse = await client.geocode({
          params: {
            address: location.address,
            key: google_key,
          },
        });

        if (geocodeResponse.data.results && geocodeResponse.data.results.length > 0) {
          const result = geocodeResponse.data.results[0];
          const coords = result.geometry.location;
          
          return {
            address: location.address,
            latitude: coords.lat,
            longitude: coords.lng
          };
        } else {
          throw new Error(`Could not geocode address: ${location.address}`);
        }
      } catch (geocodeError) {
        console.error(`Geocoding error for ${fieldName}:`, geocodeError);
        throw new Error(`Could not geocode ${fieldName} address: ${location.address}`);
      }
    };

    try {
      // Geocode locations if needed
      const geocodedFromLocation = await validateAndGeocodeLocation(fromLocation, 'fromLocation');
      const geocodedToLocation = await validateAndGeocodeLocation(toLocation, 'toLocation');
      
      // Update the location variables with geocoded data
      fromLocation = geocodedFromLocation;
      toLocation = geocodedToLocation;
    } catch (error) {
      return res.status(400).json({ message: error.message });
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
    
    // const actualDistance = calculateDistance(fromLocation, toLocation);
    
   console.log("fromLocation:", fromLocation);
   console.log("toLocation:", toLocation);
  console.log("google_key:", google_key);
    const { actualDistance, estimatedDurationMinutes, formattedDuration, routePolyline, success } = await calculateRoadDistanceAndDuration(
      fromLocation,
      toLocation,
      'truck', // vehicleType parameter
      google_key,
      weightKg
    );

    if (!success) {
      console.warn('Using fallback distance and duration due to API error');
    }
    // Calculate volumetric weight
    const volumetricWeight = (lengthCm && widthCm && heightCm)
      ? (lengthCm * widthCm * heightCm) / 5000
      : 0;

    // Calculate transport cost
    const bookingDataForCost = {
      actualDistance,
      weightKg,
      lengthCm: lengthCm || 0,
      widthCm: widthCm || 0,
      heightCm: heightCm || 0,
      urgencyLevel: urgencyLevel || 'Low',
      perishable: !!perishable,
      needsRefrigeration: !!needsRefrigeration,
      humidityControl: !!humidyControl,
      specialCargo: specialCargo || [],
      bulkiness: !!bulkiness,
      insured: !!insured,
      value: value || 0,
      tolls: tolls || 0,
      priority: !!priority,
      fuelSurchargePct: fuelSurchargePct || 0,
      waitMinutes: waitMinutes || 0,
      nightSurcharge: !!nightSurcharge,
      vehicleType: vehicleType || 'truck',
    };
    const { cost, transporterPayment, costBreakdown, paymentBreakdown } = calculateTransportCost(bookingDataForCost);
    
    // Prepare booking data
    const bookingData = {
      requestId,
      bookingType,
      bookingMode,
      userId: user,
      weightKg,
      createdAt: Timestamp.now(), // Explicitly set createdAt
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
      actualDistance,
      estimatedDuration: formattedDuration,
      routePolyline,
      cost,
      transporterPayment,
      costBreakdown,
      paymentBreakdown,
      volumetricWeight,
      lengthCm: lengthCm || 0,
      widthCm: widthCm || 0,
      heightCm: heightCm || 0,
      tolls,
      fuelSurchargePct: fuelSurchargePct || 0,
      waitMinutes: waitMinutes || 0,
      nightSurcharge: !!nightSurcharge,
      statusHistory: [{ status: 'pending', timestamp: Timestamp.now(), reason: null }],
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

    await Action.create({
      type: "booking_new",
      entityId: booking.bookingId,
      priority: "low",
      metadata: {
        bookingId: booking.bookingId,
        userId: user
      },
      status: "New Bookings Alert",
      message: 'New Booking has been created',
    });
    // console.log(`New ${bookingType}TRUK Booking: ${booking.bookingId}`);

    // Generate readable ID for display
    const readableId = generateReadableId(bookingType, bookingMode);
    
    if (bookingMode === 'instant') {
      const matchedTransporter = await MatchingService.matchBooking(booking.bookingId);
      return res.status(201).json({
        success: true,
        message: `${bookingType}TRUK booking created successfully`,
        booking: formatTimestamps(booking),
        readableId: readableId,
        matchedTransporter
      });
    } else {

      res.status(201).json({
        success: true,
        message: `${bookingType}TRUK booking created successfully`,
        booking: formatTimestamps(booking),
        readableId: readableId,
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
      const booking = transporter.transporterId ? bookingMap[transporter.transporterId] : null;
      const user = transporter.userId ? userMap[transporter.userId] : null;
      
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

exports.updateBooking = async (req, res) => {
  try {
    const { bookingId, waitMinutes, status, cancellationReason } = req.body;

    if (!bookingId) {
      return res.status(400).json({ message: 'bookingId is required' });
    }

    const bookingDoc = await Booking.get(bookingId);

    if (!bookingDoc.exists) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const bookingData = bookingDoc.data();
    const updates = {};

    // Update wait time and recalculate waitTimeFee
    if (waitMinutes !== undefined) {
      if (isNaN(waitMinutes) || waitMinutes < 0) {
        return res.status(400).json({ message: 'Invalid waitMinutes: must be a non-negative number' });
      }
      updates.waitMinutes = waitMinutes;
      updates.waitTimeFee = waitMinutes * 30; // KES 30/min
      updates.costBreakdown = {
        ...bookingData.costBreakdown,
        waitTimeFee: waitMinutes * 30,
      };

      // Recalculate total cost if needed
      const costCalculationData = {
        actualDistance: bookingData.actualDistance,
        weightKg: bookingData.weightKg,
        lengthCm: bookingData.lengthCm,
        widthCm: bookingData.widthCm,
        heightCm: bookingData.heightCm,
        urgencyLevel: bookingData.urgencyLevel,
        perishable: bookingData.perishable,
        needsRefrigeration: bookingData.needsRefrigeration,
        humidityControl: bookingData.humidyControl, 
        insured: bookingData.insured,
        value: bookingData.value,
        tolls: bookingData.tolls,
        priority: bookingData.priority,
        fuelSurchargePct: bookingData.fuelSurchargePct,
        waitMinutes,
        nightSurcharge: bookingData.nightSurcharge,
      };
      const { cost, costBreakdown } = calculateTransportCost(costCalculationData);
      
      updates.cost = cost;
      updates.costBreakdown = costBreakdown;
    }

    // Update status and statusHistory
    if (status) {
      const validStatuses = ['pending', 'accepted', 'started', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }
      updates.status = status;
      updates.statusHistory = [
        ...bookingData.statusHistory,
        {
          status,
          timestamp: admin.firestore.Timestamp.now(),
          reason: status === 'cancelled' ? cancellationReason || null : null,
        },
      ];
      if (status === 'accepted') updates.acceptedAt = admin.firestore.Timestamp.now();
      if (status === 'started') updates.startedAt = admin.firestore.Timestamp.now();
      if (status === 'completed') updates.completedAt = admin.firestore.Timestamp.now();
      if (status === 'cancelled') {
        updates.cancelledAt = admin.firestore.Timestamp.now();
        updates.cancellationReason = cancellationReason || null;
      }
    }

    // Update updatedAt timestamp
    updates.updatedAt = admin.firestore.Timestamp.now();

    // Apply updates
  // await bookingRef.update(updates);
    await Booking.update(bookingId, updates);

    // Log activity
    await logActivity(req.user.uid, 'update_booking', req);

    await Action.create({
      type: "booking_update",
      entityId: bookingId,
      priority: "low",
      metadata: {
        bookingId: bookingId,
        userId: req.user.uid
      },
      status: "Booking Updated",
      message: 'Booking updated successfully',
    });

    return res.status(200).json({
      success: true,
      message: 'Booking updated successfully',
      booking: { ...bookingData, ...updates },
    });
  } catch (error) {
    console.error('Update booking error:', error);
    return res.status(500).json({
      code: 'ERR_SERVER_ERROR',
      message: 'Failed to update booking',
    });
  }
};

// Accept a booking request
exports.acceptBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { transporterId, vehicleId } = req.body;
    const userId = req.user.uid;

    // Validate transporter ID matches authenticated user
    if (transporterId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only accept bookings for yourself'
      });
    }

    // Get booking details
    const booking = await Booking.get(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if booking is already accepted
    if (booking.status === 'accepted') {
      return res.status(409).json({
        success: false,
        message: 'Booking already accepted'
      });
    }

    // Check if booking is still available
    if (booking.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Booking is no longer available'
      });
    }

    // Update booking status
    const updates = {
      status: 'accepted',
      transporterId: transporterId,
      vehicleId: vehicleId || null,
      acceptedAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    };

    await Booking.update(bookingId, updates);

    // Get transporter details for notification
    const transporter = await Transporter.get(transporterId);
    
    // Create detailed notification for client
    await Notification.create({
      userId: booking.userId,
      type: 'booking_accepted',
      title: 'Booking Accepted! 🎉',
      message: `Your booking from ${booking.fromLocation} to ${booking.toLocation} has been accepted by ${transporter?.name || 'a transporter'}`,
      data: {
        bookingId: bookingId,
        transporterId: transporterId,
        transporterName: transporter?.name,
        transporterPhone: transporter?.phone,
        fromLocation: booking.fromLocation,
        toLocation: booking.toLocation,
        productType: booking.productType,
        estimatedCost: booking.cost,
        chatRoomId: `booking_${bookingId}_${transporterId}_${booking.userId}`
      },
      priority: 'high',
      actionRequired: false
    });

    // Also create notification for transporter
    await Notification.create({
      userId: transporterId,
      type: 'booking_accepted_confirmation',
      title: 'Booking Accepted Successfully! ✅',
      message: `You have accepted the booking from ${booking.fromLocation} to ${booking.toLocation}`,
      data: {
        bookingId: bookingId,
        clientId: booking.userId,
        fromLocation: booking.fromLocation,
        toLocation: booking.toLocation,
        productType: booking.productType,
        estimatedCost: booking.cost
      },
      priority: 'medium',
      actionRequired: false
    });

    // Log activity
    await logActivity(userId, 'accept_booking', req);

    return res.status(200).json({
      success: true,
      message: 'Booking accepted successfully',
      booking: { ...booking, ...updates }
    });

  } catch (error) {
    console.error('Accept booking error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to accept booking'
    });
  }
};

// Reject a booking request
exports.rejectBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { transporterId, reason } = req.body;
    const userId = req.user.uid;

    // Validate transporter ID matches authenticated user
    if (transporterId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only reject bookings for yourself'
      });
    }

    // Get booking details
    const booking = await Booking.get(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Update booking status
    const updates = {
      status: 'rejected',
      rejectedBy: transporterId,
      rejectionReason: reason || 'No reason provided',
      rejectedAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    };

    await Booking.update(bookingId, updates);

    // Create notification for client
    await Notification.create({
      userId: booking.userId,
      type: 'booking_rejected',
      title: 'Booking Rejected',
      message: `Your booking was rejected by a transporter`,
      data: {
        bookingId: bookingId,
        transporterId: transporterId,
        reason: reason
      },
      priority: 'medium'
    });

    // Log activity
    await logActivity(userId, 'reject_booking', req);

    return res.status(200).json({
      success: true,
      message: 'Booking rejected successfully'
    });

  } catch (error) {
    console.error('Reject booking error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to reject booking'
    });
  }
};

// Get real-time booking status with transporter details
exports.getBookingStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.uid;

    // Get booking details
    const booking = await Booking.get(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if user has access to this booking
    const hasAccess = booking.userId === userId || booking.transporterId === userId;
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this booking'
      });
    }

    // Get transporter details if booking is accepted
    let transporterDetails = null;
    if (booking.transporterId) {
      transporterDetails = await Transporter.get(booking.transporterId);
    }

    // Get recent notifications for this booking
    const notifications = await Notification.getByBooking(bookingId);

    // Calculate estimated delivery time if in progress
    let estimatedDelivery = null;
    if (booking.status === 'in_progress' && booking.startedAt) {
      const startTime = booking.startedAt.toDate();
      const estimatedDuration = booking.estimatedDuration || '2 hours';
      const durationHours = parseInt(estimatedDuration.split(' ')[0]) || 2;
      estimatedDelivery = new Date(startTime.getTime() + (durationHours * 60 * 60 * 1000));
    }

    const statusData = {
      booking: {
        ...booking,
        transporter: transporterDetails ? {
          id: transporterDetails.id,
          name: transporterDetails.name,
          phone: transporterDetails.phone,
          rating: transporterDetails.rating,
          profilePhoto: transporterDetails.profilePhoto
        } : null,
        estimatedDelivery: estimatedDelivery?.toISOString(),
        recentNotifications: notifications.slice(0, 5) // Last 5 notifications
      }
    };

    return res.status(200).json({
      success: true,
      message: 'Booking status retrieved successfully',
      data: statusData
    });

  } catch (error) {
    console.error('Get booking status error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get booking status'
    });
  }
};