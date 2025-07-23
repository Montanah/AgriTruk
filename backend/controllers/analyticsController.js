const Analytics = require('../models/Analytics');

const createAnalytics = async (req, res) => {
  try {
    const date = req.params.date; // Use date from URL parameter
    if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD',
      });
    }

    const analytics = await Analytics.create(date);
    res.status(201).json({
      success: true,
      message: 'Analytics data processed and created successfully',
      data: analytics,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Error processing analytics data: ${error.message}`,
    });
  }
};

const getAnalytics = async (req, res) => {
  try {
    const date = req.params.date;
    if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD',
      });
    }

    const analytics = await Analytics.get(date);
    res.status(200).json({
      success: true,
      message: 'Analytics data retrieved successfully',
      data: analytics,
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: `Error retrieving analytics data: ${error.message}`,
    });
  }
};

const updateAnalytics = async (req, res) => {
  try {
    const date = req.params.date;
    if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD',
      });
    }

    const updates = {
      dailyActiveUsers: req.body.dailyActiveUsers,
      bookingCompletionRate: req.body.bookingCompletionRate,
      totalRevenue: req.body.totalRevenue,
      failedPayments: req.body.failedPayments,
      activeTransporters: req.body.activeTransporters,
      pendingRequests: req.body.pendingRequests,
      activeBookings: req.body.activeBookings,
      activeSubscribers: req.body.activeSubscribers,
      newUsers: req.body.newUsers,
      mpesaSuccessRate: req.body.mpesaSuccessRate,
      airtelSuccessRate: req.body.airtelSuccessRate,
      paystackSuccessRate: req.body.paystackSuccessRate,
      avgCompletionTime: req.body.avgCompletionTime,
    };

    const validUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    );

    if (Object.keys(validUpdates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields provided for update',
      });
    }

    const updated = await Analytics.update(date, validUpdates);
    res.status(200).json({
      success: true,
      message: 'Analytics data updated successfully',
      data: updated,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Error updating analytics data: ${error.message}`,
    });
  }
};

const getAnalyticsRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate || !startDate.match(/^\d{4}-\d{2}-\d{2}$/) || !endDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid startDate or endDate format. Use YYYY-MM-DD',
      });
    }

    const analytics = await Analytics.getRange(startDate, endDate);
    res.status(200).json({
      success: true,
      message: 'Analytics data for range retrieved successfully',
      data: analytics,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Error retrieving analytics range: ${error.message}`,
    });
  }
};

module.exports = {
  createAnalytics,
  getAnalytics,
  updateAnalytics,
  getAnalyticsRange,
};