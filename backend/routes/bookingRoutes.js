const express = require('express');
const router = express.Router();

const { authenticateToken } = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/requireRole');
const { authorize } = require('../middlewares/adminAuth');
const bookingController = require('../controllers/bookingController');

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
router.get('/requests', authenticateToken, requireRole(['transporter', 'business']), bookingController.getAllAvailableBookings);

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
router.get('/transporters/route-loads', authenticateToken, requireRole('transporter'), bookingController.getTransporterRouteLoads);

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
  .get(authenticateToken, requireRole(['transporter', 'shipper', 'business', 'broker']), bookingController.getAllBookings)
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
router
  .route('/:bookingId')
  .get(authenticateToken, requireRole(['transporter', 'shipper', 'business', 'broker']), bookingController.getBookingById)
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
  requireRole(['transporter', 'shipper', 'business', 'broker']),
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
router.get('/transporter/:transporterId', authenticateToken, requireRole(['transporter', 'shipper', 'business', 'broker']), bookingController.getBookingsByTransporterId);

module.exports = router;