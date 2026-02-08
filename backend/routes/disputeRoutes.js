

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/requireRole');
const {
  createDispute,
  getDispute,
  updateDispute,
  getDisputesByBookingId,
  getDisputesByOpenedBy,
  deleteDispute,
} = require('../controllers/disputeController');
const { authorize } = require("../middlewares/adminAuth");
//const { getActiveSubscribedTransporters } = require('../services/testService');

/**
 * @swagger
 * tags:
 *   - name: Disputes
 *     description: Dispute management endpoints
 */
/**
 * @swagger
 * components:
 *   schemas:
 *     Dispute:
 *       type: object
 *       properties:
 *         disputeId:
 *           type: string
 *         bookingId:
 *           type: string
 *         transporterId:
 *           type: string
 *         reason:
 *           type: string
 *         status:
 *           type: string
 *         priority:
 *           type: string
 *         comments:
 *           type: array
 *           items:
 *             type: string
 *         evidence:
 *           type: array
 *           items:
 *             type: string
 *         resolution:
 *           type: string
 *         amountRefunded:
 *           type: number
 *         openedAt:
 *           type: string
 *           format: date-time
 *         openedBy:
 *           type: string
 *         resolvedAt:
 *           type: string
 *           format: date-time
 *         resolvedBy:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
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
router.post('/', authenticateToken, requireRole(['user', 'transporter', 'admin', 'shipper', 'business']), createDispute);

//router.get('/test', getActiveSubscribedTransporters)

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
router.get('/:disputeId', authenticateToken, requireRole(['user', 'transporter', 'admin', 'shipper', 'business']), getDispute);

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
router.put('/:disputeId', authenticateToken, requireRole(['user', 'transporter', 'admin', 'shipper', 'business']), updateDispute);

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
router.get('/booking/:bookingId', authenticateToken, requireRole(['user', 'transporter', 'admin', 'shipper', 'business']), getDisputesByBookingId);

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
router.get('/openedBy/:openedBy', authenticateToken, requireRole(['user', 'transporter', 'admin', 'shipper', 'business', 'broker']), getDisputesByOpenedBy);

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
router.delete('/:disputeId', authenticateToken, requireRole('admin'), authorize(['manage_disputes', 'super_admin']), deleteDispute);

module.exports = router;