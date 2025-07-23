const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/requireRole');
const {
  createCompany,
  getCompany,
  updateCompany,
  approveCompany,
  rejectCompany,
  getAllCompanies,
  deleteCompany,
  getCompaniesByTransporter,
  getCompaniesByStatus,
  getCompaniesByTransporterAndStatus,
  getAllForTransporter,
  searchCompany
} = require('../controllers/companyController');
const { validateCompanyCreation, validateCompanyUpdate } = require('../middlewares/validationMiddleware');

/**
 * @swagger
 * tags:
 *   - name: Companies
 *     description: Company management endpoints
 */

/**
 * @swagger
 * /api/companies:
 *   post:
 *     summary: Create a new company
 *     description: Creates a new company associated with a transporter.
 *     tags: [Companies]
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
 *               - registration
 *               - contact
 *             properties:
 *               name:
 *                 type: string
 *                 description: The name of the company
 *               registration:
 *                 type: string
 *                 description: The registration number of the company
 *               contact:
 *                 type: string
 *                 description: Contact information for the company
 *             example:
 *               name: "Green Farms Ltd"
 *               registration: "REG123456"
 *               contact: "info@greenfarms.com"
 *     responses:
 *       201:
 *         description: Company created successfully
 *       400:
 *         description: Missing required fields or validation errors
 *       500:
 *         description: Internal server error
 */
router.post('/', authenticateToken, requireRole('transporter'),validateCompanyCreation, createCompany);


/**
 * @swagger
 * /api/companies/search:
 *   get:
 *     summary: Search companies
 *     description: Retrieves a paginated list of companies based on a search term across company name or registration number, and status.
 *     tags: [Admin]
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
router.get('/search', authenticateToken, requireRole('admin'), searchCompany);

/**
 * @swagger
 * /api/companies/{companyId}:
 *   get:
 *     summary: Get a company by ID
 *     description: Retrieves details of a specific company.
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the company to retrieve
 *     responses:
 *       200:
 *         description: Company retrieved successfully
 *       404:
 *         description: Company not found
 *       500:
 *         description: Internal server error
 */
router.get('/:companyId', authenticateToken, requireRole(['transporter', 'admin']), getCompany);

/**
 * @swagger
 * /api/companies/{companyId}:
 *   put:
 *     summary: Update a company
 *     description: Updates details of a specific company.
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the company to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: The name of the company
 *               registration:
 *                 type: string
 *                 description: The registration number of the company
 *               contact:
 *                 type: string
 *                 description: Contact information for the company
 *             example:
 *               name: "Green Farms Ltd Updated"
 *               contact: "newinfo@greenfarms.com"
 *     responses:
 *       200:
 *         description: Company updated successfully
 *       400:
 *         description: No updates provided or validation errors
 *       404:
 *         description: Company not found
 *       500:
 *         description: Internal server error
 */
router.put('/:companyId', authenticateToken, requireRole('transporter'), validateCompanyUpdate, updateCompany);

/**
 * @swagger
 * /api/companies/{companyId}/approve:
 *   patch:
 *     summary: Approve a company
 *     description: Approves a pending company.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the company to approve
 *     responses:
 *       200:
 *         description: Company approved successfully
 *       404:
 *         description: Company not found
 *       500:
 *         description: Internal server error
 */
router.patch('/:companyId/approve', authenticateToken, requireRole('admin'), approveCompany);

/**
 * @swagger
 * /api/companies/{companyId}/reject:
 *   patch:
 *     summary: Reject a company
 *     description: Rejects a pending company with a reason.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the company to reject
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 description: The reason for rejection
 *             example:
 *               reason: "Incomplete documentation"
 *     responses:
 *       200:
 *         description: Company rejected successfully
 *       400:
 *         description: Rejection reason is required
 *       404:
 *         description: Company not found
 *       500:
 *         description: Internal server error
 */
router.patch('/:companyId/reject', authenticateToken, requireRole('admin'), rejectCompany);

/**
 * @swagger
 * /api/companies/transporter/{transporterId}:
 *   get:
 *     summary: Get companies by transporter
 *     description: Retrieves all companies for a specific transporter.
 *     tags: [Companies]
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
router.get('/transporter/:transporterId', authenticateToken, requireRole(['transporter', 'admin']), getCompaniesByTransporter);

/**
 * @swagger
 * /api/companies/status/{status}:
 *   get:
 *     summary: Get companies by status
 *     description: Retrieves all companies with a specific status.
 *     tags: [Admin]
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
router.get('/status/:status', authenticateToken, requireRole('admin'), getCompaniesByStatus);

/**
 * @swagger
 * /api/companies/transporter/{transporterId}/status/{status}:
 *   get:
 *     summary: Get companies by transporter and status
 *     description: Retrieves all companies for a transporter with a specific status.
 *     tags: [Companies]
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
router.get('/transporter/:transporterId/status/:status', authenticateToken, requireRole(['transporter', 'admin']), getCompaniesByTransporterAndStatus);

/**
 * @swagger
 * /api/companies/transporter/{transporterId}/all:
 *   get:
 *     summary: Get all companies for a transporter
 *     description: Retrieves all companies associated with a specific transporter.
 *     tags: [Companies]
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
router.get('/transporter/:transporterId/all', authenticateToken, requireRole(['transporter', 'admin']), getAllForTransporter);

/**
 * @swagger
 * /api/companies/{companyId}:
 *   delete:
 *     summary: Soft delete a company
 *     description: Marks a company as deleted instead of permanent removal.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the company to delete
 *     responses:
 *       200:
 *         description: Company marked as deleted successfully
 *       404:
 *         description: Company not found
 *       500:
 *         description: Internal server error
 */
router.delete('/companies/:companyId', authenticateToken, requireRole('admin'), deleteCompany);

module.exports = router;