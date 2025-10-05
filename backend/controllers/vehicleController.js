const admin = require('../config/firebase');
const db = admin.firestore();
const { uploadVehicleDocuments } = require('./transporterController');
const { adminNotification } = require('../utils/sendMailTemplate');

// Create a new vehicle for a company
const createVehicle = async (req, res) => {
  try {
    console.log('🚗 VEHICLE CONTROLLER HIT!');
    console.log('🚗 User ID:', req.user?.uid);
    console.log('🚗 Company ID from body:', req.body.companyId);
    console.log('🚗 Company ID from params:', req.params.companyId);
    console.log('🚗 Files received:', req.files?.length || 0);
    console.log('🚗 Body data:', req.body);
    
    const userId = req.user.uid;
    const companyId = req.body.companyId;

    // Verify the user owns the company
    const companyDoc = await db.collection('companies').doc(companyId).get();
    if (!companyDoc.exists) {
      return res.status(404).json({ message: 'Company not found' });
    }

    const companyData = companyDoc.data();
    if (companyData.transporterId !== userId) {
      return res.status(403).json({ message: 'Unauthorized to add vehicles to this company' });
    }

    // Prepare vehicle data - map to Vehicle model field names with defaults
    // Match individual transporter field structure
    const vehicleData = {
      companyId,
      type: req.body.vehicleType || 'truck',
      make: req.body.vehicleMake || 'Unknown',
      year: parseInt(req.body.vehicleYear) || 2020,
      color: req.body.vehicleColor || 'Unknown',
      vehicleRegistration: req.body.vehicleRegistration, // Use same field name as individual transporters
      capacity: parseFloat(req.body.vehicleCapacity) || 5,
      bodyType: req.body.bodyType || 'closed',
      driveType: req.body.driveType || '2WD',
      refrigerated: req.body.refrigerated === 'true' || req.body.refrigerated === true, // Use 'refrigerated' like individual transporters
      humidityControl: req.body.humidityControl === 'true' || req.body.humidityControl === true,
      specialCargo: req.body.specialCargo === 'true' || req.body.specialCargo === true,
      features: req.body.features || '',
      status: 'pending',
      assignedDriverId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Handle file uploads - check for both multipart files and URL fields
    if (req.files && req.files.length > 0) {
      // Handle multipart form data (original approach)
      try {
        const uploadResults = await uploadVehicleDocuments(req.files, 'vehicles');
        
        if (uploadResults.vehicleImages && uploadResults.vehicleImages.length > 0) {
          vehicleData.vehicleImagesUrl = uploadResults.vehicleImages;
        }
        if (uploadResults.insurance && uploadResults.insurance.length > 0) {
          vehicleData.insuranceUrl = uploadResults.insurance[0];
        }
      } catch (uploadError) {
        console.error('Error uploading vehicle documents:', uploadError);
        return res.status(500).json({ message: 'Failed to upload vehicle documents' });
      }
    } else if (req.body.insuranceUrl || req.body.vehicleImageUrls) {
      // Handle pre-uploaded file URLs (new approach)
      console.log('🚗 Handling pre-uploaded file URLs');
      if (req.body.insuranceUrl) {
        vehicleData.insuranceUrl = req.body.insuranceUrl;
        console.log('🚗 Added insurance URL:', req.body.insuranceUrl);
      }
      if (req.body.vehicleImageUrls) {
        try {
          // Handle both string (from FormData) and array (from JSON) formats
          const imageUrls = typeof req.body.vehicleImageUrls === 'string' 
            ? JSON.parse(req.body.vehicleImageUrls) 
            : req.body.vehicleImageUrls;
          vehicleData.vehicleImagesUrl = imageUrls;
          console.log('🚗 Added vehicle image URLs:', vehicleData.vehicleImagesUrl);
        } catch (parseError) {
          console.error('Error parsing vehicle image URLs:', parseError);
        }
      }
    }

    // Create vehicle document
    const vehicleRef = db.collection('vehicles').doc();
    await vehicleRef.set(vehicleData);

    // Create action for admin review
    await db.collection('actions').add({
      type: 'vehicle_review',
      entityId: vehicleRef.id,
      priority: 'medium',
      metadata: {
        companyName: companyData.companyName,
        vehicleRegistration: vehicleData.vehicleRegistration,
        vehicleType: vehicleData.type
      },
      message: `New vehicle added by ${companyData.companyName}. Vehicle ID: ${vehicleRef.id}`,
      createdAt: new Date(),
    });

    // Send notification to admin
    await adminNotification({
      subject: 'New Vehicle Added for Review',
      message: `Company ${companyData.companyName} has added a new vehicle (${vehicleData.vehicleRegistration}) for review.`,
    });

    res.status(201).json({
      message: 'Vehicle created successfully',
      vehicle: { id: vehicleRef.id, ...vehicleData }
    });

  } catch (error) {
    console.error('Error creating vehicle:', error);
    res.status(500).json({ message: 'Failed to create vehicle' });
  }
};

// Get all vehicles for a company
const getVehicles = async (req, res) => {
  try {
    const userId = req.user.uid;

    // Get company ID for the user
    const companyQuery = await db.collection('companies')
      .where('transporterId', '==', userId)
      .limit(1)
      .get();

    if (companyQuery.empty) {
      // Return empty array instead of 404 - company might not have vehicles yet
      return res.status(200).json({ vehicles: [] });
    }

    const companyId = companyQuery.docs[0].id;

    // Get all vehicles for the company
    const vehiclesQuery = await db.collection('vehicles')
      .where('companyId', '==', companyId)
      .orderBy('createdAt', 'desc')
      .get();

    const vehicles = [];
    for (const doc of vehiclesQuery.docs) {
      const vehicleData = { id: doc.id, ...doc.data() };
      
      // Get assigned driver info if exists
      if (vehicleData.assignedDriverId) {
        const driverDoc = await db.collection('drivers').doc(vehicleData.assignedDriverId).get();
        if (driverDoc.exists) {
          const driverData = driverDoc.data();
          vehicleData.assignedDriver = {
            id: driverDoc.id,
            name: `${driverData.firstName} ${driverData.lastName}`,
            phone: driverData.phone
          };
        }
      }

      vehicles.push(vehicleData);
    }

    res.json({ vehicles });

  } catch (error) {
    console.error('Error fetching vehicles:', error);
    res.status(500).json({ message: 'Failed to fetch vehicles' });
  }
};

// Get vehicle by ID
const getVehicleById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;

    const vehicleDoc = await db.collection('vehicles').doc(id).get();
    if (!vehicleDoc.exists) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    const vehicleData = { id: vehicleDoc.id, ...vehicleDoc.data() };

    // Verify the user owns the company that owns this vehicle
    const companyDoc = await db.collection('companies').doc(vehicleData.companyId).get();
    if (!companyDoc.exists || companyDoc.data().transporterId !== userId) {
      return res.status(403).json({ message: 'Unauthorized to access this vehicle' });
    }

    // Get assigned driver info if exists
    if (vehicleData.assignedDriverId) {
      const driverDoc = await db.collection('drivers').doc(vehicleData.assignedDriverId).get();
      if (driverDoc.exists) {
        const driverData = driverDoc.data();
        vehicleData.assignedDriver = {
          id: driverDoc.id,
          name: `${driverData.firstName} ${driverData.lastName}`,
          phone: driverData.phone
        };
      }
    }

    res.json({ vehicle: vehicleData });

  } catch (error) {
    console.error('Error fetching vehicle:', error);
    res.status(500).json({ message: 'Failed to fetch vehicle' });
  }
};

// Update vehicle
const updateVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;

    const vehicleDoc = await db.collection('vehicles').doc(id).get();
    if (!vehicleDoc.exists) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    const vehicleData = vehicleDoc.data();

    // Verify the user owns the company that owns this vehicle
    const companyDoc = await db.collection('companies').doc(vehicleData.companyId).get();
    if (!companyDoc.exists || companyDoc.data().transporterId !== userId) {
      return res.status(403).json({ message: 'Unauthorized to update this vehicle' });
    }

    // Prepare update data
    const updateData = {
      vehicleType: req.body.vehicleType || vehicleData.vehicleType,
      vehicleMake: req.body.vehicleMake || vehicleData.vehicleMake,
      vehicleModel: req.body.vehicleModel || vehicleData.vehicleModel,
      vehicleYear: req.body.vehicleYear ? parseInt(req.body.vehicleYear) : vehicleData.vehicleYear,
      vehicleColor: req.body.vehicleColor || vehicleData.vehicleColor,
      vehicleRegistration: req.body.vehicleRegistration || vehicleData.vehicleRegistration,
      vehicleCapacity: req.body.vehicleCapacity ? parseFloat(req.body.vehicleCapacity) : vehicleData.vehicleCapacity,
      bodyType: req.body.bodyType || vehicleData.bodyType,
      driveType: req.body.driveType || vehicleData.driveType,
      updatedAt: new Date(),
    };

    // Handle file uploads
    if (req.files && req.files.length > 0) {
      try {
        const uploadResults = await uploadVehicleDocuments(req.files, 'vehicles');
        
        if (uploadResults.vehicleImages && uploadResults.vehicleImages.length > 0) {
          updateData.vehicleImagesUrl = uploadResults.vehicleImages;
        }
        if (uploadResults.insurance && uploadResults.insurance.length > 0) {
          updateData.insuranceUrl = uploadResults.insurance[0];
        }
      } catch (uploadError) {
        console.error('Error uploading vehicle documents:', uploadError);
        return res.status(500).json({ message: 'Failed to upload vehicle documents' });
      }
    }

    // Update vehicle
    await db.collection('vehicles').doc(id).update(updateData);

    res.json({
      message: 'Vehicle updated successfully',
      vehicle: { id, ...updateData }
    });

  } catch (error) {
    console.error('Error updating vehicle:', error);
    res.status(500).json({ message: 'Failed to update vehicle' });
  }
};

// Delete vehicle
const deleteVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;

    const vehicleDoc = await db.collection('vehicles').doc(id).get();
    if (!vehicleDoc.exists) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    const vehicleData = vehicleDoc.data();

    // Verify the user owns the company that owns this vehicle
    const companyDoc = await db.collection('companies').doc(vehicleData.companyId).get();
    if (!companyDoc.exists || companyDoc.data().transporterId !== userId) {
      return res.status(403).json({ message: 'Unauthorized to delete this vehicle' });
    }

    // Check if vehicle is assigned to a driver
    if (vehicleData.assignedDriverId) {
      return res.status(400).json({ 
        message: 'Cannot delete vehicle that is assigned to a driver. Please unassign the driver first.' 
      });
    }

    // Delete vehicle
    await db.collection('vehicles').doc(id).delete();

    res.json({ message: 'Vehicle deleted successfully' });

  } catch (error) {
    console.error('Error deleting vehicle:', error);
    res.status(500).json({ message: 'Failed to delete vehicle' });
  }
};

// Assign driver to vehicle
const assignDriverToVehicle = async (req, res) => {
  try {
    const { id: vehicleId } = req.params;
    const { driverId } = req.body;
    const userId = req.user.uid;

    // Verify vehicle exists and user owns it
    const vehicleDoc = await db.collection('vehicles').doc(vehicleId).get();
    if (!vehicleDoc.exists) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    const vehicleData = vehicleDoc.data();
    const companyDoc = await db.collection('companies').doc(vehicleData.companyId).get();
    if (!companyDoc.exists || companyDoc.data().transporterId !== userId) {
      return res.status(403).json({ message: 'Unauthorized to assign drivers to this vehicle' });
    }

    // Verify driver exists and belongs to the same company
    const driverDoc = await db.collection('drivers').doc(driverId).get();
    if (!driverDoc.exists) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    const driverData = driverDoc.data();
    if (driverData.companyId !== vehicleData.companyId) {
      return res.status(400).json({ message: 'Driver does not belong to the same company' });
    }

    if (driverData.status !== 'active') {
      return res.status(400).json({ message: 'Driver must be active to be assigned to a vehicle' });
    }

    // Check if driver is already assigned to another vehicle
    const existingAssignmentQuery = await db.collection('vehicles')
      .where('companyId', '==', vehicleData.companyId)
      .where('assignedDriverId', '==', driverId)
      .get();

    if (!existingAssignmentQuery.empty) {
      return res.status(400).json({ message: 'Driver is already assigned to another vehicle' });
    }

    // Unassign current driver from this vehicle if any
    if (vehicleData.assignedDriverId) {
      await db.collection('vehicles').doc(vehicleId).update({
        assignedDriverId: null,
        updatedAt: new Date()
      });
    }

    // Assign new driver
    await db.collection('vehicles').doc(vehicleId).update({
      assignedDriverId: driverId,
      updatedAt: new Date()
    });

    res.json({ message: 'Driver assigned to vehicle successfully' });

  } catch (error) {
    console.error('Error assigning driver to vehicle:', error);
    res.status(500).json({ message: 'Failed to assign driver to vehicle' });
  }
};

// Unassign driver from vehicle
const unassignDriverFromVehicle = async (req, res) => {
  try {
    const { id: vehicleId } = req.params;
    const userId = req.user.uid;

    // Verify vehicle exists and user owns it
    const vehicleDoc = await db.collection('vehicles').doc(vehicleId).get();
    if (!vehicleDoc.exists) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    const vehicleData = vehicleDoc.data();
    const companyDoc = await db.collection('companies').doc(vehicleData.companyId).get();
    if (!companyDoc.exists || companyDoc.data().transporterId !== userId) {
      return res.status(403).json({ message: 'Unauthorized to unassign drivers from this vehicle' });
    }

    if (!vehicleData.assignedDriverId) {
      return res.status(400).json({ message: 'No driver assigned to this vehicle' });
    }

    // Unassign driver
    await db.collection('vehicles').doc(vehicleId).update({
      assignedDriverId: null,
      updatedAt: new Date()
    });

    res.json({ message: 'Driver unassigned from vehicle successfully' });

  } catch (error) {
    console.error('Error unassigning driver from vehicle:', error);
    res.status(500).json({ message: 'Failed to unassign driver from vehicle' });
  }
};

module.exports = {
  createVehicle,
  getVehicles,
  getVehicleById,
  updateVehicle,
  deleteVehicle,
  assignDriverToVehicle,
  unassignDriverFromVehicle
};
