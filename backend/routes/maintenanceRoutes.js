const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/requireRole');
const {
  getMaintenanceRecords,
  addMaintenanceRecord,
  updateMaintenanceStatus,
  deleteMaintenanceRecord
} = require('../controllers/maintenanceController');

// Maintenance management routes for companies
router.get('/', authenticateToken, requireRole('transporter'), getMaintenanceRecords);
router.post('/', authenticateToken, requireRole('transporter'), addMaintenanceRecord);
router.patch('/:id/status', authenticateToken, requireRole('transporter'), updateMaintenanceStatus);
router.delete('/:id', authenticateToken, requireRole('transporter'), deleteMaintenanceRecord);

module.exports = router;
