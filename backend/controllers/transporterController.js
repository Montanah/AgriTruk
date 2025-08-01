const fs = require('fs'); 
const { uploadImage } = require('../utils/upload');
const Transporter = require("../models/Transporter");
const User = require("../models/User");
const { logActivity, logAdminActivity } = require("../utils/activityLogger");
const Notification = require("../models/Notification");
const MatchingService = require('../services/matchingService');

exports.createTransporter = async (req, res) => {
  try {

    console.log('Creating transporter...');
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

    if (!vehicleType || !vehicleRegistration ||! vehicleColor || !vehicleMake || !vehicleModel || !vehicleCapacity || !transporterType) {
      return res.status(400).json({ message: 'Required fields are missing' });
    }

    const uid = req.user?.uid;

    const userData = await User.get(uid);
    const email = userData?.email || null;
    const driverName = userData?.name || null;
    const phoneNumber = userData?.phone || null;
    
    // Handle multiple file uploads
    let licenseUrl = null;
    let insuranceUrl = null;
    // let logbookUrl = null;
    let profileImageUrl = null;
    let vehicleImageUrl = null;
    let idUrl = null;

     if (req.files) {
      if (req.files.dlFile) {
        const publicId = await uploadImage(req.files.dlFile[0].path);
        licenseUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${publicId}.jpg`;
        fs.unlinkSync(req.files.dlFile[0].path);
      }

      if (req.files.insuranceFile) {
        const publicId = await uploadImage(req.files.insuranceFile[0].path);
        insuranceUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${publicId}.jpg`;
        fs.unlinkSync(req.files.insuranceFile[0].path);
      }

      // if (req.files.logbook) {
      //   const publicId = await uploadImage(req.files.logbook[0].path);
      //   logbookUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${publicId}.jpg`;
      //   fs.unlinkSync(req.files.logbook[0].path);
      // }

      if (req.files.profilePhoto) {
        const publicId = await uploadImage(req.files.profilePhoto[0].path);
        profileImageUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${publicId}.jpg`;
        fs.unlinkSync(req.files.profilePhoto[0].path);
      }

      // if (req.files.vehicleImage) {
      //   const publicId = await uploadImage(req.files.vehicleImage[0].path);
      //   vehicleImageUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${publicId}.jpg`;
      //   fs.unlinkSync(req.files.vehicleImage[0].path);
      // }
      if (req.files.vehiclePhoto) {
        for (const file of req.files.vehiclePhoto) {
          const publicId = await uploadImage(file.path);
          const imageUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${publicId}.jpg`;
          vehicleImagesUrl.push(imageUrl);
          fs.unlinkSync(file.path);
        }
      }

      if (req.files.idFile) {
        const publicId = await uploadImage(req.files.idFile[0].path);
        console.log('Uploaded ID publicId:', publicId); // Debug
        idUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${publicId}.jpg`;
        fs.unlinkSync(req.files.idFile[0].path);
      }
    }

    const transporterData = {
      transporterId: uid,
      userId: uid,
      driverName,
      phoneNumber,
      driverProfileImage: profileImageUrl,
      driverIdUrl: idUrl,
      email,
      driverLicense: licenseUrl,
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
      vehicleImagesUrl: vehicleImageUrl ? [vehicleImageUrl] : [],
      humidityControl: humidityControl === "false",
      refrigerated: refrigerated === "false",
      // logbookUrl,
      insuranceUrl,
      acceptingBooking: false,
      status: "pending",
      totalTrips: 0,
      rating: 0, 
      transporterType, 
    };
    
    console.log(transporterData);
    const transporter = await Transporter.create(transporterData);

    await logActivity(req.user.uid, 'create_transporter', req);

    await Notification.create({
      type: "Create Transporter",
      message: `You created a transporter. Transporter ID: ${transporter.transporterId}`,
      userId: req.user.uid,
      userType: "user",
    });

    res.status(201).json({
      message: "Transporter created successfully",
      transporter
    });
  } catch (error) {
    console.error('Error creating transporter:', error);
    
    // Clean up any uploaded files
    if (req.files) {
      for (let key in req.files) {
        req.files[key].forEach(file => {
          if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        });
      }
    }

    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getTransporter = async (req, res) => {
  try {
    const transporter = await Transporter.get(req.params.transporterId); 
    await logActivity(req.user.uid, 'get_transporter', req);

    res.status(200).json({
      message: "Transporter retrieved successfully",
      transporter
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
    res.status(200).json({ message: 'Transporter updated', updated });
  } catch (error) {
    console.error('Update transporter error:', error);
    res.status(500).json({ message: 'Failed to update transporter' });
  }
};

exports.getAllTransporters = async (req, res) => {
  console.log('Fetching all transporters');
  try {
    const transporters = await Transporter.getAll();
    await logAdminActivity(req.admin.adminId, 'get_all_transporters', req);

    res.status(200).json({
      message: "Transporters retrieved successfully",
      transporters
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

    const updated = await Transporter.update(transporterId, { availability });

    await logActivity(req.user.uid, 'toggle_availability', req);

    await Notification.create({
      type: "Toggle Transporter Availability",
      message: `You toggled the availability of a transporter. Transporter ID: ${transporterId}`,
      userId: req.user.uid,
      userType: "user",
    });
    res.status(200).json({ message: 'Availability updated successfully', transporter: updated });
  } catch (error) {
    console.error('Toggle availability error:', error);
    res.status(500).json({ message: 'Failed to update availability' });
  }
};

exports.getAvailableTransporters = async (req, res) => {
  try {
    const available = await Transporter.getByAvailability(true);

    // await logAdminActivity(req.admin.adminId, 'get_available_transporters', req);
    await logActivity(req.user.uid, 'get_available_transporters', req);

    res.status(200).json({ transporters: available });
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

    await logAdminActivity(req.admin.adminId, 'update_rating', req);
    res.status(200).json({ message: 'Rating updated', transporter: updated });
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
      availableBookings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Error retrieving available bookings: ${error.message}`,
    });
  }
};