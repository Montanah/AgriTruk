const express = require('express');
const router = express.Router();

const { authenticateToken } = require("../middlewares/authMiddleware");
const { requireRole } = require("../middlewares/requireRole");
const getUserLogs = require('../controllers/getUserLogs');
const { requireSelfOrSuperAdmin } = require('../middlewares/adminAuth');

/**
 * @swagger
 * tags:
 *   - name: Activity Log
 *     description: Activity log management for users
 */

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     ActivityLog:
 *       type: object
 *       properties:
 *         action:
 *           type: string
 *           description: Description of the action performed
 *         device:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp of the action
 */
/**
 * @swagger
 * /api/activity:
 *   get:
 *     summary: Get user activity logs
 *     description: Fetches the recent activity logs for the authenticated user.
 *     tags: [Activity Log]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         required: false
 *         description: Number of logs to retrieve (default is 20)
 *     responses:
 *       200:
 *         description: Successfully retrieved user logs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                   description: Number of logs retrieved
 *                 logs:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       action:
 *                         type: string
 *                         description: Description of the action performed
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         description: Timestamp of the action
 *       401:
 *         description: Unauthorized access, user must be authenticated
 *       500:
 *         description: Internal server error, failed to fetch logs
 */
router.get('/', authenticateToken, getUserLogs.getUserLogs);

/**
 * @swagger
 * /api/activity:
 *   post:
 *     summary: Log a new user activity
 *     description: Creates a new activity log entry for the authenticated user.
 *     tags: [Activity Log]
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
 *             properties:
 *               action:
 *                 type: string
 *                 description: Description of the action to log
 *                 example: "User updated profile"
 *     responses:
 *       201:
 *         description: Activity logged successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Success message
 *                 log:
 *                   type: object
 *                   properties:
 *                     action:
 *                       type: string
 *                       description: Description of the action performed
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       description: Timestamp of the action
 *       400:
 *         description: Bad request, action is required
 *       401:
 *         description: Unauthorized access, user must be authenticated
 *       500:
 *         description: Internal server error, failed to log activity
 */
router.post('/', authenticateToken, getUserLogs.createUserLog);


/**
 * @swagger
 * /api/activity/adminlogs:
 *   get:
 *     summary: Get admin activity logs
 *     description: Fetches the recent activity logs for the authenticated admin.
 *     tags: [Activity Log]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         required: false
 *         description: Number of logs to retrieve (default is 20)
 *     responses:
 *       200:
 *         description: Successfully retrieved admin logs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                   description: Number of logs retrieved
 *                 logs:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       action:
 *                         type: string
 *                         description: Description of the action performed
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         description: Timestamp of the action
 *       401:
 *         description: Unauthorized access, admin must be authenticated
 *       500:
 *         description: Internal server error, failed to fetch logs
 */
router.get('/adminlogs', authenticateToken, requireRole('admin'), requireSelfOrSuperAdmin, getUserLogs.getAdminLogs);

module.exports = router;