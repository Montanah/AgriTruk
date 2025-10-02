const admin = require('../config/firebase');
const db = admin.firestore();
const { adminNotification } = require('../utils/sendMailTemplate');
const cloudinary = require('cloudinary').v2;

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

// Create a new driver for a company
const createDriver = async (req, res) => {
  try {
    const userId = req.user.uid;
    const companyId = req.body.companyId;

    // Verify the user owns the company
    const companyDoc = await db.collection('companies').doc(companyId).get();
    if (!companyDoc.exists) {
      return res.status(404).json({ message: 'Company not found' });
    }

    const companyData = companyDoc.data();
    if (companyData.transporterId !== userId) {
      return res.status(403).json({ message: 'Unauthorized to add drivers to this company' });
    }

    // Check if driver with same email or phone already exists
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

    // Generate default password (driver can change this later)
    const defaultPassword = Math.random().toString(36).slice(-8) + '123'; // 8 random chars + 123

    // Create Firebase Auth user for the driver using Admin SDK
    let firebaseUser;
    try {
      firebaseUser = await admin.auth().createUser({
        email: req.body.email,
        password: defaultPassword,
        displayName: `${req.body.firstName} ${req.body.lastName}`,
        emailVerified: false,
      });
    } catch (authError) {
      console.error('Error creating Firebase user:', authError);
      if (authError.code === 'auth/email-already-exists') {
        return res.status(400).json({ message: 'A user with this email already exists. Please use a different email address.' });
      }
      return res.status(400).json({ message: 'Failed to create driver account: ' + authError.message });
    }

    // Prepare driver data (filter out undefined values)
    const driverData = {
      companyId,
      userId: firebaseUser.uid,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      phone: req.body.phone,
      driverLicense: req.body.driverLicenseNumber || req.body.driverLicense || 'DL-' + Date.now(),
      idNumber: req.body.idNumber || 'ID-' + Date.now(),
      status: 'pending',
      assignedVehicleId: null,
      isDefaultPassword: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Only add optional fields if they have values
    if (req.body.driverLicenseExpiryDate) {
      driverData.driverLicenseExpiryDate = req.body.driverLicenseExpiryDate;
    }
    if (req.body.idExpiryDate) {
      driverData.idExpiryDate = req.body.idExpiryDate;
    }

    // Handle file uploads
    if (req.files && req.files.length > 0) {
      try {
        const uploadResults = await uploadDriverDocuments(req.files);
        
        if (uploadResults.profileImage) {
          driverData.profileImage = uploadResults.profileImage[0];
        }
        if (uploadResults.driverLicense) {
          driverData.driverLicenseUrl = uploadResults.driverLicense[0];
        }
        if (uploadResults.idDocument) {
          driverData.idDocumentUrl = uploadResults.idDocument[0];
        }
      } catch (uploadError) {
        console.error('Error uploading driver documents:', uploadError);
        return res.status(500).json({ message: 'Failed to upload driver documents' });
      }
    }

    // Create driver document
    const driverRef = db.collection('drivers').doc();
    await driverRef.set(driverData);

    // Create action for admin review
    await db.collection('actions').add({
      type: 'driver_review',
      entityId: driverRef.id,
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
    await adminNotification({
      subject: 'New Driver Recruited for Review',
      message: `Company ${companyData.companyName} has recruited a new driver (${driverData.firstName} ${driverData.lastName}) for review.`,
    });

    // Send welcome email with login credentials
    try {
      const { sendDriverWelcomeEmail } = require('../utils/sendMailTemplate');
      await sendDriverWelcomeEmail({
        email: driverData.email,
        firstName: driverData.firstName,
        lastName: driverData.lastName,
        companyName: companyData.companyName,
        defaultPassword,
        loginUrl: process.env.FRONTEND_URL || 'https://your-app.com'
      });
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError);
      // Don't fail the driver creation if email fails
    }

    res.status(201).json({
      message: 'Driver created successfully',
      driver: { 
        id: driverRef.id, 
        ...driverData,
        defaultPassword // Include for company admin reference
      }
    });

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

// Approve driver (company owner can approve their own drivers)
const approveDriver = async (req, res) => {
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
      return res.status(403).json({ message: 'Unauthorized to approve this driver' });
    }

    if (driverData.status !== 'pending') {
      return res.status(400).json({ message: 'Driver is not in pending status' });
    }

    // Update driver status
    await db.collection('drivers').doc(id).update({
      status: 'approved',
      updatedAt: new Date()
    });

    res.json({ message: 'Driver approved successfully' });

  } catch (error) {
    console.error('Error approving driver:', error);
    res.status(500).json({ message: 'Failed to approve driver' });
  }
};

// Reject driver
const rejectDriver = async (req, res) => {
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
      return res.status(403).json({ message: 'Unauthorized to reject this driver' });
    }

    if (driverData.status !== 'pending') {
      return res.status(400).json({ message: 'Driver is not in pending status' });
    }

    // Update driver status
    await db.collection('drivers').doc(id).update({
      status: 'rejected',
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

    // Update driver status
    await db.collection('drivers').doc(id).update({
      status: 'active',
      updatedAt: new Date()
    });

    res.json({ message: 'Driver activated successfully' });

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

    // Find driver by userId
    const driverQuery = db.collection('drivers').where('userId', '==', uid);
    const driverSnapshot = await driverQuery.get();

    if (driverSnapshot.empty) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    const driverDoc = driverSnapshot.docs[0];
    const driverData = driverDoc.data();
    const driverId = driverDoc.id;

    // Get assigned vehicle if exists
    let assignedVehicle = null;
    if (driverData.assignedVehicleId) {
      const vehicleDoc = await db.collection('vehicles').doc(driverData.assignedVehicleId).get();
      if (vehicleDoc.exists) {
        assignedVehicle = {
          id: vehicleDoc.id,
          ...vehicleDoc.data()
        };
      }
    }

    // Get company information
    let company = null;
    if (driverData.companyId) {
      const companyDoc = await db.collection('companies').doc(driverData.companyId).get();
      if (companyDoc.exists) {
        company = {
          id: companyDoc.id,
          name: companyDoc.data().companyName,
          contact: companyDoc.data().companyContact
        };
      }
    }

    res.status(200).json({
      success: true,
      driver: {
        id: driverId,
        ...driverData,
        assignedVehicle,
        company
      }
    });
  } catch (error) {
    console.error('Error fetching driver profile:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
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
  getDriverProfile
};
