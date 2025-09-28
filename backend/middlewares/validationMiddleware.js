const Company = require('../models/Company');
const admin = require("../config/firebase");
const db = admin.firestore();
const { body, param, validationResult } = require('express-validator');

exports.validateCompanyCreation = [
  body('name').notEmpty().withMessage('Company name is required'),
  body('registration').notEmpty().withMessage('Registration number is required').custom(async value => {
    const snapshot = await db.collection("companies").where("companyRegistration", "==", value).get();
    if (!snapshot.empty) throw new Error('Registration number already exists');
    return true;
  }),
  body('contact').notEmpty().withMessage('Contact information is required'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

exports.validateCompanyUpdate = [
  param('companyId').notEmpty().withMessage('Company ID is required'),
  body().custom((value, { req }) => {
    if (Object.keys(req.body).length === 0) {
      throw new Error('No updates provided');
    }
    return true;
  }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

// Vehicle validation
exports.validateVehicleCreation = [
  body('companyId').notEmpty().withMessage('Company ID is required'),
  body('vehicleType').notEmpty().withMessage('Vehicle type is required'),
  body('vehicleMake').notEmpty().withMessage('Vehicle make is required'),
  body('vehicleModel').notEmpty().withMessage('Vehicle model is required'),
  body('vehicleYear').isInt({ min: 1900, max: new Date().getFullYear() + 1 }).withMessage('Valid vehicle year is required'),
  body('vehicleColor').notEmpty().withMessage('Vehicle color is required'),
  body('vehicleRegistration').notEmpty().withMessage('Vehicle registration is required'),
  body('vehicleCapacity').isFloat({ min: 0 }).withMessage('Valid vehicle capacity is required'),
  body('bodyType').notEmpty().withMessage('Body type is required'),
  body('driveType').notEmpty().withMessage('Drive type is required'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

exports.validateVehicleUpdate = [
  param('id').notEmpty().withMessage('Vehicle ID is required'),
  body().custom((value, { req }) => {
    if (Object.keys(req.body).length === 0) {
      throw new Error('No updates provided');
    }
    return true;
  }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

// Driver validation
exports.validateDriverCreation = [
  body('companyId').notEmpty().withMessage('Company ID is required'),
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('driverLicense').notEmpty().withMessage('Driver license number is required'),
  body('driverLicenseExpiryDate').isISO8601().withMessage('Valid license expiry date is required'),
  body('idNumber').notEmpty().withMessage('ID number is required'),
  body('idExpiryDate').isISO8601().withMessage('Valid ID expiry date is required'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

exports.validateDriverUpdate = [
  param('id').notEmpty().withMessage('Driver ID is required'),
  body().custom((value, { req }) => {
    if (Object.keys(req.body).length === 0) {
      throw new Error('No updates provided');
    }
    return true;
  }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];