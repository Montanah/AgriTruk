const express = require('express');
const router = express.Router();

const { authenticateToken } = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/requireRole');
const { authorize } = require('../middlewares/adminAuth');
const bookingController = require('../controllers/bookingController');
const driverController = require('../controllers/driverController');
const validateBookingAccess = require('../middlewares/validateBookingAccess');

/**
 * @swagger
 * tags:
 *   name: Bookings
 *   description: Manage produce transportation bookings
 */
/**
 * @swagger
 * components:
 *   schemas:
 *     Booking:
 *       type: object
 *       properties:
 *         bookingId:
 *           type: string
 *           description: Unique ID of the booking
 *         requestId:
 *           type: string
 *           description: ID of the original request linked to this booking
 *         bookingType:
 *           type: string
 *           description: Type of booking (e.g., cargo, agri, etc.)
 *         bookingMode:
 *           type: string
 *           enum: [instant, scheduled]
 *           default: instant
 *           description: Mode of the booking
 *         userId:
 *           type: string
 *           description: ID of the user who created the booking
 *         transporterId:
 *           type: string
 *           nullable: true
 *           description: Assigned transporter ID
 *         vehicleId:
 *           type: string
 *           nullable: true
 *           description: Assigned vehicle ID
 *         status:
 *           type: string
 *           enum: [pending, accepted, in_progress, completed, cancelled]
 *           default: pending
 *           description: Current status of the booking
 *         cost:
 *           type: number
 *           format: float
 *           default: 0
 *           description: Cost of the booking
 *         estimatedDuration:
 *           type: string
 *           description: Estimated duration of the trip (e.g., "2h 30m")
 *         actualDistance:
 *           type: number
 *           format: float
 *           nullable: true
 *           description: Actual traveled distance in km
 *         routePolyline:
 *           type: string
 *           nullable: true
 *           description: Encoded polyline of the route
 *         fuelSurcharge:
 *           type: number
 *           format: float
 *           default: 0
 *           description: Extra fuel surcharge applied
 *         waitTimeFee:
 *           type: number
 *           format: float
 *           default: 0
 *           description: Extra fee for waiting time
 *         acceptedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when booking was accepted
 *         startedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Timestamp when booking started
 *         completedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Timestamp when booking completed
 *         cancelledAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Timestamp when booking was cancelled
 *         cancellationReason:
 *           type: string
 *           nullable: true
 *           description: Reason for cancellation
 *         fromLocation:
 *           type: string
 *           description: Pickup location
 *         toLocation:
 *           type: string
 *           description: Drop-off location
 *         productType:
 *           type: string
 *           description: Type of product being transported
 *         weightKg:
 *           type: number
 *           format: float
 *           description: Weight of the cargo in kilograms
 *         urgencyLevel:
 *           type: string
 *           enum: [Low, Medium, High]
 *           default: Low
 *           description: Urgency level of the booking
 *         perishable:
 *           type: boolean
 *           default: false
 *           description: Whether the cargo is perishable
 *         needsRefrigeration:
 *           type: boolean
 *           default: false
 *           description: Whether the cargo requires refrigeration
 *         humidyControl:
 *           type: boolean
 *           default: false
 *           description: Whether the cargo requires humidity control
 *         insured:
 *           type: boolean
 *           default: false
 *           description: Whether the cargo is insured
 *         value:
 *           type: number
 *           format: float
 *           nullable: true
 *           description: Declared value of the cargo
 *         priority:
 *           type: boolean
 *           default: false
 *           description: Whether this booking is prioritized
 *         recurrence:
 *           type: object
 *           description: Recurrence details for recurring bookings
 *           properties:
 *             isRecurring:
 *               type: boolean
 *             frequency:
 *               type: string
 *             timeFrame:
 *               type: string
 *             duration:
 *               type: string
 *             startDate:
 *               type: string
 *               format: date
 *             endDate:
 *               type: string
 *               format: date
 *             interval:
 *               type: string
 *             occurences:
 *               type: integer
 *             baseBookingId:
 *               type: string
 *         pickUpDate:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Scheduled pickup date
 *         specialCargo:
 *           type: array
 *           items:
 *             type: string
 *           description: Special cargo requirements
 *         consolidated:
 *           type: boolean
 *           default: false
 *           description: Whether this booking is consolidated with others
 *         matchedTransporterId:
 *           type: string
 *           nullable: true
 *           description: ID of matched transporter
 *         additionalNotes:
 *           type: string
 *           description: Any extra notes
 */

/**
 * @swagger
 * /api/bookings/requests:
 *   get:
 *     summary: Get available bookings for transporters, businesses
 *     description: Returns a list of available bookings for transporters, businesses.
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of available bookings for transporters
 *       500:
 *         description: Internal server error
 */
router.get('/requests', (req, res, next) => {
  console.log('🚨 BOOKING ROUTES /requests HIT - URL:', req.originalUrl, 'User:', req.user?.uid);
  next();
}, authenticateToken, requireRole(['transporter', 'business', 'driver']), validateBookingAccess, bookingController.getAllAvailableBookings);

/**
 * @swagger
 * /api/bookings/available:
 *   get:
 *     summary: Get available bookings
 *     description: Returns a list of available bookings (alias for /requests)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of available bookings
 *       500:
 *         description: Internal server error
 */
router.get('/available', authenticateToken, requireRole(['driver', 'transporter', 'business']), bookingController.getAvailable);

/**
 * @swagger
 * /api/bookings/transporter/accepted:
 *   get:
 *     summary: Get accepted bookings for transporter/driver
 *     description: Returns bookings accepted by the transporter or driver
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Accepted bookings retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/transporter/accepted', authenticateToken, requireRole(['driver', 'transporter']), bookingController.getAcceptedBookings);

/**
 * @swagger
 * /api/bookings/driver/accepted:
 *   get:
 *     summary: Get accepted bookings for driver (alias)
 *     description: Returns bookings accepted by the driver
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Accepted bookings retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/driver/accepted', authenticateToken, requireRole(['driver', 'transporter']), bookingController.getAcceptedBookings);

/**
 * @swagger
 * /api/bookings/driver/active-trip:
 *   get:
 *     summary: Get active trip for driver
 *     description: Returns the current active trip for a driver
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active trip retrieved successfully
 *       404:
 *         description: No active trip found
 *       500:
 *         description: Internal server error
 */
router.get('/driver/active-trip', authenticateToken, requireRole(['driver', 'transporter']), bookingController.getDriverActiveTrip);

// Broker scoped bookings (minimal, additive; does not affect existing flows)
router.get('/broker/scoped', authenticateToken, requireRole(['broker']), bookingController.getBrokerScopedBookings);

/**
 * @swagger
 * /api/bookings/transporters/route-loads:
 *   get:
 *     summary: Get available bookings for transporters
 *     description: Returns a list of available bookings for transporters.
 *     tags: [Transporters]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of available bookings for transporters
 *       500:
 *         description: Internal server error
 */
router.get('/transporters/route-loads', authenticateToken, requireRole(['driver', 'transporter']), bookingController.getTransporterRouteLoads);

/**
 * @swagger
 * /api/bookings/companies/route-loads:
 *   get:
 *     summary: Get available bookings for companies
 *     description: Returns a list of available bookings for companies.
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of available bookings for companies
 *       500:
 *         description: Internal server error
 */
router.get('/companies/route-loads', authenticateToken, requireRole('driver'), bookingController.getDriverRouteLoads);

/**
 * @swagger
 * /api/bookings/fleet:
 *   get:
 *     summary: Get fleet status
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Fleet status retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal server error
 */
router.get('/fleet', authenticateToken, requireRole(['driver', 'transporter', 'shipper', 'business', 'broker', 'admin']), bookingController.getFleetStatus);

/**
 * @swagger
 * /api/bookings:
 *   get:
 *     summary: Get all bookings
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Bookings retrieved successfully
 *       401:
 *         description: Unauthorized
 */
/**
 * @swagger
 * /api/bookings:
 *   post:
 *     summary: Create a new booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Booking'
 *     responses:
 *       201:
 *         description: Booking created successfully
 *       401:
 *         description: Unauthorized
 */
router
  .route('/')
  .get(authenticateToken, requireRole(['driver', 'transporter', 'shipper', 'business', 'broker']), bookingController.getAllBookings)
  .post(authenticateToken, requireRole(['shipper', 'business', 'broker']), bookingController.createBooking);

/**
 * @swagger
 * /api/bookings/{bookingId}:
 *   get:
 *     summary: Get a specific booking by ID
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the booking
 *     responses:
 *       200:
 *         description: Booking retrieved successfully
 *       401:
 *         description: Unauthorized
 */
/**
 * @swagger
 * /api/bookings/{bookingId}:
 *   patch:
 *     summary: Update a specific booking by ID
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the booking
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Booking'
 *     responses:
 *       200:
 *         description: Booking updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden   
 */
/**
 * @swagger
 * /api/bookings/{bookingId}:
 *   delete:
 *     summary: Delete a specific booking by ID
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the booking
 *     responses:
 *       200:
 *         description: Booking deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Booking not found
 *       500:
 *         description: Internal server error
 */
/**
 * @swagger
 * /api/bookings/update/{bookingId}:
 *   patch:
 *     summary: Update a specific booking by ID (for drivers, transporters, etc.)
 *     description: Allows drivers and other roles to update booking status (start, cancel, complete)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the booking
 *     responses:
 *       200:
 *         description: Booking updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
// CRITICAL: This route MUST be defined BEFORE /:bookingId to ensure correct route matching
// Express matches routes in order, so specific routes must come before generic ones
router.patch('/update/:bookingId', authenticateToken, requireRole(['admin', 'broker', 'shipper', 'transporter', 'business', 'driver']), bookingController.updateBooking);

router
  .route('/:bookingId')
  .get(authenticateToken, requireRole(['driver', 'transporter', 'shipper', 'business', 'broker']), bookingController.getBookingById)
  .patch(authenticateToken, requireRole(['shipper', 'business', 'broker']), bookingController.updateBooking)
  .delete(authenticateToken, requireRole('admin'), authorize(['manage_bookings', 'super_admin']), bookingController.deleteBooking);

/**
 * @swagger
 * /api/bookings/shipper/{userId}:
 *   get:
 *     summary: Get bookings by shipper
 *     description: 
 *       If `userId` is provided, fetch bookings for that user.  
 *       If omitted, fetch bookings for the currently signed-in user.
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *         required: false
 *         description: The ID of the shipper (optional). If not provided, defaults to the logged-in user.
 *     responses:
 *       200:
 *         description: Bookings retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Bookings not found
 *       500:
 *         description: Internal server error
 */
router.get(
  '/shipper/:userId',
  authenticateToken,
  requireRole(['driver', 'transporter', 'shipper', 'business', 'broker']),
  bookingController.getBookingsByUserId
);

/**
 * @swagger
 * /api/bookings/transporter/{transporterId}:
 *   get:
 *     summary: Get bookings by transporter ID
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transporterId
 *         schema:
 *           type: string
 *         description: The ID of the transporter
 *     responses:
 *       200:
 *         description: Bookings retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Bookings not found
 *       500:
 *         description: Internal server error
 */
router.get('/transporter/:transporterId', authenticateToken, requireRole(['driver', 'transporter', 'shipper', 'business', 'broker']), bookingController.getBookingsByTransporterId);


/**
 * @swagger
 * /api/bookings/{bookingId}/accept:
 *   post:
 *     summary: Accept a booking request
 *     description: Allows a transporter to accept a booking request
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the booking to accept
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - transporterId
 *             properties:
 *               transporterId:
 *                 type: string
 *                 description: ID of the transporter accepting the booking
 *               vehicleId:
 *                 type: string
 *                 description: ID of the vehicle to be used (optional)
 *     responses:
 *       200:
 *         description: Booking accepted successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Booking not found
 *       409:
 *         description: Booking already accepted
 */
router.post('/:bookingId/accept', authenticateToken, requireRole(['driver', 'transporter']), bookingController.acceptBooking);

/**
 * @swagger
 * /api/bookings/{bookingId}/reject:
 *   post:
 *     summary: Reject a booking request
 *     description: Allows a transporter to reject a booking request
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the booking to reject
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - transporterId
 *             properties:
 *               transporterId:
 *                 type: string
 *                 description: ID of the transporter rejecting the booking
 *               reason:
 *                 type: string
 *                 description: Reason for rejection (optional)
 *     responses:
 *       200:
 *         description: Booking rejected successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Booking not found
 */
router.post('/:bookingId/reject', authenticateToken, requireRole(['driver', 'transporter']), bookingController.rejectBooking);

/**
 * @swagger
 * /api/bookings/client/{userId}:
 *   get:
 *     summary: Get bookings for a specific client
 *     description: Allows clients (shipper, business, broker) to view their bookings
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the client
 *     responses:
 *       200:
 *         description: Client bookings retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/client/:userId', authenticateToken, requireRole(['shipper', 'business', 'broker']), bookingController.getBookingsByUserId);

/**
 * @swagger
 * /api/bookings/{bookingId}/status:
 *   get:
 *     summary: Get real-time booking status
 *     description: Get current status and updates for a specific booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the booking
 *     responses:
 *       200:
 *         description: Booking status retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Booking not found
 */
router.get('/:bookingId/status', authenticateToken, requireRole(['driver', 'transporter', 'shipper', 'business', 'broker']), bookingController.getBookingStatus);

/**
 * @swagger
 * /api/bookings/{companyId}/accept/{bookingId}:
 *   patch:
 *     summary: Accept a booking request for a specific company
 *     description: Allows a transporter to accept a booking request for a specific company
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the company
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the booking to accept
 *     responses:
 *       200:
 *         description: Booking accepted successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Booking not found
 */
router.patch('/:companyId/accept/:bookingId', authenticateToken, requireRole([ 'transporter', 'driver']), driverController.acceptBooking);

/**
 * @swagger
 * /api/bookings/estimate:
 *   post:
 *     summary: Get booking cost, distance, and duration estimate
 *     description: Calculate estimated cost, distance, and duration for a booking without creating it
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fromLocation
 *               - toLocation
 *             properties:
 *               fromLocation:
 *                 type: object
 *                 properties:
 *                   address:
 *                     type: string
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *               toLocation:
 *                 type: object
 *                 properties:
 *                   address:
 *                     type: string
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *               weightKg:
 *                 type: number
 *               urgencyLevel:
 *                 type: string
 *                 enum: [Low, Medium, High]
 *               perishable:
 *                 type: boolean
 *               needsRefrigeration:
 *                 type: boolean
 *               humidityControl:
 *                 type: boolean
 *               specialCargo:
 *                 type: array
 *               bulkiness:
 *                 type: boolean
 *               insured:
 *                 type: boolean
 *               value:
 *                 type: number
 *     responses:
 *       200:
 *         description: Estimate calculated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 estimatedDistance:
 *                   type: string
 *                 estimatedDuration:
 *                   type: string
 *                 estimatedCost:
 *                   type: number
 *                 minCost:
 *                   type: number
 *                 maxCost:
 *                   type: number
 *                 costRange:
 *                   type: object
 *                   properties:
 *                     min:
 *                       type: number
 *                     max:
 *                       type: number
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Internal server error
 */
router.post('/estimate', authenticateToken, bookingController.estimateBooking);

module.exports = router;