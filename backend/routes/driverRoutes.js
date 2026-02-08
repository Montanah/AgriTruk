const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/requireRole');
const { uploadAny } = require('../middlewares/uploadMiddleware');
const { validateDriverCreation, validateDriverUpdate } = require('../middlewares/validationMiddleware');
const {
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
  getDriverProfile,
  checkIfDriver,
  updateDriverProfile,
  toggleDriverAvailability
} = require('../controllers/driverController');

// Driver management routes for companies
router.post('/', authenticateToken, requireRole('transporter'), uploadAny, validateDriverCreation, createDriver);
router.get('/', authenticateToken, requireRole('transporter'), getDrivers);

// Driver authentication and profile routes - MUST BE BEFORE /:id routes to avoid route conflicts
router.post('/verify', authenticateToken, verifyDriver);
// Driver profile - allow both driver and transporter roles (drivers access their own profile)
router.get('/profile', authenticateToken, requireRole(['driver', 'transporter']), getDriverProfile);
// Update driver profile - allow drivers to update their own profile
router.put('/profile', authenticateToken, requireRole(['driver']), updateDriverProfile);
// Check if user is a driver (for routing - requires authentication but no specific role)
router.get('/check/:userId', authenticateToken, checkIfDriver);

// Driver status management
router.patch('/:id/approve', authenticateToken, requireRole('transporter'), approveDriver);
router.patch('/:id/reject', authenticateToken, requireRole('transporter'), rejectDriver);
// Activate driver - expects body with { emailType, companyEmail, sendCredentials }
router.patch('/:id/activate', authenticateToken, requireRole('transporter'), activateDriver);
router.patch('/:id/deactivate', authenticateToken, requireRole('transporter'), deactivateDriver);

// These /:id routes MUST come AFTER specific routes like /profile and /check/:userId
router.get('/:id', authenticateToken, requireRole('transporter'), getDriverById);
router.put('/:id', authenticateToken, requireRole('transporter'), uploadAny, validateDriverUpdate, updateDriver);
router.delete('/:id', authenticateToken, requireRole('transporter'), deleteDriver);

// Driver availability management
router.post('/toggle-availability', authenticateToken, requireRole('driver'), toggleDriverAvailability);

module.exports = router;
