const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/adminManagementController');
const {getAllBookings, 
  getAllUsers, 
  searchUsers 
} = require('../controllers/adminController');
const authController = require("../controllers/authController");
const {
  authenticate,
  authorize,
  requireSuperAdmin,
  requireSelfOrSuperAdmin,
  loginRateLimit
} = require("../middlewares/adminAuth");
const { requireRole } = require('../middlewares/requireRole');
const companyController = require('../controllers/companyController');
const transporterController = require('../controllers/transporterController');

/**
 * @swagger
 * tags:
 *   - name: Admin
 *     description: Admin management endpoints
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Admin:
 *       type: object
 *       properties:
 *         adminId:
 *           type: string
 *         userId:
 *           type: string
 *         name:
 *           type: string
 *         email:
 *           type: string
 *         phone:
 *           type: string
 *         role:
 *           type: string
 *           enum: [admin, super_admin]
 *         permissions:
 *           type: array
 *           items:
 *             type: string
 *         status:
 *           type: string
 *           enum: [active, inactive]
 *         lastLogin:
 *           type: string
 *           format: date-time
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

// Public routes
/**
 * @swagger
 * /api/admin/login:
 *   post:
 *     tags: [AdminManagement]
 *     summary: Login as an admin
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', loginRateLimit, AdminController.login);

router.post('/logout', AdminController.logout);

// Protected routes - require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/admin/profile:
 *   get:
 *     tags: [AdminManagement]
 *     summary: Get the logged-in admin's profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Admin'
 */
router.get('/profile', AdminController.getProfile);

/**
 * @swagger
 * /api/admin/profile:
 *   put:
 *     tags: [AdminManagement]
 *     summary: Update the logged-in admin's profile
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated
 */
router.put('/profile', AdminController.updateProfile);

// Admin management routes - Super admin only
/**
 * @swagger
 * /api/admin/create:
 *   post:
 *     tags: [AdminManagement]
 *     summary: Create a new admin (Super Admin only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Admin'
 *     responses:
 *       201:
 *         description: Admin created
 */
router.post('/create', requireSuperAdmin, AdminController.createAdmin);

/**
 * @swagger
 * /api/admin/all:
 *   get:
 *     tags: [AdminManagement]
 *     summary: Get a list of all admins (Super Admin only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of admins
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Admin'
 */
router.get('/all', requireSuperAdmin, AdminController.getAllAdmins);


// Permission-based routes 
router.get('/users/manage', authorize(['manage_users', 'super_admin']), (req, res) => {
  res.json({
    success: true,
    message: 'Access granted to user management',
    admin: req.admin.name
  });
});

router.get('/reports/view', authorize(['view_reports', 'super_admin']), (req, res) => {
  res.json({
    success: true,
    message: 'Access granted to reports',
    admin: req.admin.name
  });
});

/**
 * @swagger
 * /api/admin/bookings:
 *   get:
 *     tags: [Admin Views]
 *     summary: Get a list of all bookings (View Bookings or Super Admin only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of bookings
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Booking'
 *       403:
 *         description: Access denied
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 * 
 */
router.get('/bookings', authenticate, authorize(['view_bookings', 'super_admin']), getAllBookings);
/**
 * @swagger
 * /api/admin/users/search:
 *   get:
 *     tags: [Admin Views]
 *     summary: Search for users (View Users or Super Admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: query
 *         in: query
 *         required: true
 *         description: Search keyword (e.g. name, email)
 *         schema:
 *           type: string
 *       - name: limit
 *         in: query
 *         required: false
 *         description: Maximum number of users to return
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *       400:
 *         description: Missing search query
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Access denied
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/users/search', authenticate, authorize(['manage_users', 'view_users', 'super_admin']), searchUsers);

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     tags: [Admin Views]
 *     summary: Get a list of all users (View Users or Super Admin only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       403:
 *         description: Access denied
 *         content:
*/
router.get('/users', authenticate, authorize(['manage_users', 'view_users', 'super_admin']), getAllUsers);

/**
 * @swagger
 * /api/admin/companies:
 *   get:
 *     summary: Get all companies
 *     description: Retrieves a list of all companies.
 *     tags: [Admin Views]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Companies retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/companies', authenticate, requireRole('admin'), authorize(['view_companies', 'manage_companies', 'super_admin']), companyController.getAllCompanies);

/**
 * @swagger
 * /api/admin/transporters:
 *   get:
 *     summary: Get all transporters
 *     description: Retrieve a list of all transporters. Accessible by users, transporters, and admins.
 *     tags: [Admin Views]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of transporters retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                 transporters:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       transporterId:
 *                         type: string
 *                       driverName:
 *                         type: string
 *                       phoneNumber:
 *                         type: string
 *                       email:
 *                         type: string
 *                       status:
 *                         type: string
 *                       rating:
 *                         type: number
 *                       totalTrips:
 *                         type: integer
 *                       vehicleType:
 *                         type: string
 *                       vehicleRegistration:
 *                         type: string
 *       401:
 *         description: Unauthorized - user must be logged in
 *       500:
 *         description: Internal server error
 */
router.get('/transporters', authenticate, requireRole(['admin']), authorize(['view_transporters', 'manage_transporters', 'super_admin']),  transporterController.getAllTransporters);

router.get('/settings/manage', authorize(['manage_settings', 'super_admin']), (req, res) => {
  res.json({
    success: true,
    message: 'Access granted to settings management',
    admin: req.admin.name
  });
});

/**
 * @swagger
 * /api/admin/{adminId}:
 *   get:
 *     tags: [AdminManagement]
 *     summary: Get a single admin by ID (Self or Super Admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: adminId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Admin found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Admin'
 */
router.get('/:adminId', requireSelfOrSuperAdmin, AdminController.getAdmin);

/**
 * @swagger
 * /api/admin/{adminId}:
 *   put:
 *     tags: [AdminManagement]
 *     summary: Update an admin (Super Admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: adminId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Admin'
 *     responses:
 *       200:
 *         description: Admin updated
 */
router.put('/:adminId', requireSuperAdmin, AdminController.updateAdmin);

/**
 * @swagger
 * /api/admin/{adminId}:
 *   delete:
 *     tags: [AdminManagement]
 *     summary: Delete an admin (Super Admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: adminId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Admin deleted
 */
router.delete('/:adminId', requireSuperAdmin, AdminController.deleteAdmin);

/**
 * @swagger
 * /api/admin/delete_user/{uid}:
 *   delete:
 *     summary: Delete user profile
 *     description: Delete the authenticated user's profile from Firestore (not the Firebase Auth account).
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete("/delete_user/:uid", requireSuperAdmin, authController.deleteUser);

/**
 * @swagger
 * /api/admin/delete-account/{uid}:
 *   delete:
 *     summary: Delete user account
 *     description: Delete the authenticated user's Firebase Auth account and Firestore profile.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User account deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       50044:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete("/delete-account/:uid", requireSuperAdmin, authController.deleteAccount);


/**
 * @swagger
 * /api/admin/deactivate-account/{uid}:
 *   delete:
 *     summary: Delete user profile
 *     description: Delete the authenticated user's profile from Firestore (not the Firebase Auth account).
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete("/deactivate-account/:uid", requireSuperAdmin, authController.deactivateAccount);

module.exports = router;