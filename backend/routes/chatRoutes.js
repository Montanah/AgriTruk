const express = require('express');
const router = express.Router();
const ChatController = require('../controllers/chatController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { requireRole }= require("../middlewares/requireRole");

/**
 * @swagger
 * tags:
 *   - name: Chat
 *     description: In-app chat management endpoints
 */

/**
 * @swagger
 * /api/chats:
 *   post:
 *     summary: Create a new chat between two participants
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               participant1Id:
 *                 type: string
 *               participant1Type:
 *                 type: string
 *                 enum: [user, broker, transporter]
 *               participant2Id:
 *                 type: string
 *               participant2Type:
 *                 type: string
 *                 enum: [user, broker, transporter]
 *     responses:
 *       201:
 *         description: Chat created successfully
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
router.post('/', authenticateToken, requireRole(['broker', 'user', 'transporter']),  ChatController.createChat);

/**
 * @swagger
 * /api/chats:
 *   post:
 *     summary: Send a message in a chat
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               chatId:
 *                 type: string
 *               message:
 *                 type: string
 *     responses:
 *       201:
 *         description: Message sent successfully
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
router.post('/messages', authenticateToken, requireRole(['broker', 'user', 'transporter']), ChatController.sendMessage);

/**
 * @swagger
 * /api/chats/{chatId}:
 *   get:
 *     summary: Get a specific chat with messages
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Chat retrieved successfully
 *       400:
 *         description: Chat ID is required
 *       500:
 *         description: Server error
 */
router.get('/:chatId', authenticateToken, requireRole(['broker', 'user', 'transporter']), ChatController.getChat);

/**
 * @swagger
 * /api/chats:
 *   get:
 *     summary: Get all chats for the authenticated user
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Chats retrieved successfully
 *       500:
 *         description: Server error
 */
router.get('/', authenticateToken, requireRole(['broker', 'user', 'transporter']), ChatController.getChats);

/**
 * @swagger
 * /api/chats/job/{jobId}:
 *   get:
 *     summary: Get chat by job ID
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Chat retrieved successfully
 *       404:
 *         description: No chat found for this job
 *       500:
 *         description: Server error
 */
router.get('/job/:jobId', authenticateToken, requireRole(['broker', 'user', 'transporter']), ChatController.getChatByJob);

module.exports = router;