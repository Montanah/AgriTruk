const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/requireRole');
const { authorize } = require('../middlewares/adminAuth');
const {
  createCargoBooking,
  getCargoBooking,
  updateCargoBooking,
  acceptCargoBooking,
  rejectCargoBooking,
  deleteCargoBooking,
  getAllCargoBookings,
  getUserCargoBookings,
  getTransporterCargoBookings,
  cancelCargoBooking,
  startCargoBooking,
  searchCargoBookings
} = require("../controllers/cargoBookingController");
/**
 * @swagger
 * tags:
 *   name: Cargo Bookings
 *   description: Manage cargoTRUK produce transportation bookings
 */

/**
 * @swagger
 * /api/cargo:
 *   get:
 *     summary: Get cargoTRUK bookings
 *     description: Retrieves all cargoTRUK bookings or filters by userId or transporterId.
 *     tags: [Cargo Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter bookings by user ID
 *       - in: query
 *         name: transporterId
 *         schema:
 *           type: string
 *         description: Filter bookings by transporter ID
 *       - in: query
 *         name: bookingId
 *         schema:
 *           type: string
 *         description: Filter bookings by booking ID
 *     responses:
 *       200:
 *         description: Bookings retrieved successfully
 *       400:
 *         description: Invalid query parameters
 *       500:
 *         description: Internal server error
 *
 *   post:
 *     summary: Create a new cargoTRUK booking
 *     description: Creates a booking for cargocultural produce transportation.
 *     tags: [Cargo Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *               - fromLocation
 *               - toLocation
 *               - weightKg
 *               - productType
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [create]
 *               requestId:
 *                 type: string
 *               userId:
 *                 type: string
 *               fromLocation:
 *                 type: string
 *               toLocation:
 *                 type: string
 *               weightKg:
 *                 type: number
 *               productType:
 *                 type: string
 *               specialRequest:
 *                 type: string
 *               perishable:
 *                 type: boolean
 *               needsRefrigeration:
 *                 type: boolean
 *               urgentDelivery:
 *                 type: boolean
 *             example:
 *               action: "create"
 *               userId: "user123"
 *               fromLocation: "Nairobi"
 *               toLocation: "Mombasa"
 *               weightKg: 500
 *               productType: "Maize"
 *               perishable: true
 *     responses:
 *       201:
 *         description: Booking created successfully
 *       400:
 *         description: Missing or invalid fields
 *       500:
 *         description: Internal server error
 */

// GET: /api/cargo?userId=x&transporterId=y
router.get('/', authenticateToken, requireRole(['transporter', 'admin', 'shipper', 'business']), async (req, res) => {
  const { bookingId } = req.params;
  const { userId, transporterId } = req.query;

  if (bookingId) {
    return getCargoBooking(req, res);
  } else if (userId) {
    return getUserCargoBookings(req, res);
  } else if (transporterId) {
    return getTransporterCargoBookings(req, res);
  } else {
    return getAllCargoBookings(req, res);
  }
});

// POST: /api/cargo
router.post('/', authenticateToken, requireRole(['shipper', 'business']), (req, res) => {
  if (req.body.action === 'create') {
    return createCargoBooking(req, res);
  }
  return res.status(400).json({ success: false, message: 'Invalid action for POST' });
});

/**
 * @swagger
 * /api/cargo/{bookingId}:
 *   patch:
 *     summary: Manage or update a booking
 *     description: Perform actions like accept, cancel, start, reject, complete, or update booking details.
 *     tags: [Cargo Bookings]
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
 *             type: object
 *             required:
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [accept, cancel, start, reject, complete, update]
 *               transporterId:
 *                 type: string
 *               vehicleId:
 *                 type: string
 *               reason:
 *                 type: string
 *               weightKg:
 *                 type: number
 *               productType:
 *                 type: string
 *               specialRequest:
 *                 type: string
 *               perishable:
 *                 type: boolean
 *               needsRefrigeration:
 *                 type: boolean
 *               urgentDelivery:
 *                 type: boolean
 *             example:
 *               action: "accept"
 *               transporterId: "transporter123"
 *               vehicleId: "vehicle456"
 *     responses:
 *       200:
 *         description: Action performed successfully
 *       400:
 *         description: Bad request or invalid action
 *       404:
 *         description: Booking not found
 *       500:
 *         description: Internal server error
 *
 *   delete:
 *     summary: Delete a booking (Admin only)
 *     description: Deletes the specified cargoTRUK booking.
 *     tags: [Cargo Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the booking to delete
 *     responses:
 *       200:
 *         description: Booking deleted successfully
 *       400:
 *         description: Booking ID missing
 *       500:
 *         description: Internal server error
 */
// PATCH: /api/cargo/:bookingId
router.patch('/:bookingId', authenticateToken, async (req, res) => {
  const { bookingId } = req.params;
  const { action } = req.body;

  if (!bookingId) {
    return res.status(400).json({ success: false, message: 'Booking ID is required' });
  }

  const routeMap = {
    accept: { handler: acceptCargoBooking, roles: ['transporter', 'driver'] },
    cancel: { handler: cancelCargoBooking, roles: ['admin', 'shipper', 'business'] },
    start: { handler: startCargoBooking, roles: ['transporter', 'driver'] },
    reject: { handler: rejectCargoBooking, roles: ['transporter', 'driver'] },
    complete: { handler: completeCargoBooking, roles: ['transporter', 'driver'] },
    update: { handler: updateCargoBooking, roles: ['admin', 'shipper', 'business'] },
  };

  const route = routeMap[action];
  if (!route) {
    return res.status(400).json({ success: false, message: 'Invalid action' });
  }

  return requireRole(route.roles)(req, res, () => route.handler(req, res));
});

// DELETE: /api/cargo/:bookingId
router.delete('/:bookingId', authenticateToken, requireRole('admin'), authorize(['manage_bookings', 'super_admin']), (req, res) => {
  const { bookingId } = req.params;
  if (!bookingId) {
    return res.status(400).json({ success: false, message: 'Booking ID is required' });
  }
  return deleteCargoBooking(req, res);
});

/**
 * @swagger
 * /api/cargo/search:
 *   get:
 *     summary: Search cargoTRUK bookings
 *     description: Retrieves a list of cargoTRUK bookings based on search criteria.
 *     tags: [Cargo Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Full-text search keyword
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: fromLocation
 *         schema:
 *           type: string
 *       - in: query
 *         name: toLocation
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Search results
 *       500:
 *         description: Server error
 */
router.get('/search', authenticateToken, searchCargoBookings);

module.exports = router;
