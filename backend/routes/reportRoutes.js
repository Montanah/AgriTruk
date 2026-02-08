const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/requireRole');
const {
  getReports,
  generateReport,
  downloadReport
} = require('../controllers/reportController');

// Report management routes for companies
router.get('/', authenticateToken, requireRole('transporter'), getReports);
router.post('/generate', authenticateToken, requireRole('transporter'), generateReport);
router.get('/:id/download', authenticateToken, requireRole('transporter'), downloadReport);

module.exports = router;
