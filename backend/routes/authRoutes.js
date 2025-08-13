const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { requireRole } = require("../middlewares/requireRole");
const { authenticateToken } = require("../middlewares/authMiddleware");
const loadUserProfile = require("../middlewares/loadUserProfile");
const multer = require("multer");
const { authorize } = require("../middlewares/adminAuth");
const upload = multer({ dest: "uploads/" }); 
// Swagger documentation
/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         uid:
 *           type: string
 *         email:
 *           type: string
 *           nullable: true
 *         phone:
 *           type: string
 *           nullable: true
 *         role:
 *           type: string
 *           enum: [user, farmer, transporter, admin]
 *         name:
 *           type: string
 *           nullable: true
 *         location:
 *           type: string
 *           nullable: true
 *         userType:
 *           type: string
 *           nullable: true
 *         languagePreference:
 *           type: string
 *           nullable: true
 *         profilePhotoUrl:
 *           type: string
 *           nullable: true
 *         isVerified:
 *           type: boolean
 *         fcmToken:
 *           type: string
 *           nullable: true
 *     Error:
 *       type: object
 *       properties:
 *         code:
 *           type: string
 *         message:
 *           type: string
 */

/**
 * @swagger
 * tags:
 *   - name: Authentication
 *     description: User authentication and management
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Register a new user with email and additional profile information.
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, phone, role]
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [user, farmer, transporter, admin]
 *               location:
 *                 type: string
 *               userType:
 *                 type: string
 *               languagePreference:
 *                 type: string
 *               profilePhotoUrl:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Bad request, invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: User already exists
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
router.post("/register", authenticateToken, authController.registerUser);

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Get user profile
 *     description: Retrieve the authenticated user's profile information.
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
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
router.get("/profile", authenticateToken, loadUserProfile, authController.getUser);

/**
 * @swagger
 * /api/auth/update:
 *   put:
 *     summary: Update user profile
 *     description: Update the authenticated user's profile information.
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, phone, role]
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [user, farmer, transporter, admin]
 *               location:
 *                 type: string
 *               userType:
 *                 type: string
 *               languagePreference:
 *                 type: string
 *               profilePhotoUrl:
 *                 type: string
 *     responses:
 *       200:
 *         description: User profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
router.put('/update', authenticateToken, upload.single('profilePhoto'), authController.updateUser);
// router.put("/update", authenticateToken, authController.updateUser);

/**
 * @swagger
 * /api/auth/update-password:
 *   put:
 *     summary: Update user password
 *     description: Update the authenticated user's password in Firebase Auth.
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [newPassword]
 *             properties:
 *               newPassword:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Password updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid input
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
router.put("/update-password", authenticateToken, authController.updatePassword);

/**
 * @swagger
 * /api/auth/verify_token:
 *   get:
 *     summary: Verify JWT token
 *     description: Verify the validity of the authenticated user's JWT token.
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token is valid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: User not authenticated
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
router.get("/verify_token", authenticateToken, authController.verifyToken);

/**
 * @swagger
 * /api/auth/user/role:
 *   get:
 *     summary: Get user role
 *     description: Retrieve the role of the authenticated user.
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User role retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 role:
 *                   type: string
 *                   enum: [user, farmer, transporter, admin]
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
router.get("/user/role", authenticateToken, authController.getUserRole);

/**
 * @swagger
 * /api/auth/delete:
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
router.delete("/delete", authenticateToken, requireRole('admin'), authorize(['manage_users', 'super_admin']), authController.deactivateAccount);

/**
 * @swagger
 * /api/auth/:
 *   post:
 *     summary: Verify user code
 *     description: Verify the code sent to the user's email for account verification.
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *     responses:
 *       200:
 *         description: Code verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid input
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
router.post("/", authenticateToken, async (req, res) => {
  const { action } = req.body;
  
  try {
    if (action === 'verify-email') {
      return await authController.verifyEmailCode(req, res);
    } else if (action === 'verify-phone') {
      return await authController.verifyPhoneCode(req, res);
    } else if (action === 'resend-email-code') {
      return await authController.resendCode(req, res);
    } else if (action === 'resend-phone-code') {
      return await authController.resendPhoneCode(req, res);
    } else {
      return res.status(400).json({ 
        code: "ERR_INVALID_ACTION",
        message: "Invalid action" 
      });
    }
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({
      code: 'ERR_SERVER_ERROR',
      message: 'Internal server error'
    });
  }
});
module.exports = router