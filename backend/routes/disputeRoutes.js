const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/requireRole');
const {
  createDispute,
  getDispute,
  updateDispute,
  resolveDispute,
  getDisputesByBookingId,
  getDisputesByStatus,
  getDisputesByOpenedBy,
  deleteDispute,
  getAllDisputes
} = require('../controllers/disputeController');

/**
 * @swagger
 * tags:
 *   - name: Disputes
 *     description: Dispute management endpoints
 */

/**
 * @swagger
 * /api/disputes:
 *   post:
 *     summary: Create a new dispute
 *     description: Creates a new dispute related to a booking.
 *     tags: [Disputes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bookingId
 *               - reason
 *             properties:
 *               bookingId:
 *                 type: string
 *                 description: The ID of the related booking
 *               transporterId:
 *                 type: string
 *                 description: The ID of the transporter involved
 *               userId:
 *                 type: string
 *                 description: The ID of the user involved
 *               reason:
 *                 type: string
 *                 description: The reason for the dispute
 *               status:
 *                 type: string
 *                 description: The initial status (default to'open')
 *               priority:
 *                 type: string
 *                 description: The priority level (default to 'medium')
 *               comments:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Initial comments
 *               evidence:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Evidence references
 *             example:
 *               bookingId: "book123"
 *               reason: "Delivery delay"
 *               transporterId: "trans123"
 *               userId: "user456"
 *               priority: "high"
 *     responses:
 *       201:
 *         description: Dispute created successfully
 *       500:
 *         description: Internal server error
 */
router.post('/', authenticateToken, requireRole(['user', 'transporter', 'admin']), createDispute);

/**
 * @swagger
 * /api/disputes:
 *   get:
 *     summary: Get all disputes
 *     description: Retrieves a list of all disputes.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Disputes retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/', authenticateToken, requireRole('admin'), getAllDisputes);

/**
 * @swagger
 * /api/disputes/{disputeId}:
 *   get:
 *     summary: Get a dispute by ID
 *     description: Retrieves details of a specific dispute.
 *     tags: [Disputes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: disputeId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the dispute to retrieve
 *     responses:
 *       200:
 *         description: Dispute retrieved successfully
 *       404:
 *         description: Dispute not found
 *       500:
 *         description: Internal server error
 */
router.get('/:disputeId', authenticateToken, requireRole(['user', 'transporter', 'admin']), getDispute);

/**
 * @swagger
 * /api/disputes/{disputeId}:
 *   put:
 *     summary: Update a dispute
 *     description: Updates details of a specific dispute.
 *     tags: [Disputes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: disputeId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the dispute to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Updated reason for the dispute
 *               status:
 *                 type: string
 *                 description: Updated status
 *               priority:
 *                 type: string
 *                 description: Updated priority level
 *               comments:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Additional comments
 *               evidence:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Additional evidence references
 *             example:
 *               reason: "Updated delivery delay reason"
 *               status: "in_progress"
 *     responses:
 *       200:
 *         description: Dispute updated successfully
 *       400:
 *         description: No updates provided
 *       404:
 *         description: Dispute not found
 *       500:
 *         description: Internal server error
 */
router.put('/:disputeId', authenticateToken, requireRole(['user', 'transporter', 'admin']), updateDispute);

/**
 * @swagger
 * /api/disputes/{disputeId}/resolve:
 *   patch:
 *     summary: Resolve a dispute
 *     description: Resolves a dispute with resolution details.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: disputeId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the dispute to resolve
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - resolution
 *             properties:
 *               resolution:
 *                 type: string
 *                 description: The resolution details
 *               amountRefunded:
 *                 type: number
 *                 description: The amount refunded (optional)
 *               comments:
 *                 type: string
 *                 description: Additional resolution comments
 *             example:
 *               resolution: "Refund issued"
 *               amountRefunded: 1000
 *               comments: "Processed on July 04, 2025"
 *     responses:
 *       200:
 *         description: Dispute resolved successfully
 *       400:
 *         description: Resolution details are required
 *       404:
 *         description: Dispute not found
 *       500:
 *         description: Internal server error
 */
router.patch('/:disputeId/resolve', authenticateToken, requireRole('admin'), resolveDispute);

/**
 * @swagger
 * /api/disputes/booking/{bookingId}:
 *   get:
 *     summary: Get disputes by booking ID
 *     description: Retrieves all disputes for a specific booking.
 *     tags: [Disputes]
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
 *         description: Disputes retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/booking/:bookingId', authenticateToken, requireRole(['user', 'transporter', 'admin']), getDisputesByBookingId);

/**
 * @swagger
 * /api/disputes/status/{status}:
 *   get:
 *     summary: Get disputes by status
 *     description: Retrieves all disputes with a specific status.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: status
 *         required: true
 *         schema:
 *           type: string
 *         description: The status of the disputes (e.g., open, resolved)
 *     responses:
 *       200:
 *         description: Disputes retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/status/:status', authenticateToken, requireRole('admin'), getDisputesByStatus);

/**
 * @swagger
 * /api/disputes/openedBy/{openedBy}:
 *   get:
 *     summary: Get disputes by openedBy
 *     description: Retrieves all disputes opened by a specific user or transporter.
 *     tags: [Disputes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: openedBy
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user or transporter who opened the dispute
 *     responses:
 *       200:
 *         description: Disputes retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/openedBy/:openedBy', authenticateToken, requireRole(['user', 'transporter', 'admin']), getDisputesByOpenedBy);

/**
 * @swagger
 * /api/disputes/{disputeId}:
 *   delete:
 *     summary: Soft delete a dispute
 *     description: Marks a dispute as deleted instead of permanent removal.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: disputeId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the dispute to delete
 *     responses:
 *       200:
 *         description: Dispute marked as deleted successfully
 *       404:
 *         description: Dispute not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:disputeId', authenticateToken, requireRole('admin'), deleteDispute);

module.exports = router;