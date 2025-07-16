const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middlewares/requireRole');
const { updateAdminPermissions } = require('../controllers/adminController');
const { authenticateToken } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * tags:
 *   - name: Admin
 *     description: Admin management endpoints
 */

/**
 * @swagger
 * /api/admins/{adminId}/permissions:
 *   put:
 *     summary: Update admin permissions
 *     description: Allows a superadmin to update the permissions of a specific admin.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: adminId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the admin to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - permissionIds
 *             properties:
 *               permissionIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of permission IDs to assign
 *                 example: ["perm_001", "perm_002"]
 *     responses:
 *       200:
 *         description: Admin permissions updated successfully
 *       400:
 *         description: Invalid permission IDs or missing data
 *       404:
 *         description: Admin not found
 *       500:
 *         description: Internal server error
 */
router.put('/:adminId/permissions', authenticateToken, requireAuth('superadmin'), updateAdminPermissions);

module.exports = router;