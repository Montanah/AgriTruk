const fs = require('fs'); 
const { uploadImage } = require('../utils/upload');
const Transporter = require("../models/Transporter");
const User = require("../models/User");
const { logActivity, logAdminActivity } = require("../utils/activityLogger");
const Notification = require("../models/Notification");

exports.createTransporter = async (req, res) => {
  try {
    const { 
      vehicleType,
      vehicleRegistration,
      vehicleMake,
      vehicleModel,
      vehicleCapacity,
      humidityControl,
      refrigerated,
      businessType = 'individual' 
     } = req.body;

    if (!vehicleType || !vehicleRegistration ) {
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
    let logbookUrl = null;
    let profileImageUrl = null;
    let vehicleImageUrl = null;
    let idUrl = null;

     if (req.files) {
      if (req.files.license) {
        const publicId = await uploadImage(req.files.license[0].path);
        licenseUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${publicId}.jpg`;
        fs.unlinkSync(req.files.license[0].path);
      }

      if (req.files.insurance) {
        const publicId = await uploadImage(req.files.insurance[0].path);
        insuranceUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${publicId}.jpg`;
        fs.unlinkSync(req.files.insurance[0].path);
      }

      if (req.files.logbook) {
        const publicId = await uploadImage(req.files.logbook[0].path);
        logbookUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${publicId}.jpg`;
        fs.unlinkSync(req.files.logbook[0].path);
      }

      if (req.files.profileImage) {
        const publicId = await uploadImage(req.files.profileImage[0].path);
        profileImageUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${publicId}.jpg`;
        fs.unlinkSync(req.files.profileImage[0].path);
      }

      if (req.files.vehicleImage) {
        const publicId = await uploadImage(req.files.vehicleImage[0].path);
        vehicleImageUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${publicId}.jpg`;
        fs.unlinkSync(req.files.vehicleImage[0].path);
      }

      if (req.files.idImage) {
        const publicId = await uploadImage(req.files.idImage[0].path);
        console.log(publicId);
        idUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${publicId}.jpg`
        fs.unlinkSync(req.files.idImage[0].path);
      }
    }

    const transporterData = {
      transporterId: uid,
      driverName,
      phoneNumber,
      driverProfileImage: profileImageUrl,
      driverIdUrl: idUrl,
      email,
      driverLicense: licenseUrl,
      vehicleType,
      vehicleRegistration,
      vehicleMake,
      vehicleModel,
      vehicleCapacity,
      vehicleImagesUrl: vehicleImageUrl ? [vehicleImageUrl] : [],
      humidityControl: humidityControl === "false",
      refrigerated: refrigerated === "false",
      logbookUrl,
      insuranceUrl,
      acceptingBooking: false,
      status: "pending",
      totalTrips: 0,
      rating: 0, 
      businessType, 
    };

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

    await logAdminActivity(req.admin.adminId, 'get_available_transporters', req);

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

