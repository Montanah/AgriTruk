const fs = require('fs'); 
const { uploadImage } = require('../utils/upload');
const Transporter = require("../models/Transporter");
const User = require("../models/User");
const { logActivity, logAdminActivity } = require("../utils/activityLogger");
const Notification = require("../models/Notification");
const MatchingService = require('../services/matchingService');
const { formatTimestamps } = require('../utils/formatData');
const admin = require("../config/firebase");
const Action = require('../models/Action');

exports.createTransporter = async (req, res) => {
  try {
    const { 
      vehicleType,
      vehicleRegistration,
      vehicleColor,
      vehicleMake,
      vehicleModel,
      vehicleYear,
      vehicleCapacity,
      driveType,
      bodyType,
      vehicleFeatures,
      humidityControl,
      refrigerated,
      transporterType = 'individual' 
    } = req.body;
    console.log("humidy and refrigerated", humidityControl, refrigerated);
    if (!vehicleType || !vehicleRegistration || !vehicleColor || !vehicleMake || !vehicleModel || !vehicleCapacity || !transporterType) {
      return res.status(400).json({ message: 'Required fields are missing' });
    }

    if (transporterType !== 'individual' && transporterType !== 'company') {
      return res.status(400).json({ message: 'Invalid transporter type' });
    }

    if (!req.files) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const plate = vehicleRegistration.trim().toUpperCase();

    const regex = /^K?[A-Z]{2} ?\d{3}[A-Z]$/;

    if (!(plate.length === 7 || plate.length === 8) || !regex.test(plate)) {
      return res.status(400).json({ message: 'Invalid vehicle registration number' });
    }

    const uid = req.user?.uid;

    const userData = await User.get(uid);
    const email = userData?.email;
    const driverName = userData?.name;
    const phoneNumber = userData?.phone;
    
    console.log('receive files', req.files);
    console.log('User data:', driverName);
    
    // Handle multiple file uploads dynamically
    let licenseUrl = null;
    let insuranceUrl = null;
    let logbookUrl = null;
    let profileImageUrl = null;
    let vehicleImagesUrl = [];
    let idUrl = null;

    if (req.files) {
      const uploadTasks = req.files.map(async file => {
        const fieldName = file.fieldname;
        // console.log(`Processing file: ${fieldName}, path: ${file.path}`); 

        switch (fieldName) {
          case 'dlFile':
            const licensePublicId = await uploadImage(file.path);
            if (licensePublicId) {
              licenseUrl = licensePublicId;
              fs.unlinkSync(file.path);
            }
            break;
          case 'insuranceFile':
            const insurancePublicId = await uploadImage(file.path);
            if (insurancePublicId) {
              insuranceUrl = insurancePublicId;
              fs.unlinkSync(file.path);
            }
            break;
          case 'profilePhoto':
            const profilePublicId = await uploadImage(file.path);
            if (profilePublicId) {
              profileImageUrl = profilePublicId;
              fs.unlinkSync(file.path);
            }
            break;
          case 'vehiclePhoto':
            const vehiclePublicId = await uploadImage(file.path);
            if (vehiclePublicId) {
              vehicleImagesUrl.push(vehiclePublicId);
              fs.unlinkSync(file.path);
            }
            break;
          case 'idFile':
            const idPublicId = await uploadImage(file.path);
            if (idPublicId) {
              idUrl = idPublicId;
              fs.unlinkSync(file.path);
            }
            break;
          default:
            console.log(`Ignoring unexpected field: ${fieldName}`);
            fs.unlinkSync(file.path); // Clean up unexpected files
        }
      });

      await Promise.all(uploadTasks); // Wait for all uploads to complete
    }

    const transporterData = {
      transporterId: uid,
      userId: uid,
      transporterType: transporterType,
      displayName: driverName,
      phoneNumber,
      driverProfileImage: profileImageUrl,
      email,
      vehicleType,
      vehicleRegistration,
      vehicleColor,
      vehicleYear,
      driveType,
      bodyType,
      vehicleFeatures,
      vehicleMake,
      vehicleModel,
      vehicleCapacity,
      vehicleImagesUrl,
      humidityControl, //: humidityControl === "false" ? false : !!humidityControl,
      refrigerated, //: refrigerated === "false" ? false : !!refrigerated,
      driverLicense: licenseUrl,
      logbookUrl,
      insuranceUrl,
      driverIdUrl: idUrl,
      acceptingBooking: false,
      status: "pending",
      rejectionReason: null,
      totalTrips: 0,
      rating: 0,
      currentRoute: [],
      lastKnownLocation: null,
      notificationPreferences: { method: 'both' },
    };
    
    console.log('Transporter data:', transporterData); // Debug
    const transporter = await Transporter.create(transporterData);

    await logActivity(req.user.uid, 'create_transporter', req);

    await Notification.create({
      type: "Create Transporter",
      message: `You created a transporter. Transporter ID: ${transporter.transporterId}`,
      userId: req.user.uid,
      userType: "user",
    });

    await Action.create({
      type: "transporter_review",
      entityId: uid,
      priority: "high",
      metadata: {
        transporterType: transporterType,
        Name: driverName,
      },
      status: "Needs Approval",
      message: 'New transporter needs approval',
    });

    res.status(201).json({
      message: "Transporter created successfully",
      transporter
    });
  } catch (error) {
    console.error('Error creating transporter:', error);
    
    // Clean up any uploaded files
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      });
    }

    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.getTransporter = async (req, res) => {
  try {
    const transporter = await Transporter.get(req.params.transporterId); 
    await logActivity(req.user.uid, 'get_transporter', req);

    res.status(200).json({
      message: "Transporter retrieved successfully",
      transporter: formatTimestamps(transporter)
    });
  } catch (error) {
    console.error('Error retrieving transporter:', error);
    if (error.message === 'Transporter not found') {
      return res.status(404).json({ message: 'Transporter not found' });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.updateTransporter = async (req, res) => {
  try {
    const updated = await Transporter.update(req.params.transporterId, req.body); 
    await logActivity(req.user.uid, 'update_transporter', req);
    
    await Notification.create({
      type: "Update Transporter",
      message: `You updated a transporter. Transporter ID: ${req.params.transporterId}`,
      userId: req.user.uid,
      userType: "user",
    });
    res.status(200).json({ message: 'Transporter updated', updated: formatTimestamps(updated) });
  } catch (error) {
    console.error('Update transporter error:', error);
    res.status(500).json({ message: 'Failed to update transporter' });
  }
};

exports.getAllTransporters = async (req, res) => {
  console.log('Fetching all transporters');
  try {
    const transporters = await Transporter.getAll();
    await logAdminActivity(req.user.uid, 'get_all_transporters', req);

    res.status(200).json({
      message: "Transporters retrieved successfully",
      transporters: formatTimestamps(transporters)
    });
  } catch (error) {
    console.error('Error retrieving transporters:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.toggleAvailability = async (req, res) => {
  try {
    const { transporterId } = req.params;
    const { availability } = req.body;

    if (typeof availability !== 'boolean') {
      return res.status(400).json({ message: 'Availability must be true or false' });
    }

    const updated = await Transporter.update(transporterId, { acceptingBooking: availability });

    await logActivity(req.user.uid, 'toggle_availability', req);

    await Notification.create({
      type: "Toggle Transporter Availability",
      message: `You toggled the availability of a transporter. Transporter ID: ${transporterId}`,
      userId: req.user.uid,
      userType: "user",
    });
    res.status(200).json({ message: 'Availability updated successfully', transporter: formatTimestamps(updated) });
  } catch (error) {
    console.error('Toggle availability error:', error);
    res.status(500).json({ message: 'Failed to update availability' });
  }
};

exports.getAvailableTransporters = async (req, res) => {
  try {
    const available = await Transporter.getByAvailability(true);

    // await logAdminActivity(req.user.uid, 'get_available_transporters', req);
    await logActivity(req.user.uid, 'get_available_transporters', req);

    res.status(200).json({ transporters: formatTimestamps(available) });
  } catch (error) {
    console.error('Get available transporters error:', error);
    res.status(500).json({ message: 'Failed to fetch available transporters' });
  }
};

exports.updateRating = async (req, res) => {
  try {
    const { transporterId } = req.params;
    const { rating } = req.body;

    if (typeof rating !== 'number' || rating < 0 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be a number between 0 and 5' });
    }

    const updated = await Transporter.update(transporterId, { rating });

    await logAdminActivity(req.user.uid, 'update_rating', req);
    res.status(200).json({ message: 'Rating updated', transporter: formatTimestamps(updated) });
  } catch (error) {
    console.error('Update rating error:', error);
    res.status(500).json({ message: 'Failed to update rating' });
  }
};

exports.getAvailableBookings = async (req, res) => {
  try {
    const transporterId = req.user.uid;
    const availableBookings = await MatchingService.getAvailableBookingsForTransporter(transporterId);

    await logActivity(transporterId, 'get_available_bookings', req);

    await Notification.create({
      type: "Get Available Bookings",
      message: `You searched for available bookings. Transporter ID: ${transporterId}`,
      userId: req.user.uid,
      userType: "transporter",
    });
    res.status(200).json({
      success: true,
      message: 'Available bookings retrieved successfully',
      availableBookings: formatTimestamps(availableBookings),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Error retrieving available bookings: ${error.message}`,
    });
  }
};

exports.updateLocation = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { latitude, longitude } = req.body;

    // Validate input
    if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or missing latitude/longitude',
      });
    }

    // Get transporter profile
    const transporterSnapshot = await Transporter.get(userId);

    if (transporterSnapshot.empty) {
      return res.status(404).json({
        success: false,
        message: 'Transporter profile not found',
      });
    }

    const transporterData = transporterSnapshot;

    // Create new location entry
    const newLocation = {
      location: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
      },
      timestamp: admin.firestore.Timestamp.now(),
    };

    // Update currentRoute with time-based pruning (keep last 48 hours)
    const currentRoute = transporterData.currentRoute || [];
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

    // Update transporter document
    await Transporter.update(userId, updates);

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

exports.uploadDocuments = async (req, res) => {
  try {
    const transporterId = req.user.uid;

    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    // Fetch transporter
    const transporter = await Transporter.get(transporterId);
    let updateData = {};

    // Keep existing vehicle images
    let existingVehicleImages = transporter.vehicleImagesUrl || [];

    // Track if sensitive docs changed
    let sensitiveDocsChanged = false;

    let changedFields = []

    const uploadTasks = Object.values(req.files).map(async file => {
      const fieldName = file.fieldname;
      const publicId = await uploadImage(file.path);

      if (publicId) {
        switch (fieldName) {
          case 'dlFile':
            updateData.driverLicense = publicId;       // replace license
            updateData.driverLicenseapproved = false;  // needs re-approval
            sensitiveDocsChanged = true;
            changedFields.push('Driver License');
            break;
          case 'insuranceFile':
            updateData.insuranceUrl = publicId;        // replace insurance
            updateData.insuranceapproved = false;      // needs re-approval
            sensitiveDocsChanged = true;
            changedFields.push('Insurance');
            break;
          case 'profilePhoto':
            updateData.driverProfileImage = publicId;  // replace profile
            break;
          case 'vehiclePhoto':
            existingVehicleImages.push(publicId);      // append vehicle image
            updateData.vehicleImagesUrl = existingVehicleImages;
            break;
          case 'idFile':
            updateData.driverIdUrl = publicId;         // replace ID
            updateData.idapproved = false;             // needs re-approval
            sensitiveDocsChanged = true;
            changedFields.push('ID');
            break;
          default:
            console.log(`Ignoring unexpected field: ${fieldName}`);
        }
      }

      fs.unlinkSync(file.path);
    });

    await Promise.all(uploadTasks);

    // If any sensitive doc changed, set transporter status to renewal
    if (sensitiveDocsChanged) {
      updateData.status = 'renewal';

      await Action.create({
        type: 'transporter_review',
        entityId: { id: transporterId, email: transporter.email },
        priority: 'high',
        metadata : {
          changedFields,
        },
        message: `Transporter ${transporter.displayName} updated sensitive documents: ${changedFields.join(', ')}`
      });
    }

    // Update transporter root fields
    await Transporter.update(transporterId, updateData);

    return res.status(200).json({
      success: true,
      message: 'Documents updated successfully',
      updateData,
    });
  } catch (error) {
    console.error('Error uploading documents:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

exports.deleteVehicleImage = async (req, res) => {
  try {
    const transporterId = req.user.uid;
    const { imageUrl } = req.body; // client sends the image URL to delete

    if (!imageUrl) {
      return res.status(400).json({ success: false, message: 'Image URL is required' });
    }

    // Fetch transporter
    const transporter = await Transporter.get(transporterId);
    let vehicleImages = transporter.vehicleImagesUrl || [];

    // Check if image exists
    if (!vehicleImages.includes(imageUrl)) {
      return res.status(404).json({ success: false, message: 'Image not found in vehicleImagesUrl' });
    }

    // Remove image
    vehicleImages = vehicleImages.filter(url => url !== imageUrl);

    // Update Firestore
    await Transporter.update(transporterId, { vehicleImagesUrl: vehicleImages });

    // Optional: also remove from Cloudinary if you want
    // const publicId = extractPublicId(imageUrl);
    // await cloudinary.uploader.destroy(publicId);

    return res.status(200).json({
      success: true,
      message: 'Vehicle image deleted successfully',
      vehicleImagesUrl: vehicleImages,
    });
  } catch (error) {
    console.error('Error deleting vehicle image:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

