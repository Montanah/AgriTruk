const Payment = require("../models/Payment");
const Users = require("../models/User");
const SubscriptionPlans = require("../models/SubscriptionsPlans");
const { formatTimestamps } = require("../utils/formatData");
const { logAdminActivity } = require("../utils/activityLogger");

exports.getAllTransactions = async (req, res) => {
  try {
    const transactions = await Payment.getAll();

    // Attach payer user details
    for (const tran of transactions) {
      const user = await Users.get(tran.payerId);
      tran.user = formatTimestamps(user);
    }

    // ---- ANALYTICS SECTION ----
    const totalTransactions = transactions.length;

    const successful = transactions.filter(t => t.status === 'paid');
    const failed = transactions.filter(t => t.status === 'failed');
    const pending = transactions.filter(t => t.status === 'pending');

    const totalRevenue = successful.reduce((sum, t) => sum + (t.amount || 0), 0);
    const mpesaRevenue = successful
      .filter(t => t.method === 'mpesa')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    const cardRevenue = successful
      .filter(t => t.method === 'card')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const successRate = totalTransactions > 0 
      ? ((successful.length / totalTransactions) * 100).toFixed(1) 
      : 0;

    const avgRevenuePerUser = successful.length > 0 
      ? (totalRevenue / successful.length).toFixed(2) 
      : 0;

    // Trend data (based on creation date)
    // const revenueTrends = {};
    // for (const t of successful) {
    //   const dateKey = new Date(t.createdAt).toISOString().split('T')[0]; // YYYY-MM-DD
    //   if (!revenueTrends[dateKey]) revenueTrends[dateKey] = 0;
    //   revenueTrends[dateKey] += t.amount || 0;
    // }

    // Payment method distribution
    const paymentDistribution = {
      mpesa: successful.filter(t => t.method === 'mpesa').length,
      card: successful.filter(t => t.method === 'card').length,
      other: successful.filter(
        t => t.method !== 'mpesa' && t.method !== 'card'
      ).length,
    };

    // Log admin activity
    await logAdminActivity(req.user.uid, 'get_all_payments', req);

    // ---- RESPONSE ----
    res.status(200).json({
      success: true,
      message: 'Transactions retrieved successfully',
      summary: {
        totalTransactions,
        successful: successful.length,
        failed: failed.length,
        pending: pending.length,
        totalRevenue: `KSH ${totalRevenue.toFixed(2)}`,
        successRate: `${successRate}%`,
        mpesaRevenue: `KSH ${mpesaRevenue.toFixed(2)}`,
        cardRevenue: `KSH ${cardRevenue.toFixed(2)}`,
        avgRevenuePerUser: `KSH ${avgRevenuePerUser}`,
        failedPayments: failed.length,
        paymentDistribution,
      },
      data: formatTimestamps(transactions),
      count: transactions.length,
    });

  } catch (error) {
    console.error('Transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

exports.getTransactionById = async (req, res) => {
    try {
        const paymentId = req.params.id;
       
        const payment = await Payment.get(paymentId);
       
        if (payment) {
            const user = await Users.get(payment.payerId);
            payment.user = formatTimestamps(user);
            await logAdminActivity(req.user.uid, 'get_payment', req);
            res.status(200).json({ success: true, message: 'Payment retrieved', data: formatTimestamps(payment) });
        } else {
            res.status(404).json({ success: false, message: 'Payment not found' });
        }
    } catch (error) {
        
    }
};