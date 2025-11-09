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
 */
router.post('/', authenticateToken, requireRole(['broker', 'user', 'transporter', 'client', 'shipper', 'business']), ChatController.createChat);

/**
 * @swagger
 * /api/chats:
 *   get:
 *     summary: Get all chats for the authenticated user with unread counts
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', authenticateToken, requireRole(['broker', 'user', 'transporter', 'client', 'shipper', 'business']), ChatController.getChats);

/**
 * @swagger
 * /api/chats/messages:
 *   post:
 *     summary: Send a message (text or file) in a chat
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 */
router.post('/messages', authenticateToken, requireRole(['broker', 'user', 'transporter', 'client', 'shipper', 'business']), upload.single('file'), ChatController.sendMessage);

/**
 * @swagger
 * /api/chats/messages/edit:
 *   put:
 *     summary: Edit a message
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 */
router.put('/messages/edit', authenticateToken, requireRole(['broker', 'user', 'transporter', 'client', 'shipper', 'business']), ChatController.editMessage);

/**
 * @swagger
 * /api/chats/messages/{chatId}/{messageId}:
 *   delete:
 *     summary: Delete a message
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/messages/:chatId/:messageId', authenticateToken, requireRole(['broker', 'user', 'transporter', 'client', 'shipper', 'business']), ChatController.deleteMessage);

/**
 * @swagger
 * /api/chats/messages/read:
 *   put:
 *     summary: Mark a specific message as read
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 */
router.put('/messages/read', authenticateToken, requireRole(['broker', 'user', 'transporter', 'client', 'shipper', 'business']), ChatController.markAsRead);

/**
 * @swagger
 * /api/chats/{chatId}/read-all:
 *   put:
 *     summary: Mark all messages in a chat as read
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:chatId/read-all', authenticateToken, requireRole(['broker', 'user', 'transporter', 'client', 'shipper', 'business']), ChatController.markAllAsRead);

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
router.get('/:chatId/load-more', authenticateToken, requireRole(['broker', 'user', 'transporter', 'client', 'shipper', 'business']), ChatController.loadMoreMessages);

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
router.get('/:chatId/search', authenticateToken, requireRole(['broker', 'user', 'transporter', 'client', 'shipper', 'business']), ChatController.searchMessages);

/**
 * @swagger
 * /api/chats/{chatId}/mute:
 *   put:
 *     summary: Mute notifications for a chat
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:chatId/mute', authenticateToken, requireRole(['broker', 'user', 'transporter', 'client', 'shipper', 'business']), ChatController.muteChat);

/**
 * @swagger
 * /api/chats/{chatId}/unmute:
 *   put:
 *     summary: Unmute notifications for a chat
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:chatId/unmute', authenticateToken, requireRole(['broker', 'user', 'transporter', 'client', 'shipper', 'business']), ChatController.unmuteChat);

/**
 * @swagger
 * /api/chats/{chatId}/block:
 *   put:
 *     summary: Block a chat
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:chatId/block', authenticateToken, requireRole(['broker', 'user', 'transporter', 'client', 'shipper', 'business']), ChatController.blockChat);

/**
 * @swagger
 * /api/chats/{chatId}/unblock:
 *   put:
 *     summary: Unblock a chat
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:chatId/unblock', authenticateToken, requireRole(['broker', 'user', 'transporter', 'client', 'shipper', 'business']), ChatController.unblockChat);

/**
 * @swagger
 * /api/chats/job/{jobId}:
 *   get:
 *     summary: Get chat associated with a specific job
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 */
router.get('/job/:jobId', authenticateToken, requireRole(['broker', 'user', 'transporter', 'client', 'shipper', 'business']), ChatController.getChatByJob);

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
router.get('/:chatId', authenticateToken, requireRole(['broker', 'user', 'transporter', 'client', 'shipper', 'business']), ChatController.getChat);

module.exports = router;