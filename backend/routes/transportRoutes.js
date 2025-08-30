const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/authMiddleware');
const { requireRole }= require("../middlewares/requireRole");
const { authorize } = require("../middlewares/adminAuth");

const {
  createTransporter,
  getTransporter,
  updateTransporter,
  getAvailableBookings,
  getAvailableTransporters,
  toggleAvailability,
  updateRating
} = require('../controllers/transporterController');

const {
  approveTransporter,
  rejectTransporter,
  deleteTransporter,
  reviewTransporter
} = require('../controllers/adminController');

const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); 

const uploadAny = upload.any();

/**
 * @swagger
 * tags:
 *   - name: Transporters
 *     description: Transporter management operations
 */

/**
 * @swagger
 * /api/transporters/:
 *   post:
 *     summary: Create a new transporter profile
 *     description: Allows a transporter to create their profile (pending approval) with optional image uploads.
 *     tags: [Transporters]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - vehicleType
 *               - vehicleRegistration
 *               - vehicleColor
 *               - vehicleMake
 *               - vehicleModel
 *               - vehicleCapacity
 *               - transporterType
 *               - dlFile
 *             properties:
 *               vehicleType:
 *                 type: string
 *               vehicleRegistration:
 *                 type: string
 *               vehicleMake:
 *                 type: string
 *               vehicleColor:
 *                 type: string
 *               vehicleYear:
 *                 type: integer
 *               vehicleModel:
 *                 type: string
 *               vehicleCapacity:
 *                 type: integer
 *               vehicleFeatures:
 *                 type: string
 *               driveType:
 *                 type: string
 *               bodyType:
 *                 type: string
 *               humidityControl:
 *                 type: boolean
 *               refrigerated:
 *                 type: boolean
 *               transporterType:
 *                 type: string
 *               dlFile:
 *                 type: string
 *                 format: binary
 *               insuranceFile:
 *                 type: string
 *                 format: binary
 *               profilePhoto:
 *                 type: string
 *                 format: binary
 *               vehiclePhoto:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Transporter created successfully
 *       400:
 *         description: Missing required fields
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/', authenticateToken, requireRole('transporter'), uploadAny, createTransporter);

/**
 * @swagger
 * /api/transporters/available/list:
 *   get:
 *     summary: List available transporters
 *     description: Returns a list of approved transporters marked as available.
 *     tags: [Transporters]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of available transporters
 *       500:
 *         description: Internal server error
 */
router.get('/available/list', authenticateToken, requireRole(['admin', 'shipper']), getAvailableTransporters);

/**
 * @swagger
 * /api/transporters/getAvailableBookings:
 *   get:
 *     summary: Get available bookings for transporters
 *     description: Returns a list of available bookings for transporters.
 *     tags: [Transporters]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of available bookings
 *       500:
 *         description: Internal server error
 */
router.get('/getAvailableBookings', authenticateToken, requireRole('transporter'), getAvailableBookings);

/**
 * @swagger
 * /api/transporters/{transporterId}:
 *   get:
 *     summary: Get transporter details
 *     description: Retrieve details of a specific transporter.
 *     tags: [Transporters]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transporterId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Transporter retrieved successfully
 *       404:
 *         description: Transporter not found
 *       500:
 *         description: Internal server error
 */
router.get('/:transporterId', authenticateToken, requireRole(['transporter', 'admin', 'shipper']), getTransporter);

/**
 * @swagger
 * /api/transporters/{transporterId}:
 *   put:
 *     summary: Update transporter details
 *     description: Allows a transporter or admin to update transporter information.
 *     tags: [Transporters]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transporterId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               businessType:
 *                 type: string
 *               driverProfileImage:
 *                 type: string
 *               driverLicense:
 *                 type: string
 *               vehicleType:
 *                 type: string
 *               vehicleRegistration:
 *                 type: string
 *               vehicleMake:
 *                 type: string
 *               vehicleModel:
 *                 type: string
 *               vehicleCapacity:
 *                 type: integer
 *               vehicleImagesUrl:
 *                 type: array
 *                 items:
 *                   type: string
 *               humidityControl:
 *                 type: boolean
 *               refrigerated:
 *                 type: boolean
 *               logbookUrl:
 *                 type: string
 *               insuranceUrl:
 *                 type: string
 *               acceptingBooking:
 *                 type: boolean
 *               status:
 *                 type: string
 *                 enum: [active, pending, approved, rejected]
 *               totalTrips:
 *                 type: integer
 *               rating:
 *                 type: number
 *     responses:
 *       200:
 *         description: Transporter updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 updated:
 *                   type: object
 *       400:
 *         description: Invalid input or missing transporter ID
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.put('/:transporterId', authenticateToken, requireRole(['transporter', 'admin']), updateTransporter);

/**
 * @swagger
 * /api/transporters/{transporterId}:
 *   delete:
 *     summary: Delete a transporter
 *     description: Allows an admin to delete a transporter profile.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transporterId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Transporter deleted successfully
 *       500:
 *         description: Internal server error
 */
router.delete('/:transporterId', authenticateToken, requireRole('admin'), deleteTransporter);

/**
 * @swagger
 * /api/transporters/{transporterId}/review:
 *   patch:
 *     summary: Approve a transporter or reject Transporter (super-admin, manage_transporters)
 *     description: Allows an admin to review a pending transporter.
 *     tags: [Admin Actions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transporterId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [approve-id, approve-dl, approve-insurance, reject]
 *                 description: Action to take on the transporter (approve or reject)
 *               reason:
 *                 type: string
 *                 description: Reason for action (optional)
 *               insuranceExpiryDate:
 *                 type: string
 *                 format: date-time
 *                 description: Insurance expiry date (optional)
 *               driverLicenseExpiryDate:
 *                 type: string
 *                 format: date-time
 *                 description: Driver license expiry date (optional)
 *               idExpiryDate:
 *                 type: string
 *                 format: date-time
 *                 description: ID expiry date (optional)
 *     responses:
 *       200:
 *         description: Transporter reviewed successfully
 *       500:
 *         description: Internal server error
 */
router.patch('/:transporterId/review', authenticateToken, requireRole('admin'), authorize(['manage_transporters', 'super_admin']), reviewTransporter);

/**
 * @swagger
 * /api/transporters/{transporterId}/availability:
 *   patch:
 *     summary: Toggle transporter availability
 *     description: Allows a transporter to update their availability status.
 *     tags: [Transporters]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transporterId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               availability:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Availability updated
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Internal server error
 */
router.patch('/:transporterId/availability', authenticateToken, requireRole('transporter'), toggleAvailability);

/**
 * @swagger
 * /api/transporters/{transporterId}/rating:
 *   patch:
 *     summary: Update transporter rating
 *     description: Admins can update a transporter’s average rating.
 *     tags: [Admin Actions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transporterId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rating:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 5
 *     responses:
 *       200:
 *         description: Rating updated
 *       400:
 *         description: Invalid rating value
 *       500:
 *         description: Internal server error
 */
router.patch('/:transporterId/rating', authenticateToken, requireRole('admin'), authorize(['manage_transporters', 'super_admin']), updateRating);
module.exports = router;