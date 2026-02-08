// middleware/subscriptionMiddleware.js
const SubscriptionService = require('../services/subscriptionService');
const Company = require('../models/Company');

const subscriptionMiddleware = {
  /**
   * Middleware to check if user has active subscription
   */
  async requireActiveSubscription(req, res, next) {
    try {
      console.log('🚀 SUBSCRIPTION MIDDLEWARE HIT!');
      const userId = req.user.uid || req.body.userId;
      console.log('User ID:', userId);
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User authentication required',
        });
      }

      const userRole = req.user.role;
      console.log('User Role:', userRole);


      // Skip middleware for admin users
      if (userRole === 'admin') {
        return next();
      }

      const status = await SubscriptionService.getSubscriptionStatus(userId);
      
      if (!status.hasSubscription) {
        return res.status(403).json({
          success: false,
          message: 'Active subscription required',
          requiresSubscription: true,
        });
      }

      // Attach subscription info to request
      req.subscription = status;
      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error verifying subscription',
        error: error.message,
      });
    }
  },

  /**
   * Middleware to validate driver addition
   */
  async validateDriverAddition(req, res, next) {
    try {
      const userId = req.user.uid || req.body.userId;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User authentication required',
        });
      }

      const userRole = req.user.role;
      console.log('User Role:', userRole);


      // Skip middleware for admin users
      if (userRole === 'admin') {
        return next();
      }

      // const { companyId } = req.body;
      const companyData = await Company.getByTransporter(userId);
    
      const companyId =  companyData[0].companyId;
      
      const validation = await SubscriptionService.canAddDriver(companyId);
      
      if (!validation.allowed) {
        return res.status(403).json({
          success: false,
          message: validation.reason,
          limitReached: true,
          currentCount: validation.currentCount,
          maxAllowed: validation.maxAllowed,
        });
      }

      req.driverValidation = validation;
      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error validating driver addition',
        error: error.message,
      });
    }
  },

  /**
   * Middleware to validate vehicle addition
   */
  async validateVehicleAddition(req, res, next) {
    try {
      const userId = req.user.uid || req.body.userId;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User authentication required',
        });
      }

      const userRole = req.user.role;
      
      // Skip middleware for admin users
      if (userRole === 'admin') {
        return next();
      }

      // const { companyId } = req.body;
      const companyData = await Company.getByTransporter(userId);
  
      const companyId =  companyData[0].companyId;
      
      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: 'companyId is required',
        });
      }

      const validation = await SubscriptionService.canAddVehicle(companyId);
      
      console.log(validation);
      if (!validation.allowed) {
        return res.status(403).json({
          success: false,
          message: validation.reason,
          limitReached: true,
          currentCount: validation.currentCount,
          maxAllowed: validation.maxAllowed,
        });
      }

      req.vehicleValidation = validation;
      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error validating vehicle addition',
        error: error.message,
      });
    }
  },

  /**
   * Middleware to check feature access
   */
  async checkFeatureAccess(featureName) {
    return async (req, res, next) => {
      try {
        if (!req.subscription) {
          return res.status(403).json({
            success: false,
            message: 'Subscription information not available',
          });
        }

        const hasFeature = req.subscription.plan.features[featureName];
        
        if (!hasFeature) {
          return res.status(403).json({
            success: false,
            message: `Feature '${featureName}' not available in your plan`,
            upgradeRequired: true,
            currentPlan: req.subscription.plan.name,
          });
        }

        next();
      } catch (error) {
        res.status(500).json({
          success: false,
          message: 'Error checking feature access',
          error: error.message,
        });
      }
    };
  },
};

module.exports = subscriptionMiddleware;