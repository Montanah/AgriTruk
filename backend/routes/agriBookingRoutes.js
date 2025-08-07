const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/requireRole');
const { authorize, authenticate } = require('../middlewares/adminAuth');
const {
  createAgriBooking,
  getAgriBookings,
  getUserAgriBookings,
  getTransporterAgriBookings,
  getAgriBooking,
  acceptAgriBooking,
  updateAgriBooking,
  cancelAgriBooking,
  startAgriBooking,
  rejectAgriBooking,
  completeAgriBooking,
  deleteAgriBooking,
  searchAgriBookings
} = require('../controllers/agriBookingController');
/**
 * @swagger
 * tags:
 *   name: Agri Bookings
 *   description: Manage agriTRUK produce transportation bookings
 */

/**
 * @swagger
 * /api/agri:
 *   get:
 *     summary: Get agriTRUK bookings
 *     description: Retrieves all agriTRUK bookings or filters by userId or transporterId.
 *     tags: [Agri Bookings]
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
 *     summary: Create a new agriTRUK booking
 *     description: Creates a booking for agricultural produce transportation.
 *     tags: [Agri Bookings]
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

// GET: /api/agri?userId=x&transporterId=y
router.get('/', authenticateToken, requireRole(['transporter', 'admin', 'shipper', 'business']), async (req, res) => {
  const { bookingId } = req.query;
  
  const { userId, transporterId } = req.query;

  if (bookingId) {
    return getAgriBooking(req, res);
  } else if (userId) {
    return getUserAgriBookings(req, res);
  } else if (transporterId) {
    return getTransporterAgriBookings(req, res);
  } else {
    return getAgriBookings(req, res);
  }
});

// POST: /api/agri
router.post('/', authenticateToken, requireRole(['shipper', 'business']), (req, res) => {
  if (req.body.action === 'create') {
    return createAgriBooking(req, res);
  }
  return res.status(400).json({ success: false, message: 'Invalid action for POST' });
});

/**
 * @swagger
 * /api/agri/{bookingId}:
 *   patch:
 *     summary: Manage or update a booking
 *     description: Perform actions like accept, cancel, start, reject, complete, or update booking details.
 *     tags: [Agri Bookings]
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
 *     description: Deletes the specified agriTRUK booking.
 *     tags: [Agri Bookings]
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
// PATCH: /api/agri/:bookingId
router.patch('/:bookingId', authenticateToken, async (req, res) => {
  const { bookingId } = req.params;
  const { action } = req.body;

  if (!bookingId) {
    return res.status(400).json({ success: false, message: 'Booking ID is required' });
  }

  const routeMap = {
    accept: { handler: acceptAgriBooking, roles: ['transporter', 'driver'] },
    cancel: { handler: cancelAgriBooking, roles: ['admin', 'shipper', 'business'] },
    start: { handler: startAgriBooking, roles: ['transporter', 'driver'] },
    reject: { handler: rejectAgriBooking, roles: ['transporter', 'driver'] },
    complete: { handler: completeAgriBooking, roles: ['transporter', 'driver'] },
    update: { handler: updateAgriBooking, roles: ['admin', 'shipper', 'business'] },
  };

  const route = routeMap[action];
  if (!route) {
    return res.status(400).json({ success: false, message: 'Invalid action' });
  }

  return requireRole(route.roles)(req, res, () => route.handler(req, res));
});

// DELETE: /api/agri/:bookingId
router.delete('/:bookingId', authenticate, requireRole('admin'), authorize(['manage_bookings', 'super_admin']), (req, res) => {
  const { bookingId } = req.params;
  if (!bookingId) {
    return res.status(400).json({ success: false, message: 'Booking ID is required' });
  }
  return deleteAgriBooking(req, res);
});

/**
 * @swagger
 * /api/agri/search:
 *   get:
 *     summary: Search agriTRUK bookings
 *     description: Retrieves a list of agriTRUK bookings based on search criteria.
 *     tags: [Agri Bookings]
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
router.get('/search', authenticateToken, searchAgriBookings);

module.exports = router;
