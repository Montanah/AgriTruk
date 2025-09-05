const Payment = require("../models/Payment");
const Users = require("../models/User");
const SubscriptionPlans = require("../models/SubscriptionsPlans");
const { formatTimestamps } = require("../utils/formatData");
const { logAdminActivity } = require("../utils/activityLogger");

exports.getAllTransactions = async (req, res) => {
    try {
        const trans = await Payment.getAll();

        console.log(trans);

        for (const tran of trans) {
            const user = await Users.get(tran.payerId);
            tran.user = formatTimestamps(user);
        }
        await logAdminActivity(req.user.uid, 'get_all_payments', req);
        res.status(200).json({ 
            success: true, 
            message: 'Subscribers retrieved', 
            data: formatTimestamps(trans),
            count: trans.length});
    } catch (error) {
        console.error('Subscribers error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

exports.getTransactionById = async (req, res) => {
    try {
        const paymentId = req.params.id;
        console.log(paymentId);
        const payment = await Payment.get(paymentId);
        console.log(payment);
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