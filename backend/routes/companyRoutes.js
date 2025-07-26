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
  deleteCompany,
  getCompaniesByTransporter,
  getCompaniesByStatus,
  getCompaniesByTransporterAndStatus,
  getAllForTransporter
} = require('../controllers/companyController');
const {
  authenticate,
  authorize
} = require("../middlewares/adminAuth");
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
 *     tags: [Admin Actions] 
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
router.patch('/:companyId/approve', authenticate, requireRole('admin'), authorize(['manage_companies', 'super_admin']), approveCompany);

/**
 * @swagger
 * /api/companies/{companyId}/reject:
 *   patch:
 *     summary: Reject a company
 *     description: Rejects a pending company with a reason.
 *     tags: [Admin Actions]
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
router.patch('/:companyId/reject', authenticate, requireRole('admin'), authorize(['manage_companies', 'super_admin']), rejectCompany);

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
router.delete('/companies/:companyId', authenticate, requireRole('admin'), authorize(['manage_companies', 'super_admin']), deleteCompany);

module.exports = router;