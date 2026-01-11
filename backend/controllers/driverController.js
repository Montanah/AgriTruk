const admin = require('../config/firebase');
const db = admin.firestore();
const { adminNotification, sendDriverWelcomeMail } = require('../utils/sendMailTemplate');
const cloudinary = require('cloudinary').v2;
const sendEmail = require('../utils/sendEmail');
const Driver = require('../models/Driver');
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');
const { logActivity, logAdminActivity } = require('../utils/activityLogger');
const Action = require('../models/Action');
const Company = require('../models/Company');
const { uploadImage } = require('../utils/upload');
const fs = require('fs');


// Utility function to upload driver documents
const uploadDriverDocuments = async (files) => {
  const uploadResults = {};
  
  for (const file of files) {
    try {
      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload(file.path, {
        folder: 'drivers',
        resource_type: 'auto',
      });
      
      // Categorize based on fieldname
      const fieldName = file.fieldname;
      if (!uploadResults[fieldName]) {
        uploadResults[fieldName] = [];
      }
      uploadResults[fieldName].push(result.secure_url);
      
    } catch (uploadError) {
      console.error(`Error uploading ${file.fieldname}:`, uploadError);
      throw new Error(`Failed to upload ${file.fieldname}`);
    }
  }
  
  return uploadResults;
};

const createDriver = async (req, res) => {
  try {
    console.log('🚗 ===== DRIVER CREATION REQUEST =====');
    console.log('🚗 Request body:', req.body);
    console.log('🚗 Request files:', req.files?.length || 0);
    console.log('🚗 User ID:', req.user.uid);
    
    const userId = req.user.uid;
    const companyId = req.body.companyId;
    
    console.log('🚗 Company ID from request:', companyId);

    // Verify the user owns the company
    const companyDoc = await db.collection('companies').doc(companyId).get();
    if (!companyDoc.exists) {
      console.log('🚗 Company not found:', companyId);
      return res.status(404).json({ message: 'Company not found' });
    }

    const companyData = companyDoc.data();
    console.log('🚗 Company data:', companyData);
    
    if (companyData.transporterId !== userId) {
      console.log('🚗 Unauthorized: user', userId, 'does not own company', companyId);
      return res.status(403).json({ message: 'Unauthorized to add drivers to this company' });
    }

    // Check for existing driver with same email or phone within the company
    const existingDriverQuery = await db.collection('drivers')
      .where('companyId', '==', companyId)
      .where('email', '==', req.body.email)
      .get();

    if (!existingDriverQuery.empty) {
      return res.status(400).json({ message: 'Driver with this email already exists' });
    }

    const existingPhoneQuery = await db.collection('drivers')
      .where('companyId', '==', companyId)
      .where('phone', '==', req.body.phone)
      .get();

    if (!existingPhoneQuery.empty) {
      return res.status(400).json({ message: 'Driver with this phone number already exists' });
    }

    // Check for existing job seeker to reuse Firebase user
    let firebaseUser, userIdFromJobSeeker, defaultPassword = null;
    const jobSeekerQuery = await db.collection('job_seekers')
      .where('email', '==', req.body.email)
      .get();
    if (!jobSeekerQuery.empty) {
      const jobSeekerDoc = req.body.jobSeekerId ? 
        jobSeekerQuery.docs.find(doc => doc.id === req.body.jobSeekerId) : 
        jobSeekerQuery.docs[0];
      if (jobSeekerDoc) {
       
        firebaseUser = await admin.auth().getUserByEmail(req.body.email);
        userIdFromJobSeeker = firebaseUser.uid;
        // Update user role and job seeker status
        await db.collection('users').doc(userIdFromJobSeeker).update({ role: 'driver' });
        await db.collection('job_seekers').doc(jobSeekerDoc.id).update({ status: 'recruited' });
      }
    }

    // If no job seeker found, create new Firebase user
    if (!userIdFromJobSeeker) {
      defaultPassword = Math.random().toString(36).slice(-8) + '123'; // 8 random chars + 123
      console.log('🚀 Creating Firebase user...', defaultPassword);
      let phoneNumber = req.body.phone;
      if (phoneNumber && !phoneNumber.startsWith('+')) {
        phoneNumber = phoneNumber.startsWith('0') ? '+254' + phoneNumber.substring(1) : '+254' + phoneNumber;
      }

      try {
        firebaseUser = await admin.auth().createUser({
          email: req.body.email,
          phoneNumber: phoneNumber,
          password: defaultPassword,
          displayName: `${req.body.firstName} ${req.body.lastName}`,
          emailVerified: false,
        });
        console.log('Firebase user created:', firebaseUser.uid);
        await db.collection('users').doc(firebaseUser.uid).set({
          email: req.body.email,
          phone: phoneNumber,
          role: 'driver',
          createdAt: new Date(),
        });
      } catch (authError) {
        console.error('Error creating Firebase user:', authError);
        if (authError.code === 'auth/email-already-exists' || authError.code === 'auth/phone-number-already-exists') {
          return res.status(400).json({ message: 'A user with this email or phone already exists. Consider linking a job seeker.' });
        }
        return res.status(400).json({ message: 'Failed to create driver account: ' + authError.message });
      }
    }

    // Prepare driver data using existing Firebase details where applicable
    const driverData = {
      companyId,
      userId: userIdFromJobSeeker || firebaseUser.uid,
      firstName: req.body.firstName || (firebaseUser.displayName ? firebaseUser.displayName.split(' ')[0] : null),
      lastName: req.body.lastName || (firebaseUser.displayName ? firebaseUser.displayName.split(' ')[1] : null),
      email: firebaseUser.email,
      phone: firebaseUser.phoneNumber || req.body.phone,
      driverLicense: req.body.driverLicenseNumber || req.body.driverLicense || 'DL-' + Date.now(),
      idNumber: req.body.idNumber || 'ID-' + Date.now(),
      status: userIdFromJobSeeker ? 'recruited' : 'pending',
      assignedVehicleId: null,
      isDefaultPassword: !!defaultPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Handle optional fields with proper defaults
    if (req.body.driverLicenseExpiryDate) {
      driverData.driverLicenseExpiryDate = req.body.driverLicenseExpiryDate;
    } else {
      // Set default expiry to 1 year from now
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
      driverData.driverLicenseExpiryDate = oneYearFromNow.toISOString();
    }
    
    if (req.body.idExpiryDate) {
      driverData.idExpiryDate = req.body.idExpiryDate;
    } else {
      // Set default expiry to 1 year from now
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
      driverData.idExpiryDate = oneYearFromNow.toISOString();
    }
    
    console.log('🚗 Prepared driver data:', driverData);

    // Handle file uploads using the same working pattern as vehicle creation
    if (req.files && req.files.length > 0) {
      console.log('🚗 Processing driver files:', req.files.length);
      
      const uploadTasks = req.files.map(async file => {
        const fieldName = file.fieldname;
        console.log(`🚗 Processing driver file: ${fieldName}, path: ${file.path}`);
        
        try {
          const publicId = await uploadImage(file.path);
          if (publicId) {
            switch (fieldName) {
              case 'profileImage':
                driverData.profileImage = publicId;
                console.log(`🚗 Added profile image: ${publicId}`);
                break;
              case 'driverLicense':
                driverData.driverLicenseUrl = publicId;
                console.log(`🚗 Added driver license: ${publicId}`);
                break;
              case 'idDocument':
                driverData.idDocumentUrl = publicId;
                console.log(`🚗 Added ID document: ${publicId}`);
                break;
              default:
                console.log(`🚗 Ignoring unexpected field: ${fieldName}`);
            }
            fs.unlinkSync(file.path);
          } else {
            console.error(`🚗 Failed to upload ${fieldName}`);
            fs.unlinkSync(file.path);
          }
        } catch (uploadError) {
          console.error(`🚗 Error uploading ${fieldName}:`, uploadError);
          fs.unlinkSync(file.path);
          throw new Error(`Failed to upload ${fieldName}`);
        }
      });
      
      await Promise.all(uploadTasks);
      
      console.log('🚗 Driver file upload completed:', {
        profileImage: !!driverData.profileImage,
        driverLicense: !!driverData.driverLicenseUrl,
        idDocument: !!driverData.idDocumentUrl
      });
    }

    // Create driver document
    // const driverRef = db.collection('drivers').doc();
    // await driverRef.set(driverData);
    const driverRef = await Driver.create(driverData);

    // Create action for admin review
    await db.collection('actions').add({
      type: 'driver_review',
      entityId: driverRef.driverId,
      priority: 'medium',
      metadata: {
        companyName: companyData.companyName,
        driverName: `${driverData.firstName} ${driverData.lastName}`,
        driverLicense: driverData.driverLicense
      },
      message: `New driver recruited by ${companyData.companyName}. Driver ID: ${driverRef.id}`,
      createdAt: new Date(),
    });

    // Send notification to admin
    await sendEmail({
      to: "support@trukafrica.com",
      subject: 'New Driver Recruited for Review',
      html: adminNotification(`Company ${companyData.companyName} has recruited a new driver (${driverData.firstName} ${driverData.lastName}) for review.`),
    });

    // Send welcome email with login credentials if new account
    if (defaultPassword) {
      try {
        const {subject, html} = sendDriverWelcomeMail(driverData, defaultPassword);
        await sendEmail({
          to: driverData.email,
          subject,
          html
        });
        // const { sendDriverWelcomeEmail } = require('../utils/sendMailTemplate');
        // await sendDriverWelcomeEmail({
        //   email: driverData.email,
        //   phone: driverData.phone,
        //   firstName: driverData.firstName,
        //   lastName: driverData.lastName,
        //   companyName: companyData.companyName,
        //   defaultPassword,
        //   loginUrl: process.env.FRONTEND_URL || 'https://your-app.com'
        // });
      } catch (emailError) {
        console.error('Error sending welcome email:', emailError);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Driver created successfully',
      data: {
        driver: { id: driverRef.id, ...driverData, defaultPassword }
      }
    });
    
    console.log('🚗 ===== DRIVER CREATION COMPLETED =====');

  } catch (error) {
    console.error('Error creating driver:', error);
    res.status(500).json({ message: 'Failed to create driver' });
  }
};

// Get all drivers for a company
const getDrivers = async (req, res) => {
  try {
    const userId = req.user.uid;

    // Get company ID for the user
    const companyQuery = await db.collection('companies')
      .where('transporterId', '==', userId)
      .limit(1)
      .get();

    if (companyQuery.empty) {
      // Return empty array instead of 404 - company might not have drivers yet
      return res.status(200).json({ drivers: [] });
    }

    const companyId = companyQuery.docs[0].id;

    // Get all drivers for the company
    const driversQuery = await db.collection('drivers')
      .where('companyId', '==', companyId)
      .orderBy('createdAt', 'desc')
      .get();

    const drivers = [];
    for (const doc of driversQuery.docs) {
      const driverData = { id: doc.id, ...doc.data() };
      
      // Get assigned vehicle info if exists
      if (driverData.assignedVehicleId) {
        const vehicleDoc = await db.collection('vehicles').doc(driverData.assignedVehicleId).get();
        if (vehicleDoc.exists) {
          const vehicleData = vehicleDoc.data();
          driverData.assignedVehicle = {
            id: vehicleDoc.id,
            make: vehicleData.vehicleMake,
            model: vehicleData.vehicleModel,
            registration: vehicleData.vehicleRegistration
          };
        }
      }

      drivers.push(driverData);
    }

    res.json({ drivers });

  } catch (error) {
    console.error('Error fetching drivers:', error);
    res.status(500).json({ message: 'Failed to fetch drivers' });
  }
};

// Get driver by ID
const getDriverById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;

    const driverDoc = await db.collection('drivers').doc(id).get();
    if (!driverDoc.exists) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    const driverData = { id: driverDoc.id, ...driverDoc.data() };

    // Verify the user owns the company that owns this driver
    const companyDoc = await db.collection('companies').doc(driverData.companyId).get();
    if (!companyDoc.exists || companyDoc.data().transporterId !== userId) {
      return res.status(403).json({ message: 'Unauthorized to access this driver' });
    }

    // Get assigned vehicle info if exists
    if (driverData.assignedVehicleId) {
      const vehicleDoc = await db.collection('vehicles').doc(driverData.assignedVehicleId).get();
      if (vehicleDoc.exists) {
        const vehicleData = vehicleDoc.data();
        driverData.assignedVehicle = {
          id: vehicleDoc.id,
          make: vehicleData.vehicleMake,
          model: vehicleData.vehicleModel,
          registration: vehicleData.vehicleRegistration
        };
      }
    }

    res.json({ driver: driverData });

  } catch (error) {
    console.error('Error fetching driver:', error);
    res.status(500).json({ message: 'Failed to fetch driver' });
  }
};

// Update driver
const updateDriver = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;

    const driverDoc = await db.collection('drivers').doc(id).get();
    if (!driverDoc.exists) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    const driverData = driverDoc.data();

    // Verify the user owns the company that owns this driver
    const companyDoc = await db.collection('companies').doc(driverData.companyId).get();
    if (!companyDoc.exists || companyDoc.data().transporterId !== userId) {
      return res.status(403).json({ message: 'Unauthorized to update this driver' });
    }

    // Prepare update data
    const updateData = {
      firstName: req.body.firstName || driverData.firstName,
      lastName: req.body.lastName || driverData.lastName,
      email: req.body.email || driverData.email,
      phone: req.body.phone || driverData.phone,
      driverLicense: req.body.driverLicense || driverData.driverLicense,
      driverLicenseExpiryDate: req.body.driverLicenseExpiryDate || driverData.driverLicenseExpiryDate,
      idNumber: req.body.idNumber || driverData.idNumber,
      idExpiryDate: req.body.idExpiryDate || driverData.idExpiryDate,
      updatedAt: new Date(),
    };

    // Handle file uploads
    if (req.files && req.files.length > 0) {
      try {
        const uploadResults = await uploadDriverDocuments(req.files);
        
        if (uploadResults.profileImage) {
          updateData.profileImage = uploadResults.profileImage[0];
        }
        if (uploadResults.driverLicense) {
          updateData.driverLicenseUrl = uploadResults.driverLicense[0];
        }
        if (uploadResults.idDocument) {
          updateData.idDocumentUrl = uploadResults.idDocument[0];
        }
      } catch (uploadError) {
        console.error('Error uploading driver documents:', uploadError);
        return res.status(500).json({ message: 'Failed to upload driver documents' });
      }
    }

    // Update driver
    await db.collection('drivers').doc(id).update(updateData);

    res.json({
      message: 'Driver updated successfully',
      driver: { id, ...updateData }
    });

  } catch (error) {
    console.error('Error updating driver:', error);
    res.status(500).json({ message: 'Failed to update driver' });
  }
};

// Delete driver
const deleteDriver = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;

    const driverDoc = await db.collection('drivers').doc(id).get();
    if (!driverDoc.exists) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    const driverData = driverDoc.data();

    // Verify the user owns the company that owns this driver
    const companyDoc = await db.collection('companies').doc(driverData.companyId).get();
    if (!companyDoc.exists || companyDoc.data().transporterId !== userId) {
      return res.status(403).json({ message: 'Unauthorized to delete this driver' });
    }

    // Check if driver is assigned to a vehicle
    if (driverData.assignedVehicleId) {
      return res.status(400).json({ 
        message: 'Cannot delete driver that is assigned to a vehicle. Please unassign the driver first.' 
      });
    }

    // Delete driver
    await db.collection('drivers').doc(id).delete();

    res.json({ message: 'Driver deleted successfully' });

  } catch (error) {
    console.error('Error deleting driver:', error);
    res.status(500).json({ message: 'Failed to delete driver' });
  }
};

// Approve driver (admin only - like individual transporters)
const approveDriver = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;

    // Check if user is admin
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists || userDoc.data().role !== 'admin') {
      return res.status(403).json({ message: 'Only administrators can approve drivers' });
    }

    const driverDoc = await db.collection('drivers').doc(id).get();
    if (!driverDoc.exists) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    const driverData = driverDoc.data();

    if (driverData.status !== 'pending') {
      return res.status(400).json({ message: 'Driver is not in pending status' });
    }

    // Update driver status
    await db.collection('drivers').doc(id).update({
      status: 'approved',
      approvedBy: userId,
      approvedAt: new Date(),
      updatedAt: new Date()
    });

    res.json({ message: 'Driver approved successfully' });

  } catch (error) {
    console.error('Error approving driver:', error);
    res.status(500).json({ message: 'Failed to approve driver' });
  }
};

// Reject driver (admin only - like individual transporters)
const rejectDriver = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;

    // Check if user is admin
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists || userDoc.data().role !== 'admin') {
      return res.status(403).json({ message: 'Only administrators can reject drivers' });
    }

    const driverDoc = await db.collection('drivers').doc(id).get();
    if (!driverDoc.exists) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    const driverData = driverDoc.data();

    if (driverData.status !== 'pending') {
      return res.status(400).json({ message: 'Driver is not in pending status' });
    }

    // Update driver status
    await db.collection('drivers').doc(id).update({
      status: 'rejected',
      rejectedBy: userId,
      rejectedAt: new Date(),
      rejectionReason: req.body.reason || 'No reason provided',
      updatedAt: new Date()
    });

    res.json({ message: 'Driver rejected successfully' });

  } catch (error) {
    console.error('Error rejecting driver:', error);
    res.status(500).json({ message: 'Failed to reject driver' });
  }
};

// Activate driver
const activateDriver = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;
    const { emailType = 'driver', companyEmail, sendCredentials = true } = req.body;

    const driverDoc = await db.collection('drivers').doc(id).get();
    if (!driverDoc.exists) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    const driverData = driverDoc.data();

    // Verify the user owns the company that owns this driver
    const companyDoc = await db.collection('companies').doc(driverData.companyId).get();
    if (!companyDoc.exists || companyDoc.data().transporterId !== userId) {
      return res.status(403).json({ message: 'Unauthorized to activate this driver' });
    }

    if (driverData.status !== 'approved') {
      return res.status(400).json({ message: 'Driver must be approved before activation' });
    }

    // Determine recipient email based on emailType
    let recipientEmail = driverData.email;
    if (emailType === 'company' && companyEmail) {
      recipientEmail = companyEmail.trim();
    }

    // Send credentials email if requested
    if (sendCredentials && driverData.userId) {
      try {
        // Retrieve the Firebase Auth user to get email for credentials
        let defaultPassword = 'Contact your company for credentials';
        
        // Check if we need to send temporary password
        // Since Firebase Admin SDK doesn't allow reading passwords, we'll generate a reset
        try {
          const firebaseAuthUser = await admin.auth().getUser(driverData.userId);
          const userEmail = firebaseAuthUser.email || driverData.email;
          
          // Create password reset link for the driver
          const passwordResetLink = await admin.auth().generatePasswordResetLink(userEmail);
          
          // Send activation email with credentials and password reset link
          const { sendDriverWelcomeMail } = require('../utils/sendMailTemplate');
          const { subject, html } = sendDriverWelcomeMail({
            email: driverData.email,
            phone: driverData.phone,
            firstName: driverData.firstName,
            lastName: driverData.lastName,
            companyName: companyDoc.data().companyName,
            defaultPassword: 'You can set your password using the link below',
            loginUrl: process.env.FRONTEND_URL || 'https://agritruk.app',
            passwordResetLink: passwordResetLink
          }, defaultPassword);

          await sendEmail({
            to: recipientEmail,
            subject: subject + ' - Set Your Password',
            html: html + `
              <div style="margin-top: 20px; padding: 15px; background-color: #fff3cd; border-radius: 5px;">
                <p style="margin: 0; color: #856404;"><strong>Set Your Password:</strong></p>
                <a href="${passwordResetLink}" style="display: inline-block; margin-top: 10px; padding: 10px 20px; background-color: #0F2B04; color: white; text-decoration: none; border-radius: 5px;">
                  Click here to set your password
                </a>
              </div>
            `
          });

          console.log('✅ Activation credentials sent to:', recipientEmail);
        } catch (firebaseError) {
          console.error('Error getting Firebase user:', firebaseError);
          // Fallback: send email without password reset link
          const { sendDriverWelcomeMail } = require('../utils/sendMailTemplate');
          const { subject, html } = sendDriverWelcomeMail({
            email: driverData.email,
            phone: driverData.phone,
            firstName: driverData.firstName,
            lastName: driverData.lastName,
            companyName: companyDoc.data().companyName,
            defaultPassword: 'Please contact your company for login credentials',
            loginUrl: process.env.FRONTEND_URL || 'https://agritruk.app'
          }, defaultPassword);

          await sendEmail({
            to: recipientEmail,
            subject,
            html
          });

          console.log('✅ Activation notification sent to:', recipientEmail);
        }
      } catch (emailError) {
        console.error('Error sending activation email:', emailError);
        // Don't fail activation if email fails
      }
    }

    // Update driver status to active
    await db.collection('drivers').doc(id).update({
      status: 'active',
      activatedAt: new Date(),
      updatedAt: new Date()
    });

    // Update user document to mark as verified and active
    if (driverData.userId) {
      await db.collection('users').doc(driverData.userId).update({
        role: 'driver',
        emailVerified: true,
        phoneVerified: true,
        isVerified: true,
        status: 'active',
        updatedAt: new Date()
      });
    }

    res.json({ 
      success: true,
      message: 'Driver activated successfully. Login credentials have been sent to the specified email.',
      data: {
        driver: {
          id,
          status: 'active',
          email: recipientEmail
        }
      }
    });

  } catch (error) {
    console.error('Error activating driver:', error);
    res.status(500).json({ message: 'Failed to activate driver' });
  }
};

// Deactivate driver
const deactivateDriver = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;

    const driverDoc = await db.collection('drivers').doc(id).get();
    if (!driverDoc.exists) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    const driverData = driverDoc.data();

    // Verify the user owns the company that owns this driver
    const companyDoc = await db.collection('companies').doc(driverData.companyId).get();
    if (!companyDoc.exists || companyDoc.data().transporterId !== userId) {
      return res.status(403).json({ message: 'Unauthorized to deactivate this driver' });
    }

    if (driverData.status !== 'active') {
      return res.status(400).json({ message: 'Driver is not active' });
    }

    // Unassign driver from vehicle if assigned
    if (driverData.assignedVehicleId) {
      await db.collection('vehicles').doc(driverData.assignedVehicleId).update({
        assignedDriverId: null,
        updatedAt: new Date()
      });
    }

    // Update driver status
    await db.collection('drivers').doc(id).update({
      status: 'inactive',
      assignedVehicleId: null,
      updatedAt: new Date()
    });

    res.json({ message: 'Driver deactivated successfully' });

  } catch (error) {
    console.error('Error deactivating driver:', error);
    res.status(500).json({ message: 'Failed to deactivate driver' });
  }
};

// Verify if user is a driver
const verifyDriver = async (req, res) => {
  try {
    const { userId, email } = req.body;
    const { uid } = req.user;

    // Check if user exists in drivers collection
    const driverQuery = db.collection('drivers').where('userId', '==', uid);
    const driverSnapshot = await driverQuery.get();

    if (driverSnapshot.empty) {
      return res.status(404).json({
        success: false,
        isDriver: false,
        message: 'Driver not found'
      });
    }

    const driverData = driverSnapshot.docs[0].data();
    
    // Check if driver is active
    if (driverData.status !== 'active') {
      return res.status(403).json({
        success: false,
        isDriver: false,
        message: 'Driver account is not active'
      });
    }

    res.status(200).json({
      success: true,
      isDriver: true,
      driverId: driverSnapshot.docs[0].id,
      message: 'Driver verified successfully'
    });
  } catch (error) {
    console.error('Error verifying driver:', error);
    res.status(500).json({
      success: false,
      isDriver: false,
      message: 'Internal server error'
    });
  }
};

// Get driver profile
const getDriverProfile = async (req, res) => {
  try {
    const { uid } = req.user;
    console.log('🔍 getDriverProfile - Looking for driver with userId:', uid);

    // Use EXACT same query as checkIfDriver which works successfully
    const driverQuery = db.collection('drivers').where('userId', '==', uid).limit(1);
    const driverSnapshot = await driverQuery.get();

    console.log('🔍 Driver query result - empty:', driverSnapshot.empty, 'size:', driverSnapshot.size);

    if (driverSnapshot.empty) {
      console.log('⚠️ Driver not found via userId query - trying alternative lookup');
      
      // Alternative: Try to find by driverId if user document has it
      try {
        const userDoc = await db.collection('users').doc(uid).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          console.log('🔍 User document found, checking for driverId:', userData.driverId);
          
          if (userData.driverId) {
            const driverDocById = await db.collection('drivers').doc(userData.driverId).get();
            if (driverDocById.exists) {
              console.log('✅ Found driver by driverId from user document');
              const driverData = driverDocById.data();
              return await buildDriverProfileResponse(driverDocById.id, driverData, res);
            }
          }
        }
      } catch (altError) {
        console.error('Error in alternative lookup:', altError);
      }
      
      // Final fallback: Try to get any driver with this userId (case-insensitive, different field names)
      console.log('⚠️ Trying final fallback - checking all possible fields');
      try {
        const allDriversQuery = await db.collection('drivers').get();
        let foundDriver = null;
        
        for (const doc of allDriversQuery.docs) {
          const data = doc.data();
          if (data.userId === uid || data.user_id === uid || String(data.userId) === String(uid)) {
            foundDriver = { id: doc.id, ...data };
            console.log('✅ Found driver in fallback search:', doc.id);
            break;
          }
        }
        
        if (foundDriver) {
          return await buildDriverProfileResponse(foundDriver.id, foundDriver, res);
        }
      } catch (fallbackError) {
        console.error('Error in fallback search:', fallbackError);
      }
      
      console.error('❌ Driver not found after all attempts for userId:', uid);
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    const driverDoc = driverSnapshot.docs[0];
    const driverData = driverDoc.data();
    const driverId = driverDoc.id;
    
    console.log('✅ Driver found via userId query:', driverId);

    
    return await buildDriverProfileResponse(driverId, driverData, res);
  } catch (error) {
    console.error('❌ Error fetching driver profile:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Helper function to build driver profile response
const buildDriverProfileResponse = async (driverId, driverData, res) => {
  try {
    // Get assigned vehicle if exists - check multiple locations
    let assignedVehicle = null;
    if (driverData.assignedVehicleId) {
      // First try main vehicles collection
      const vehicleDoc = await db.collection('vehicles').doc(driverData.assignedVehicleId).get();
      if (vehicleDoc.exists) {
        const vehicleData = vehicleDoc.data();
        // Capacity is already stored in tons (frontend provides it in tons)
        assignedVehicle = {
          id: vehicleDoc.id,
          ...vehicleData,
          capacity: vehicleData.capacity || vehicleData.capacityKg || vehicleData.vehicleCapacity || 0,
          registration: vehicleData.registration || vehicleData.vehicleRegistration || vehicleData.reg || null,
        };
      } else if (driverData.companyId) {
        // Try company vehicles subcollection
        try {
          const companyVehicleDoc = await db.collection('companies').doc(driverData.companyId)
            .collection('vehicles').doc(driverData.assignedVehicleId).get();
          if (companyVehicleDoc.exists) {
            const vehicleData = companyVehicleDoc.data();
            // Capacity is already stored in tons (frontend provides it in tons)
            assignedVehicle = {
              id: companyVehicleDoc.id,
              make: vehicleData.vehicleMake || vehicleData.make,
              model: vehicleData.vehicleModel || vehicleData.model,
              registration: vehicleData.vehicleRegistration || vehicleData.reg || vehicleData.registration || null,
              type: vehicleData.vehicleType || vehicleData.type,
              capacity: vehicleData.vehicleCapacity || vehicleData.capacityKg || vehicleData.capacity || 0,
              ...vehicleData,
              // Ensure registration is always included
              registration: vehicleData.vehicleRegistration || vehicleData.reg || vehicleData.registration || null,
            };
          }
        } catch (subcollectionError) {
          console.log('Could not fetch from company vehicles subcollection:', subcollectionError.message);
        }
      }
      
      // Use assignedVehicleDetails if available and no vehicle found
      if (!assignedVehicle && driverData.assignedVehicleDetails) {
        assignedVehicle = driverData.assignedVehicleDetails;
      }
    }

    // Get company information
    let company = null;
    if (driverData.companyId) {
      const companyDoc = await db.collection('companies').doc(driverData.companyId).get();
      if (companyDoc.exists) {
        const companyData = companyDoc.data();
        company = {
          id: companyDoc.id,
          name: companyData.companyName || companyData.name || 'Unknown Company',
          contact: companyData.companyContact || companyData.contact || null
        };
      }
    }

    console.log('✅ Returning driver profile for:', driverId);

    return res.status(200).json({
      success: true,
      driver: {
        id: driverId,
        ...driverData,
        assignedVehicle,
        company
      }
    });
  } catch (error) {
    console.error('Error building driver profile response:', error);
    throw error;
  }
};

// Check if a user is a driver (public endpoint for routing purposes)
const checkIfDriver = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Find driver by userId in drivers collection
    const driverQuery = db.collection('drivers').where('userId', '==', userId).limit(1);
    const driverSnapshot = await driverQuery.get();

    if (driverSnapshot.empty) {
      return res.status(200).json({
        success: false,
        isDriver: false,
        message: 'User is not a driver'
      });
    }

    const driverDoc = driverSnapshot.docs[0];
    const driverData = driverDoc.data();

    res.status(200).json({
      success: true,
      isDriver: true,
      driverType: 'company',
      driver: {
        id: driverDoc.id,
        ...driverData
      }
    });
  } catch (error) {
    console.error('Error checking if user is driver:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Update driver profile (for drivers to update their own profile)
const updateDriverProfile = async (req, res) => {
  try {
    const { uid } = req.user;
    const { firstName, lastName, phone, email, profileImage } = req.body;

    console.log('📝 Updating driver profile for userId:', uid);
    console.log('📝 Update data:', { firstName, lastName, phone, email, profileImage: !!profileImage });

    // Find driver by userId
    const driverQuery = db.collection('drivers').where('userId', '==', uid).limit(1);
    const driverSnapshot = await driverQuery.get();

    if (driverSnapshot.empty) {
      console.error('❌ Driver not found for userId:', uid);
      return res.status(404).json({
        success: false,
        message: 'Driver profile not found'
      });
    }

    const driverDoc = driverSnapshot.docs[0];
    const driverId = driverDoc.id;
    const driverData = driverDoc.data();

    console.log('✅ Found driver:', driverId);

    // Prepare update data (only include provided fields)
    const updateData = {
      updatedAt: admin.firestore.Timestamp.now()
    };

    if (firstName !== undefined) {
      updateData.firstName = firstName;
    }
    if (lastName !== undefined) {
      updateData.lastName = lastName;
    }
    if (phone !== undefined) {
      updateData.phone = phone;
    }
    if (email !== undefined) {
      updateData.email = email;
    }
    if (profileImage !== undefined && profileImage) {
      updateData.profileImage = profileImage;
    }

    // Update driver document
    await db.collection('drivers').doc(driverId).update(updateData);

    // Also update users collection if name/phone/email changed
    const userUpdateData = {};
    if (firstName !== undefined || lastName !== undefined) {
      userUpdateData.name = `${firstName || driverData.firstName} ${lastName || driverData.lastName}`.trim();
    }
    if (phone !== undefined) {
      userUpdateData.phone = phone;
      userUpdateData.phone_clean = phone.replace(/\D/g, '');
    }
    if (email !== undefined) {
      userUpdateData.email = email;
      userUpdateData.email_lower = email.toLowerCase();
    }
    if (profileImage !== undefined && profileImage) {
      userUpdateData.profilePhotoUrl = profileImage;
    }

    if (Object.keys(userUpdateData).length > 0) {
      userUpdateData.updatedAt = admin.firestore.Timestamp.now();
      await db.collection('users').doc(uid).update(userUpdateData);
      console.log('✅ Users collection also updated');
    }

    // Get updated driver data
    const updatedDriverDoc = await db.collection('drivers').doc(driverId).get();
    const updatedDriverData = { id: driverId, ...updatedDriverDoc.data() };

    console.log('✅ Driver profile updated successfully');

    res.status(200).json({
      success: true,
      message: 'Driver profile updated successfully',
      driver: updatedDriverData
    });
  } catch (error) {
    console.error('❌ Error updating driver profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update driver profile',
      error: error.message
    });
  }
};

// Toggle driver availability (for drivers to update their own status)
const toggleDriverAvailability = async (req, res) => {
  try {
    const { availability } = req.body;
    const driverId = req.user.uid;

    if (typeof availability !== 'boolean') {
      return res.status(400).json({ message: 'Availability must be true or false' });
    }

    // Try to find driver in main drivers collection first (preferred)
    const mainDriverQuery = db.collection('drivers').where('userId', '==', driverId).limit(1);
    const mainDriverSnapshot = await mainDriverQuery.get();

    if (!mainDriverSnapshot.empty) {
      // Driver found in main drivers collection
      const driverRef = mainDriverSnapshot.docs[0].ref;
      await driverRef.update({
        availability: availability,
        updatedAt: admin.firestore.Timestamp.now()
      });

      return res.status(200).json({
        message: `Availability ${availability ? 'enabled' : 'disabled'} successfully`,
        availability: availability
      });
    }

    // Fallback: Find the driver in the companies subcollection
    const companiesSnapshot = await db.collection('companies').get();
    let driverFound = false;
    let companyId = null;

    for (const companyDoc of companiesSnapshot.docs) {
      const driverDoc = await db.collection('companies')
        .doc(companyDoc.id)
        .collection('drivers')
        .where('userId', '==', driverId)
        .limit(1)
        .get();

      if (!driverDoc.empty) {
        companyId = companyDoc.id;
        driverFound = true;
        break;
      }
    }

    if (!driverFound) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    // Update driver availability in company subcollection
    const driverDoc = await db.collection('companies')
      .doc(companyId)
      .collection('drivers')
      .where('userId', '==', driverId)
      .limit(1)
      .get();

    if (driverDoc.empty) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    const driverRef = driverDoc.docs[0].ref;
    await driverRef.update({
      availability: availability,
      updatedAt: admin.firestore.Timestamp.now()
    });

    res.status(200).json({
      message: `Availability ${availability ? 'enabled' : 'disabled'} successfully`,
      availability: availability
    });
  } catch (error) {
    console.error('Toggle driver availability error:', error);
    res.status(500).json({ message: 'Failed to update availability' });
  }
};

const acceptBooking = async (req, res) => {
  try {
    const { bookingId, companyId } = req.params;
    const userId = req.user.uid;

    console.log('🚗 Accepting booking:', bookingId);
    console.log('🚗 Company ID:', companyId);
    console.log('🚗 User ID:', userId);

    // Get company details
    const company = await Company.get(companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Check if company is approved
    if (company.status === 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Company is not approved yet'
      });
    }

    // Check if overlimit and no registration
    // 🚫 Block if over limit and no registration
    console.log('🚗 Trips count:', company.completedTripsCount);
    if (!company.registrationProvided && company.completedTripsCount >= 5) {
      return res.status(403).json({
        success: false,
        message: 'Company registration required to continue creating trips',
        code: 'REGISTRATION_REQUIRED',
      });
    }

    const driverData = await Driver.getDriverIdByUserId(userId);
    if (!driverData) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    const driverId = driverData.driverId;

    const vehicleId = driverData.assignedVehicleId;
    console.log('🚗 Vehicle ID:', vehicleId);

    if (driverData.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to accept this booking'
      });
    }

    // Get booking details
    const booking = await Booking.get(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if booking is already accepted
    if (booking.status === 'accepted') {
      return res.status(409).json({
        success: false,
        message: 'Booking already accepted'
      });
    }

    // Check if booking is still available
    if (booking.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Booking is no longer available'
      });
    }

    // Get driver details
    let driver = null;
    try {
      driver = await Driver.get(driverId);
      console.log('✅ Driver found:', {
        id: driverId,
        name: `${driver.firstName} ${driver.lastName}`,
        phone: driver.phone,
        status: driver.status
      });
    } catch (error) {
      console.log('❌ Driver not found, continuing without driver details:', error.message);
    }

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    // Get vehicle details - handle both individual drivers and company drivers
    let vehicle = null;
    if (vehicleId) {
      try {
        // Check if this is a company driver by looking for the driver in companies collection
        let isCompanyDriver = false;
        let companyIdFromDriver = companyId || driver.companyId; // Use provided companyId or driver's companyId
        console.log('🚗 Company ID from driver:', companyIdFromDriver);
        
        if (companyIdFromDriver) {
          const driverSnapshot  = await Driver.get(driverId);
          
          if (driverSnapshot) {
            isCompanyDriver = true;
            console.log('✅ Company driver detected, getting vehicle from company collection');
            
            const vehicleSnapshot = await db.collection('vehicles').doc(vehicleId).get();
            if (vehicleSnapshot.exists) {
              vehicle = vehicleSnapshot.data();
              console.log('✅ Vehicle found:', vehicle);
              console.log('✅ Company vehicle found:', {
                make: vehicle.make,
                model: vehicle.type,
                registration: vehicle.vehicleRegistration
              });
            }
          }
        }

        if (!isCompanyDriver && driver.assignedVehicleId) {
          // Individual driver - vehicle data might be in assignedVehicleDetails
          console.log('✅ Individual driver detected, using assigned vehicle details');
          vehicle = driver.assignedVehicleDetails || {};
        }
      } catch (error) {
        console.log('Error determining driver type or fetching vehicle details:', error.message);
      }
    }

    // Update booking status with driver and vehicle details
    const updates = {
      status: 'accepted',
      driverId: driverId,
      vehicleId: vehicleId || null,
      companyId: companyId || null, // Include companyId
      driverName: `${driver.firstName} ${driver.lastName}` || null,
      driverPhone: driver.phone || null,
      driverPhoto: driver.profileImage || null,
      driverStatus: driver.status || null,
      vehicleMake: vehicle?.vehicleMake || vehicle?.make || (driver.assignedVehicleDetails?.make || null),
      vehicleModel: vehicle?.vehicleModel || vehicle?.model || (driver.assignedVehicleDetails?.model || null),
      vehicleYear: vehicle?.vehicleYear || vehicle?.year || (driver.assignedVehicleDetails?.year || null),
      vehicleType: vehicle?.vehicleType || vehicle?.type || (driver.assignedVehicleDetails?.type || null),
      vehicleRegistration: vehicle?.vehicleRegistration || vehicle?.reg || (driver.assignedVehicleDetails?.registration || null),
      vehicleColor: vehicle?.vehicleColor || vehicle?.color || (driver.assignedVehicleDetails?.color || null),
      // Capacity is already stored in tons (frontend provides it in tons)
      vehicleCapacity: vehicle?.vehicleCapacity || vehicle?.capacity || (driver.assignedVehicleDetails?.capacityKg || driver.assignedVehicleDetails?.capacity || 0),
      acceptedAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    };

    console.log('💾 Saving booking updates:', {
      bookingId,
      driverName: updates.driverName,
      driverPhone: updates.driverPhone,
      vehicleMake: updates.vehicleMake,
      vehicleRegistration: updates.vehicleRegistration
    });

    await Booking.update(bookingId, updates);

    // Use existing user-facing booking ID if available
    const displayBookingId = (
      booking.displayId ||
      booking.userFriendlyId ||
      booking.unifiedBookingId ||
      booking.readableId ||
      booking.referenceCode ||
      booking.referenceId ||
      booking.bookingId ||
      booking.id ||
      bookingId
    );

    // Create single notification for client
    await Notification.create({
      userId: booking.userId,
      type: 'booking_accepted',
      title: 'Booking Accepted! 🎉',
      message: `Your booking #${displayBookingId} from ${booking.fromLocation} to ${booking.toLocation} has been accepted by ${driver.firstName} ${driver.lastName || ''}`,
      data: {
        bookingId: bookingId,
        displayBookingId: displayBookingId,
        driverId: driverId,
        driverName: `${driver.firstName} ${driver.lastName || ''}`,
        driverPhone: driver.phone,
        fromLocation: booking.fromLocation,
        toLocation: booking.toLocation,
        productType: booking.productType,
        estimatedCost: booking.cost,
        chatRoomId: `booking_${bookingId}_${driverId}_${booking.userId}`
      },
      priority: 'high',
      actionRequired: false
    });

    // Log activity
    await logActivity(userId, 'accept_booking', req);

    await Action.create({
      type: 'accept_booking',
      entityId: driverId,
      priority: 'low',
      metadata: {
        bookingId: bookingId,
        userId: userId
      },
      message: `Booking #${displayBookingId} from ${booking.fromLocation} to ${booking.toLocation} has been accepted by ${driver.firstName} ${driver.lastName || ''}`
    })

    return res.status(200).json({
      success: true,
      message: 'Booking accepted successfully',
      booking: { ...booking, ...updates }
    });

  } catch (error) {
    console.error('Accept booking error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to accept booking'
    });
  }
};

const updateLocation = async (req, res) => {
  try {
    const userId = req.user.uid;
    const companyId = req.params.companyId;
    const { latitude, longitude } = req.body;

    // Validate input
    if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or missing latitude/longitude',
      });
    }
    
    const companyData = await Company.get(companyId);
    if (!companyData && !companyData.status === 'approved') {
      return res.status(404).json({
        success: false,
        message: 'Company not found nor approved',
      });
    }

    //validate relationships of company and driver
    const driver = await Driver.getDriverIdByUserId(userId);
    if (driver.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        message: 'Invalid company for driver',
      });
    }

    // Create new location entry
    const newLocation = {
      location: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
      },
      timestamp: admin.firestore.Timestamp.now(),
    };

    // Update currentRoute with time-based pruning (keep last 48 hours)
    const currentRoute = driver.currentRoute || [];
    const maxAgeHours = 48;
    const cutoffTime = admin.firestore.Timestamp.fromMillis(
      Date.now() - maxAgeHours * 60 * 60 * 1000
    );
    const filteredRoute = currentRoute.filter(
      (entry) => entry.timestamp.toMillis() >= cutoffTime.toMillis()
    );
    filteredRoute.push(newLocation);

    // Prepare updates
    const updates = {
      currentRoute: filteredRoute,
      lastKnownLocation: newLocation.location
    };

    const driverId = driver.driverId;
    // Update transporter document
    await Driver.update(driverId, updates);

    await Action.create({
      type: 'update_location',
      entityId: driverId,
      priority: 'low',
      metadata: {
        driverId: driverId,
        userId: userId
      },
      message: `Driver ${driver.firstName} ${driver.lastName || ''} updated location`
    });

    return res.status(200).json({
      success: true,
      message: 'Location updated successfully',
      location: newLocation,
    });

  } catch (error) {
    console.error('Error updating location:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

module.exports = {
  createDriver,
  getDrivers,
  getDriverById,
  updateDriver,
  deleteDriver,
  approveDriver,
  rejectDriver,
  activateDriver,
  deactivateDriver,
  verifyDriver,
  getDriverProfile,
  checkIfDriver,
  updateDriverProfile,
  toggleDriverAvailability,
  acceptBooking,
  updateLocation
};
