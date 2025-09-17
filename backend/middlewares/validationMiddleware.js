const Company = require('../models/Company');
const admin = require("../config/firebase");
const db = admin.firestore();
const { body, param, validationResult } = require('express-validator');

exports.validateCompanyCreation = [
  body('name').notEmpty().withMessage('Company name is required'),
  body('registration').notEmpty().withMessage('Registration number is required').custom(async value => {
    const snapshot = await db.collection("company").where("companyRegistration", "==", value).get();
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