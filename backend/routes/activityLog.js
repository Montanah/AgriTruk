const express = require('express');
const router = express.Router();

const { authenticateToken } = require("../middlewares/authMiddleware");
const getUserLogs = require('../controllers/getUserLogs');


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
 *     User:
 *       type: object
 *       properties:
 *         uid:
 *           type: string
 *         email:
 *           type: string
 *           nullable: true
 *         phone:
 *           type: string
 *           nullable: true
 *         role:
 *           type: string
 *           enum: [user, farmer, transporter, admin]
 *         name:
 *           type: string
 *           nullable: true
 *         location:
 *           type: string
 *           nullable: true
 *         userType:
 *           type: string
 *           nullable: true
 *         languagePreference:
 *           type: string
 *           nullable: true
 *         profilePhotoUrl:
 *           type: string
 *           nullable: true
 *         isVerified:
 *           type: boolean
 *         fcmToken:
 *           type: string
 *           nullable: true
 *     Error:
 *       type: object
 *       properties:
 *         code:
 *           type: string
 *         message:
 *           type: string
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

module.exports = router;