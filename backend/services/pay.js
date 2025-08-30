import axios from "axios";
import moment from "moment";
import Stripe from "stripe";
import Subscribers from "../models/Subscribers.js";
import Payment from "../models/Payment.js";

// Initialize Stripe
const stripeKey = new Stripe(process.env.STRIPE_SECRET_KEY);

async function getMpesaToken() {
  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;

  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");

  const response = await axios.get(
    "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
    {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    }
  );

  return response.data.access_token;
}

export async function processMpesaPayment({ phone, amount, accountRef }) {
  try {
    const token = await getMpesaToken();

    const shortCode = process.env.MPESA_SHORTCODE;
    const passkey = process.env.MPESA_PASSKEY;
    const timestamp = moment().format("YYYYMMDDHHmmss");
    const password = Buffer.from(`${shortCode}${passkey}${timestamp}`).toString("base64");

    const payload = {
      BusinessShortCode: shortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: amount,
      PartyA: phone,
      PartyB: shortCode,
      PhoneNumber: phone,
      CallBackURL: process.env.MPESA_CALLBACK_URL,
      AccountReference: accountRef || "Payment",
      TransactionDesc: "Payment via STK Push",
    };

    const response = await axios.post(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      payload,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    // Return initial STK push response
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error("M-Pesa Error:", error.response?.data || error.message);
    return { success: false, message: "M-Pesa Payment Failed" };
  }
}

export async function mpesaCallback(req, res) {
  let responseSent = false;

  try {
    // const stk = req.body.Body.stkCallback;
    const stk = req.body;
 
   const paymentResponse = await Payment.getByRequestID(stk.CheckoutRequestID);
    if (!paymentResponse) {
      throw new Error('Payment record not found');
    }
    console.log("callback pending paymentId", paymentResponse.paymentId);

    if (!paymentResponse.payerId) {
      throw new Error('Payer ID not found in payment response');
    }
    const subscriber = await Subscribers.getByUserId(paymentResponse.payerId);
    if (!subscriber) {
      throw new Error('Subscriber record not found');
    }

    console.log("callback pending subscriber", subscriber.id);

    if (stk.ResultCode === 0) {
      const meta = stk.CallbackMetadata.Item.reduce((acc, i) => {
        acc[i.Name] = i.Value;
        return acc;
      }, {});

      // Update payment record
      await Payment.update(paymentResponse.paymentId, {
        transDate: meta.TransactionDate,
        status: "success",
        mpesaReference: meta.MpesaReceiptNumber,
        paidAt: new Date(),
      });
      
      // Create subscriber record
      await Subscribers.update(subscriber.id, {
        isActive: true,
        paymentStatus: "success",
        endDate: paymentResponse.endDate,
        transactionId: meta.MpesaReceiptNumber,
      });
       
    } else {
      console.log("Updating payment:", paymentResponse.paymentId, {
        status: "failed",
        failureReason: stk.ResultDesc,
      });
      await Payment.update(paymentResponse.paymentId, {
        status: "failed",
        failureReason: stk.ResultDesc,
      });
    }

    res.json({ success: true });
    responseSent = true;
  } catch (err) {
    if (!responseSent) {
      console.error("M-Pesa callback error:", err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
}

export async function processCardPayment({ amount, currency = "usd" }) {
  try {
    const paymentIntent = await stripeKey.paymentIntents.create({
      amount: amount * 100,
      currency,
      automatic_payment_methods: { enabled: true },
    });

    return {
      clientSecret: paymentIntent.client_secret,
    };
  } catch (error) {
    console.error("Stripe Error:", error.message);
    throw new Error("Card Payment Failed");
  }
}

export async function stripeCallback(req, res) {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripeKey.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object;

    await Payment.update(intent.id, {
      status: "success",
      receiptUrl: intent.charges.data[0]?.receipt_url,
      paidAt: new Date(),
    });

    const payment = await Payment.getByRequestID(intent.id);

    await Subscribers.create({
      userId: payment.payerId,
      planId: payment.planId,
      startDate: new Date().toISOString(),
      endDate: payment.endDate,
      isActive: true,
      paymentStatus: "success",
      transactionId: intent.id,
    });
  }

  res.json({ received: true });
}