const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/authMiddleware');
const { createAgriBooking, acceptAgriBooking } = require('../controllers/agriBookingController');
const { createCargoBooking } = require('../controllers/cargoBookingController');

// Swagger for agriTRUK booking
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
 *               - requestId
 *               - userId
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
 *                type: string
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
 *       201:
 *         description: Booking created successfully
 *       500:
 *         description: Internal server error
 */
router.post('/agri', authenticateToken, createAgriBooking);

// Swagger for cargoTRUK booking
/**
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
 *               - weightKg
 *               - cargoType
 *               - cargoValue
 *               - fromLocation
 *               - toLocation
 *             properties:
 *               requestId:
 *                 type: string
 *               userId:
 *                 type: string
 *               fromLocation:
 *                 type: string
 *               toLocation:
 *                type: string
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
 *       201:
 *         description: Booking created successfully
 *       500:
 *         description: Internal server error
 */
router.post('/cargo', authenticateToken, createCargoBooking);

// Swagger for accepting agriTRUK booking
/**
 * @swagger
 * /api/bookings/agri/{bookingId}/accept:
 *   post:
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
 *     responses:
 *       200:
 *         description: Booking accepted successfully
 *       400:
 *         description: Bad request, missing parameters
 */

router.patch('/agri/:bookingId/accept', authenticateToken, acceptAgriBooking);
module.exports = router;
