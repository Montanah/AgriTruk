const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/requireRole');
const { authorize } = require('../middlewares/adminAuth');

/**
 * @swagger
 * /api/admin/fix/trial-subscriptions:
 *   post:
 *     tags: [Admin Fixes]
 *     summary: Fix trial subscription durations (ADMIN ONLY)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Fix completed successfully
 *       403:
 *         description: Unauthorized - Admin only
 */
router.post('/trial-subscriptions', 
  authenticateToken, 
  requireRole('admin'),
  authorize,
  async (req, res) => {
    try {
      console.log('🔧 Starting trial subscription fix via API...');
      
      // Import the fix function
      const fixAllTrialSubscriptions = require('../fix-all-trial-subscriptions');
      
      // Run the fix
      await fixAllTrialSubscriptions();
      
      res.status(200).json({
        success: true,
        message: 'Trial subscriptions fixed successfully',
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ Error running fix:', error);
      res.status(500).json({
        success: false,
        message: 'Error running fix',
        error: error.message
      });
    }
  }
);

module.exports = router;
