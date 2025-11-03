const admin = require('../config/firebase');
const User = require('../models/User');
const Notification = require('../models/Notification');
const sendEmail  = require('../utils/sendEmail');
const SMSService = require('../utils/sendSms');
const formatPhoneNumber = require("../utils/formatPhone");
const {getMFATemplate } = require("../utils/sendMailTemplate");
const { logActivity, logAdminActivity } = require("../utils/activityLogger");
const { formatTimestamps } = require('../utils/formatData');

const smsService = new SMSService(process.env.MOBILESASA_API_TOKEN);

const RecruiterAuthController = {

  /**
   * Register a new recruiter
   */
  async registerRecruiter(req, res) {
    const { 
      name, 
      phone, 
      email, 
      password,
      preferredVerificationMethod
    } = req.body;

    try {
      // Validate required fields
      if (!name || !email || !phone || !password) {
        return res.status(400).json({ 
          message: "Name, email, phone, and password are required" 
        });
      }

      // Check if email already exists
      let existingUser;
      try {
        existingUser = await admin.auth().getUserByEmail(email);
      } catch (_) {}
      if (existingUser) {
        return res.status(409).json({ message: "Email already registered" });
      }

      // Check if phone already exists
      try {
        existingUser = await admin.auth().getUserByPhoneNumber(phone);
      } catch (_) {}
      if (existingUser) {
        return res.status(409).json({ message: "Phone already registered" });
      }
      function formatPhoneNumbers(phone) {
        // remove spaces and dashes
        phone = phone.replace(/\s|-/g, '');

        // if it starts with 0, replace with +254
        if (phone.startsWith('0')) {
          phone = '+254' + phone.substring(1);
        } else if (!phone.startsWith('+')) {
          phone = '+' + phone;
        }

        return phone;
      }
      
      //format phone number
      const formattedphone = formatPhoneNumbers(phone);

      // Create Firebase user
      const userRecord = await admin.auth().createUser({
        email,
        password,
        phoneNumber: formattedphone,
        displayName: name,
      });

      const uid = userRecord.uid;

      // Save user in Firestore with recruiter role
      const user = await User.create({
        uid,
        email,
        name,
        phone,
        role: 'recruiter',
        userType: 'recruiter',
        languagePreference: 'en',
        isVerified: true,
        preferredVerificationMethod: preferredVerificationMethod || 'phone',
        // Recruiter-specific fields
        subscriptionRequired: true,
        hasActiveSubscription: false,
      });

      // // Send verification code
      // if (preferredVerificationMethod === "email" || !preferredVerificationMethod) {
      //   await sendEmail({
      //     to: email,
      //     subject: 'Your Truk Verification Code',
      //     text: `Your verification code is: ${emailVerificationCode}`,
      //     html: getMFATemplate(
      //       emailVerificationCode, 
      //       null, 
      //       req.ip || 'unknown', 
      //       req.headers['user-agent'] || 'unknown'
      //     )
      //   });
      // } else if (preferredVerificationMethod === "phone") {
      //   const formattedPhone = formatPhoneNumber(phone);
      //   const smsMessage = `Your Truk verification code is: ${phoneVerificationCode}`;
      //   await smsService.sendSMS('TRUK LTD', smsMessage, formattedPhone);
      // }

      // Log activity
      await logActivity(uid, 'recruiter_registration', req);

      // Create welcome notification
      await Notification.create({
        userId: uid,
        type: 'Welcome to Truk',
        message: 'Your recruiter account has been created successfully. Please verify your account and select a subscription plan.',
        UserType: 'recruiter',
      });

      res.status(201).json({ 
        message: "Recruiter account created successfully. Please verify your account and select a subscription plan.",
        user: {
          uid: user.uid,
          email: user.email,
          name: user.name,
          role: user.role,
          requiresSubscription: true,
        },
      });
    } catch (error) {
      console.error('Recruiter registration error:', error);
      res.status(400).json({
        code: 'REGISTRATION_FAILED',
        message: error.message || 'Recruiter registration failed'
      });
    }
  },

  /**
   * Login recruiter (uses Firebase Auth)
   * Note: Firebase Auth handles authentication on client side
   * This endpoint is for additional server-side checks
   */
  async loginRecruiter(req, res) {
    // const { uid } = req.body; // UID from Firebase Auth client
    const uid = req.user.uid;

    try {
      // Get user from Firestore
      const user = await User.get(uid);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.role !== 'recruiter') {
        return res.status(403).json({ 
          message: "Access denied. This login is for recruiters only." 
        });
      }

      // Check if account is verified
      if (!user.isVerified) {
        return res.status(403).json({ 
          message: "Please verify your account before logging in.",
          nextStep: 'verify_account'
        });
      }

      // Check subscription status
      const RecruiterSubscribers = require('../models/RecruiterSubscribers');
      const subscription = await RecruiterSubscribers.getByUserId(uid);
      
      const hasActiveSubscription = subscription && subscription.isActive;

      // Log activity
      await logActivity(uid, 'recruiter_login', req);

      res.status(200).json({
        message: "Login successful",
        user: {
          uid: user.uid,
          email: user.email,
          name: user.name,
          role: user.role,
          companyName: user.companyName,
        },
        hasActiveSubscription,
        nextStep: hasActiveSubscription ? 'dashboard' : 'subscription_required'
      });
    } catch (error) {
      console.error('Recruiter login error:', error);
      res.status(400).json({
        code: 'LOGIN_FAILED',
        message: error.message || 'Login failed'
      });
    }
  },

  /**
   * Verify account (email or phone)
   */
  async verifyAccount(req, res) {
    const { uid, code, verificationType } = req.body; // 'email' or 'phone'

    try {
      const user = await User.getByUid(uid);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if code matches and hasn't expired
      const now = new Date();
      const expiry = user.verificationExpires?.toDate();

      if (!expiry || now > expiry) {
        return res.status(400).json({ 
          message: "Verification code has expired. Please request a new one." 
        });
      }

      let isValid = false;
      let updateData = {};

      if (verificationType === 'email') {
        isValid = user.emailVerificationCode === code;
        if (isValid) {
          updateData = { emailVerified: true };
        }
      } else if (verificationType === 'phone') {
        isValid = user.phoneVerificationCode === code;
        if (isValid) {
          updateData = { phoneVerified: true };
        }
      }

      if (!isValid) {
        return res.status(400).json({ message: "Invalid verification code" });
      }

      // If both email and phone are verified, mark account as verified
      if (user.emailVerified || verificationType === 'email') {
        updateData.isVerified = true;
      }

      // Update user
      await User.update(uid, updateData);

      // Log activity
      await logActivity(uid, 'account_verified', req);

      res.status(200).json({
        message: "Account verified successfully",
        nextStep: 'subscription_required'
      });
    } catch (error) {
      console.error('Verification error:', error);
      res.status(400).json({
        code: 'VERIFICATION_FAILED',
        message: error.message || 'Verification failed'
      });
    }
  },

  /**
   * Resend verification code
   */
  async resendVerificationCode(req, res) {
    const { uid, verificationType } = req.body;

    try {
      const user = await User.getByUid(uid);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Generate new code
      const newCode = generateOtp();
      const verificationExpiry = admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + 10 * 60 * 1000)
      );

      let updateData = {
        verificationExpires: verificationExpiry,
      };

      if (verificationType === 'email') {
        updateData.emailVerificationCode = newCode;
        
        await sendEmail({
          to: user.email,
          subject: 'Your Truk Verification Code',
          text: `Your verification code is: ${newCode}`,
          html: getMFATemplate(
            newCode, 
            null, 
            req.ip || 'unknown', 
            req.headers['user-agent'] || 'unknown'
          )
        });
      } else if (verificationType === 'phone') {
        updateData.phoneVerificationCode = newCode;
        
        const formattedPhone = formatPhoneNumber(user.phone);
        const smsMessage = `Your Truk verification code is: ${newCode}`;
        await smsService.sendSMS('TRUK LTD', smsMessage, formattedPhone);
      }

      await User.update(uid, updateData);

      res.status(200).json({
        message: "Verification code sent successfully"
      });
    } catch (error) {
      console.error('Resend verification error:', error);
      res.status(400).json({
        code: 'RESEND_FAILED',
        message: error.message || 'Failed to resend verification code'
      });
    }
  },

  /**
   * Logout
   */
  async logout(req, res) {
    try {
      res.status(200).json({
        message: "Logout successful"
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(400).json({
        code: 'LOGOUT_FAILED',
        message: error.message || 'Logout failed'
      });
    }
  },

  async getAllRecruiters(req, res) {
    try {
      const recruiters = await User.getRecruiters();
      console.log(recruiters);
      await logAdminActivity(req.user.uid, 'get_all_shippers', req);
      res.status(200).json({
        success: true,
        message: 'Recruiters fetched successfully',
        recruiters: formatTimestamps(recruiters)
      });
    } catch (error) {
      console.error('Error fetching recruiters:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch recruiters',
        error: error.message
      });
    }
  }
};

module.exports = RecruiterAuthController;