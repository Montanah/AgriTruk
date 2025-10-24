const RecruiterSubscriptionService = require('../services/RecruiterSubscriptionService');
const RecruiterPlans = require('../models/RecruiterPlans');
const RecruiterSubscribers = require('../models/RecruiterSubscribers');
const User = require('../models/User');

const RecruiterSubscriptionController = {

  /**
   * Get all available plans
   */
  async getPlans(req, res) {
    try {
      const plans = await RecruiterPlans.getAll();
      
      res.status(200).json({
        success: true,
        plans
      });
    } catch (error) {
      console.error('Error fetching plans:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch plans',
        error: error.message
      });
    }
  },

  /**
   * Get a specific plan
   */
  async getPlan(req, res) {
    try {
      const { planId } = req.params;
      const plan = await RecruiterPlans.get(planId);
      
      res.status(200).json({
        success: true,
        plan
      });
    } catch (error) {
      console.error('Error fetching plan:', error);
      res.status(404).json({
        success: false,
        message: 'Plan not found',
        error: error.message
      });
    }
  },

  /**
   * Start a new subscription
   */
  async startSubscription(req, res) {
    try {
      const userId = req.user.uid || req.body.userId;
      const { planId, paymentData } = req.body;
      
      if (!userId || !planId) {
        return res.status(400).json({
          success: false,
          message: 'userId and planId are required'
        });
      }

      // Verify user exists and is a recruiter
      const user = await User.get(userId);
      if (!user || user.role !== 'recruiter') {
        return res.status(403).json({
          success: false,
          message: 'Invalid user or not a recruiter'
        });
      }

      const result = await RecruiterSubscriptionService.startSubscription(
        userId, 
        planId, 
        paymentData
      );

      // Update user's subscription status
      await User.update(userId, { hasActiveSubscription: true });

      res.status(201).json(result);
    } catch (error) {
      console.error('Error starting subscription:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to start subscription'
      });
    }
  },

  /**
   * Get subscription status
   */
  async getSubscriptionStatus(req, res) {
    try {
      const { userId } = req.params;

      const status = await RecruiterSubscriptionService.getSubscriptionStatus(userId);

      res.status(200).json({
        success: true,
        ...status
      });
    } catch (error) {
      console.error('Error getting subscription status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get subscription status',
        error: error.message
      });
    }
  },

  /**
   * Check if user can contact driver
   */
  async checkDriverContactLimit(req, res) {
    try {
      const { userId } = req.params;

      const result = await RecruiterSubscriptionService.canContactDriver(userId);

      res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Error checking driver contact limit:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check driver contact limit',
        error: error.message
      });
    }
  },

  /**
   * Check if user can post job
   */
  async checkJobPostLimit(req, res) {
    try {
      const { userId } = req.params;

      const result = await RecruiterSubscriptionService.canPostJob(userId);

      res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Error checking job post limit:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check job post limit',
        error: error.message
      });
    }
  },

  /**
   * Record driver contact (increment usage)
   */
  async recordDriverContact(req, res) {
    try {
      const { userId } = req.body;

      // First check if allowed
      const canContact = await RecruiterSubscriptionService.canContactDriver(userId);
      
      if (!canContact.allowed) {
        return res.status(403).json({
          success: false,
          message: canContact.reason
        });
      }

      // Increment usage
      await RecruiterSubscriptionService.incrementUsage(userId, 'driverContacts');

      res.status(200).json({
        success: true,
        message: 'Driver contact recorded',
        remaining: canContact.remaining ? canContact.remaining - 1 : null
      });
    } catch (error) {
      console.error('Error recording driver contact:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to record driver contact',
        error: error.message
      });
    }
  },

  /**
   * Record job post (increment usage)
   */
  async recordJobPost(req, res) {
    try {
      const { userId } = req.body;

      // First check if allowed
      const canPost = await RecruiterSubscriptionService.canPostJob(userId);
      
      if (!canPost.allowed) {
        return res.status(403).json({
          success: false,
          message: canPost.reason
        });
      }

      // Increment usage
      await RecruiterSubscriptionService.incrementUsage(userId, 'activeJobPosts');

      res.status(200).json({
        success: true,
        message: 'Job post recorded',
        remaining: canPost.remaining ? canPost.remaining - 1 : null
      });
    } catch (error) {
      console.error('Error recording job post:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to record job post',
        error: error.message
      });
    }
  },

  /**
   * Close job post (decrement usage)
   */
  async closeJobPost(req, res) {
    try {
      const { userId } = req.body;

      await RecruiterSubscriptionService.decrementUsage(userId, 'activeJobPosts');

      res.status(200).json({
        success: true,
        message: 'Job post closed successfully'
      });
    } catch (error) {
      console.error('Error closing job post:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to close job post',
        error: error.message
      });
    }
  },

  /**
   * Upgrade subscription
   */
  async upgradeSubscription(req, res) {
    try {
      const userId = req.user.uid || req.body.userId;
      const { newPlanId, paymentData } = req.body;

      if (!userId || !newPlanId) {
        return res.status(400).json({
          success: false,
          message: 'userId and newPlanId are required'
        });
      }

      const result = await RecruiterSubscriptionService.upgradeSubscription(
        userId,
        newPlanId,
        paymentData
      );

      res.status(200).json(result);
    } catch (error) {
      console.error('Error upgrading subscription:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to upgrade subscription'
      });
    }
  },

  /**
   * Cancel subscription
   */
  async cancelSubscription(req, res) {
    try {
      const { userId } = req.params;
      const { reason } = req.body;

      const result = await RecruiterSubscriptionService.cancelSubscription(
        userId,
        reason || 'User requested cancellation'
      );

      // Update user's subscription status
      await User.update(userId, { hasActiveSubscription: false });

      res.status(200).json(result);
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to cancel subscription'
      });
    }
  },

  /**
   * Get subscription history
   */
  async getSubscriptionHistory(req, res) {
    try {
      const { userId } = req.params;

      const subscriptions = await RecruiterSubscribers.getAllByUserId(userId);

      res.status(200).json({
        success: true,
        subscriptions
      });
    } catch (error) {
      console.error('Error getting subscription history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get subscription history',
        error: error.message
      });
    }
  },

  /**
   * Admin: Create/Update plans
   */
  async createPlan(req, res) {
    try {
      const planData = req.body;

      const plan = await RecruiterPlans.create(planData);

      res.status(201).json({
        success: true,
        message: 'Plan created successfully',
        plan
      });
    } catch (error) {
      console.error('Error creating plan:', error);
      res.status(400).json({
        success: false,
        message: 'Failed to create plan',
        error: error.message
      });
    }
  },

  /**
   * Admin: Update plan
   */
  async updatePlan(req, res) {
    try {
      const { planId } = req.params;
      const updates = req.body;

      const plan = await RecruiterPlans.update(planId, updates);

      res.status(200).json({
        success: true,
        message: 'Plan updated successfully',
        plan
      });
    } catch (error) {
      console.error('Error updating plan:', error);
      res.status(400).json({
        success: false,
        message: 'Failed to update plan',
        error: error.message
      });
    }
  },

  /**
   * Admin: Delete plan
   */
  async deletePlan(req, res) {
    try {
      const { planId } = req.params;

      await RecruiterPlans.delete(planId);

      res.status(200).json({
        success: true,
        message: 'Plan deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting plan:', error);
      res.status(400).json({
        success: false,
        message: 'Failed to delete plan',
        error: error.message
      });
    }
  },
};

module.exports = RecruiterSubscriptionController;