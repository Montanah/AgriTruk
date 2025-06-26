const admin = require("../config/firebase");
const User = require("../models/User");
const ActivityLog = require("../models/ActivityLog");
const generateOtp = require("../utils/generateOtp");
const sendEmail = require("../utils/sendEmail");
const {getMFATemplate, getResetPasswordTemplate, getSuccessTemplate } = require("../utils/sendMailTemplate");
const getGeoLocation = require("../utils/locationHelper");
const logActivity = require("../utils/activityLogger");
const { uploadImage } = require('../utils/upload');
const fs = require('fs');

exports.verifyUser = async (req, res) => {
    const { email, phone, password } = req.body;

    try {
        let user;
        if  (email && password) {
            user = await admin.auth().getUserByEmail(email);
        } else if (phone) {
        user = await admin.auth().getUserByPhoneNumber(phone);
        } else {
        return res.status(400).json({
            code: 'ERR_INVALID_INPUT',
            message: 'Email/password or phone number required'
        });
        }

        // Generate custom token for client (if needed)
        const customToken = await admin.auth().createCustomToken(user.uid);

        const userData = await User.get(user.uid);

        res.status(200).json({
            token: customToken,
            user: {
                uid: user.uid,
                email: user.email || null,
                phone: user.phoneNumber || null,
                role: userData.role || 'user'
            }
        });
    } catch (error) {
        console.error('Auth error:', error);
        res.status(400).json({
            code: 'ERR_INVALID_CREDENTIALS',
            message: error.message || 'Authentication failed'
        });
    }
};

exports.registerUser = async (req, res) => {
  const { name, phone, role, location, userType, languagePreference, profilePhotoUrl } = req.body;
  console.log('Registering user:', req.user);
  const uid = req.user.uid;
  const email = req.user.email;

  if (!["farmer", "transporter", "admin", "user"].includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }

  try {
    // Check if user already exists
    const usersRef = admin.firestore().collection("users");
    const existingUser = await usersRef.doc(uid).get();
    if (existingUser.exists) {
      return res.status(409).json({ message: "User already exists" });
    }

    //check if email is already registered
    const emailQuery = await usersRef.where("email", "==", email).get();
    if (!emailQuery.empty) {
      return res.status(409).json({ message: "Email is already registered" });
    }

    //check if phone is already registered
    const phoneQuery = await usersRef.where("phone", "==", phone).get();
    if (!phoneQuery.empty) {
      return res.status(409).json({ message: "Phone number is already registered" });
    }
    
    // Save to Firestore
    const verificationCode = generateOtp();

    // Create user in Firestore via model
    const user = await User.create({
      uid,
      email,
      name,
      phone,
      role,
      userType,
      location,
      languagePreference,
      profilePhotoUrl,
      verificationCode,
      fcmToken: null, 
      isVerified: false,
      verificationExpires: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 10 * 60 * 1000)) // expires in 10 mins
    });

     // Send code to user 
    await sendEmail({
      to: email,
      subject: 'Your AgriTruk Verification Code',
      text: `Your verification code is: ${verificationCode}`,
      html: getMFATemplate(verificationCode, null, req.ip || 'unknown', req.headers['user-agent'] || 'unknown')
      // html: `<p>Your AgriTruk verification code is: <strong>${verificationCode}</strong></p>`
    });

    await logActivity(uid, 'user_registration', req);

    res.status(201).json({ message: "User profile created", user });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({
      code: 'REGISTRATION_FAILED',
      message: error.message || 'User registration failed'
    });
  }
};

exports.verifyCode = async (req, res) => {
  const { code } = req.body;
  const uid = req.user.uid;
  const ipAddress = req.ip || 'unknown';

  console.log('Verifying code for user:', uid);
  console.log('Verification code:', code);

  try {
    const userData =await User.get(uid);
    const userRef = admin.firestore().collection("users").doc(uid);

    if (userData.isVerified) {
      return res.status(200).json({ message: "User already verified" });
    }

    const now = admin.firestore.Timestamp.now();

    console.log('stored code:', userData.verificationCode);
    console.log('current code:', code);

    if (userData.verificationCode !== code) {
      return res.status(400).json({ message: "Invalid verification code" });
    }

    if (userData.verificationExpires.toMillis() < now.toMillis()) {
      return res.status(400).json({ message: "Verification code expired" });
    }

    await userRef.update({
      isVerified: true,
      emailVerified: true,
      verificationCode: admin.firestore.FieldValue.delete(),
      verificationExpires: admin.firestore.FieldValue.delete()
    });

    const userAgent = req.headers['user-agent'] 
      ? req.headers['user-agent'].substring(0, 500).replace(/[^\x00-\x7F]/g, "") 
      : 'unknown';
    
    const location = await getGeoLocation(ipAddress);

    //send success email
    await sendEmail({
      to: userData.email,
      subject: "Email Verified Successfully",
      text: "Your email has been successfully verified.",
      html: getSuccessTemplate(location, ipAddress, userAgent)
    });

   await logActivity(uid, 'email_verification', req);

    res.status(200).json({ message: "User verified successfully" });
  } catch (error) {
    console.error("Verification error:", error);
    res.status(500).json({ message: "Failed to verify user" });
  }
};

exports.resendVerificationEmail = async (req, res) => {
  const { email } = req.body;
  console.log('Resending verification email to:', email);
  try {
    const link = await admin.auth().generateEmailVerificationLink(email, {
      url: process.env.CLIENT_URL || 'http://localhost:3000',
      handleCodeInApp: true
    });

    await sendEmail({
      to: email,
      subject: 'Verify your email',
      text: `Click the link to verify your email: ${link}`,
      html: `<p>Click the link to verify your email: <a href="${link}">${link}</a></p>`
    });

    // Log the email verification activity
    const userAgent = req.headers['user-agent'] 
      ? req.headers['user-agent'].substring(0, 500).replace(/[^\x00-\x7F]/g, "") 
      : 'unknown';

    await ActivityLog.log(req.user.uid, {
      event: 'email_reverification',
      device: userAgent,
      ip: req.ip || 'unknown',
      timestamp: admin.firestore.Timestamp.now()
    });

    res.status(200).json({
      message: 'Verification email sent successfully'
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      code: 'EMAIL_VERIFICATION_FAILED',
      message: 'Failed to send verification email'
    });
  }
};

exports.getUser = async (req, res) => {
    try {
      const userData = await User.get(req.user.uid);
      
      res.status(200).json({
        uid: req.user.uid,
        email: req.user.email || null,
        phone: req.user.phoneNumber || null,
        role: userData.role || 'user'
     });
    } catch (error) {
      console.error('Profile error:', error);
      res.status(500).json({
        code: 'ERR_SERVER_ERROR',
        message: 'Internal server error'
      });
    }
};


exports.updateUser = async (req, res) => {
  const {
    name,
    phone,
    role,
    location,
    userType,
    languagePreference,
    profilePhotoUrl
  } = req.body;

  try {
    const uid = req.user.uid;
    const now = admin.firestore.Timestamp.now();

    let profilePhotoUrl = undefined;

    // Upload image if provided
    if (req.file) {
      const publicId = await uploadImage(req.file.path);
      profilePhotoUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${publicId}.jpg`;

      // Optional: remove local file
      fs.unlinkSync(req.file.path);
    }
    
    const updates = {
      name,
      phone,
      role,
      location,
      userType,
      languagePreference,
      profilePhotoUrl, 
      lastActive: now,
      updatedAt: now
    };

    // Remove empty values to prevent overwriting with undefined
    Object.keys(updates).forEach(
      key => updates[key] === undefined && delete updates[key]
    );

    const updatedUser = await User.update(uid, updates);

    await logActivity(uid, 'user_profile_update', req);

    res.status(200).json({
      message: "User profile updated successfully",
      user: updatedUser
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      code: "ERR_SERVER_ERROR",
      message: "Failed to update user profile"
    });
  }
};

exports.updatePassword = async (req, res) => {
    const { newPassword } = req.body;

    if (!newPassword) {
        return res.status(400).json({
            code: 'ERR_INVALID_INPUT',
            message: 'New password is required'
        });
    }

    try {
        await admin.auth().updateUser(req.user.uid, {
            password: newPassword
        });

        await logActivity(req.user.uid, 'password_update', req);

        res.status(200).json({
            message: 'Password updated successfully'
        });
    } catch (error) {
        console.error('Update password error:', error);
        res.status(500).json({
            code: 'ERR_SERVER_ERROR',
            message: 'Failed to update password'
        });
    }
};

exports.getUserRole = async (req, res) => {
    try {
        const userData = await User.get(req.user.uid);
        res.status(200).json({
            role: userData.role || 'user'
        });
    } catch (error) {
        console.error('Get user role error:', error);
        res.status(500).json({
            code: 'ERR_SERVER_ERROR',
            message: 'Internal server error'
        });
    }
};

exports.getFcmToken = async (req, res) => {
    try {
        const userDoc = await admin.firestore()
            .collection('users')
            .doc(req.user.uid)
            .get();

        if (!userDoc.exists) {
            return res.status(404).json({
                code: 'ERR_USER_NOT_FOUND',
                message: 'User not found'
            });
        }

        const userData = userDoc.data();
        res.status(200).json({
            fcmToken: userData.fcmToken || null
        });
    } catch (error) {
        console.error('Get FCM token error:', error);
        res.status(500).json({
            code: 'ERR_SERVER_ERROR',
            message: 'Internal server error'
        });
    }
};

exports.verifyToken = async (req, res) => {
  try {
    const { uid, email, phone_number } = req.user;

    const userData = await User.get(uid);

    if (!userData.isVerified) {
      return res.status(401).json({
        code: 'ERR_UNAUTHORIZED',
        message: 'User not verified'
      });
    }

    res.status(200).json({
      message: 'Token is valid',
      user: {
        uid,
        email: email || null,
        phone: phone_number || null,
        role: userData.role || 'user'
      }
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({
      code: 'ERR_SERVER_ERROR',
      message: 'Internal server error'
    });
  }
};

exports.deleteAccount = async (req, res) => {
    try {
        const uid = req.user.uid;

        // Delete user from Firebase Auth
        await admin.auth().deleteUser(uid);

        // Delete user document from Firestore
        await User.delete(uid);

        // Log the account deletion activity
        await logActivity(uid, 'account_deletion', req);

        res.status(200).json({
            message: 'User account deleted successfully'
        });
    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({
            code: 'ERR_SERVER_ERROR',
            message: 'Failed to delete user account'
        });
    }
};

exports.updateFcmToken = async (req, res) => {
  const { fcmToken } = req.body;
  if (!fcmToken) return res.status(400).json({ message: "FCM token required" });

  try {
    await User.update(req.user.uid,{
      fcmToken,
      updatedAt: admin.firestore.Timestamp.now()
    });

    // Log the FCM token update activity
    await logActivity(req.user.uid, 'fcm_token_update', req);

    res.status(200).json({ message: "FCM token updated" });
  } catch (err) {
    res.status(500).json({ message: "Failed to update FCM token" });
  }
};

exports.deleteUser = async (req, res) => {
  const uid = req.params.uid;
  if (!uid) return res.status(400).json({ message: "User ID required" });

  try {
    // Delete user from Firebase Auth
    await admin.auth().deleteUser(uid);

    // Delete user document from Firestore
    await admin.firestore().collection('users').doc(uid).delete();

    // Log the user deletion activity
    await logActivity(uid, 'user_deletion', req);

    res.status(200).json({
      message: 'User account deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      code: 'ERR_SERVER_ERROR',
      message: 'Failed to delete user account'
    });
  }
};

exports.resendCode = async (req, res) => {
  const uid = req.user.uid;
  const email = req.user.email;
  const ipAddress = req.ip || 'unknown';

  try {
    const userData = await User.get(uid);
    if (userData.isVerified) {
      return res.status(400).json({ message: "User is already verified" });
    }

    const newCode = generateOtp();

    await User.update(uid,{
      verificationCode: newCode,
      verificationExpires: admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
      ),
      updatedAt: admin.firestore.Timestamp.now()
    });

    const userAgent = req.headers['user-agent'] 
      ? req.headers['user-agent'].substring(0, 500).replace(/[^\x00-\x7F]/g, "") 
      : 'unknown';

    const location = await getGeoLocation(ipAddress);

    await sendEmail({
      to: email,
      subject: "Your new AgriTruk Verification Code",
      text: `Your new verification code is: ${newCode}`,
      html: getMFATemplate(newCode, location, ipAddress, userAgent)
      // html: `<p>Your new AgriTruk verification code is: <strong>${newCode}</strong></p>`
    });

    await logActivity(uid, 'code_resend', req);

    console.log("Verification code resent successfully to:", email);

    res.status(200).json({ message: "Verification code resent successfully" });
  } catch (error) {
    console.error("Resend code error:", error);
    res.status(500).json({
      code: "ERR_RESEND_CODE_FAILED",
      message: "Failed to resend verification code"
    });
  }
};