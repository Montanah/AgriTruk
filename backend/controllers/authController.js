const admin = require("../config/firebase");
const User = require("../models/User");
const ActivityLog = require("../models/ActivityLog");
const generateOtp = require("../utils/generateOtp");
const sendEmail = require("../utils/sendEmail");
const {getMFATemplate, getResetPasswordTemplate, getSuccessTemplate } = require("../utils/sendMailTemplate");
const getGeoLocation = require("../utils/locationHelper");
const { logActivity, logAdminActivity } = require("../utils/activityLogger");
const { uploadImage } = require('../utils/upload');
const fs = require('fs');
const Notification = require('../models/Notification');
const SMSService = require('../utils/sendSms');

const smsService = new SMSService(process.env.MOBILESASA_API_TOKEN);

function formatPhoneNumber(phone) {
  // Convert 07... to 2547...
  if (phone.startsWith('0') && phone.length === 10) {
    return `254${phone.substring(1)}`;
  }
  // Ensure international format
  if (phone.startsWith('+')) {
    return phone.substring(1);
  }
  return phone;
}

exports.registerUser = async (req, res) => {
  const { name, phone, role, location, userType, languagePreference, profilePhotoUrl } = req.body;
  console.log('Registering user:', req.user);
  const uid = req.user.uid;
  const email = req.user.email;

  if (!["shipper", "transporter", "admin", "user", "broker", "business"].includes(role)) {
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
    const emailVerificationCode = generateOtp();
    const phoneVerificationCode = generateOtp();

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
      emailVerificationCode: emailVerificationCode, 
      phoneVerificationCode: phoneVerificationCode,
      emailVerified: false,
      phoneVerified: false,
      isVerified: false,
      phoneVerificationExpires: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 10 * 60 * 1000)), // expires in 10 mins
      verificationExpires: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 10 * 60 * 1000)) // expires in 10 mins
    });

     // Send code to user 
    await sendEmail({
      to: email,
      subject: 'Your AgriTruk Verification Code',
      text: `Your verification code is: ${emailVerificationCode}`,
      html: getMFATemplate(emailVerificationCode, null, req.ip || 'unknown', req.headers['user-agent'] || 'unknown')
      // html: `<p>Your AgriTruk verification code is: <strong>${verificationCode}</strong></p>`
    });

    // Send SMS to user
    const formattedPhone = formatPhoneNumber(phone);
    try {
      const smsMessage = `Your Truk verification code is: ${phoneVerificationCode}`;
      await smsService.sendSMS(
        'TRUK LTD', 
        smsMessage,
        formattedPhone
      );
      console.log('Verification SMS sent successfully');
    } catch (smsError) {
      console.error('Failed to send verification SMS:', smsError);
      // Don't fail the registration if SMS fails, just log it
    }

    await logActivity(uid, 'user_registration', req);

    await Notification.create({
      userId: uid,
      type: 'Welcome to AgriTruk',
      message: 'Your account has been created successfully',
      UserType: 'user',
    });

    res.status(201).json({ message: "User profile created", user });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({
      code: 'REGISTRATION_FAILED',
      message: error.message || 'User registration failed'
    });
  }
};

exports.verifyEmailCode = async (req, res) => {
  const { code } = req.body;
  const uid = req.user.uid;
  const ipAddress = req.ip || 'unknown';

  console.log('Verifying code for user:', uid);
  console.log('Verification code:', code);

  try {
    const userData =await User.get(uid);
    const userRef = admin.firestore().collection("users").doc(uid);

    if (userData.emailVerified) {
      return res.status(200).json({ message: "User already email verified" });
    }

    const now = admin.firestore.Timestamp.now();

    console.log('stored code:', userData.emailVerificationCode);
    console.log('current code:', code);

    if (userData.emailVerificationCode !== code) {
      return res.status(400).json({ message: "Invalid verification code" });
    }

    if (userData.verificationExpires.toMillis() < now.toMillis()) {
      return res.status(400).json({ message: "Verification code expired" });
    }

    await userRef.update({
      emailVerified: true,
      emailVerificationCode: admin.firestore.FieldValue.delete(),
      verificationExpires: admin.firestore.FieldValue.delete()
    });
    
    // Check if phone also verified → set isVerified
    const updatedUser = await User.get(uid);
    if (updatedUser.emailVerified && updatedUser.phoneVerified) {
      await userRef.update({ isVerified: true });
    }
    
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

exports.verifyPhoneCode = async (req, res) => {
  const { code } = req.body;
  const uid = req.user.uid;

  try {
    const userData =await User.get(uid);
    const userRef = admin.firestore().collection("users").doc(uid);

    if (userData.phoneVerified) {
      return res.status(200).json({ message: "User already is phone verified" });
    }

    const now = admin.firestore.Timestamp.now();

    console.log('stored code:', userData.phoneVerificationCode);
    console.log('current code:', code);

    if (userData.phoneVerificationCode !== code) {
      return res.status(400).json({ message: "Invalid verification code" });
    }

    if (userData.phoneVerificationExpires.toMillis() < now.toMillis()) {
      return res.status(400).json({ message: "Verification code expired" });
    }

    await userRef.update({
      phoneVerified: true,
      phoneVerificationCode: admin.firestore.FieldValue.delete(),
      phoneVerificationExpires: admin.firestore.FieldValue.delete()
    });

    // Check if email also verified → set isVerified
    const updatedUser = await User.get(uid);
    if (updatedUser.emailVerified && updatedUser.phoneVerified) {
      await userRef.update({ isVerified: true });
    }

   await logActivity(uid, 'phone_verification', req);

    res.status(200).json({ message: "User verified successfully" });
  } catch (error) {
    console.error("Verification error:", error);
    res.status(500).json({ message: "Failed to verify user" });
  }
};

exports.resendVerificationCode = async (req, res) => {
  const { type } = req.body; // 'email' or 'phone'
  const uid = req.user.uid;

  if (!['email', 'phone'].includes(type)) {
    return res.status(400).json({ message: "Invalid verification type" });
  }

  try {
    const userData = await User.get(uid);
    const userRef = admin.firestore().collection("users").doc(uid);

    const now = admin.firestore.Timestamp.now();
    const expiresAt = admin.firestore.Timestamp.fromMillis(
      now.toMillis() + 10 * 60 * 1000 // 10 min expiry
    );
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code

    if (type === 'email') {
      if (userData.emailVerified) {
        return res.status(200).json({ message: "Email already verified" });
      }

      await userRef.update({
        emailVerificationCode: verificationCode,
        verificationExpires: expiresAt
      });

      // Send verification email
      await sendEmail({
        to: userData.email,
        subject: "Email Verification Code",
        text: `Your verification code is: ${verificationCode}`,
        html: `<p>Your verification code is: <strong>${verificationCode}</strong></p>`
      });

      await logActivity(uid, 'resend_email_verification', req);
    }

    if (type === 'phone') {
      if (userData.phoneVerified) {
        return res.status(200).json({ message: "Phone already verified" });
      }

      await userRef.update({
        phoneVerificationCode: verificationCode,
        phoneVerificationExpires: expiresAt
      });

      // Send SMS (replace sendSMS with your provider integration)
      await sendSMS(userData.phone, `Your verification code is: ${verificationCode}`);

      await logActivity(uid, 'resend_phone_verification', req);
    }

    res.status(200).json({ message: "Verification code resent successfully" });
  } catch (error) {
    console.error("Resend verification error:", error);
    res.status(500).json({ message: "Failed to resend verification code" });
  }
};


exports.getUser = async (req, res) => {
    try {
      const userData = await User.get(req.user.uid);
      
      res.status(200).json({userData})
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

        await Notification.create({
            type: "Update Password",
            message: "You updated your password",
            userId: req.user.uid,
            userType: "user",
        })

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

        await Notification.create({
            type: "Account Deletion",
            message: "You deleted your account",
            userId: uid,
            userType: "user",
        })

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

    await Notification.create({
      type: "Account Deletion",
      message: "You deleted your account",
      userId: uid,
      userType: "user",
    })

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
      emailVerificationCode: newCode,
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

exports.resendPhoneCode = async (req, res) => {
  const uid = req.user.uid;

  try {
    const userData = await User.get(uid);
    if (userData.phoneVerified) {
      return res.status(400).json({ message: "User is already verified" });
    }

    const newCode = generateOtp();

    await User.update(uid,{
      phoneVerificationCode: newCode,
      phoneVerificationExpires: admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
      ),
      updatedAt: admin.firestore.Timestamp.now()
    });

    // Send SMS to user
    const formattedPhone = formatPhoneNumber(userData.phone);
    try {
      const smsMessage = `Your Truk verification code is: ${newCode}`;
      await smsService.sendSMS(
        'TRUK LTD', 
        smsMessage,
        formattedPhone
      );
      console.log('Verification SMS sent successfully');
    } catch (smsError) {
      console.error('Failed to send verification SMS:', smsError);
      // Don't fail the registration if SMS fails, just log it
    }

    await logActivity(uid, 'code_resend', req);

    res.status(200).json({ message: "Verification code resent successfully" });
  } catch (error) {
    console.error("Resend code error:", error);
    res.status(500).json({
      code: "ERR_RESEND_CODE_FAILED",
      message: "Failed to resend verification code"
    });
  }
};

exports.deactivateAccount = async (req, res) => {
  try {
    const uid = req.user.uid;
    await User.update(uid, { status: 'inactive' });

    await logActivity(req.user.uid, 'account_deactivation', req);

    await Notification.create({
      type: "Account Deactivation",
      message: "You deactivated your account",
      userId: req.user.uid,
      userType: "user",
    })
    res.status(200).json({ message: 'Account deactivated successfully' });
  } catch (error) {
    console.error('Deactivate account error:', error);
    res.status(500).json({ message: 'Failed to deactivate account' });
  }
};