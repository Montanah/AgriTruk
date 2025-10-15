const express = require('express');
const router = express.Router();
const jobSeekerController = require('../controllers/jobSeekerController');
const { requireRole } = require('../middlewares/requireRole');
const { authenticateToken } = require('../middlewares/authMiddleware');
const multer = require("multer");
const { authorize } = require('../middlewares/adminAuth');


const upload = multer({ dest: 'uploads/' }); 

const uploadAny = upload.any();

/**
 * @swagger
 * tags:
 *   name: Job Seekers
 *   description: Job Seeker management endpoints
 */
/**
 * @swagger
 * components:
 *   schemas:
 *     JobSeeker:
 *       type: object
 *       properties:
 *         jobSeekerId:
 *           type: string
 *         userId:
 *           type: string
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         phone:
 *           type: string
 *         dateOfBirth:
 *           type: string
 *           format: date-time
 *         gender:
 *           type: string
 *         age:
 *           type: number
 *         address:
 *           type: object
 *           properties:
 *             street:
 *               type: string
 *             city:
 *               type: string
 *             county:
 *               type: string
 *             country:
 *               type: string
 *         profilePhoto:
 *           type: string
 *           nullable: true
 *         employmentStatus:
 *           type: string
 *           enum: [employed, independent, inactive]
 *         employedSince:
 *           type: string
 *           format: date-time
 *           nullable: true
 *
 *         documents:
 *           type: object
 *           properties:
 *             idDoc:
 *               $ref: '#/components/schemas/DocumentWithExpiry'
 *             drivingLicense:
 *               allOf:
 *                 - $ref: '#/components/schemas/DocumentWithExpiry'
 *                 - type: object
 *                   properties:
 *                     vehicleClasses:
 *                       type: array
 *                       items:
 *                         type: string
 *             goodConductCert:
 *               allOf:
 *                 - $ref: '#/components/schemas/DocumentWithExpiry'
 *                 - type: object
 *                   properties:
 *                     isClean:
 *                       type: boolean
 *                     isRenewed:
 *                       type: boolean
 *             psvBadge:
 *               $ref: '#/components/schemas/DocumentWithExpiry'
 *             nightTravelLicense:
 *               $ref: '#/components/schemas/DocumentWithExpiry'
 *             rslLicense:
 *               $ref: '#/components/schemas/DocumentWithExpiry'
 *             backgroundCheck:
 *               $ref: '#/components/schemas/DocumentWithExpiry'
 *             goodsServiceLicense:
 *               $ref: '#/components/schemas/DocumentWithExpiry'
 *
 *         experience:
 *           type: object
 *           properties:
 *             experienceYears:
 *               type: number
 *             startDate:
 *               type: string
 *               format: date-time
 *             vehicleClassesExperience:
 *               type: array
 *               items:
 *                 type: string
 *             experienceDescription:
 *               type: string
 *               nullable: true
 *             specializations:
 *               type: array
 *               items:
 *                 type: string
 *                 enum: [local, regional, cross-border, hazmat]
 *
 *         saccoDetails:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *               nullable: true
 *             membershipNumber:
 *               type: string
 *               nullable: true
 *             verificationStatus:
 *               type: string
 *               enum: [pending, verified, not-applicable]
 *
 *         crossBorderVerification:
 *           type: object
 *           properties:
 *             eacVerified:
 *               type: boolean
 *             countries:
 *               type: array
 *               items:
 *                 type: string
 *             verifiedAt:
 *               type: string
 *               format: date-time
 *               nullable: true
 *
 *         training:
 *           type: object
 *           properties:
 *             basicSafetyCompleted:
 *               type: boolean
 *             basicSafetyDate:
 *               type: string
 *               format: date-time
 *               nullable: true
 *             advancedTrainingEligible:
 *               type: boolean
 *             advancedTrainingCompleted:
 *               type: boolean
 *             advancedTrainingDate:
 *               type: string
 *               format: date-time
 *               nullable: true
 *             certificates:
 *               type: array
 *               items:
 *                 type: string
 *
 *         performance:
 *           type: object
 *           properties:
 *             platformRating:
 *               type: number
 *             totalRatings:
 *               type: number
 *             completedTrips:
 *               type: number
 *             onTimeDeliveryRate:
 *               type: number
 *             incidentReports:
 *               type: number
 *             lastIncidentDate:
 *               type: string
 *               format: date-time
 *               nullable: true
 *
 *         tierEligibility:
 *           type: object
 *           properties:
 *             silverEligible:
 *               type: boolean
 *             goldEligible:
 *               type: boolean
 *             platinumEligible:
 *               type: boolean
 *             eligibilityCheckedAt:
 *               type: string
 *               format: date-time
 *             blockingReasons:
 *               type: array
 *               items:
 *                 type: string
 *
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         status:
 *           type: string
 *           enum: [pending_approval, approved, rejected]
 *         approvedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         approvedBy:
 *           type: string
 *           nullable: true
 *         rejectedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         rejectedBy:
 *           type: string
 *           nullable: true
 *         rejectionReason:
 *           type: string
 *           nullable: true
 *
 *     DocumentWithExpiry:
 *       type: object
 *       properties:
 *         number:
 *           type: string
 *         url:
 *           type: string
 *         uploadedAt:
 *           type: string
 *           format: date-time
 *         status:
 *           type: string
 *           enum: [pending, approved, rejected]
 *         verifiedBy:
 *           type: string
 *         verifiedAt:
 *           type: string
 *           format: date-time
 *         expiryDate:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/job-seekers/:
 *   post:
 *     summary: Create a new Job Seeker profile
 *     description: |
 *       Creates a job seeker profile for an existing user.  
 *       Requires authentication and valid user data.  
 *       Use `multipart/form-data` for file uploads.  
 *       Nested fields such as `address` and `experience` should be sent as JSON strings.
 *     tags: [Job Seekers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - dateOfBirth
 *               - gender
 *             properties:
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *                 example: "1992-05-14"
 *               gender:
 *                 type: string
 *                 enum: [male, female, other]
 *                 example: "male"
 *               address:
 *                 type: string
 *                 description: JSON string of the user's address
 *                 example: '{"street": "Mombasa Road", "city": "Nairobi", "county": "Nairobi", "country": "Kenya"}'
 *               experience:
 *                 type: string
 *                 description: JSON string of experience details
 *                 example: '{"experienceYears": 5, "startDate": "2019-01-01", "vehicleClassesExperience": ["B","C","D"], "experienceDescription": "Experienced fleet driver", "specializations": ["regional","cross-border"]}'
 *               profilePhoto:
 *                 type: string
 *                 format: binary
 *                 description: Profile photo upload
 *               idDoc:
 *                 type: string
 *                 format: binary
 *                 description: National ID or passport scan
 *               drivingLicense:
 *                 type: string
 *                 format: binary
 *                 description: Driver’s license document
 *               goodConductCert:
 *                 type: string
 *                 format: binary
 *                 description: Certificate of good conduct
 *               gsl:
 *                 type: string
 *                 format: binary
 *                 description: Government Safety License document (optional)
 *     responses:
 *       201:
 *         description: Job Seeker successfully created
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/JobSeeker'
 *                 - type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "abc123xyz"
 *       400:
 *         description: Invalid request or missing required fields
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error while creating job seeker
 */
router.post('/', authenticateToken, uploadAny, jobSeekerController.submitApplication);

/**
 * @swagger
 * /api/job-seekers/approved:
 *   get:
 *     summary: Get approved job seekers
 *     tags: [Job Seekers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of approved job seekers
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/JobSeeker'
 *       500:
 *         description: Internal server error
 */
router.get('/approved', authenticateToken, requireRole(['transporter', 'admin']), authorize(['manage-job-seekers', 'super_admin']), jobSeekerController.getApprovedJobSeekers);

/**
 * @swagger
 * /api/job-seekers/{jobSeekerId}:
 *   put:
 *     summary: Update job seeker
 *     tags: [Job Seekers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               
 *     responses:
 *       200:
 *         description: Job seeker updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JobSeeker'
 *       400:
 *         description: Bad request
 */
router.put('/:jobSeekerId', authenticateToken, requireRole('job_seeker'), jobSeekerController.updateJobSeeker);

/**
 * @swagger
 * /api/job-seekers/{jobSeekerId}/experience:
 *   put:
 *     summary: Complete job seeker application
 *     tags: [Job Seekers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               experienceYears:
 *                 type: number
 *                 example: 5
 *               startDate:
 *                 type: string
 *                 format: date
 *                 example: "2019-01-01"
 *               vehicleClassesExperience:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [B, C, D]
 *                 example: ["B", "C", "D"]
 *               experienceDescription:
 *                 type: string
 *                 example: "Experienced fleet driver"
 *               specializations:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [regional, cross-border]
 *                 example: ["regional", "cross-border"]
 *     responses:
 *       200:
 *         description: Job seeker application completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JobSeeker'
 *       400:
 *         description: Bad request
 */
router.put('/:jobSeekerId/experience', authenticateToken, requireRole('job_seeker'), jobSeekerController.completeApplication);

/**
 * @swagger
 * /api/job-seekers/{jobSeekerId}:
 *   get:
 *     summary: Get job seeker application by ID
 *     tags: [Job Seekers]
 *     parameters:
 *       - in: path
 *         name: jobSeekerId
 *         required: true
 *         description: ID of the job seeker
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job seeker application retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JobSeeker'
 *       404:
 *         description: Job seeker application not found
 *       500:
 *         description: Internal server error
 */
router.get('/:jobSeekerId', authenticateToken, requireRole(['job-seeker', 'transporter', 'admin' ]), jobSeekerController.getApplicationById);

/**
 * @swagger
 * /api/job-seekers/user/{userId}:
 *   get:
 *     summary: Get job seeker application by user ID
 *     tags: [Job Seekers]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         description: ID of the user
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job seeker application retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JobSeeker'
 *       404:
 *         description: Job seeker application not found
 *       500:
 *         description: Internal server error
 */
router.get('/user/:userId', authenticateToken, requireRole(['job_seeker', 'transporter', 'admin' ]), jobSeekerController.getApplicationByUserId);

/**
 * @swagger
 * /api/job-seekers/{jobSeekerId}/upload:
 *   patch:
 *     summary: Upload job seeker documents
 *     description: Uploads multiple documents for a job seeker profile.
 *     tags: [Job Seekers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: jobSeekerId
 *         in: path
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               profilePhoto:
 *                 type: string
 *                 format: binary
 *                 description: Profile photo file
 *               driverLicense:
 *                 type: string
 *                 format: binary
 *                 description: Driver's license file
 *               goodConductCert:
 *                 type: string
 *                 format: binary
 *                 description: Good conduct certificate file
 *               goodsServiceLicence:
 *                 type: string
 *                 format: binary
 *                 description: Goods service license file
 *               idDoc:
 *                 type: string
 *                 format: binary
 *                 description: National ID or passport file
 *     responses:
 *       200:
 *         description: Job seeker documents uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 uploadedFiles:
 *                   type: object
 *                   additionalProperties:
 *                     type: string
 *                     format: uri
 *                     description: URLs of uploaded documents
 *       400:
 *         description: Bad request (e.g., no files uploaded)
 *       500:
 *         description: Internal server error
 */
router.patch('/:jobSeekerId/upload', authenticateToken, requireRole('job_seeker'), uploadAny, jobSeekerController.uploadDocuments);

/**
 * @swagger
 * /api/job-seekers/{jobSeekerId}/documents:
 *   get:
 *     summary: Get job seeker documents
 *     tags: [Job Seekers]
 *     parameters:
 *       - in: path
 *         name: jobSeekerId
 *         required: true
 *         description: ID of the job seeker
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job seeker documents retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JobSeeker'
 *       404:
 *         description: Job seeker not found
 *       500:
 *         description: Internal server error
 */
router.get('/:jobSeekerId/documents', authenticateToken, requireRole(['job_seeker', 'admin', 'transporter']), jobSeekerController.getDocuments);

/**
 * @swagger
 * /api/job-seekers/{jobSeekerId}/status:
 *   patch:
 *     summary: Update job seeker status
 *     tags: [Admin Actions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Job seeker status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JobSeeker'
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.patch('/:jobSeekerId/status', authenticateToken, requireRole('admin'), authorize(['manage-job-seekers', 'super_admin']), jobSeekerController.updateApplicationStatus);

/**
 * @swagger
 * /api/job-seekers/{jobSeekerId}/status:
 *   get:
 *     summary: Get job seeker status
 *     tags: [Admin Actions]
 *     parameters:
 *       - in: path
 *         name: jobSeekerId
 *         required: true
 *         description: ID of the job seeker
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job seeker status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JobSeeker'
 *       404:
 *         description: Job seeker not found
 *       500:
 *         description: Internal server error
 */
router.get('/:jobSeekerId/status', authenticateToken, requireRole('admin'), authorize(['view-job-seekers',  'manage-job-seekers', 'super_admin']), jobSeekerController.getApplicationStatus);

/**
 * @swagger
 * /api/job-seekers:
 *   get:
 *     summary: Get all job seekers
 *     tags: [Admin Views]
 *     responses:
 *       200:
 *         description: All job seekers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JobSeeker'
 *       500:
 *         description: Internal server error
 */
router.get('/', authenticateToken, requireRole('admin'), authorize(['view-job-seekers', 'manage-job-seekers', 'super_admin']), jobSeekerController.getAllJobSeekers);

// @route   GET /api/job-seekers/schema

// @desc    Get job seeker schema
// @access  Public
router.get('/schema', jobSeekerController.getSchema);


/**
 * @swagger
 * /api/job-seekers/{jobSeekerId}:
 *   delete:
 *     summary: Delete job seeker
 *     tags: [Admin Actions]
 *     parameters:
 *       - in: path
 *         name: jobSeekerId
 *         required: true
 *         description: ID of the job seeker
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job seeker deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JobSeeker'
 *       404:
 *         description: Job seeker not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:jobSeekerId', authenticateToken, requireRole('admin'), authorize(['manage-job-seekers', 'super_admin']), jobSeekerController.deleteJobSeeker);

/**
 * @swagger
 * /api/job-seekers/admin/{jobSeekerId}/updateDocumentsStatus:
 *   patch:
 *     summary: Update document status
 *     tags: [Admin Actions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Document status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JobSeeker'
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.patch('/admin/:jobSeekerId/updateDocumentsStatus', authenticateToken, requireRole('admin'), authorize(['manage-job-seekers', 'super_admin']), jobSeekerController.updateDocumentStatus);

/**
 * @swagger
 * /api/job-seekers/admin/{jobSeekerId}/updateTier:
 *   patch:
 *     summary: Update job seeker tier
 *     tags: [Admin Actions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tier:
 *                 type: string
 *     responses:
 *       200:
 *         description: Job seeker tier updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JobSeeker'
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.patch('admin/:jobSeekerId/updateTier', authenticateToken, requireRole('admin'), authorize(['manage-job-seekers', 'super_admin']), jobSeekerController.updateTier);

/**
 * @swagger
 * /api/job-seekers/{jobSeekerId}/email:
 *   get:
 *     summary: Get job seeker by email
 *     tags: [Admin Views]
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         description: Email of the job seeker
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job seeker retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JobSeeker'
 *       404:
 *         description: Job seeker not found
 *       500:
 *         description: Internal server error
 */
router.get('/:jobSeekerId/email', authenticateToken, requireRole(['transporter', 'admin', 'job_seeker']), authorize(['manage-job-seekers', 'super_admin']), jobSeekerController.getJobSeekerByEmail);

/**
 * @swagger
 * /api/job-seekers/{jobSeekerId}/review:
 *   patch:
 *     summary: Approve a job seeker's documents or reject job seeker (super-admin, manage_job_seekers)
 *     description: Allows an admin to review a pending job seeker's documents.
 *     tags: [Admin Actions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobSeekerId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [approve-idDoc, approve-drivingLicense, approve-goodConductCert, approve-goodsServiceLicense, reject]
 *                 description: Action to take on the job seeker's documents (approve or reject)
 *               reason:
 *                 type: string
 *                 description: Reason for rejection (optional, required for reject action)
 *               expiryDate:
 *                 type: string
 *                 format: date-time
 *                 description: Expiry date for the approved document (required for approve actions)
 *     responses:
 *       200:
 *         description: Job seeker reviewed successfully
 *       400:
 *         description: Bad request (e.g., missing required fields or invalid action)
 *       404:
 *         description: Job seeker not found
 *       500:
 *         description: Internal server error
 */
router.patch('/:jobSeekerId/review', authenticateToken, requireRole('admin'), authorize(['manage_job_seekers', 'super_admin']), jobSeekerController.reviewJobSeeker);


module.exports = router;