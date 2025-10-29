const admin = require('firebase-admin');
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
const { driverId } = require('../schemas/DriverSchema');
const Driver = require('../models/Driver');
require('dotenv').config();

const google_key = process.env.GOOGLE_MAPS_API_KEY;

// Generate readable ID (unique) aligned with mobile: YYMMDD-HHMMSS-TYPE-[BIC]SUF
const generateReadableId = (bookingType, bookingMode, isConsolidated = false, timestamp = new Date(), seed = '') => {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hour = date.getHours().toString().padStart(2, '0');
  const minute = date.getMinutes().toString().padStart(2, '0');
  const second = date.getSeconds().toString().padStart(2, '0');
  const type = bookingType === 'Agri' ? 'AGR' : 'CAR';
  const letter = isConsolidated ? 'C' : (bookingMode === 'instant' ? 'I' : 'B');
  const suffix = computeShortToken(seed || `${date.getTime()}-${Math.random()}`);
  return `${year}${month}${day}-${hour}${minute}${second}-${type}-${letter}${suffix}`;
};

function computeShortToken(seed) {
  try {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash) + seed.charCodeAt(i);
      hash |= 0;
    }
    return (hash >>> 0).toString(36).toUpperCase().slice(-3).padStart(3, '0');
  } catch {
    return Math.random().toString(36).toUpperCase().slice(2, 5);
  }
}

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
      readableId, // Accept readableId from frontend if provided
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
    
    // Prepare booking data (readableId will be generated after booking is created)
    const bookingData = {
      requestId,
      readableId: null, // Will be generated after booking creation using createdAt and bookingId
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

    // Compute final unique readableId using createdAt and bookingId as seed
    const createdAtDate = booking.createdAt?.toDate ? booking.createdAt.toDate() : new Date();
    const computedReadableId = generateReadableId(bookingType, bookingMode, !!consolidated, createdAtDate, booking.bookingId);
    if (!booking.readableId || booking.readableId !== computedReadableId) {
      try {
        await Booking.update(booking.bookingId, { readableId: computedReadableId });
        booking.readableId = computedReadableId;
      } catch (e) {
        console.warn('Failed to persist readableId:', e?.message);
      }
    }
    const bookingReadableId = booking.readableId;
    
    if (bookingMode === 'instant') {
      const matchedTransporter = await MatchingService.matchBooking(booking.bookingId);
      return res.status(201).json({
        success: true,
        message: `${bookingType}TRUK booking created successfully`,
        booking: formatTimestamps(booking),
        readableId: bookingReadableId,
        matchedTransporter
      });
    } else {

      res.status(201).json({
        success: true,
        message: `${bookingType}TRUK booking created successfully`,
        booking: formatTimestamps(booking),
        readableId: bookingReadableId,
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
    
    // Populate client and vehicle information for each booking
    const enrichedBookings = await Promise.all(bookings.map(async (booking) => {
      const enrichedBooking = { ...booking };
      
      // Populate client information
      if (booking.userId) {
        try {
          const client = await User.get(booking.userId);
          if (client) {
            enrichedBooking.client = {
              id: client.uid,
              name: client.name || 'Unknown Client',
              phone: client.phone || 'No phone',
              email: client.email || 'No email',
              rating: client.rating || 0,
              completedOrders: client.completedOrders || 0,
            };
          }
        } catch (error) {
          console.error('Error fetching client for booking:', booking.id, error);
          enrichedBooking.client = {
            id: booking.userId,
            name: 'Unknown Client',
            phone: 'No phone',
            email: 'No email',
            rating: 0,
            completedOrders: 0,
          };
        }
      }
      
      // Populate vehicle information
      if (booking.vehicleId) {
        try {
          // First, we need to find which company owns this vehicle
          // For now, we'll try to get the transporter's company ID
          const transporter = await Transporter.get(transporterId);
          if (transporter && transporter.companyId) {
            const Vehicle = require('../models/Vehicle');
            const vehicle = await Vehicle.get(transporter.companyId, booking.vehicleId);
            if (vehicle) {
              enrichedBooking.vehicle = {
                id: vehicle.vehicleId,
                type: vehicle.type || 'N/A',
                reg: vehicle.reg || 'N/A',
                bodyType: vehicle.bodyType || 'N/A',
                model: vehicle.model || 'N/A',
                capacity: vehicle.capacity || 'N/A',
              };
            }
          }
        } catch (error) {
          console.error('Error fetching vehicle for booking:', booking.id, error);
          enrichedBooking.vehicle = {
            id: booking.vehicleId,
            type: 'N/A',
            reg: 'N/A',
            bodyType: 'N/A',
            model: 'N/A',
            capacity: 'N/A',
          };
        }
      }
      
      return enrichedBooking;
    }));
    
    // await logAdminActivity(req.user.uid, 'get_bookings_by_transporter_id', req);
    res.status(200).json({
      message: 'Bookings retrieved successfully', 
      bookings: formatTimestamps(enrichedBookings), 
      count: enrichedBookings
    });
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

    // Get transporter/driver details first
    let transporter = null;
    const userRole = req.user?.role;
    
    try {
      if (userRole === 'driver') {
        // For drivers, get from drivers collection
        const driverSnapshot = await admin.firestore().collection('drivers')
          .where('userId', '==', transporterId)
          .limit(1)
          .get();
        
        if (!driverSnapshot.empty) {
          const driverData = driverSnapshot.docs[0].data();
          transporter = {
            name: `${driverData.firstName || ''} ${driverData.lastName || ''}`.trim(),
            displayName: `${driverData.firstName || ''} ${driverData.lastName || ''}`.trim(),
            phone: driverData.phone,
            phoneNumber: driverData.phone,
            rating: driverData.rating || 0,
            status: driverData.status || 'active',
            driverProfileImage: driverData.profileImage,
            totalTrips: driverData.totalTrips || 0,
            acceptingBooking: driverData.availability || false
          };
          console.log('✅ Driver found:', {
            id: transporterId,
            name: transporter.name,
            phone: transporter.phone,
            rating: transporter.rating
          });
        }
      } else {
        // For transporters, get from transporters collection
        transporter = await Transporter.get(transporterId);
        console.log('✅ Transporter found:', {
          id: transporterId,
          name: transporter?.name,
          phone: transporter?.phone,
          rating: transporter?.rating,
          status: transporter?.status
        });
      }
    } catch (error) {
      console.log('❌ Transporter/Driver not found, continuing without details:', error.message);
    }

    // Get vehicle details - handle both individual transporters and company drivers
    let vehicle = null;
    
    if (vehicleId) {
      try {
        // Check if this is a company driver by looking for the driver in companies collection
        const companiesSnapshot = await db.collection('companies').get();
        let isCompanyDriver = false;
        let companyId = null;
        
        for (const companyDoc of companiesSnapshot.docs) {
          const driverSnapshot = await db.collection('companies').doc(companyDoc.id).collection('drivers').doc(transporterId).get();
          if (driverSnapshot.exists) {
            isCompanyDriver = true;
            companyId = companyDoc.id;
            break;
          }
        }
        
        if (isCompanyDriver) {
          // Company driver - get vehicle from companies/{companyId}/vehicles/{vehicleId}
          console.log('✅ Company driver detected, getting vehicle from company collection');
          const vehicleSnapshot = await db.collection('companies').doc(companyId).collection('vehicles').doc(vehicleId).get();
          if (vehicleSnapshot.exists) {
            vehicle = vehicleSnapshot.data();
            console.log('✅ Company vehicle found:', {
              make: vehicle.vehicleMake,
              model: vehicle.vehicleModel,
              registration: vehicle.vehicleRegistration
            });
          }
        } else {
          // Individual transporter - vehicle data is already in transporter document
          console.log('✅ Individual transporter detected, vehicle data should be in transporter document');
          // For individual transporters, vehicle data is embedded in the transporter document
          // Extract it from the transporter data
          if (transporter) {
            vehicle = {
              vehicleMake: transporter.vehicleMake,
              vehicleModel: transporter.vehicleModel,
              vehicleYear: transporter.vehicleYear,
              vehicleType: transporter.vehicleType,
              vehicleRegistration: transporter.vehicleRegistration,
              vehicleColor: transporter.vehicleColor,
              vehicleCapacity: transporter.vehicleCapacity
            };
            console.log('✅ Extracted vehicle from transporter:', {
              make: vehicle.vehicleMake,
              model: vehicle.vehicleModel,
              registration: vehicle.vehicleRegistration
            });
          }
        }
      } catch (error) {
        console.log('Error determining transporter type, continuing without vehicle details:', error.message);
      }
    }

    // Update booking status with transporter and vehicle details
    const updates = {
      status: 'accepted',
      transporterId: transporterId,
      vehicleId: vehicleId || null,
      transporterName: transporter?.displayName || null,
      transporterPhone: transporter?.phoneNumber || null,
      transporterPhoto: transporter?.driverProfileImage || null,
      transporterRating: transporter?.rating || 0,
      transporterExperience: transporter?.totalTrips ? `${transporter.totalTrips} trips` : 'New transporter',
      transporterAvailability: transporter?.acceptingBooking ? 'Available' : 'Offline',
      transporterTripsCompleted: transporter?.totalTrips || 0,
      transporterStatus: transporter?.status || null,
      vehicleMake: vehicle?.vehicleMake || vehicle?.make || transporter?.vehicleMake || null,
      vehicleModel: vehicle?.vehicleModel || vehicle?.model || transporter?.vehicleModel || null,
      vehicleYear: vehicle?.vehicleYear || vehicle?.year || transporter?.vehicleYear || null,
      vehicleType: vehicle?.vehicleType || vehicle?.type || transporter?.vehicleType || null,
      vehicleRegistration: vehicle?.vehicleRegistration || vehicle?.reg || transporter?.vehicleRegistration || null,
      vehicleColor: vehicle?.vehicleColor || vehicle?.color || transporter?.vehicleColor || null,
      vehicleCapacity: vehicle?.vehicleCapacity || vehicle?.capacity || transporter?.vehicleCapacity || null,
      acceptedAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    };

    console.log('💾 Saving booking updates:', {
      bookingId,
      transporterName: updates.transporterName,
      transporterPhone: updates.transporterPhone,
      transporterRating: updates.transporterRating,
      vehicleMake: updates.vehicleMake,
      vehicleRegistration: updates.vehicleRegistration
    });

    await Booking.update(bookingId, updates);
    
    // Use existing user-facing booking ID if available (must match what's shown in Activity/Management screens)
    const displayBookingId = (
      booking.displayId ||
      booking.userFriendlyId ||
      booking.unifiedBookingId ||
      booking.readableId ||
      booking.referenceCode ||
      booking.referenceId ||
      booking.bookingId ||
      booking.id ||
      bookingId
    );
    
    // Create single notification for client
    await Notification.create({
      userId: booking.userId,
      type: 'booking_accepted',
      title: 'Booking Accepted! 🎉',
      message: `Your booking #${displayBookingId} from ${booking.fromLocation} to ${booking.toLocation} has been accepted by ${transporter?.name || 'a transporter'}`,
      data: {
        bookingId: bookingId,
        displayBookingId: displayBookingId,
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

exports.getDriverRouteLoads = async (req, res) => {
  try {
    const userId = req.params.userId || req.user.uid;

    const driver = await Driver.getDriverIdByUserId(userId);
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }
    
    if (!driver.currentRoute || driver.currentRoute.length === 0) {
      return res.status(404).json({ message: 'Driver has no route' });
    }

    const bookingsSnapshot = await Booking.getAllAvailable();

    const routeLoads = [];

    for (const booking of bookingsSnapshot) {

      let isRouteCompatible = false;
      if (driver.currentRoute && driver.currentRoute.length > 0) {
        const lastKnownLocation = driver.lastKnownLocation || 
          driver.currentRoute[driver.currentRoute.length - 1].location;
        
        if (lastKnownLocation && booking.fromLocation) {
          const distance = geolib.getDistance(
            { latitude: lastKnownLocation.latitude, longitude: lastKnownLocation.longitude },
            { latitude: booking.fromLocation.latitude, longitude: booking.fromLocation.longitude }
          );
          isRouteCompatible = distance <= 50000;
        }
      } else {
        isRouteCompatible = true;
      }

      const isCapacityCompatible = 
        (!booking.weightKg || !driver.assignedVehicleDetails?.capacityKg || 
         booking.weightKg <= driver.assignedVehicleDetails.capacityKg) &&
        (!booking.needsRefrigeration || driver.assignedVehicleDetails?.refrigerated) &&
        (!booking.humidityControl || driver.assignedVehicleDetails?.humidityControl);

      let isScheduleCompatible = true;
      if (booking.pickUpDate) {
        const now = new Date();
        const pickupDate = booking.pickUpDate.toDate();
        const timeDiff = pickupDate.getTime() - now.getTime();
        isScheduleCompatible = timeDiff >= 0 && timeDiff <= 24 * 60 * 60 * 1000;
      }

      if (isRouteCompatible && isCapacityCompatible && isScheduleCompatible) {
        routeLoads.push({
          bookingId: booking.bookingId,
          fromLocation: booking.fromLocation,
          toLocation: booking.toLocation,
          weightKg: booking.weightKg,
          needsRefrigeration: booking.needsRefrigeration,
          humidityControl: booking.humidityControl,
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

// Get accepted bookings for transporter/driver
exports.getAcceptedBookings = async (req, res) => {
  try {
    const userId = req.user.uid;
    const userRole = req.user.role;
    
    // For drivers, transporterId is the userId
    // For transporters, check if they're in transporters or companies collection
    let transporterId = userId;
    
    if (userRole === 'driver') {
      // Driver's userId is their transporterId for bookings
      transporterId = userId;
    } else if (userRole === 'transporter') {
      // Check if transporter is individual or company
      const Transporter = require('../models/Transporter');
      const transporter = await Transporter.get(userId);
      if (transporter) {
        transporterId = transporter.transporterId || userId;
      } else {
        // Check companies collection
        const companyQuery = await admin.firestore().collection('companies')
          .where('transporterId', '==', userId)
          .limit(1)
          .get();
        if (!companyQuery.empty) {
          transporterId = userId;
        }
      }
    }
    
    // Get accepted bookings for this transporter/driver
    const bookings = await Booking.getBookingsForTransporter(transporterId);
    
    // Filter to only accepted/in-progress bookings
    const acceptedBookings = bookings.filter(b => 
      ['accepted', 'in_progress', 'started', 'picked-up'].includes(b.status)
    );
    
    // Enrich bookings with customer details and vehicle info
    const enrichedBookings = await Promise.all(acceptedBookings.map(async (booking) => {
      const enriched = { ...booking };
      
      // Fetch customer details from users collection using userId
      if (booking.userId) {
        try {
          const userDoc = await admin.firestore().collection('users').doc(booking.userId).get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            enriched.client = {
              id: userDoc.id,
              name: userData.name || userData.displayName || `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'Unknown Customer',
              email: userData.email || null,
              phone: userData.phone || userData.phoneNumber || null,
              rating: userData.rating || 0,
              completedOrders: userData.completedOrders || 0
            };
            // Also add legacy fields for compatibility
            enriched.customerName = enriched.client.name;
            enriched.customerEmail = enriched.client.email;
            enriched.customerPhone = enriched.client.phone;
          }
        } catch (userError) {
          console.error('Error fetching customer details:', userError);
          // Set default customer if fetch fails
          enriched.client = {
            name: 'Unknown Customer',
            email: null,
            phone: null
          };
        }
      }
      
      // For drivers, get vehicle details from driver profile
      if (userRole === 'driver' && transporterId) {
        try {
          const driverQuery = await admin.firestore().collection('drivers')
            .where('userId', '==', transporterId)
            .limit(1)
            .get();
          
          if (!driverQuery.empty) {
            const driverData = driverQuery.docs[0].data();
            if (driverData.assignedVehicleId) {
              // Try to get vehicle from main vehicles collection
              const vehicleDoc = await admin.firestore().collection('vehicles')
                .doc(driverData.assignedVehicleId)
                .get();
              
              if (vehicleDoc.exists) {
                const vehicleData = vehicleDoc.data();
                enriched.vehicle = {
                  id: vehicleDoc.id,
                  make: vehicleData.make,
                  model: vehicleData.model,
                  year: vehicleData.year,
                  registration: vehicleData.registration || vehicleData.vehicleRegistration,
                  type: vehicleData.type || vehicleData.vehicleType,
                  capacity: vehicleData.capacity || vehicleData.vehicleCapacity || vehicleData.capacityKg || 0,
                  color: vehicleData.color || vehicleData.vehicleColor
                };
              } else if (driverData.companyId) {
                // Try company vehicles subcollection
                const companyVehicleDoc = await admin.firestore()
                  .collection('companies')
                  .doc(driverData.companyId)
                  .collection('vehicles')
                  .doc(driverData.assignedVehicleId)
                  .get();
                
                if (companyVehicleDoc.exists) {
                  const vehicleData = companyVehicleDoc.data();
                  enriched.vehicle = {
                    id: companyVehicleDoc.id,
                    make: vehicleData.make || vehicleData.vehicleMake,
                    model: vehicleData.model || vehicleData.vehicleModel,
                    year: vehicleData.year || vehicleData.vehicleYear,
                    registration: vehicleData.vehicleRegistration || vehicleData.reg || vehicleData.registration,
                    type: vehicleData.vehicleType || vehicleData.type,
                    capacity: vehicleData.vehicleCapacity || vehicleData.capacityKg || vehicleData.capacity || 0,
                    color: vehicleData.vehicleColor || vehicleData.color
                  };
                }
              }
              
              // Use assignedVehicleDetails as fallback
              if (!enriched.vehicle && driverData.assignedVehicleDetails) {
                enriched.vehicle = driverData.assignedVehicleDetails;
              }
            }
          }
        } catch (vehicleError) {
          console.error('Error fetching vehicle details:', vehicleError);
        }
      }
      
      // Ensure readableId is included (use bookingId if readableId doesn't exist)
      if (!enriched.readableId && enriched.bookingId) {
        // Generate readableId from booking data if missing - MUST use createdAt, not current time!
        const bookingDate = enriched.createdAt?.toDate ? enriched.createdAt.toDate() : (enriched.createdAt ? new Date(enriched.createdAt) : null);
        if (bookingDate) {
          enriched.readableId = generateReadableId(
            enriched.bookingType || 'Agri',
            enriched.bookingMode || 'booking',
            enriched.consolidated || false,
            bookingDate, // CRITICAL: Pass createdAt timestamp (not current time!)
            enriched.bookingId // Pass bookingId as seed for uniqueness
          );
        }
      }
      
      // Ensure costBreakdown is included and properly formatted
      if (enriched.costBreakdown) {
        enriched.pricing = {
          basePrice: enriched.costBreakdown.baseFare || 0,
          distanceCost: enriched.costBreakdown.distanceCost || 0,
          weightCost: enriched.costBreakdown.weightCost || 0,
          urgencySurcharge: enriched.costBreakdown.urgencySurcharge || 0,
          perishableSurcharge: enriched.costBreakdown.perishableSurcharge || 0,
          refrigerationSurcharge: enriched.costBreakdown.refrigerationSurcharge || 0,
          humiditySurcharge: enriched.costBreakdown.humiditySurcharge || 0,
          insuranceFee: enriched.costBreakdown.insuranceFee || 0,
          priorityFee: enriched.costBreakdown.priorityFee || 0,
          waitTimeFee: enriched.costBreakdown.waitTimeFee || 0,
          tollFee: enriched.costBreakdown.tollFee || 0,
          nightSurcharge: enriched.costBreakdown.nightSurcharge || 0,
          fuelSurcharge: enriched.costBreakdown.fuelSurcharge || 0,
          subtotal: enriched.costBreakdown.subtotal || enriched.cost || 0,
          total: enriched.costBreakdown.total || enriched.cost || 0
        };
      }
      
      // Ensure weight is displayed properly (use weightKg)
      if (enriched.weightKg && !enriched.weight) {
        enriched.weight = `${enriched.weightKg} kg`;
      }
      
      // Ensure estimatedValue or paymentAmount is set from cost
      if (enriched.cost && !enriched.estimatedValue && !enriched.paymentAmount) {
        enriched.estimatedValue = enriched.cost;
        enriched.paymentAmount = enriched.cost;
      }
      
      return enriched;
    }));
    
    await logActivity(userId, 'get_accepted_bookings', req);
    res.status(200).json({
      success: true,
      message: 'Accepted bookings retrieved successfully',
      jobs: formatTimestamps(enrichedBookings),
      bookings: formatTimestamps(enrichedBookings) // Support both keys
    });
  } catch (err) {
    console.error('Get accepted bookings error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch accepted bookings' 
    });
  }
};

// Get active trip for driver
exports.getDriverActiveTrip = async (req, res) => {
  try {
    const userId = req.user.uid;
    const userRole = req.user.role;
    
    let transporterId = userId;
    
    if (userRole === 'driver') {
      transporterId = userId;
    }
    
    // Get active booking (accepted, in_progress, started)
    const activeBooking = await Booking.getByTransporterId(transporterId);
    
    if (!activeBooking) {
      return res.status(200).json({
        success: true,
        trip: null,
        message: 'No active trip'
      });
    }
    
    await logActivity(userId, 'get_driver_active_trip', req);
    res.status(200).json({
      success: true,
      trip: formatTimestamps(activeBooking),
      message: 'Active trip retrieved successfully'
    });
  } catch (err) {
    console.error('Get driver active trip error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch active trip' 
    });
  }
};

// Get available bookings (alias for getAllAvailableBookings for consistency)
exports.getAvailable = async (req, res) => {
  try {
    const availableBookings = await Booking.getAllAvailable();
    await logActivity(req.user.uid, 'get_available_bookings', req);
    res.status(200).json({
      success: true,
      message: 'Available bookings retrieved successfully',
      jobs: formatTimestamps(availableBookings),
      bookings: formatTimestamps(availableBookings) // Support both keys
    });
  } catch (err) {
    console.error('Get available bookings error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch available bookings' 
    });
  }
};

exports.acceptDriverRouteLoad = async (req, res) => {
  try {
    const userId = req.user.uid;
    const bookingId = req.params.bookingId;

    const driver = await Driver.get(userId);
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    const bookingSnap = await Booking.get(bookingId);
    if (!bookingSnap) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (bookingSnap.status !== 'pending') {
      return res.status(400).json({ message: 'Booking is not available for acceptance' });
    }

    await Driver.acceptLoad(userId, bookingId, bookingData);
    await logActivity(userId, 'accept_route_load', req);
    
    await Action.create({
      type: 'accept_route_load',
      entityId: driverId,
      priority: 'low',
      metadata: {
        bookingId: bookingId,
        userId: userId
      },
      status: 'Accepted',
      message: 'A driver has accepted a route load',
    });

    res.status(200).json({
      success: true,
      message: 'Load accepted successfully',
      driverId: userId,
      bookingId
    });
  } catch (error) {
    console.error('Error accepting route load:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to accept load: ' + error.message
    });
  }
};