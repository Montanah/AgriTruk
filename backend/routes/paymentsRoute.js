const express = require('express');
const router = express.Router();
const { processMpesaPayment, processCardPayment, mpesaCallback, stripeCallback } = require('../services/pay');


router.post("/mpesa", async (req, res) => {
  try {
    const { phone, amount, accountRef } = req.body;
    const response = await processMpesaPayment({ phone, amount, accountRef });
    res.json({ success: true, data: response });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/stripe", async (req, res) => {
  try {
    const { amount, currency } = req.body;
    const response = await processCardPayment({ amount, currency });
    res.json({ success: true, data: response });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/mpesa/callback", async (req, res) => {
  try {
    const response = await mpesaCallback(req, res);
    res.json({ success: true, data: response });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    const response = await stripeCallback(req, res);
    res.json({ success: true, data: response });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


module.exports = router;