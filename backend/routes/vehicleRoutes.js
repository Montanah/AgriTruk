const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middlewares/authMiddleware');
const { uploadAny } = require('../middlewares/uploadMiddleware');
const { validateVehicleCreation, validateVehicleUpdate } = require('../middlewares/validationMiddleware');
const {
  createVehicle,
  getVehicles,
  getVehicleById,
  updateVehicle,
  deleteVehicle,
  assignDriverToVehicle,
  unassignDriverFromVehicle
} = require('../controllers/vehicleController');

// Vehicle management routes for companies
router.post('/', authenticateToken, requireRole('transporter'), uploadAny, validateVehicleCreation, createVehicle);
router.get('/', authenticateToken, requireRole('transporter'), getVehicles);
router.get('/:id', authenticateToken, requireRole('transporter'), getVehicleById);
router.put('/:id', authenticateToken, requireRole('transporter'), uploadAny, validateVehicleUpdate, updateVehicle);
router.delete('/:id', authenticateToken, requireRole('transporter'), deleteVehicle);

// Driver assignment routes
router.post('/:id/assign-driver', authenticateToken, requireRole('transporter'), assignDriverToVehicle);
router.delete('/:id/unassign-driver', authenticateToken, requireRole('transporter'), unassignDriverFromVehicle);

module.exports = router;
