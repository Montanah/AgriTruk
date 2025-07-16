const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middlewares/requireRole');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { createPermission, updatePermission, deletePermission } = require('../controllers/permissionController');

/**
 * @swagger
 * tags:
 *   - name: Permissions
 *     description: Permission management endpoints
 */

/**
 * @swagger
 * /api/permissions:
 *   post:
 *     summary: Create a new permission
 *     description: Allows a superadmin to create a new permission.
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: Unique name of the permission
 *               description:
 *                 type: string
 *                 description: Description of the permission
 *               status:
 *                 type: string
 *                 description: Status of the permission (active/inactive)
 *                 enum: [active, inactive]
 *                 default: active
 *             example:
 *               name: "manage_users"
 *               description: "Ability to manage user accounts"
 *               status: "active"
 *     responses:
 *       201:
 *         description: Permission created successfully
 *       400:
 *         description: Permission name already exists or missing required fields
 *       500:
 *         description: Internal server error
 */
router.post('/', authenticateToken, requireAuth('superadmin'), createPermission);
/**
 * @swagger
 * /api/permissions/{permissionId}:
 *   put:
 *     summary: Update a permission
 *     description: Allows a superadmin to update an existing permission.
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: permissionId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the permission to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Updated name of the permission
 *               description:
 *                 type: string
 *                 description: Updated description of the permission
 *               status:
 *                 type: string
 *                 description: Updated status of the permission
 *                 enum: [active, inactive]
 *             example:
 *               description: "Updated ability to manage user accounts"
 *               status: "inactive"
 *     responses:
 *       200:
 *         description: Permission updated successfully
 *       400:
 *         description: No fields provided for update
 *       404:
 *         description: Permission not found
 *       500:
 *         description: Internal server error
 */
router.put('/:permissionId', authenticateToken, requireAuth('superadmin'), updatePermission);

/**
 * @swagger
 * /api/permissions/{permissionId}:
 *   delete:
 *     summary: Delete a permission
 *     description: Allows a superadmin to mark a permission as inactive (soft delete).
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: permissionId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the permission to delete
 *     responses:
 *       200:
 *         description: Permission marked as inactive successfully
 *       404:
 *         description: Permission not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:permissionId', authenticateToken, requireAuth('superadmin'), deletePermission);

module.exports = router;