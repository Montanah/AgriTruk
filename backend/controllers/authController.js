const admin = require("../config/firebase");
const User = require("../models/User");
const ActivityLog = require("../models/ActivityLog");
const generateOtp = require("../utils/generateOtp");
const sendEmail = require("../utils/sendEmail");
const {getMFATemplate, getResetPasswordTemplate, getSuccessTemplate, getRejectTemplate } = require("../utils/sendMailTemplate");
const getGeoLocation = require("../utils/locationHelper");
const { logActivity, logAdminActivity } = require("../utils/activityLogger");
const { uploadImage } = require('../utils/upload');
const fs = require('fs');
const Notification = require('../models/Notification');
const SMSService = require('../utils/sendSms');

const smsService = new SMSService(process.env.MOBILESASA_API_TOKEN);

function formatPhoneNumber(phone) {
  // Remove all spaces or special characters
  phone = phone.replace(/\D/g, '');

  // If starts with 0 and is 10 digits: 07XXXXXXXX → 2547XXXXXXXX
  if (phone.startsWith('0') && phone.length === 10) {
    return `254${phone.substring(1)}`;
  }

  // If starts with 2540 → fix to 2547XXXXXXXX
  if (phone.startsWith('2540')) {
    return `254${phone.substring(4)}`;
  }

  // If starts with +254 → remove +
  if (phone.startsWith('+254')) {
    return phone.substring(1);
  }

  // Already correct
  return phone;
}

function formatPhoneNumberAuth(phone) {
  if (!phone) return null;

  let cleaned = phone.toString().replace(/\D/g, ""); 

  // If it starts with "0", replace with +254
  if (cleaned.startsWith("0")) {
    cleaned = "+254" + cleaned.slice(1);
  } else if (!cleaned.startsWith("+")) {
    cleaned = "+" + cleaned;
  }

  return cleaned;
}
exports.registerUser = async (req, res) => {
  const { name, phone,email, role, location, userType, languagePreference, profilePhotoUrl, preferredVerificationMethod } = req.body;
  console.log('Registering user:', req.user);
  const uid = req.user.uid;
  // const email = req.user.email;

  if (!["shipper", "transporter", "admin", "user", "broker", "business", "job_seeker"].includes(role)) {
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
    const verificationExpiry = admin.firestore.Timestamp.fromDate(new Date(Date.now() + 10 * 60 * 1000));

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
      phoneVerificationExpires: verificationExpiry,
      verificationExpires: verificationExpiry,
      preferredVerificationMethod
    });

     // Send code to user 
    let sendMethod = null;
    
    if (preferredVerificationMethod === "email") {
      await sendEmail({
        to: email,
        subject: 'Your Truk Verification Code',
        text: `Your verification code is: ${emailVerificationCode}`,
        html: getMFATemplate(emailVerificationCode, null, req.ip || 'unknown', req.headers['user-agent'] || 'unknown')
        // html: `<p>Your AgriTruk verification code is: <strong>${verificationCode}</strong></p>`
      });
      sendMethod = "email";
    } else if (preferredVerificationMethod === "phone") {
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
      sendMethod = "phone";
    } else {
      return res.status(400).json({ message: "Invalid preferred verification method" });
    }

    await logActivity(uid, 'user_registration', req);

    await Notification.create({
      userId: uid,
      type: 'Welcome to Truk',
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
    if (updatedUser.emailVerified || updatedUser.phoneVerified) {
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
  const { code, userId } = req.body;
  const uid = req.user.uid || userId;
  //const uid = userId
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
    if (updatedUser.emailVerified || updatedUser.phoneVerified) {
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

      // Send SMS using the SMS service
      const formattedPhone = formatPhoneNumber(userData.phone);
      await smsService.sendSMS('TRUK LTD', `Your verification code is: ${verificationCode}`, formattedPhone);

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
    email,
    role,
    location,
    userType,
    languagePreference,
    profilePhotoUrl: profilePhotoUrlFromBody,
  } = req.body;

  try {
    const uid = req.user.uid;
    const now = admin.firestore.Timestamp.now();

    let profilePhotoUrl = undefined;

    // Upload image if provided via file upload (direct upload)
    if (req.file) {
      const publicId = await uploadImage(req.file.path);
      profilePhotoUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${publicId}.jpg`;

      // Optional: remove local file
      fs.unlinkSync(req.file.path);
    } else if (profilePhotoUrlFromBody) {
      // Use pre-uploaded URL from /api/upload endpoint
      profilePhotoUrl = profilePhotoUrlFromBody;
    }
    
    const updates = {
      name,
      phone,
      email,
      email,
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

    if (email || phone ) {
      const updateFirebaseUser = {
        email,
        phoneNumber: phone,
      };
      try {
        await admin.auth().updateUser(uid, updateFirebaseUser);
      } catch (error) {
        console.error("Firebase user update error:", error);
      }
    }
    if (email || phone ) {
      const updateFirebaseUser = {
        email,
        phoneNumber: phone,
      };
      try {
        await admin.auth().updateUser(uid, updateFirebaseUser);
      } catch (error) {
        console.error("Firebase user update error:", error);
      }
    }
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

exports.forgotPassword = async (req, res) => {
  try {
    const { email, phone } = req.body;

    if (!email && !phone) {
      return res.status(400).json({
        code: 'ERR_INVALID_INPUT',
        message: 'Email or phone number is required'
      });
    }
  
   
    let user;
    if (email) {
      try {
        user = await admin.auth().getUserByEmail(email);
      } catch (error) {
        console.log('User not found by email:', error.message);
        // User doesn't exist, user will remain null
        user = null;
      }
    } else if (phone) {
      // Try multiple phone number formats to find the user
      const phoneFormats = [
        phone, // Original format
        formatPhoneNumberAuth(phone), // +254 format
        phone.replace(/^\+/, ''), // Without + prefix
        phone.replace(/^0/, '+254'), // Convert 0 to +254
        phone.replace(/^0/, '254'), // Convert 0 to 254
      ];
      
      // Remove duplicates
      const uniqueFormats = [...new Set(phoneFormats)];
      
      for (const phoneFormat of uniqueFormats) {
        try {
          user = await admin.auth().getUserByPhoneNumber(phoneFormat);
          if (user) break; // Found user, exit loop
        } catch (error) {
          // Continue to next format if this one fails
          continue;
        }
      }
    }

    if (!user) {
      const errorMessage = email 
        ? 'No account found with this email address'
        : 'No account found with this phone number';
      
      return res.status(404).json({
        code: 'ERR_USER_NOT_FOUND',
        message: errorMessage
      });
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
    const resetTokenExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes expiry

    // Store reset token and expiry in database
    await User.update(user.uid, {
      resetToken: verificationCode,
      resetTokenExpiry: resetTokenExpiry
    });

    if (email) {
      const userData = await User.get(user.uid);
      await sendEmail({
        to: email,
        subject: "Password Reset Code",
        text: `Your password reset code is: ${verificationCode}`,
        html: getRejectTemplate('Password Reset Code', `You are receiving this email because we received a forget password request for your account. <br> <br>Your password reset code is: ${verificationCode}. <br> <br> If you did not request a password reset, you can safely ignore this email. <br> <br> Thank you for using our services. <br> <br> Best regards, <br>  ${process.env.APP_NAME}`, userData)
      });
    } else if (phone) {
      const smsMessage = `Your password reset code is: ${verificationCode}`;
      
      const formattedPhoneNumber = formatPhoneNumber(phone);
      await smsService.sendSMS(
        'TRUK LTD',
        smsMessage,
        formattedPhoneNumber
     );
    }

    await logActivity(user.uid, 'forgot_password', req);

    res.status(200).json({
      message: 'Password reset code sent successfully',
      userId: user.uid 
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      code: 'ERR_SERVER_ERROR',
      message: 'Failed to send password reset code'
    });
  }
};
exports.verifyPasswordResetCode = async (req, res) => {
  try {
    const { code, userId } = req.body;

    if (!code || !userId) {
      return res.status(400).json({
        code: 'ERR_INVALID_INPUT',
        message: 'Reset code and user ID are required'
      });
    }

    const user = await User.get(userId);
    if (!user) {
      return res.status(404).json({
        code: 'ERR_USER_NOT_FOUND',
        message: 'User not found'
      });
    }

    if (user.resetToken === code && user.resetTokenExpiry > Date.now()) {
      
      res.status(200).json({
        message: 'Password reset code is valid',
        userId: userId
      });
    } else {
      res.status(400).json({
        code: 'ERR_INVALID_CODE',
        message: 'Invalid or expired password reset code'
      });
    }
  } catch (error) {
    console.error('Verify password reset code error:', error);
    res.status(500).json({
      code: 'ERR_SERVER_ERROR',
      message: 'Failed to verify password reset code'
    });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { newPassword, userId } = req.body;

    console.log(newPassword, userId);

    if (!newPassword || !userId) {
      return res.status(400).json({
        code: 'ERR_INVALID_INPUT',
        message: 'New password and user ID are required'
      });
    }

    const user = await User.get(userId);
    console.log(user);
    if (!user || !user.resetToken) {
      return res.status(400).json({
        code: 'ERR_INVALID_REQUEST',
        message: 'Invalid password reset request'
      });
    }

    await admin.auth().updateUser(userId, {
      password: newPassword
    });

    await User.update(userId, {
      resetToken: null,
      resetTokenExpiry: null
    });

    await logActivity(userId, 'password_reset', req);

    await Notification.create({
      type: "Reset Password",
      message: "You reset your password",
      userId: userId,
      userType: "user",
    })
    
    const userData = await User.get(userId);
    console.log(userData);
    await sendEmail({
      to: userData.email,
      subject: "Password Reset Confirmation",
      html: getRejectTemplate("Password Reset Confirmation", `You have successfully reset your password. <br> <br> Thank you for using our services. <br> <br> Best regards, <br>  ${process.env.APP_NAME}`, userData)
    })

    res.status(200).json({
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      code: 'ERR_SERVER_ERROR',
      message: 'Failed to reset password'
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
        const {uid} = req.params;
        console.log(req.params);

        // Delete user from Firebase Auth
        await admin.auth().deleteUser(uid);

        // Delete user document from Firestore
        await User.delete(uid);

        // Log the account deletion activity
        await logAdminActivity(uid, 'account_deletion', req);

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
    if (userData.emailVerified) {
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
    const {uid} = req.params;
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

exports.registerUserFromBackend = async (req, res) => {
  const { 
    name, 
    phone, 
    email, 
    password,     // 👈 add password (or generate random if OTP-only)
    role, 
    location, 
    userType, 
    languagePreference, 
    profilePhotoUrl, 
    preferredVerificationMethod 
  } = req.body;

  if (!["shipper", "transporter", "admin", "user", "broker", "business", "job_seeker"].includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }

  try {
    // 🔹 Step 1: Check if email/phone already exists in Auth
    let existingUser;
    try {
      existingUser = await admin.auth().getUserByEmail(email);
    } catch (_) {}
    if (existingUser) {
      return res.status(409).json({ message: "Email already registered" });
    }

    try {
      existingUser = await admin.auth().getUserByPhoneNumber(phone);
    } catch (_) {}
    if (existingUser) {
      return res.status(409).json({ message: "Phone already registered" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    // 🔹 Step 1: Check if email/phone already exists in Firestore
    const existingUserDoc = await User.getByEmail(email);
    if (existingUserDoc) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const existingUserDocByPhone = await User.getByPhone(phone);
    if (existingUserDocByPhone) {
      return res.status(409).json({ message: "Phone already registered" });
    }

    // 🔹 Step 2: Create Firebase user
    const userRecord = await admin.auth().createUser({
      email,
      password,       // or omit if OTP-only
      phoneNumber: phone,
      displayName: name,
      // photoURL: profilePhotoUrl || null,
    });

    const uid = userRecord.uid;

    // 🔹 Step 3: Generate verification codes
    const emailVerificationCode = generateOtp();
    const phoneVerificationCode = generateOtp();
    const verificationExpiry = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() + 10 * 60 * 1000) // 10 mins
    );

    // 🔹 Step 4: Save user in Firestore
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
      emailVerificationCode, 
      phoneVerificationCode,
      emailVerified: false,
      phoneVerified: false,
      isVerified: false,
      phoneVerificationExpires: verificationExpiry,
      verificationExpires: verificationExpiry,
      preferredVerificationMethod
    });

    // 🔹 Step 5: Send code
    if (preferredVerificationMethod === "email") {
      await sendEmail({
        to: email,
        subject: 'Your Truk Verification Code',
        text: `Your verification code is: ${emailVerificationCode}`,
        html: getMFATemplate(emailVerificationCode, null, req.ip || 'unknown', req.headers['user-agent'] || 'unknown')
      });
    } else if (preferredVerificationMethod === "phone") {
      const formattedPhone = formatPhoneNumber(phone);
      const smsMessage = `Your Truk verification code is: ${phoneVerificationCode}`;
      await smsService.sendSMS('TRUK LTD', smsMessage, formattedPhone);
    } else {
      return res.status(400).json({ message: "Invalid preferred verification method" });
    }

    // 🔹 Step 6: Log + Notify
    await logActivity(uid, 'user_registration', req);
    await Notification.create({
      userId: uid,
      type: 'Welcome to Truk',
      message: 'Your account has been created successfully',
      UserType: 'user',
    });

    res.status(201).json({ message: "User account created", user });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({
      code: 'REGISTRATION_FAILED',
      message: error.message || 'User registration failed'
    });
  }
};

// Get user by phone number for login
exports.getUserByPhone = async (req, res) => {
  try {
    const { phone } = req.body;
    
    if (!phone) {
      return res.status(400).json({ 
        code: "ERR_MISSING_PHONE",
        message: "Phone number is required" 
      });
    }
    
    // Use the User model to get user by phone
    const user = await User.getUserByPhone(phone);
    
    if (!user) {
      return res.status(404).json({ 
        code: "ERR_USER_NOT_FOUND",
        message: "No account found with this phone number" 
      });
    }
    
    // Return only necessary data for login
    res.json({
      email: user.email,
      phoneVerified: user.phoneVerified || false,
      emailVerified: user.emailVerified || false
    });
    
  } catch (error) {
    console.error('Get user by phone error:', error);
    res.status(500).json({
      code: 'ERR_SERVER_ERROR',
      message: 'Internal server error'
    });
  }
};
