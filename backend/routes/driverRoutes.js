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
  toggleDriverAvailability
} = require('../controllers/driverController');

// Driver management routes for companies
router.post('/', authenticateToken, requireRole('transporter'), uploadAny, validateDriverCreation, createDriver);
router.get('/', authenticateToken, requireRole('transporter'), getDrivers);
router.get('/:id', authenticateToken, requireRole('transporter'), getDriverById);
router.put('/:id', authenticateToken, requireRole('transporter'), uploadAny, validateDriverUpdate, updateDriver);
router.delete('/:id', authenticateToken, requireRole('transporter'), deleteDriver);

// Driver status management
router.patch('/:id/approve', authenticateToken, requireRole('transporter'), approveDriver);
router.patch('/:id/reject', authenticateToken, requireRole('transporter'), rejectDriver);
// Activate driver - expects body with { emailType, companyEmail, sendCredentials }
router.patch('/:id/activate', authenticateToken, requireRole('transporter'), activateDriver);
router.patch('/:id/deactivate', authenticateToken, requireRole('transporter'), deactivateDriver);

// Driver authentication and profile routes
router.post('/verify', authenticateToken, verifyDriver);
router.get('/profile', authenticateToken, getDriverProfile);
// Check if user is a driver (for routing - requires authentication but no specific role)
router.get('/check/:userId', authenticateToken, checkIfDriver);

// Driver availability management
router.post('/toggle-availability', authenticateToken, requireRole('driver'), toggleDriverAvailability);

module.exports = router;
