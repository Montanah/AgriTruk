const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/adminManagementController');
const {getAllBookings, getPermissions, getAllUsers, searchUsers, getAllDeletedUsers, exportToCSV, generatePDFReport, generateReports, getAllShippers, getAllActions, markAsResolved, getPendingActions, banUser, unbanUser } = require('../controllers/adminController');
const authController = require("../controllers/authController");
const {
  authorize,
  requireSuperAdmin,
  requireSelfOrSuperAdmin,
  loginRateLimit
} = require("../middlewares/adminAuth");
const { requireRole } = require('../middlewares/requireRole');
const companyController = require('../controllers/companyController');
const transporterController = require('../controllers/transporterController');
const disputeController = require('../controllers/disputeController');
const brokerController = require('../controllers/brokerController');
const AnalyticsController = require('../controllers/analyticsController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const multer = require("multer");
const bookingController = require('../controllers/bookingController');

const upload = multer({ dest: "uploads/" }); 

/**
 * @swagger
 * tags:
 *   - name: Admin
 *     description: Admin management endpoints
 *   - name: Admin Views
 *     description: Admin management GET endpoints
 *   - name: Admin Actions
 *     description: Admin management Action (PATCH) endpoints
 *   - name: Admin Management
 *     description: Admin management endpoints for admin dashboard
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

/**
 * @swagger
 * components:
 *   schemas:
 *     Action:
 *       type: object
 *       properties:
 *         actionId:
 *           type: string
 *         entityId:
 *           type: string
 *         priority:         
 *           type: string
 *         metadata:
 *           type: string
 *         status:
 *           type: string
 *         message:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         resolvedAt:
 *           type: string
 *           format: date-time
 *         resolvedBy:
 *           type: string
 */
// Public routes
/**
 * @swagger
 * /api/admin/login:
 *   post:
 *     tags: [Admin Management]
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
router.use(authenticateToken);

/**
 * @swagger
 * /api/admin/profile:
 *   get:
 *     tags: [Admin Management]
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
 *     tags: [Admin Management]
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
router.put('/profile', authenticateToken, requireSelfOrSuperAdmin, AdminController.updateProfile);

// Admin management routes - Super admin only
/**
 * @swagger
 * /api/admin/create:
 *   post:
 *     tags: [Admin Management]
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
 *     tags: [Admin Management]
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
router.get('/bookings', authenticateToken, authorize(['view_bookings', 'super_admin']), getAllBookings);

/** 
 * @swagger
 * /api/admin/actions:
 *   get:
 *     tags: [Admin Views]
 *     summary: Get a list of all actions (Admin only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of actions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Action'
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
router.get('/actions', authenticateToken, requireRole('admin'), getAllActions);

/**
 * @swagger
 * /api/admin/pendingActions:
 *   get:
 *     tags: [Admin Views]
 *     summary: Get a list of all pending actions (admin only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending actions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Action'
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
router.get('/pendingActions', authenticateToken,  getPendingActions);

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
router.get('/users/search', authenticateToken, authorize(['manage_users', 'view_users', 'super_admin']), searchUsers);

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
router.get('/users', authenticateToken, authorize(['manage_users', 'view_users', 'super_admin']), getAllUsers);

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
router.get('/companies', authenticateToken, requireRole('admin'), authorize(['view_companies', 'manage_companies', 'super_admin']), companyController.getAllCompanies);

/** 
 * @swagger
 * /api/admin/shippers:
 *   get:
 *     summary: Get all shippers
 *     description: Retrieves a list of all shippers.
 *     tags: [Admin Views]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Shippers retrieved successfully
 *       500:
 *         description: Internal server error
*/
router.get('/shippers', authenticateToken, requireRole('admin'), authorize(['view_shippers', 'manage_shippers', 'super_admin']), getAllShippers);

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
router.get('/transporters', authenticateToken, requireRole(['admin']), authorize(['view_transporters', 'manage_transporters', 'super_admin']),  transporterController.getAllTransporters);

/**
 * @swagger
 * /api/admin/brokers:
 *   get:
 *     summary: Get all brokers
 *     tags: [Admin Views]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Brokers retrieved successfully
 *       500:
 *         description: Server error
 */
router.get('/brokers', authenticateToken, requireRole('admin'), authorize(['view_brokers', 'manage_brokers', 'super_admin']), brokerController.getAllBrokers);

/**
 * @swagger
 * /api/admin/permissions:
 *   get:
 *     summary: Get all permissions
 *     tags: [Admin Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Permissions retrieved successfully
 *       500:
 *         description: Server error
 */
router.get('/permissions', authenticateToken, requireRole('admin'), authorize(['super_admin']), getPermissions);

/**
 * @swagger
 * /api/admin/deleted-users:
 *   get:
 *     summary: Get a list of deleted users (Super Admin & Manage Users only)
 *     tags: [Admin Views]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of deleted users
 *       500:
 *         description: Server error
 */
router.get('/deleted-users', authenticateToken, requireRole('admin'), authorize(['super_admin', 'manage_users']), getAllDeletedUsers);

/**
 * @swagger
 * /api/admin/dashboard-metrics:
 *   get:
 *     summary: Get dashboard metrics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *         description: Start date for range (e.g., 2025-07-01)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *         description: End date for range (e.g., 2025-07-01)
 *     responses:
 *       200:
 *         description: Dashboard metrics retrieved successfully
 *       500:
 *         description: Server error
 */
router.get('/dashboard-metrics', authenticateToken, requireRole('admin'), authorize(['view_analytics', 'super_admin']), AnalyticsController.getAnalytics);

/**
 * @swagger
 * /api/admin/disputes/status/{status}:
 *   get:
 *     summary: Get disputes by status
 *     description: Retrieves all disputes with a specific status.
 *     tags: [Admin Views]
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
router.get('/disputes/status/:status', authenticateToken, requireRole('admin'), authorize(['view_disputes', 'manage_disputes', 'super_admin']), disputeController.getDisputesByStatus);

/**
 * @swagger
 * /api/admin/disputes:
 *   get:
 *     summary: Get all disputes
 *     description: Retrieves a list of all disputes.
 *     tags: [Admin Views]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Disputes retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/disputes', authenticateToken, requireRole('admin'), authorize(['view_disputes', 'manage_disputes', 'super_admin']), disputeController.getAllDisputes);

/**
 * @swagger
 * /api/admin/export/csv:
 *   get:
 *     summary: Export disputes to CSV
 *     description: Exports disputes to a CSV file.
 *     tags: [Admin Views]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         required: false
 *         description: Start date for report filtering
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         required: false
 *         description: End date for report filtering 
 *       - in: query
 *         name: entity
 *         schema:
 *           type: string
 *         required: true
 *         description: Entity for report filtering
 *     responses:
 *       200:
 *         description: Disputes exported to CSV successfully
 *       500:
 *         description: Internal server error
 */
router.get('/export/csv', authenticateToken, requireRole('admin'), authorize(['view_reports', 'manage_reports','super_admin']), exportToCSV);

/**
 * @swagger
 * /api/admin/pdfreports:
 *   get:
 *     summary: Get all reports as PDF with a date range
 *     description: Retrieves a list of all reports.
 *     tags: [Admin Views]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         required: false
 *         description: Start date for report filtering
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         required: false
 *         description: End date for report filtering 
 *       - in: query
 *         name: entity
 *         schema:
 *           type: string
 *         required: true
 *         description: Entity for report filtering
 *     responses:
 *       200:
 *         description: Reports retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/pdfreports', authenticateToken, requireRole('admin'), authorize(['view_reports', 'manage_reports', 'super_admin']), generatePDFReport);

/**
 * @swagger
 * /api/admin/brokers/{brokerId}:
 *   get:
 *     summary: Get broker details
 *     tags: [Admin Views]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: brokerId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Broker retrieved successfully
 *       404:
 *         description: Broker not found
 *       500:
 *         description: Server error
 */
router.get('/brokers/:brokerId', authenticateToken, requireRole('admin'), authorize(['view_brokers', 'super_admin']), brokerController.getBroker);

/**
 * @swagger
 * /api/admin/disputes/{disputeId}/resolve:
 *   patch:
 *     summary: Resolve a dispute
 *     description: Resolves a dispute with resolution details.
 *     tags: [Admin Actions]
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
router.patch('/disputes/:disputeId/resolve', authenticateToken, requireRole('admin'), authorize(['manage_disputes', 'super_admin']), disputeController.resolveDispute);

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
 *     tags: [Admin Management]
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
 * /api/admin/companies/search:
 *   get:
 *     summary: Search companies
 *     description: Retrieves a paginated list of companies based on a search term across company name or registration number, and status.
 *     tags: [Admin Views]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status (e.g., pending, approved, rejected)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for company name or registration number
 *     responses:
 *       200:
 *         description: Companies retrieved successfully
 *         content:
 *           application/json:
 *             example:
 *               companies:
 *                 - companyId: "comp123"
 *                   companyName: "Green Farms Ltd"
 *                   companyRegistration: "REG123456"
 *                   status: "approved"
 *                   transporterId: "trans123"
 *                 - companyId: "comp124"
 *                   companyName: "Blue Agro Ltd"
 *                   companyRegistration: "REG789012"
 *                   status: "pending"
 *                   transporterId: "trans124"
 *               currentPage: 1
 *               totalPages: 5
 *               totalItems: 50
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             example: { message: 'Failed to fetch companies' }
 */
router.get('/companies/search', authenticateToken, requireRole('admin'), authorize(['view_companies', 'manage_companies', 'super_admin']), companyController.searchCompany);

/**
 * @swagger
 * /api/admin/companies/transporter/{transporterId}:
 *   get:
 *     summary: Get companies by transporter
 *     description: Retrieves all companies for a specific transporter.
 *     tags: [Admin Views]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transporterId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the transporter
 *     responses:
 *       200:
 *         description: Companies retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/transporter/:transporterId', authenticateToken, requireRole([ 'admin']), authorize(['view_companies', 'manage_companies', 'super_admin']), companyController.getCompaniesByTransporter);

/**
 * @swagger
 * /api/admin/companies/status/{status}:
 *   get:
 *     summary: Get companies by status
 *     description: Retrieves all companies with a specific status.
 *     tags: [Admin Views]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: status
 *         required: true
 *         schema:
 *           type: string
 *         description: The status of the companies (e.g., pending, approved, rejected)
 *     responses:
 *       200:
 *         description: Companies retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/companies/status/:status', authenticateToken, requireRole('admin'), authorize(['view_companies', 'manage_companies', 'super_admin']), companyController.getCompaniesByStatus);

/**
 * @swagger
 * /api/admin/companies/transporter/{transporterId}/status/{status}:
 *   get:
 *     summary: Get companies by transporter and status
 *     description: Retrieves all companies for a transporter with a specific status.
 *     tags: [Admin Views]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transporterId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the transporter
 *       - in: path
 *         name: status
 *         required: true
 *         schema:
 *           type: string
 *         description: The status of the companies (e.g., pending, approved, rejected)
 *     responses:
 *       200:
 *         description: Companies retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/companies/transporter/:transporterId/status/:status', authenticateToken, requireRole(['transporter', 'admin']), authorize(['view_companies', 'manage_companies', 'super_admin']), companyController.getCompaniesByTransporterAndStatus);

/**
 * @swagger
 * /api/admin/companies/transporter/{transporterId}/all:
 *   get:
 *     summary: Get all companies for a transporter
 *     description: Retrieves all companies associated with a specific transporter.
 *     tags: [Admin Views]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transporterId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the transporter
 *     responses:
 *       200:
 *         description: Companies retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/companies/transporter/:transporterId/all', authenticateToken, requireRole(['admin']), authorize(['view_companies', 'manage_companies', 'super_admin']), companyController.getAllForTransporter);

/**
 * @swagger
 * /api/admin/updateAvatar:
 *   put:
 *     tags: [Admin Management]
 *     summary: Update an admin's avatar
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Admin avatar updated
 */
router.put('/updateAvatar', authenticateToken, upload.single('avatar'), requireRole('admin'), requireSelfOrSuperAdmin, AdminController.uploadImage);

/**
 * @swagger
 * /api/admin/{adminId}:
 *   put:
 *     tags: [Admin Management]
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
 *   patch:
 *     tags: [Admin Management]
 *     summary: Deactivate an admin (Super Admin only)
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
router.patch('/:adminId', requireSuperAdmin, AdminController.deleteAdmin);

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
 * /api/admin/delete-account/{userId}:
 *   delete:
 *     summary: Delete user account
 *     description: Delete the authenticated user's Firebase Auth account and Firestore profile.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID of the account to delete
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
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema:
 *           type: string
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

/**
 * @swagger
 * /api/admin/reports:
 *   post:
 *     summary: Generate reports from selected fields
 *     tags: [Admin Views]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *               format:
 *                 type: string
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Reports generated successfully
 */
router.post('/reports', authenticateToken, requireRole('admin'), authorize(['view_reports', 'manage_reports', 'super_admin']), generateReports);

/**
 * @swagger
 * /api/admin/actions/{actionId}/resolve:
 *   patch:
 *     summary: Mark an action as resolved
 *     tags: [Admin Actions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: actionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Action marked as resolved
 */
router.patch('/actions/:actionId/resolve', authenticateToken, requireRole('admin'), markAsResolved);

/**
 * @swagger
 * /api/admin/delete/{adminId}:
 *   delete:
 *     summary: Hard delete an admin
 *     tags: [Admin Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: adminId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Admin hard deleted
 *       500:
 *         description: Server error
 */
// router.patch('/:adminId', requireSuperAdmin, AdminController.deleteAdmin);
router.delete('/delete/:adminId', requireSuperAdmin, AdminController.hardDelete);

/**
 * @swagger
 * /api/admin/{userId}/ban:
 *   patch:
 *     summary: Ban a user
 *     tags: [Admin Actions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User banned
 *       500:
 *         description: Server error
 */
router.patch('/:userId/ban', authenticateToken, requireRole('admin'), authorize(['ban_users', 'super_admin']), banUser);

/**
 * @swagger
 * /api/admin/{userId}/unban:
 *   patch:
 *     summary: Unban a user
 *     tags: [Admin Actions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User unbanned
 *       500:
 *         description: Server error
 */
router.patch('/:userId/unban', authenticateToken, requireRole('admin'), authorize(['ban_users', 'super_admin']), unbanUser);

/**
 * @swagger
 * /api/admin/{bookingId}/cancel:
 *   patch:
 *     summary: Cancel a booking
 *     tags: [Admin Actions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: The type of cancellation
 *     responses:
 *       200:
 *         description: Booking canceled
 *       500:
 *         description: Server error
 */
router.patch('/:bookingId/cancel', authenticateToken, requireRole('admin'), authorize(['cancel_bookings', 'super_admin']), bookingController.cancelBooking);

/**
 * @swagger
 * /api/admin/{userId}/details:
 *   get:
 *     summary: Get user details (including bookings and disputes)
 *     tags: [Admin Views]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the user to fetch
 *     responses:
 *       200:
 *         description: User details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 bookings:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Booking'
 *                 disputes:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Dispute'
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.get('/:userId/details', authenticateToken, requireRole('admin'), authorize(['view_users', 'super_admin']), authController.getUserDetails);

/**
 * @swagger
 * /api/admin/disputes/{disputeId}:
 *   get:
 *     summary: Get a dispute by ID
 *     description: Retrieves details of a specific dispute.
 *     tags: [Admin Views]
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
router.get('/disputes/:disputeId', authenticateToken, requireRole(['admin']), authorize(['view_disputes', 'manage_disputes', 'super_admin']), disputeController.getDisputeAdmin);

module.exports = router;