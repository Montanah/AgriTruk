const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/requireRole');
const { createCompany, getCompany } = require('../controllers/companyController');
const { validateCompanyCreation } = require('../middlewares/validationMiddleware');

const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); 
const uploadAny = upload.any();

/**
 * @swagger
 * /api/companies:
 *   post:
 *     summary: Create a new company (Phase 1)
 *     description: Create a company profile with basic information and logo upload
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - registration
 *               - contact
 *             properties:
 *               name:
 *                 type: string
 *                 description: Company name
 *               registration:
 *                 type: string
 *                 description: Company registration number
 *               contact:
 *                 type: string
 *                 description: Company contact phone number
 *               address:
 *                 type: string
 *                 description: Company address (optional)
 *               logo:
 *                 type: string
 *                 format: binary
 *                 description: Company logo image
 *     responses:
 *       201:
 *         description: Company created successfully
 *       400:
 *         description: Missing required fields or validation errors
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/', authenticateToken, requireRole('transporter'), uploadAny, validateCompanyCreation, createCompany);

/**
 * @swagger
 * /api/companies/{companyId}:
 *   get:
 *     summary: Get company details
 *     description: Retrieve company information by ID
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *         description: Company ID
 *     responses:
 *       200:
 *         description: Company details retrieved successfully
 *       404:
 *         description: Company not found
 *       500:
 *         description: Internal server error
 */
router.get('/:companyId', authenticateToken, requireRole(['transporter', 'admin']), getCompany);

/**
 * @swagger
 * /api/companies/transporter/{transporterId}:
 *   get:
 *     summary: Get companies by transporter ID
 *     description: Retrieve companies associated with a specific transporter
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transporterId
 *         required: true
 *         schema:
 *           type: string
 *         description: Transporter ID
 *     responses:
 *       200:
 *         description: Companies retrieved successfully
 *       404:
 *         description: No companies found
 *       500:
 *         description: Internal server error
 */
const { getCompaniesByTransporter } = require('../controllers/companyController');
router.get('/transporter/:transporterId', authenticateToken, requireRole(['transporter', 'admin']), getCompaniesByTransporter);

module.exports = router;
