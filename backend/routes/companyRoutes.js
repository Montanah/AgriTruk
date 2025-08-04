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
  getAllForTransporter,
  approveCompanyDriver,
  approveVehicle,
  rejectCompanyDriver,
  rejectVehicle
} = require('../controllers/companyController');
const {
  authenticate,
  authorize
} = require("../middlewares/adminAuth");
const { validateCompanyCreation, validateCompanyUpdate } = require('../middlewares/validationMiddleware');
const CompanyController = require("../controllers/companyController");

const multer = require('multer');
const { auth } = require('firebase-admin');
const upload = multer({ dest: 'uploads/' }); 

const uploadAny = upload.any();
/**
 * @swagger
 * tags:
 *   - name: Companies
 *     description: Company management endpoints
 */

/**
 * @swagger
 * /api/companies/:
 *   post:
 *     summary: Create a new company
 *     description: Creates a new company associated with a transporter.
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
 *                 description: The name of the company
 *               registration:
 *                 type: string
 *                 description: The registration number of the company
 *               contact:
 *                 type: string
 *                 description: Contact information for the company
 *               logo:
 *                 type: string
 *                 format: binary
 *                 description: The logo of the company
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
router.post('/', authenticateToken, requireRole('transporter'),  upload.single('logo'), validateCompanyCreation, createCompany);

/**
 * @swagger
 * /api/companies/{companyId}/vehicles:
 *   post:
 *     summary: Create a new vehicle for a company
 *     description: Creates a new vehicle associated with a company.
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path 
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the company to create a vehicle for
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - reg
 *               - model
 *               - year
 *             properties:
 *               type:
 *                 type: string
 *                 description: The type of the vehicle
 *               reg:
 *                 type: string
 *                 description: The make of the vehicle
 *               year:
 *                 type: number
 *                 description: The year of manufacturer the vehicle
 *               color:
 *                 type: string
 *                 description: The color of the vehicle
 *               capacity:
 *                 type: number
 *                 description: The capacity of the vehicle
 *               model:
 *                 type: string
 *                 description: The model of the vehicle
 *               features:
 *                 type: number
 *                 description: The extra features of the vehicle
 *               bodyType:
 *                 type: string
 *                 description: The body type of the vehicle
 *               refrigeration:
 *                 type: boolean
 *                 description: Whether the vehicle has refrigeration
 *               humidityControl:
 *                 type: boolean
 *                 description: Whether the vehicle has humidity control
 *               specialCargo:
 *                 type: boolean
 *                 description: Whether the vehicle has special cargo
 *               insurance:
 *                 type: string
 *                 format: binary
 *                 description: The insurance details of the vehicle
 *               photos:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: The photos of the vehicle
 *               est:
 *                 type: string
 *                 description: The estimated value of the vehicle
 *             example:
 *               make: "Toyota" 
 *               model: "Camry"
 *               year: 2022
 *     responses:
 *       201:
 *         description: Vehicle created successfully
 *       400:
 *         description: Missing required fields or validation errors
 *       500:
 *         description: Internal server error
*/
router.post('/:companyId/vehicles', authenticateToken, requireRole(['transporter']), uploadAny, CompanyController.createVehicle);

/** 
 * @swagger
 * /api/companies/{companyId}/drivers:
 *   post:  
 *     summary: Create a driver for a company
 *     description: Creates a new driver associated with a company.
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the company to create a driver for
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - phone
 *             properties:
 *               name:
 *                 type: string
 *                 description: The name of the driver
 *               email:
 *                 type: string
 *                 description: The email address of the driver
 *               phone:
 *                 type: string
 *                 description: The phone number of the driver
 *               photo:
 *                 type: string
 *                 format: binary
 *                 description: The photo URL of the driver
 *               idDoc:
 *                 type: string
 *                 format: binary
 *                 description: The ID document of the driver
 *               license:
 *                 type: string
 *                 format: binary
 *                 description: The license of the driver
 *     responses:
 *       201:
 *         description: Driver created successfully
 *       400:
 *         description: Missing required fields or validation errors
 *       500:
 *         description: Internal server error
*/
router.post('/:companyId/drivers', authenticateToken, requireRole(['transporter']), uploadAny, CompanyController.createDriver);

/**
 * @swagger
 * /api/companies/{companyId}/vehicles:
 *   get:
 *     summary: Get all vehicles for a company
 *     description: Retrieves a list of all vehicles associated with a company.
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the company to retrieve vehicles for
 *     responses:
 *       200:
 *         description: Vehicles retrieved successfully
 *       404:
 *         description: Company not found
 *       500:
 *         description: Internal server error
 */
router.get('/:companyId/vehicles', authenticateToken, requireRole(['transporter']), CompanyController.getAllVehicles);

/** 
 * @swagger
 * /api/companies/{companyId}/drivers:
 *   get:
 *     summary: Get all drivers for a company
 *     description: Retrieves a list of all drivers associated with a company.
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the company to retrieve drivers for
 *     responses:
 *       200:
 *         description: Drivers retrieved successfully
 *       404:
 *         description: Company not found
 *       500:
 *         description: Internal server error
*/
router.get('/:companyId/drivers', authenticateToken, requireRole(['transporter']), CompanyController.getAllDrivers);

/** 
 * @swagger
 * /api/companies/{companyId}/vehicles/{vehicleId}:
 *   get:
 *     summary: Get a vehicle by ID
 *     description: Retrieves details of a specific vehicle.
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the company to retrieve a vehicle from
 *       - in: path
 *         name: vehicleId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the vehicle to retrieve
 *     responses:
 *       200:
 *         description: Vehicle retrieved successfully
 *       404:
 *         description: Vehicle not found
 *       500:
 *         description: Internal server error
*/
router.get('/:companyId/vehicles/:vehicleId', authenticateToken, requireRole(['transporter']), CompanyController.getVehicle);

/** 
 * @swagger
 * /api/companies/{companyId}/drivers/{driverId}:
 *   get:
 *     summary: Get a driver by ID
 *     description: Retrieves details of a specific driver.
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the company to retrieve a driver from
 *       - in: path
 *         name: driverId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the driver to retrieve
 *     responses:
 *       200:
 *         description: Driver retrieved successfully
 *       404:
 *         description: Driver not found
 *       500:
 *         description: Internal server error
*/
router.get('/:companyId/drivers/:driverId', authenticateToken, requireRole(['transporter']), CompanyController.getDriver);

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
router.get('/transporter/:transporterId/status/:status', authenticate, requireRole(['admin']), authorize(['view_companies', 'manage_companies', 'super_admin']), getCompaniesByTransporterAndStatus);

/**
 * @swagger
 * /api/companies/transporter/{transporterId}/all:
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
router.get('/transporter/:transporterId/all', authenticate, requireRole(['admin']), authorize(['view_companies', 'manage_companies', 'super_admin']), getAllForTransporter);

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

/**
 * @swagger
 * /api/companies/{companyId}/approveVehicle/{vehicleId}:
 *   patch:
 *     summary: Approve a vehicle for a company
 *     description: Approves a vehicle for a company.
 *     tags: [Admin Actions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the company
 *       - in: path
 *         name: vehicleId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the vehicle to approve
 *     responses:
 *       200:
 *         description: Vehicle approved successfully
 *       404:
 *         description: Company or vehicle not found
 *       500:
 *         description: Internal server error
 */
router.patch('/:companyId/approveVehicle/:vehicleId', authenticate, requireRole('admin'), authorize(['manage_companies', 'super_admin']), approveVehicle);
/**
 * @swagger
 * /api/companies/{companyId}/rejectVehicle/{vehicleId}:
 *   patch:
 *     summary: Reject a vehicle for a company
 *     description: Rejects a vehicle for a company.
 *     tags: [Admin Actions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the company
 *       - in: path
 *         name: vehicleId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the vehicle to reject
 *     responses:
 *       200:
 *         description: Vehicle rejected successfully
 *       404:
 *         description: Company or vehicle not found
 *       500:
 *         description: Internal server error
 */
router.patch('/:companyId/rejectvehicle/:vehicleId', authenticate, requireRole('admin'), authorize(['manage_companies', 'super_admin']), rejectVehicle);

/**
 * @swagger
 * /api/companies/{companyId}/approveDriver/{driverId}:
 *   patch:
 *     summary: Approve a driver for a company
 *     description: Approves a driver for a company.
 *     tags: [Admin Actions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the company
 *       - in: path
 *         name: driverId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the driver to approve
 *     responses:
 *       200:
 *         description: Driver approved successfully
 *       404:
 *         description: Company or driver not found
 *       500:
 *         description: Internal server error
*/
router.patch('/:companyId/approveDriver/:driverId', authenticate, requireRole('admin'), authorize(['manage_companies', 'super_admin']), approveCompanyDriver);
/**
 * @swagger
 * /api/companies/{companyId}/rejectDriver/{driverId}:
 *   patch:
 *     summary: Reject a driver for a company
 *     description: Rejects a driver for a company.
 *     tags: [Admin Actions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the company
 *       - in: path
 *         name: driverId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the driver to reject
 *     responses:
 *       200:
 *         description: Driver rejected successfully
 *       404:
 *         description: Company or driver not found
 *       500:
 *         description: Internal server error
 */
router.patch('/:companyId/rejectDriver/:driverId', authenticate, requireRole('admin'), authorize(['manage_companies', 'super_admin']), rejectCompanyDriver);

module.exports = router;