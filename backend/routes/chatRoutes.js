// routes/chatRoutes.js
const express = require('express');
const router = express.Router();
const ChatController = require('../controllers/chatController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { requireRole } = require("../middlewares/requireRole");
const { upload } = require('../middlewares/uploadMiddleware');

/**
 * @swagger
 * tags:
 *   - name: Chat
 *     description: In-app chat management with real-time messaging
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
 *             properties:
 *               participant2Id:
 *                 type: string
 *                 description: ID of the second participant
 *               participant2Type:
 *                 type: string
 *                 description: Type of the second participant (broker, user, transporter, client)
 *               jobId:
 *                 type: string
 *                 description: ID of the job (optional)
 *     responses:
 *       201:
 *         description: Chat created successfully
 *       400:
 *         description: Participant details are required
 *       404:
 *         description: Participant not found
 *       409:
 *         description: Chat already exists
 */
router.post('/', authenticateToken, requireRole(['broker', 'shipper', 'business', 'transporter', 'driver']), ChatController.createChat);

/**
 * @swagger
 * /api/chats:
 *   get:
 *     summary: Get all chats for the authenticated user with unread counts
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Chats retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/', authenticateToken, requireRole(['broker', 'shipper', 'business', 'transporter', 'driver']), ChatController.getChats);

/**
 * @swagger
 * /api/chats/messages:
 *   post:
 *     summary: Send a message (text or file) in a chat
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - chatId
 *             properties:
 *               chatId:
 *                 type: string
 *                 description: ID of the chat
 *               message:
 *                 type: string
 *                 description: Text content of the message
 *               file:
 *                 type: file
 *                 description: File attachment for the message
 *     responses:
 *       201:
 *         description: Message sent successfully
 *       400:
 *         description: Chat ID is required
 *       403:
 *         description: Unauthorized 
 */
router.post('/messages', authenticateToken, requireRole(['broker', 'shipper', 'business', 'transporter', 'driver']), upload.single('file'), ChatController.sendMessage);

/**
 * @swagger
 * /api/chats/messages/edit:
 *   put:
 *     summary: Edit a message
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 */
router.put('/messages/edit', authenticateToken, requireRole(['broker', 'shipper', 'business', 'transporter', 'driver']), ChatController.editMessage);

/**
 * @swagger
 * /api/chats/messages/{chatId}/{messageId}:
 *   delete:
 *     summary: Delete a message
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/messages/:chatId/:messageId', authenticateToken, requireRole(['broker', 'shipper', 'business', 'transporter', 'driver']), ChatController.deleteMessage);

/**
 * @swagger
 * /api/chats/messages/read:
 *   put:
 *     summary: Mark a specific message as read
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 */
router.put('/messages/read', authenticateToken, requireRole(['broker', 'shipper', 'business', 'transporter', 'driver']), ChatController.markAsRead);

/**
 * @swagger
 * /api/chats/{chatId}/read-all:
 *   put:
 *     summary: Mark all messages in a chat as read
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:chatId/read-all', authenticateToken, requireRole(['broker', 'shipper', 'business', 'transporter', 'driver']), ChatController.markAllAsRead);

/**
 * @swagger
 * /api/chats/{chatId}/load-more:
 *   get:
 *     summary: Load more messages (pagination)
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: lastMessageTimestamp
 *         required: true
 *         schema:
 *           type: number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 50
 */
router.get('/:chatId/load-more', authenticateToken, requireRole(['broker', 'shipper', 'business', 'transporter', 'driver']), ChatController.loadMoreMessages);

/**
 * @swagger
 * /api/chats/{chatId}/search:
 *   get:
 *     summary: Search messages in a chat
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/:chatId/search', authenticateToken, requireRole(['broker', 'shipper', 'business', 'transporter', 'driver']), ChatController.searchMessages);

/**
 * @swagger
 * /api/chats/{chatId}/mute:
 *   put:
 *     summary: Mute notifications for a chat
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:chatId/mute', authenticateToken, requireRole(['broker', 'shipper', 'business', 'transporter', 'driver']), ChatController.muteChat);

/**
 * @swagger
 * /api/chats/{chatId}/unmute:
 *   put:
 *     summary: Unmute notifications for a chat
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:chatId/unmute', authenticateToken, requireRole(['broker', 'shipper', 'business', 'transporter', 'driver']), ChatController.unmuteChat);

/**
 * @swagger
 * /api/chats/{chatId}/block:
 *   put:
 *     summary: Block a chat
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:chatId/block', authenticateToken, requireRole(['broker', 'shipper', 'business', 'transporter', 'driver']), ChatController.blockChat);

/**
 * @swagger
 * /api/chats/{chatId}/unblock:
 *   put:
 *     summary: Unblock a chat
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:chatId/unblock', authenticateToken, requireRole(['broker', 'shipper', 'business', 'transporter', 'driver']), ChatController.unblockChat);

/**
 * @swagger
 * /api/chats/job/{jobId}:
 *   get:
 *     summary: Get chat associated with a specific job
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 */
router.get('/job/:jobId', authenticateToken, requireRole(['broker', 'shipper', 'business', 'transporter', 'driver']), ChatController.getChatByJob);

/**
 * @swagger
 * /api/chats/{chatId}:
 *   get:
 *     summary: Get a specific chat with messages (paginated)
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 50
 *       - in: query
 *         name: lastMessageTimestamp
 *         schema:
 *           type: number
 */
router.get('/:chatId', authenticateToken, requireRole(['broker', 'shipper', 'business', 'transporter', 'driver']), ChatController.getChat);

module.exports = router;