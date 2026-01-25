const RecruiterSubscriptionService = require('../services/RecruiterSubscriptionService');

const subscriptionAccess = async (req, res, next) => {
  try {
    const userId = req.user.uid; 
   
    const userRole = req.user.role;
   
    // Skip middleware for admin users
    if (userRole === 'admin') {
      req.subscription = { unrestricted: true };
      return next();
    }

    // Get subscription status using your service
    const subscriptionStatus = await RecruiterSubscriptionService.getSubscriptionStatus(userId);
    
    if (!subscriptionStatus.hasSubscription) {
      return res.status(403).json({
        success: false,
        message: 'No active subscription found. Please subscribe to access drivers.',
        code: 'NO_ACTIVE_SUBSCRIPTION',
        subscriptionRequired: true
      });
    }

    const { subscription, plan, usage } = subscriptionStatus;

    // Check if subscription is active
    if (!subscription.isActive || subscription.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Your subscription is not active. Please check your payment status.',
        code: 'SUBSCRIPTION_INACTIVE',
        subscriptionStatus: subscription.status
      });
    }

    // Check if subscription has expired
    const daysRemaining = subscriptionStatus.daysRemaining;
    if (daysRemaining <= 0) {
      return res.status(403).json({
        success: false,
        message: 'Your subscription has expired. Please renew to continue accessing drivers.',
        code: 'SUBSCRIPTION_EXPIRED',
        expired: true
      });
    }

    // Check driver contact limits
    // const canContact = await RecruiterSubscriptionService.canContactDriver(userId);
    
    // if (!canContact.allowed) {
    //   return res.status(403).json({
    //     success: false,
    //     message: canContact.reason,
    //     code: 'DRIVER_CONTACT_LIMIT_REACHED',
    //     limit: canContact.maxAllowed,
    //     used: canContact.currentCount,
    //     remaining: 0,
    //     subscription: {
    //       plan: plan.name,
    //       daysRemaining: daysRemaining
    //     }
    //   });
    // }

    // Attach subscription info to request for use in controller
    req.subscription = {
      plan: plan,
      userSubscription: subscription,
      usage: usage,
      // contactsUsed: usage.driverContacts.current,
      // contactsRemaining: canContact.remaining || 'unlimited',
      daysRemaining: daysRemaining,
      // canContactDrivers: canContact.allowed
    };

    next();
  } catch (error) {
    console.error('Subscription access middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error checking subscription access',
      code: 'SUBSCRIPTION_CHECK_ERROR'
    });
  }
};

const recruiterAccess = async (req, res, next) => {
  try {
    const userId = req.user.uid; 
    
    const userRole = req.user.role;
    
    // Skip middleware for admin users
    if (userRole === 'admin') {
      req.subscription = { unrestricted: true };
      return next();
    }

    
    // Get subscription status using your service
    const subscriptionStatus = await RecruiterSubscriptionService.getSubscriptionStatus(userId);
    
    if (!subscriptionStatus.hasSubscription) {
      return res.status(403).json({
        success: false,
        message: 'No active subscription found. Please subscribe to access drivers.',
        code: 'NO_ACTIVE_SUBSCRIPTION',
        subscriptionRequired: true
      });
    }

    const { subscription, plan, usage } = subscriptionStatus;

    // Check if subscription is active
    if (!subscription.isActive || subscription.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Your subscription is not active. Please check your payment status.',
        code: 'SUBSCRIPTION_INACTIVE',
        subscriptionStatus: subscription.status
      });
    }

    // Check if subscription has expired
    const daysRemaining = subscriptionStatus.daysRemaining;
    if (daysRemaining <= 0) {
      return res.status(403).json({
        success: false,
        message: 'Your subscription has expired. Please renew to continue accessing drivers.',
        code: 'SUBSCRIPTION_EXPIRED',
        expired: true
      });
    }

    // Attach subscription info to request for use in controller
    req.subscription = {
      plan: plan,
      userSubscription: subscription,
      usage: usage,
      daysRemaining: daysRemaining,
      
    };

    next();
  } catch (error) {
    console.error('Subscription access middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error checking subscription access',
      code: 'SUBSCRIPTION_CHECK_ERROR'
    });
  }
}

module.exports = {
  subscriptionAccess, recruiterAccess
};