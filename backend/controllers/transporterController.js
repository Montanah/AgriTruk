const fs = require('fs'); 
const { uploadImage } = require('../utils/upload');
const Transporter = require("../models/Transporter");
const logActivity = require("../utils/activityLogger");

exports.createTransporter = async (req, res) => {
  try {
    const { documents, vehicles } = req.body;
    console.log('plateNumber:', vehicles?.plateNumber);
    console.log('capacity:', vehicles?.capacity);
    console.log('model:', vehicles?.model);

    if (!documents || !vehicles?.plateNumber || !vehicles?.capacity || !vehicles?.model) {
      return res.status(400).json({ message: 'Required fields are missing' });
    }

    // Handle multiple file uploads
    let licenseUrl = null;
    let insuranceUrl = null;
    let vehicleImageUrl = null;

    if (req.files) {
      // Upload license image if provided
      if (req.files.license) {
        const publicId = await uploadImage(req.files.license.path);
        licenseUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${publicId}.jpg`;
        fs.unlinkSync(req.files.license.path); // Clean up local file
      }
      // Upload insurance image if provided
      if (req.files.insurance) {
        const publicId = await uploadImage(req.files.insurance.path);
        insuranceUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${publicId}.jpg`;
        fs.unlinkSync(req.files.insurance.path); // Clean up local file
      }
      // Upload vehicle image if provided
      if (req.files.vehicleImage) {
        const publicId = await uploadImage(req.files.vehicleImage.path);
        vehicleImageUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${publicId}.jpg`;
        fs.unlinkSync(req.files.vehicleImage.path); // Clean up local file
      }
    }

    const transporterData = {
      transporterId: req.user?.uid,
      documents: {
        licenseUrl: licenseUrl || documents.license || null,
        insuranceUrl: insuranceUrl || documents.insurance || null,
      },
      vehicles: {
        plateNumber: vehicles.plateNumber,
        make: vehicles.make || 'Unknown',
        model: vehicles.model,
        capacity: vehicles.capacity,
        features: vehicles.features || [],
        imageUrl: vehicleImageUrl || vehicles.imageUrl || null,
        availability: vehicles.availability || true,
        location: vehicles.location || {
          county: vehicles.location?.county || null,
        },
      },
      acceptingBooking: false,
      status: 'pending',
      totalTrips: 0,
    };

    const transporter = await Transporter.create(transporterData);

    await logActivity(req.user.uid, 'create_transporter', req);

    res.status(201).json({
      message: "Transporter created successfully",
      transporter
    });
  } catch (error) {
    console.error('Error creating transporter:', error);
    if (req.files) {
      // Clean up any uploaded files in case of error
      [req.files.license, req.files.insurance, req.files.vehicleImage].forEach(file => {
        if (file) fs.unlinkSync(file.path);
      });
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
    const updated = await Transporter.update(req.params.transporterId, req.body); // Changed to transporterId
    await logActivity(req.user.uid, 'update_transporter', req);
    res.status(200).json({ message: 'Transporter updated', updated });
  } catch (error) {
    console.error('Update transporter error:', error);
    res.status(500).json({ message: 'Failed to update transporter' });
  }
};
