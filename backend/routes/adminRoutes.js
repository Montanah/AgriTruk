const express = require('express');
const adminController = require('../controllers/adminController');
const { authenticateToken} = require('../middlewares/authMiddleware');
const requireRole = require("../middlewares/requireRole");
const router = express.Router();


/**
 * @swagger
 * tags:
 *   - name: Admin 
 *     description: Admin operations for managing transporters
 */


module.exports = router;
