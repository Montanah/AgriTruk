const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middlewares/authMiddleware');
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
  deactivateDriver
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
router.patch('/:id/activate', authenticateToken, requireRole('transporter'), activateDriver);
router.patch('/:id/deactivate', authenticateToken, requireRole('transporter'), deactivateDriver);

module.exports = router;
