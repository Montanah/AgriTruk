const express = require('express');
const router = express.Router();

const { uploadSingle } = require('../middleware/upload');
const uploadController = require('../controllers/uploadController');

// Optional: bring in your auth middleware if available
let authenticateToken = (req, res, next) => next();
try {
  // Attempt to load existing auth middleware if present in the project
  // eslint-disable-next-line global-require, import/no-unresolved
  authenticateToken = require('../middleware/authenticateToken');
} catch {}

router.post('/', authenticateToken, uploadSingle, uploadController.handleUpload);

module.exports = router;


