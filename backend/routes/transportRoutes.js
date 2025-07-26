const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/authMiddleware');
const { requireRole }= require("../middlewares/requireRole");

const {
  createTransporter,
  getTransporter,
  updateTransporter,
  getAllTransporters,
  getAvailableTransporters,
  toggleAvailability,
  updateRating
} = require('../controllers/transporterController');

const {
  approveTransporter,
  rejectTransporter,
  deleteTransporter
} = require('../controllers/adminController');

const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); 

// Middleware for multiple files
const uploadFields = upload.fields([
  { name: 'license', maxCount: 1 },
  { name: 'insurance', maxCount: 1 },
  { name: 'logbook', maxCount: 1 },
  { name: 'profileImage', maxCount: 1 },
  { name: 'vehicleImage', maxCount: 1 }
]);

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
 *               - license
 *               - insurance
 *               - logbook
 *               - vehicleType
 *               - vehicleRegistration
 *               - vehicleImage
 *             properties:
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
 *               humidityControl:
 *                 type: boolean
 *               refrigerated:
 *                 type: boolean
 *               businessType:
 *                 type: string
 *               license:
 *                 type: string
 *                 format: binary
 *               insurance:
 *                 type: string
 *                 format: binary
 *               logbook:
 *                 type: string
 *                 format: binary
 *               profileImage:
 *                 type: string
 *                 format: binary
 *               vehicleImage:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Transporter created successfully
 *       400:
 *         description: Missing required fields
 *       500:
 *         description: Internal server error
 */
router.post('/', authenticateToken, requireRole('transporter'), uploadFields, createTransporter);

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
router.get('/available/list', authenticateToken, requireRole(['admin', 'user']), getAvailableTransporters);

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
router.get('/:transporterId', authenticateToken, requireRole(['transporter', 'admin', 'user']), getTransporter);

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
 * /api/transporters/{transporterId}/approve:
 *   put:
 *     summary: Approve a transporter
 *     description: Allows an admin to approve a pending transporter.
 *     tags: [Admin Actions]
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
 *         description: Transporter approved successfully
 *       500:
 *         description: Internal server error
 */
router.put('/:transporterId/approve', authenticateToken, requireRole('admin'), approveTransporter);

/**
 * @swagger
 * /api/transporters/{transporterId}/reject:
 *   put:
 *     summary: Reject a transporter
 *     description: Allows an admin to reject a pending transporter with an optional reason.
 *     tags: [Admin Actions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transporterId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the transporter to reject
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
 *               reason: "Incomplete documentation"
 *     responses:
 *       200:
 *         description: Transporter rejected successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 result:
 *                   type: object
 *       500:
 *         description: Internal server error
 */
router.put('/:transporterId/reject', authenticateToken, requireRole('admin'), rejectTransporter);

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
router.patch('/:transporterId/rating', authenticateToken, requireRole('admin'), updateRating);

module.exports = router;