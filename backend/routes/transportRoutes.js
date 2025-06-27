const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/authMiddleware');
const requireRole = require("../middlewares/requireRole");

const {
  createTransporter,
  getTransporter,
  updateTransporter
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
 *               - documents
 *               - vehicles
 *             properties:
 *               documents:
 *                 type: object
 *                 properties:
 *                   license:
 *                     type: string
 *                     format: binary
 *                     description: License document image
 *                   insurance:
 *                     type: string
 *                     format: binary
 *                     description: Insurance document image
 *               vehicles:
 *                 type: object
 *                 properties:
 *                   plateNumber:
 *                     type: string
 *                   make:
 *                     type: string
 *                   model:
 *                     type: string
 *                   capacity:
 *                     type: number
 *                   features:
 *                     type: array
 *                     items:
 *                       type: string
 *                   vehicleImage:
 *                     type: string
 *                     format: binary
 *                     description: Vehicle image
 *                   availability:
 *                     type: boolean
 *                   location:
 *                     type: object
 *                     properties:
 *                       county:
 *                         type: string
 *             example:
 *               documents: { license: <file>, insurance: <file> }
 *               vehicles: { plateNumber: "KCA 123A", make: "Toyota", model: "Hilux", capacity: 500, vehicleImage: <file> }
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
 *               documents:
 *                 type: object
 *                 properties:
 *                   license:
 *                     type: string
 *                   insurance:
 *                     type: string
 *               vehicles:
 *                 type: object
 *                 properties:
 *                   plateNumber:
 *                     type: string
 *                   make:
 *                     type: string
 *                   model:
 *                     type: string
 *                   capacity:
 *                     type: number
 *     responses:
 *       200:
 *         description: Transporter updated successfully
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
 *     tags: [Transporters]
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

module.exports = router;