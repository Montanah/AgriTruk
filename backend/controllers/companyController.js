const Company = require('../models/Company');
const { logActivity, logAdminActivity } = require('../utils/activityLogger');
const sendEmail = require("../utils/sendEmail");
const Notification = require('../models/Notification');
const Transporter = require('../models/Transporter');
const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');
const fs = require('fs');
const { uploadImage } = require('../utils/upload');
const admin = require("../config/firebase");
const User = require("../models/User");
const { formatTimestamps } = require('../utils/formatData');
const Action = require('../models/Action');
const { uploadDocuments } = require('./transporterController');

exports.generateRandomPassword = () => {
  const length = 10;
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
};

const generateSignInLink = (email) => {
  const frontendUrl = process.env.FRONTEND_URL || 'https://trukap.com';
  return `${frontendUrl}/auth/signin?email=${encodeURIComponent(email)}`;
};

exports.createCompany = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { name, registration, contact } = req.body;
    console.log("details", name, registration, contact);

    if (!name || !registration || !contact) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check if company already exists
    const existingCompanyByRegistration = await Company.getByRegistration(registration);
    console.log("Existing company by registration:", existingCompanyByRegistration);
    if (existingCompanyByRegistration) {
      return res.status(400).json({ message: 'Company with the same registration number already exists' });
    }

    const existingCompanyByName = await Company.getByName(name);
    console.log("Existing company by name:", existingCompanyByName);
    if (existingCompanyByName) {
      return res.status(400).json({ message: 'Company with the same name already exists' });
    }

    let logoUrl = null;

    console.log('Received logo file:', req.file);

    if (req.file) {
      console.log('Processing logo file:', req.file.originalname, req.file.mimetype, req.file.path); // Debug file
      try {
        logoUrl = await uploadImage(req.file.path);
        if (logoUrl) {
          console.log('Logo uploaded successfully:', logoUrl);
          fs.unlinkSync(req.file.path); 
        } else {
          console.error('Failed to upload logo, continuing without logo');
        }
      } catch (uploadError) {
        console.error('Upload error:', uploadError.message);
        return res.status(500).json({ message: 'Failed to upload logo' });
      }
    } else {
      console.log('No logo file received');
    }

    const userData = await User.get(userId); 

    const companyData = {
      name,
      registration,
      contact,
      email: userData.email,
      transporterId: req.user.uid,
      status: 'pending',
      logo: logoUrl, 
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const company = await Company.create(companyData);
    await logActivity(req.user.uid, 'create_company', req);

    await Notification.create({
      type: "Create Company",
      message: `You created a new company. Company ID: ${company.id}`,
      userId: req.user.uid,
      userType: "business",
    });

    await Action.create({
      type: 'company_review',
      entityId: company.id,
      priority: 'high',
      metadata: {
        name: company.companyName,
        registration: company.registration
      },
      message: `A new company has been created. Company ID: ${company.id}`,
    });

    await sendEmail({
        to: "support@trukafrica.com",
        subject: 'New Company Needs Review',
        html: adminNotification('Company Needs Review', `A new company needs review. Company ID: ${company.id}`),
      });

    res.status(201).json({ 
      message: 'Company created successfully', 
      data: formatTimestamps(company) 
    });
  } catch (err) {
    console.error('Create company error:', err);

    // Clean up file if upload failed and file exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({ message: 'Failed to create company' });
  }
};

exports.getCompany = async (req, res) => {
  try {
    const { companyId } = req.params;
    const company = await Company.get(companyId);

    if (!company) return res.status(404).json({ message: 'Company not found' });
    
    const vehicles = await Vehicle.getAll(companyId);
    
    const drivers = await Driver.getAll(companyId);

    await logActivity(req.user.uid, 'get_company', req);
    
    const responseData = {
      company,
      vehicles,
      drivers,
    };

    res.status(200).json({
      success: true,
      message: 'Company retrieved successfully',
      company: formatTimestamps(company),
      vehicles: formatTimestamps(vehicles),
      drivers: formatTimestamps(drivers),
    });
  } catch (err) {
    console.error('Get company error:', err);
    res.status(500).json({ message: 'Failed to fetch company' });
  }
};

exports.updateCompany = async (req, res) => {
  try {
    const { companyId } = req.params;
    const updates = req.body;

    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No updates provided' });
    }

    const company = await Company.get(companyId);
    if (company.transporterId !== req.user.uid && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized to update this company' });
    }

    const updatedCompany = await Company.update(companyId, updates);
    await logActivity(req.user.uid, 'update_company', req);

    await Notification.create({
      type: "Update Company",
      message: `You updated a company. Company ID: ${companyId}`,
      userId: req.user.uid,
      userType: "business",
    });
    res.status(200).json({ message: 'Company updated successfully', company: updatedCompany });
  } catch (err) {
    console.error('Update company error:', err);
    if (err.message === 'Company not found') {
      res.status(404).json({ message: err.message });
    } else {
      res.status(500).json({ message: 'Failed to update company' });
    }
  }
};

exports.approveCompany = async (req, res) => {
  try {
    const { companyId } = req.params;
    console.log("Approve Company", companyId);
    // Check if the company exists
    const company = await Company.get(companyId);
    console.log("Company", company);
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    const updatedCompany = await Company.approve(companyId);
    const email = updatedCompany?.companyEmail;
    await sendEmail({
      to: email,
      subject: 'Company Status',
      text: 'Your company has been approved, proceed to add Drivers and Vehicles.',
      //html: getMFATemplate(verificationCode, null, req.ip || 'unknown', req.headers['user-agent'] || 'unknown')
      html: `<p>Your Company has been approved</p>`
    });

    await logAdminActivity(req.user.uid, 'approve_company', req);

    await Notification.create({
      type: "Approved Company",
      message: `Your company was approved. Company ID: ${companyId}`,
      userId: updatedCompany.transporterId,
      userType: "user",
    })
    res.status(200).json({ message: 'Company approved successfully', company: updatedCompany });
  } catch (err) {
    console.error('Approve company error:', err);
    if (err.message === 'Company not found') {
      res.status(404).json({ message: err.message });
    } else {
      res.status(500).json({ message: 'Failed to approve company' });
    }
  }
};

exports.rejectCompany = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }

    const updatedCompany = await Company.reject(companyId, reason);

    const email = updatedCompany?.companyEmail;

    await sendEmail({
      to: email,
      subject: 'Company Approval Status',
      text: `Your company has been rejected because of: ${reason}`,
      //   html: getMFATemplate(verificationCode, null, req.ip || 'unknown', req.headers['user-agent'] || 'unknown')
      html: `<p>Your company has been rejected because of: <strong>${reason}</strong></p>`
    });

    await logAdminActivity(req.user.uid, 'reject_company', req);

    await Notification.create({
      type: "Rejected Company",
      message: `Your company was rejected. Company ID: ${companyId}`,
      userId: updatedCompany.transporterId,
      userType: "user",
    })
    res.status(200).json({ message: 'Company rejected successfully', company: updatedCompany });
  } catch (err) {
    console.error('Reject company error:', err);
    if (err.message === 'Company not found') {
      res.status(404).json({ message: err.message });
    } else {
      res.status(500).json({ message: 'Failed to reject company' });
    }
  }
};

exports.getAllCompanies = async (req, res) => {
  try {
    const companies = await Company.getAll();

    await logAdminActivity(req.user.uid, 'get_all_companies', req);
    res.status(200).json({
      message: 'Companies fetched successfully',
      companies: formatTimestamps(companies)});
  } catch (err) {
    console.error('Get all companies error:', err);
    res.status(500).json({ message: 'Failed to fetch companies' });
  }
};

exports.deleteCompany = async (req, res) => {
  try {
    const { companyId } = req.params;
    await Company.delete(companyId);
    await logAdminActivity(req.user.uid, 'delete_company', req);
    res.status(200).json({ message: 'Company deleted successfully' });
  } catch (err) {
    console.error('Delete company error:', err);
    if (err.message === 'Company not found') {
      res.status(404).json({ message: err.message });
    } else {
      res.status(500).json({ message: 'Failed to delete company' });
    }
  }
};

exports.getCompaniesByTransporter = async (req, res) => {
  try {
    const { transporterId } = req.params;
    const companies = await Company.getByTransporter(transporterId);

    // await logAdminActivity(req.user.uid, 'get_companies_by_transporter', req);
    res.status(200).json(companies);
  } catch (err) {
    console.error('Get companies by transporter error:', err);
    res.status(500).json({ message: 'Failed to fetch companies for transporter' });
  }
};

exports.getCompaniesByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    const companies = await Company.getByStatus(status);

    await logAdminActivity(req.user.uid, 'get_companies_by_status', req);

    res.status(200).json(companies);
  } catch (err) {
    console.error('Get companies by status error:', err);
    res.status(500).json({ message: 'Failed to fetch companies by status' });
  }
};

exports.getCompaniesByTransporterAndStatus = async (req, res) => {
  try {
    const { transporterId, status } = req.params;
    const companies = await Company.getByTransporterAndStatus(transporterId, status);

    await logAdminActivity(req.user.uid, 'get_companies_by_transporter_and_status', req);

    res.status(200).json(companies);
  } catch (err) {
    console.error('Get companies by transporter and status error:', err);
    res.status(500).json({ message: 'Failed to fetch companies for transporter and status' });
  }
};

exports.getAllForTransporter = async (req, res) => {
  try {
    const { transporterId } = req.params;
    const companies = await Company.getByTransporter(transporterId);

    await logAdminActivity(req.user.uid, 'get_all_companies_for_transporter', req);
    res.status(200).json(companies);
  } catch (err) {
    console.error('Get all companies for transporter error:', err);
    res.status(500).json({ message: 'Failed to fetch companies for transporter' });
  }
};

exports.searchCompany = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const result = await Company.search({ page, limit, status, search });

    await logAdminActivity(req.user.uid, 'search_companies', req);
    res.status(200).json(result);
  } catch (err) {
    console.error('Search companies error:', err);
    res.status(500).json({ message: 'Failed to fetch companies' });
  }
};

//Company Vehicles Controller
exports.createVehicle = async (req, res) => {
  try {
    const companyId = req.params.companyId;
    
    //validate companyId
    if (!companyId || typeof companyId !== 'string' || companyId.trim() === '') {
      return res.status(400).json({ message: 'Invalid company ID' });
    }
    // Check if the company exists
    const company = await Company.get(companyId);
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // Check if the company is approved
    if (company.status !== 'approved') {
      return res.status(403).json({ message: 'Company is not approved' });
    }

    const reg = req.body.reg;

    if (!reg || typeof reg !== 'string' || reg.trim() === '') {
      return res.status(400).json({ message: 'Invalid registration number' });
    }
   
    // check registration number
    const existingVehicle = await Vehicle.getByRegistration(companyId, reg);
    if (existingVehicle) {
      return res.status(400).json({ message: 'Vehicle with the same registration number already exists' });
    }
   // console.log("existingVehicle", existingVehicle);

    // check format of registration number
    
    if (!req.files) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const plate = reg.trim().toUpperCase();

    const regex = /^K?[A-Z]{2} ?\d{3}[A-Z]$/;

    if (!(plate.length === 7 || plate.length === 8) || !regex.test(plate)) {
      return res.status(400).json({ message: 'Invalid vehicle registration number' });
    }

    // Handle multiple file uploads dynamically
    let insuranceUrl = null;
    let vehicleImagesUrl = [];

    if (req.files) {
      const uploadTasks = req.files.map(async file => {
        const fieldName = file.fieldname;
        //console.log(`Processing file: ${fieldName}, path: ${file.path}`); 

        switch (fieldName) {
          case 'insurance':
            const insurancePublicId = await uploadImage(file.path);
            if (insurancePublicId) {
              insuranceUrl = insurancePublicId;
              fs.unlinkSync(file.path);
            }
            break;
          case 'photos':
            const vehiclePublicId = await uploadImage(file.path);
            if (vehiclePublicId) {
              vehicleImagesUrl.push(vehiclePublicId);
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


    const vehicleData = {
      type: req.body.type,
      reg: req.body.reg,
      bodyType: req.body.bodyType,
      capacity: req.body.capacity,
      year: req.body.year,
      color: req.body.color,
      model: req.body.model,
      refrigeration: req.body.refrigeration,
      humidityControl: req.body.humidityControl,
      specialCargo: req.body.specialCargo,
      features: req.body.features,
      insurance: insuranceUrl,
      photos: vehicleImagesUrl,
      assignedDriverId: req.body.assignedDriverId,
      est: req.body.est,
      status: req.body.status,
    };

    console.log(vehicleData);
    const vehicle = await Vehicle.create(companyId, vehicleData);

    await logActivity(req.user.uid, 'create_vehicle', req);

    await Notification.create({
      type: "Vehicle Created",
      message: `A new vehicle has been created. Vehicle ID: ${vehicle.vehicleId}`,
      userId: req.user.uid,
      userType: "company",
    });

    await Action.create({
      type: 'company_review',
      entityId: companyId,
      priority: 'high',
      metadata: {
        name: vehicle.id,
        type: 'vehicle',
      },
      message: `A new Vehicle has been created. Company ID: ${companyId}`,
    })

    res.status(201).json({
      success: true,
      message: 'Vehicle created successfully',
      data: formatTimestamps(vehicle),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Error creating vehicle: ${error.message}`,
    });
  }
};

exports.getVehicle = async (req, res) => {
  try {
    const companyId = req.params.companyId;
    const vehicle = await Vehicle.get(companyId, req.params.vehicleId);

    await logActivity(req.user.uid, 'get_vehicle', req);

    await Notification.create({
      type: "Vehicle Retrieved",
      message: `A vehicle has been retrieved. Vehicle ID: ${vehicle.vehicleId}`,
      userId: req.user.uid,
      userType: "company",
    });
    res.status(200).json({
      success: true,
      message: 'Vehicle retrieved successfully',
      data: vehicle,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Error retrieving vehicle: ${error.message}`,
    });
  }
};

exports.getAllVehicles = async (req, res) => {
  try {
    const companyId = req.params.companyId;
    const vehicles = await Vehicle.getAll(companyId);

    await logActivity(req.user.uid, 'get_all_vehicles', req);

    await Notification.create({
      type: "Vehicles Retrieved",
      message: `Vehicles have been retrieved. Company ID: ${companyId}`,
      userId: req.user.uid,
      userType: "company",
    });

    res.status(200).json({
      success: true,
      message: 'Vehicles retrieved successfully',
      data: vehicles,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Error retrieving vehicles: ${error.message}`,
    });
  }
};

exports.updateVehicle = async (req, res) => {
  try {
    const companyId = req.params.companyId;
    const vehicleId = req.params.vehicleId;
    const vehicleData = {
      type: req.body.type,
      reg: req.body.reg,
      bodyType: req.body.bodyType,
      refrigeration: req.body.refrigeration,
      humidityControl: req.body.humidityControl,
      specialCargo: req.body.specialCargo,
      features: req.body.features,
      insurance: req.body.insurance,
      photos: req.body.photos,
      assignedDriverId: req.body.assignedDriverId,
      est: req.body.est,
      status: req.body.status,
    };
    const vehicle = await Vehicle.update(companyId, vehicleId, vehicleData);

    await logActivity(req.user.uid, 'update_vehicle', req);

    await Notification.create({
      type: "Vehicle Updated",
      message: `A vehicle has been updated. Vehicle ID: ${vehicle.vehicleId}`,
      userId: req.user.uid,
      userType: "company",
    });

    res.status(200).json({
      success: true,
      message: 'Vehicle updated successfully',
      data: vehicle,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Error updating vehicle: ${error.message}`,
    });
  }
};

exports.updateAvailability = async (req, res) => {
  try {
    const companyId = req.params.companyId;
    const vehicleId = req.params.vehicleId;
    const availability = req.body.availability;
    await Vehicle.updateAvailability(vehicleId, availability);

    await logActivity(req.user.uid, 'update_availability', req);

    await Notification.create({
      type: "Vehicle Availability Updated",
      message: `The availability of a vehicle has been updated. Vehicle ID: ${vehicleId}`,
      userId: req.user.uid,
      userType: "company",
    });

    res.status(200).json({
      success: true,
      message: 'Vehicle availability updated successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Error updating vehicle availability: ${error.message}`,
    });
  }
};

//Drivers Controller
exports.createDriver = async (req, res) => {
  try {
    const companyId = req.params.companyId;

    //check if company exists
    const company = await Company.get(companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found',
      });
    }

    // check is company is approved
    if (company.status === 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Company is not approved yet',
      });
    }

    // Check for existing driver
    const existingDriver = await Driver.getByEmail(companyId, req.body.email);
    console.log("company", companyId);
    console.log("email", req.body.email);
    console.log('Existing driver:', existingDriver);
    if (existingDriver && existingDriver.email) {
      console.log('Blocking creation due to existing driver');
      return res.status(400).json({
        success: false,
        message: 'Driver with this email already exists',
      });
    }

    // Check for existing driver
    const existingDriver2 = await Driver.getByPhone(companyId, req.body.phone);
    if (existingDriver2 && existingDriver2.phone) {
      console.log('Blocking creation due to existing driver');
      return res.status(400).json({
        success: false,
        message: 'Driver with this phone number already exists',
      });
    }

    console.log('Creating driver...');
    console.log('Request body:', req.body);
    console.log('Request files structure:', req.files);

    const status = 'active';

    // Validate required fields
    const { name, email, phone } = req.body;
    if (!name || !email || !phone || !status) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, email, phone, or status',
      });
    }

    // Handle multiple file uploads
    let licenseUrl = null;
    let profileImageUrl = null;
    let idUrl = null;

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        switch (file.fieldname) {
          case 'license':
            const licensePublicId = await uploadImage(file.path, file.mimetype.startsWith('application/') ? 'raw' : 'image');
            if (licensePublicId) {
              licenseUrl = licensePublicId;
              fs.unlinkSync(file.path);
            } else {
              console.error('Failed to upload license image');
            }
            break;
          case 'photo':
            const photoPublicId = await uploadImage(file.path, file.mimetype.startsWith('application/') ? 'raw' : 'image');
            if (photoPublicId) {
              profileImageUrl = photoPublicId;
              fs.unlinkSync(file.path);
            } else {
              console.error('Failed to upload profile image');
            }
            break;
          case 'idDoc':
            const idPublicId = await uploadImage(file.path, file.mimetype.startsWith('application/') ? 'raw' : 'image');
            if (idPublicId) {
              console.log('Uploaded ID publicId:', idPublicId);
              idUrl = idPublicId;
              fs.unlinkSync(file.path);
            } else {
              console.error('Failed to upload ID image');
            }
            break;
          default:
            console.log(`Ignoring unexpected field: ${file.fieldname}`);
            fs.unlinkSync(file.path); // Clean up unexpected files
        }
      }
    } else {
      console.log('No files received in request');
    }

    console.log('License URL:', licenseUrl);
    console.log('Profile Image URL:', profileImageUrl);
    console.log('ID URL:', idUrl);

    const driverData = {
      name,
      email,
      phone,
      photo: profileImageUrl,
      idDoc: idUrl,
      license: licenseUrl,
      status,
    };
    const driver = await Driver.create(companyId, driverData);

    await Notification.create({
      type: "Driver Created",
      message: `A new driver has been created. Driver ID: ${driver.driverId}`,
      userId: req.user.uid,
      userType: "company",
    });

    await Action.create({
      type: 'company_review',
      entityId: companyId,
      priority: 'high',
      metadata: {
        name: driver.name,
        driver: 'driver',
      },
      message: `A new driver ${driver.driverId} has been created for Company ID: ${company.id}`,
    })

    res.status(201).json({
      success: true,
      message: 'Driver created successfully',
      data: formatTimestamps(driver),
    });
  } catch (error) {
    console.error('Error creating driver:', error);

    // Clean up any uploaded files in case of error
    if (req.files) {
      for (const file of req.files) {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      }
    }

    res.status(500).json({
      success: false,
      message: `Error creating driver: ${error.message}`,
    });
  }
};

exports.getDriver = async (req, res) => {
  try {
    const companyId = req.params.companyId;
    const driver = await Driver.get(companyId, req.params.driverId);
    res.status(200).json({
      success: true,
      message: 'Driver retrieved successfully',
      data: driver,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Error retrieving driver: ${error.message}`,
    });
  }
};

exports.updateDriverProfile = async (req, res) => {
  try {
    const companyId = req.params.companyId;
    const driverId = req.params.driverId;
    const driver = await Driver.update(companyId, driverId, req.body);
    res.status(200).json({
      success: true,
      message: 'Driver updated successfully',
      data: driver,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Error updating driver: ${error.message}`,
    });
  }
}

exports.getAllDrivers = async (req, res) => {
  try {
    const companyId = req.params.companyId;
    const drivers = await Driver.getAll(companyId);
    res.status(200).json({
      success: true,
      message: 'Drivers retrieved successfully',
      data: drivers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Error retrieving drivers: ${error.message}`,
    });
  }
};

exports.updateDriversAvailability = async (req, res) => {
  try {
    const companyId = req.params.companyId;
    const driverId = req.params.driverId;
    const availability = req.body.availability;
    await Driver.updateAvailability(driverId, availability);

    await logActivity(req.user.uid, 'update_availability', req);

    await Notification.create({
      type: "Driver Availability Updated",
      message: `The availability of a driver has been updated. Vehicle ID: ${driverId}`,
      userId: req.user.uid,
      userType: "company",
    });

    res.status(200).json({
      success: true,
      message: 'Driver availability updated successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Error updating driver availability: ${error.message}`,
    });
  }
};

exports.approveVehicle = async (req, res) => {
  try {
    const companyId = req.params.companyId;
    const vehicleId = req.params.vehicleId;
    await Vehicle.approve(companyId, vehicleId);
    res.status(200).json({
      success: true,
      message: 'Vehicle approved successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Error approving vehicle: ${error.message}`,
    });
  }
};

exports.rejectVehicle = async (req, res) => {
  try {
    const companyId = req.params.companyId;
    const vehicleId = req.params.vehicleId;
    await Vehicle.reject(companyId, vehicleId);
    res.status(200).json({
      success: true,
      message: 'Vehicle rejected successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Error rejecting vehicle: ${error.message}`,
    });
  }
};

exports.approveCompanyDriver = async (req, res) => {
  try {
    const companyId = req.params.companyId;
    const driverId = req.params.driverId;
    // Get driver Data
    const driver = await Driver.get(companyId, driverId);
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    console.log('Driver Data:', driver);

    // check if approved already
    if (driver.status === 'approved') {
      return res.status(400).json({ success: false, message: 'Driver is already approved' });
    }

    await Driver.approve(companyId, driverId);
    const pass =  generateRandomPassword(); 
    const signInLink = generateSignInLink(driver.email);

    // Create a Firebase Auth Account
    let userRecord;
    try {
      try {
        userRecord = await admin.auth().getUserByEmail(driver.email);
       // console.log('User already exists, skipping creation...');
      } catch (error) {
        if (error.code === 'auth/user-not-found') {
          //console.log('User not found, creating a new user...');
          userRecord = await admin.auth().createUser({
            email: driver.email,
            phoneNumber: driver.phone.startsWith('+') ? driver.phone : `+${driver.phone}`,
            displayName: driver.name,
            password: pass,
            emailVerified: false,
            disabled: false,
          });
          //console.log('User created successfully:', userRecord.uid);
        } else {
          console.error('Error checking user existence:', error);
          return res.status(500).json({ success: false, message: 'Error checking user existence' });
        }
      }
      //console.log('User Record:', userRecord);

      // Update Firebase ID if user creation was successful
      const userId = userRecord ? userRecord.uid : null;
      //console.log('User ID:', userId);  
      if (userId) {
       // console.log('Attempting to update Firebase ID with userId:', userId);
        try {
          await Driver.updateFirebaseId(companyId, driverId, userId);
          //console.log('Firebase ID updated successfully for driver:', driverId);
        } catch (updateError) {
          console.error('Error updating Firebase ID:', updateError);
          return res.status(500).json({ success: false, message: 'Error updating Firebase ID' });
        }
      } else {
        console.error('No valid userId available for update');
        return res.status(500).json({ success: false, message: 'No valid user ID available' });
      }

      await Notification.create({
        type: "Driver Approved",
        message: `A new driver has been approved. Driver ID: ${driverId}`,
        userId: req.user.uid,
        userType: "company",
      });

      await logAdminActivity(req.user.uid, 'approve_driver', req, driverId); 

    } catch (error) {
      console.error('Error creating/updating user:', error);
      return res.status(500).json({ success: false, message: 'Error creating or updating user' });
    }

    //console.log('Driver approved successfully');
    // Send welcome email outside the inner try-catch
    const email = driver.email;
    const name = driver.name;
    //const password = process.env.DEFAULT_DRIVER_PASSWORD || 'driver1234';
    try {
      await sendEmail({
        to: email,
        subject: `${name} Welcome to TrukApp`,
        text: `Your account has been created. Username: ${email} Password: ${pass}`,
        html:
          `<h2>Welcome to TrukApp!</h2>
          <p>Your driver account has been approved.</p>
          <p><strong>Email:</strong> ${driver.email}</p>
          <p><strong>Temporary Password:</strong> ${pass}</p>
          <p>You can sign in here: <a href="${signInLink}">Sign In</a></p>
          <p>Please change your password after first login.</p>
        `,
      });
      //console.log('Welcome email sent to:', email);
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError);
      // Continue without failing the request, as email is non-critical
    }

    res.status(200).json({
      success: true,
      message: 'Driver approved successfully',
    });
  } catch (error) {
    console.error('Error approving driver:', error);

    res.status(500).json({
      success: false,
      message: `Error approving driver: ${error.message}`,
    });
  }
};

exports.rejectCompanyDriver = async (req, res) => {
  try {
    const companyId = req.params.companyId;
    const driverId = req.params.driverId;
    await Driver.reject(companyId, driverId);
    res.status(200).json({
      success: true,
      message: 'Driver rejected successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Error rejecting driver: ${error.message}`,
    });
  }
};

exports.updateVehicleAssignment = async (req, res) => {
  try {
    const { companyId, vehicleId } = req.params;
    const { action, driverId, availability } = req.body;
    console.log("action", action, driverId, availability);

    // Validate required parameters
    if (!companyId || !vehicleId) {
      return res.status(400).json({ success: false, message: 'Company ID and Vehicle ID are required' });
    }

    // Check if company exists
    const company = await Company.get(companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found',
      });
    }

    // Check if company is approved
    if (company.status === 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Company is not approved yet',
      });
    }

    // Check if vehicle exists
    const vehicle = await Vehicle.get(companyId, vehicleId); // Include companyId
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found',
      });
    }

    // Check if vehicle is approved
    if (vehicle.status === 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Vehicle is not approved yet',
      });
    }

    // Handle actions
    switch (action) {
      case 'assign':
        // Check if driver exists
        const driver = await Driver.get(companyId, driverId); // Include companyId
        if (!driver) {
          return res.status(404).json({
            success: false,
            message: 'Driver not found',
          });
        }

        // Check if driver is approved
        if (driver.status === 'pending') {
          return res.status(400).json({
            success: false,
            message: 'Driver is not approved yet',
          });
        }

        await Vehicle.assignDriver(companyId, vehicleId, driverId);
        break;
      case 'unassign':
        await Vehicle.unassignDriver(companyId, vehicleId); // Include companyId
        break;
      case 'update-availability':
        if (availability === undefined) {
          return res.status(400).json({ success: false, message: 'Availability is required for update-availability action' });
        }
        await Vehicle.updateAvailability(companyId, vehicleId, availability);
        break;
      default:
        return res.status(400).json({ success: false, message: 'Invalid action' });
    }

    res.status(200).json({
      success: true,
      message: 'Vehicle assignment updated successfully',
    });
  } catch (error) {
    console.error('Error updating vehicle assignment:', error);
    res.status(500).json({
      success: false,
      message: `Error updating vehicle assignment: ${error.message}`,
    });
  }
};

exports.updateVehicleProfile = async (req, res) => {
  try {
    const { companyId, vehicleId } = req.params;

    //check if company exists
    const company = await Company.get(companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found',
      });
    }

    //check if vehicle exists
    const vehicle = await Vehicle.get(vehicleId);
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found',
      });
    }

    const veh= await Vehicle.update(companyId, vehicleId, req.body);

    res.status(200).json({
      success: true,
      message: 'Vehicle profile updated successfully',
      veh,
    });
  } catch (error) {
    
  }
};

exports.uploadLogo = async (req, res) => {
  try {
    const companyId = req.params.companyId;
    // check if company exists
    const company = await Company.get(companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found',
      });
    }
   let updateData = {}; 
   
   // Track if sensitive docs changed 
   let sensitiveDocsChanged = false; 
   let changedFields = [] 

   const uploadTasks = Object.values(req.files).map(async file => { 
    const fieldName = file.fieldname; 
    const publicId = await uploadImage(file.path); 
    if (publicId) { 
      switch (fieldName) { 
        case 'logo': 
          updateData.logo = publicId; 
          changedFields.push('logo'); 
        break; 
        default: console.log(`Unknown field name: ${fieldName}`); 
        break;
       } 
      } 
      
      fs.unlinkSync(file.path); }); 
      
      await Promise.all(uploadTasks); 
      
      await Action.create({ 
        type: 'company_review', 
        entityId: companyId, 
        priority: 'high', 
        metadata: { ...updateData }, 
        message: `${company.companyName} has ${sensitiveDocsChanged ? 'sensitive' : 'non-sensitive'} documents that need to be approved.`, 
      });

      await Company.update(companyId, updateData);

      res.status(200).json({
        success: true,
        message: 'Logo uploaded successfully',
        data: updateData
      })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Error uploading logo: ${error.message}`,
    });
  }
};

exports.uploadDriverDocuments = async (req, res) => {
  try {
    const {companyId, driverId }= req.params;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    const company = await Company.get(companyId);

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    };

    const driver = await Driver.get(companyId, driverId);

    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    };

    let updateData = {};

    // Track if sensitive docs changed
    let sensitiveDocsChanged = false;

    let changedFields = []

    const uploadTasks = Object.values(req.files).map(async file => {
      const fieldName = file.fieldname;
      const publicId = await uploadImage(file.path);

      if (publicId) {
        switch (fieldName) {
          case 'license':
            updateData.license = publicId;
            updateData.driverLicenseapproved = false;
            updateData.status = 'renewal';
            sensitiveDocsChanged = true;
            changedFields.push('license');
            break;
          case 'idDoc':
            updateData.idDoc = publicId;
            updateData.idapproved = false;
            sensitiveDocsChanged = true;
            changedFields.push('idDoc');
            break;
          case 'photo':
            updateData.photo = publicId;
            changedFields.push('photo');
            break;
          default:
            console.log(`Unknown field name: ${fieldName}`);
            break;
        }
      }
      fs.unlinkSync(file.path);
    });
    
    await Promise.all(uploadTasks);
    
    await Action.create({
      type: 'company_review',
      entityId: companyId,
      priority: 'high',
      metadata: {
        ...updateData
      },
      message: `${company.companyName} has ${sensitiveDocsChanged ? 'sensitive' : 'non-sensitive'} documents that need to be approved.`,
    });
    
    await Driver.update(companyId, driverId, updateData);

    res.status(200).json({
      success: true,
      message: "Driver documents uploaded successfully",
      data: updateData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Error uploading driver documents: ${error.message}`,
    });
  }
};

exports.uploadVehicleDocuments = async (req, res) => {
  try {
    const { companyId, vehicleId } = req.params;
    console.log(req.files);
    console.log(req.params);
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    const company = await Company.get(companyId);

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    };

    const vehicle = await Vehicle.get(companyId, vehicleId);
  

    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    };

    let updateData = {};

    // Track if sensitive docs changed
    let sensitiveDocsChanged = false;

    let changedFields = []

    const uploadTasks = Object.values(req.files).map(async file => {
      const fieldName = file.fieldname;
      const publicId = await uploadImage(file.path);

      if (publicId) {
        switch (fieldName) {
          case 'photos':
            existingVehicleImages.push(publicId);
            updateData.photos = existingVehicleImages;
            changedFields.push('photos');
            break;
          case 'insurance': 
            updateData.insurance = publicId; 
            updateData.insuranceapproved = false; 
            updateData.status = 'renewal'; 
            sensitiveDocsChanged = true; 
            changedFields.push('insurance'); break;
          default:
            console.log(`Unknown field name: ${fieldName}`);
            break;
        }
      }
      fs.unlinkSync(file.path);
    });
    
    await Promise.all(uploadTasks);
    
    await Action.create({
      type: 'company_review',
      entityId: companyId,
      priority: 'high',
      metadata: {
        ...updateData
      },
      message: `${company.companyName} has ${sensitiveDocsChanged ? 'sensitive' : 'non-sensitive'} documents that need to be approved.`,
    });
    
    await Vehicle.update(companyId, vehicleId, updateData);

    res.status(200).json({
      success: true,
      message: "Vehicle documents uploaded successfully",
      data: updateData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Error uploading vehicle documents: ${error.message}`,
    });
  }
};
