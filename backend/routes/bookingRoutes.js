const express = require('express');
const router = express.Router();
const { authenticateToken } = require("../middlewares/authMiddleware");
const { requireRole } = require("../middlewares/requireRole");
const {
  createAgriBooking,
  acceptAgriBooking,
  getAgriBooking,
  getAgriBookings,
  updateAgriBooking,
  cancelAgriBooking,
  startAgriBooking,
  rejectAgriBooking,
  deleteAgriBooking,
  getUserAgriBookings,
  getTransporterAgriBookings,
  completeAgriBooking
} = require("../controllers/agriBookingController");
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
  startCargoBooking
} = require("../controllers/cargoBookingController");

// AgriTRUK Routes

/**
 * @swagger
 * tags:
 *   - name: Bookings
 *     description: Booking management for agriTRUK and cargoTRUK
 */

/**
 * @swagger
 * /api/bookings/agri:
 *   post:
 *     summary: Create a new agriTRUK booking
 *     description: Creates a booking for agricultural produce transportation.
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
 *               - weightKg
 *               - productType
 *             properties:
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
 *               fromLocation: "Nairobi"
 *               toLocation: "Mombasa"
 *               weightKg: 500
 *               productType: "Maize"
 *     responses:
 *       201:
 *         description: Booking created successfully
 *       400:
 *         description: Missing required fields
 *       500:
 *         description: Internal server error
 */
router.post('/agri', authenticateToken, requireRole('user'), createAgriBooking);

/**
 * @swagger
 * /api/bookings/agri:
 *   get:
 *     summary: Get all agriTRUK bookings
 *     description: Retrieves a list of all agriTRUK bookings.
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Bookings retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/agri', authenticateToken, requireRole(['transporter', 'admin', 'user']), getAgriBookings);

/**
 * @swagger
 * /api/bookings/agri/user:
 *   get:
 *     summary: Get user's agriTRUK bookings
 *     description: Retrieves all agriTRUK bookings for the authenticated user.
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's bookings retrieved successfully
 *       400:
 *         description: User ID is required
 *       500:
 *         description: Internal server error
 */
router.get('/agri/user', authenticateToken, requireRole(['user', 'admin']), getUserAgriBookings);

/**
 * @swagger
 * /api/bookings/agri/transporter:
 *   get:
 *     summary: Get transporter's agriTRUK bookings
 *     description: Retrieves all agriTRUK bookings for the authenticated transporter.
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Transporter's bookings retrieved successfully
 *       400:
 *         description: Transporter ID is required
 *       500:
 *         description: Internal server error
 */
router.get('/agri/transporter', authenticateToken, requireRole(['transporter', 'admin', 'user']), getTransporterAgriBookings);

/**
 * @swagger
 * /api/bookings/agri/{bookingId}/accept:
 *   patch:
 *     summary: Accept an agriTRUK booking
 *     description: Accepts a booking for agricultural produce transportation.
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
 *               - vehicleId
 *             properties:
 *               transporterId:
 *                 type: string
 *               vehicleId:
 *                 type: string
 *             example:
 *               transporterId: "transporter123"
 *               vehicleId: "vehicle456"
 *     responses:
 *       200:
 *         description: Booking accepted successfully
 *       400:
 *         description: Bad request, missing parameters
 *       500:
 *         description: Internal server error
 */
router.patch('/agri/:bookingId/accept', authenticateToken, requireRole('transporter'), acceptAgriBooking);

/**
 * @swagger
 * /api/bookings/agri/{bookingId}:
 *   get:
 *     summary: Get an agriTRUK booking
 *     description: Retrieves details of a specific agriTRUK booking.
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the booking to retrieve
 *     responses:
 *       200:
 *         description: Booking retrieved successfully
 *       400:
 *         description: Booking ID is required
 *       404:
 *         description: Booking not found
 *       500:
 *         description: Internal server error
 */
router.get('/agri/:bookingId', authenticateToken, requireRole(['transporter', 'admin', 'user']), getAgriBooking);

/**
 * @swagger
 * /api/bookings/agri/{bookingId}:
 *   put:
 *     summary: Update an agriTRUK booking
 *     description: Updates details of a specific agriTRUK booking.
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the booking to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
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
 *     responses:
 *       200:
 *         description: Booking updated successfully
 *       400:
 *         description: Booking ID and updates are required
 *       404:
 *         description: Booking not found
 *       500:
 *         description: Internal server error
 */
router.put('/agri/:bookingId', authenticateToken, requireRole(['admin', 'user']), updateAgriBooking);

/**
 * @swagger
 * /api/bookings/agri/{bookingId}/cancel:
 *   patch:
 *     summary: Cancel an agriTRUK booking
 *     description: Cancels a specific agriTRUK booking.
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the booking to cancel
 *     responses:
 *       200:
 *         description: Booking cancelled successfully
 *       400:
 *         description: Booking ID is required
 *       404:
 *         description: Booking not found
 *       500:
 *         description: Internal server error
 */
router.patch('/agri/:bookingId/cancel', authenticateToken, requireRole(['user', 'admin']), cancelAgriBooking);

/**
 * @swagger
 * /api/bookings/agri/{bookingId}/start:
 *   patch:
 *     summary: Start an agriTRUK booking
 *     description: Starts a specific agriTRUK booking.
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the booking to start
 *     responses:
 *       200:
 *         description: Booking started successfully
 *       400:
 *         description: Booking ID is required
 *       404:
 *         description: Booking not found
 *       500:
 *         description: Internal server error
 */
router.patch('/agri/:bookingId/start', authenticateToken, requireRole('transporter'), startAgriBooking);

/**
 * @swagger
 * /api/bookings/agri/{bookingId}/reject:
 *   patch:
 *     summary: Reject an agriTRUK booking
 *     description: Rejects a specific agriTRUK booking.
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
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for rejection (optional, defaults to 'Unqualified')
 *             example:
 *               reason: "Insufficient capacity"
 *     responses:
 *       200:
 *         description: Booking rejected successfully
 *       500:
 *         description: Internal server error
 */
router.patch('/agri/:bookingId/reject', authenticateToken, requireRole('transporter'), rejectAgriBooking);

/**
 * @swagger
 * /api/bookings/agri/{bookingId}/complete:
 *   patch:
 *     summary: Mark AgriTRUK booking as completed
 *     description: Allows a transporter to mark an AgriTRUK booking as completed and increments their total trips.
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the agri booking to mark as completed
 *     responses:
 *       200:
 *         description: Booking completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: AgriTRUK booking completed successfully
 *                 booking:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: completed
 *                     completedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Missing or invalid booking ID
 *       403:
 *         description: Unauthorized - only transporters can complete bookings
 *       500:
 *         description: Internal server error
 */
router.patch('/agri/:bookingId/complete', authenticateToken, requireRole('transporter'), completeAgriBooking);

/**
 * @swagger
 * /api/bookings/agri/{bookingId}:
 *   delete:
 *     summary: Delete an agriTRUK booking
 *     description: Deletes a specific agriTRUK booking.
 *     tags: [Admin]
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
 *       500:
 *         description: Internal server error
 */
router.delete('/agri/:bookingId', authenticateToken, requireRole('admin'), deleteAgriBooking);


// CargoTRUK Routes

/**router.patch('/agri/:bookingId/complete', authenticateToken, requireRole('transporter'), completeAgriBooking);
 * @swagger
 * /api/bookings/cargo:
 *   post:
 *     summary: Create a new cargoTRUK booking
 *     description: Creates a booking for general cargo transportation.
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
 *               - weightKg
 *               - cargoType
 *               - cargoValue
 *             properties:
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
 *               cargoType:
 *                 type: string
 *               cargoValue:
 *                 type: number
 *               specialRequest:
 *                 type: string
 *               special:
 *                 type: boolean
 *             example:
 *               fromLocation: "Mombasa"
 *               toLocation: "Nairobi"
 *               weightKg: 1000
 *               cargoType: "Electronics"
 *               cargoValue: 50000
 *     responses:
 *       201:
 *         description: Booking created successfully
 *       400:
 *         description: Missing required fields
 *       500:
 *         description: Internal server error
 */
router.post('/cargo', authenticateToken, requireRole('user'), createCargoBooking);

/**
 * @swagger
 * /api/bookings/cargo:
 *   get:
 *     summary: Get all cargoTRUK bookings
 *     description: Retrieves a list of all cargoTRUK bookings.
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Bookings retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/cargo', authenticateToken, requireRole(['admin', 'user']), getAllCargoBookings);

/**
 * @swagger
 * /api/bookings/cargo/user:
 *   get:
 *     summary: Get user's cargoTRUK bookings
 *     description: Retrieves all cargoTRUK bookings for the authenticated user.
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's bookings retrieved successfully
 *       400:
 *         description: User ID is required
 *       500:
 *         description: Internal server error
 */
router.get('/cargo/user', authenticateToken, requireRole(['admin', 'user']), getUserCargoBookings);

/**
 * @swagger
 * /api/bookings/cargo/transporter:
 *   get:
 *     summary: Get transporter's cargoTRUK bookings
 *     description: Retrieves all cargoTRUK bookings for the authenticated transporter.
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Transporter's bookings retrieved successfully
 *       400:
 *         description: Transporter ID is required
 *       500:
 *         description: Internal server error
 */
router.get('/cargo/transporter', authenticateToken, requireRole(['transporter', 'admin', 'user']), getTransporterCargoBookings);

/**
 * @swagger
 * /api/bookings/cargo/{bookingId}:
 *   get:
 *     summary: Get a cargoTRUK booking
 *     description: Retrieves details of a specific cargoTRUK booking.
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the booking to retrieve
 *     responses:
 *       200:
 *         description: Booking retrieved successfully
 *       404:
 *         description: Booking not found
 *       500:
 *         description: Internal server error
 */
router.get('/cargo/:bookingId', authenticateToken, requireRole(['transporter', 'admin', 'user']), getCargoBooking);

/**
 * @swagger
 * /api/bookings/cargo/{bookingId}:
 *   put:
 *     summary: Update a cargoTRUK booking
 *     description: Updates details of a specific cargoTRUK booking.
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the booking to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               weightKg:
 *                 type: number
 *               cargoType:
 *                 type: string
 *               cargoValue:
 *                 type: number
 *               specialRequest:
 *                 type: string
 *               special:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Booking updated successfully
 *       500:
 *         description: Internal server error
 */
router.put('/cargo/:bookingId', authenticateToken, requireRole(['user', 'admin']), updateCargoBooking);

/**
 * @swagger
 * /api/bookings/cargo/{bookingId}/accept:
 *   patch:
 *     summary: Accept a cargoTRUK booking
 *     description: Accepts a booking for general cargo transportation.
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
 *               - vehicleId
 *             properties:
 *               transporterId:
 *                 type: string
 *               vehicleId:
 *                 type: string
 *             example:
 *               transporterId: "transporter125"
 *               vehicleId: "vehicle456"
 *     responses:
 *       200:
 *         description: Booking accepted successfully
 *       400:
 *         description: Bad request, missing parameters
 *       500:
 *         description: Internal server error
 */
router.patch('/cargo/:bookingId/accept', authenticateToken, requireRole('transporter'), acceptCargoBooking);

/**
 * @swagger
 * /api/bookings/cargo/{bookingId}/reject:
 *   patch:
 *     summary: Reject a cargoTRUK booking
 *     description: Rejects a booking for general cargo transportation.
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
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for rejection (optional, defaults to 'Unqualified')
 *             example:
 *               reason: "Insufficient capacity"
 *     responses:
 *       200:
 *         description: Booking rejected successfully
 *       500:
 *         description: Internal server error
 */
router.patch('/cargo/:bookingId/reject', authenticateToken, requireRole(['transporter', 'admin']), rejectCargoBooking);

/**
 * @swagger
 * /api/bookings/cargo/{bookingId}/cancel:
 *   patch:
 *     summary: Cancel a cargoTRUK booking
 *     description: Cancels a specific cargoTRUK booking.
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the booking to cancel
 *     responses:
 *       200:
 *         description: Booking cancelled successfully
 *       400:
 *         description: Booking ID is required
 *       404:
 *         description: Booking not found
 *       500:
 *         description: Internal server error
 */
router.patch('/cargo/:bookingId/cancel', authenticateToken, requireRole(['user', 'admin']), cancelCargoBooking);

/**
 * @swagger
 * /api/bookings/cargo/{bookingId}/start:
 *   patch:
 *     summary: Start a cargoTRUK booking
 *     description: Starts a specific cargoTRUK booking.
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the booking to start
 *     responses:
 *       200:
 *         description: Booking started successfully
 *       400:
 *         description: Booking ID is required
 *       404:
 *         description: Booking not found
 *       500:
 *         description: Internal server error
 */
router.patch('/cargo/:bookingId/start', authenticateToken, requireRole('transporter'), startCargoBooking);

/**
 * @swagger
 * /api/bookings/cargo/{bookingId}:
 *   delete:
 *     summary: Delete a cargoTRUK booking
 *     description: Deletes a specific cargoTRUK booking.
 *     tags: [Admin]
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
 *       500:
 *         description: Internal server error
 */
router.delete('/cargo/:bookingId', authenticateToken, requireRole('admin'), deleteCargoBooking);

/**
 * @swagger
 * /api/bookings/agri/user:
 *   get:
 *     summary: Get user's agriTRUK bookings
 *     description: Retrieves all agriTRUK bookings for the authenticated user.
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's bookings retrieved successfully
 *       400:
 *         description: User ID is required
 *       500:
 *         description: Internal server error
 */
router.get('/agri/user', authenticateToken, requireRole(['user', 'admin']), getUserAgriBookings);

/**
 * @swagger
 * /api/bookings/agri/transporter:
 *   get:
 *     summary: Get transporter's agriTRUK bookings
 *     description: Retrieves all agriTRUK bookings for the authenticated transporter.
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Transporter's bookings retrieved successfully
 *       400:
 *         description: Transporter ID is required
 *       500:
 *         description: Internal server error
 */
router.get('/agri/transporter', authenticateToken, requireRole(['transporter', 'admin', 'user']), getTransporterAgriBookings);

module.exports = router;