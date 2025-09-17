const { body, param, query, validationResult } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

// Login validation
const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  
  body('password')
    .optional()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
    
  body('firebaseToken')
    .optional()
    .isString()
    .withMessage('Firebase token must be a string'),
    
  // Either password or firebaseToken is required
  body().custom((body) => {
    if (!body.password && !body.firebaseToken) {
      throw new Error('Either password or firebaseToken is required');
    }
    return true;
  }),
  
  handleValidationErrors
];

// Create admin validation
const validateCreateAdmin = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
    
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
    
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must be at least 8 characters with uppercase, lowercase, and number'),
    
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Valid phone number is required'),
    
  body('permissions')
    .isArray({ min: 1 })
    .withMessage('At least one permission is required')
    .custom((permissions) => {
      const validPermissions = [
        'super_admin',
        'manage_users',
        'view_users',
        'manage_transporters',
        'view_transporters',
        'manage_bookings',
        'view_bookings',
        'manage_brokers',
        'view_brokers',
        'manage_companies',
        'view_companies',
        'manage_disputes',
        'view_disputes',
        'manage_reports',
        'view_reports',
        'manage_settings',
        'view_analytics'
      ];
      
      const invalidPermissions = permissions.filter(p => !validPermissions.includes(p));
      if (invalidPermissions.length > 0) {
        throw new Error(`Invalid permissions: ${invalidPermissions.join(', ')}`);
      }
      return true;
    }),
    
  handleValidationErrors
];

// Update admin validation
const validateUpdateAdmin = [
  param('adminId')
    .isString()
    .isLength({ min: 1 })
    .withMessage('Valid admin ID is required'),
    
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
    
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Valid phone number is required'),
    
  body('permissions')
    .optional()
    .isArray()
    .withMessage('Permissions must be an array')
    .custom((permissions) => {
      if (permissions && permissions.length > 0) {
        const validPermissions = [
          'super_admin',
          'manage_users',
          'view_users',
          'manage_products',
          'view_products',
          'manage_orders',
          'view_orders',
          'view_reports',
          'manage_settings',
          'view_analytics'
        ];
        
        const invalidPermissions = permissions.filter(p => !validPermissions.includes(p));
        if (invalidPermissions.length > 0) {
          throw new Error(`Invalid permissions: ${invalidPermissions.join(', ')}`);
        }
      }
      return true;
    }),
    
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'suspended'])
    .withMessage('Status must be active, inactive, or suspended'),
    
  handleValidationErrors
];

// Update profile validation
const validateUpdateProfile = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
    
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Valid phone number is required'),
    
  // Prevent updating sensitive fields
  body('email').not().exists().withMessage('Email cannot be updated'),
  body('permissions').not().exists().withMessage('Permissions cannot be updated'),
  body('status').not().exists().withMessage('Status cannot be updated'),
  body('adminId').not().exists().withMessage('Admin ID cannot be updated'),
  body('userId').not().exists().withMessage('User ID cannot be updated'),
    
  handleValidationErrors
];

// Get admins query validation
const validateGetAdmins = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
    
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
    
  query('status')
    .optional()
    .isIn(['active', 'inactive', 'suspended'])
    .withMessage('Status must be active, inactive, or suspended'),
    
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Search query must be between 1 and 50 characters'),
    
  handleValidationErrors
];

// Admin ID parameter validation
const validateAdminId = [
  param('adminId')
    .isString()
    .isLength({ min: 1 })
    .withMessage('Valid admin ID is required'),
    
  handleValidationErrors
];

module.exports = {
  validateLogin,
  validateCreateAdmin,
  validateUpdateAdmin,
  validateUpdateProfile,
  validateGetAdmins,
  validateAdminId,
  handleValidationErrors
};