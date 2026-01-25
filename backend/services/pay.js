import axios from "axios";
import moment from "moment";
import Stripe from "stripe";
import Subscribers from "../models/Subscribers.js";
import SubscriptionPlans from "../models/SubscriptionsPlans.js";
import Payment from "../models/Payment.js";
import admin from 'firebase-admin';
import  sendEmail  from "../utils/sendEmail.js";
import { generateEmailTemplate } from "../utils/sendMailTemplate.js";
import User from "../models/User.js";
import { uploadImage } from '../utils/upload.js';
import pdf from 'html-pdf';
import fs from 'fs/promises'

const db = admin.firestore(); 
// Initialize Stripe with error handling
let stripeKey = null;
try {
  if (process.env.STRIPE_SECRET_KEY) {
    stripeKey = new Stripe(process.env.STRIPE_SECRET_KEY);
  } else {
    console.warn('⚠️ STRIPE_SECRET_KEY not found - Stripe functionality disabled');
  }
} catch (error) {
  console.error('❌ Failed to initialize Stripe:', error.message);
  console.warn('⚠️ Stripe functionality disabled');
}

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

// export async function mpesaCallback(req, res) {
//   try {
//     const stk = req.body.Body.stkCallback;
//   //  const stk = req.body;
 
//    const paymentResponse = await Payment.getByRequestID(stk.CheckoutRequestID);
//     if (!paymentResponse) {
//       console.error('Payment record not found');
//       return res.status(400).send('Payment record not found');
//     }

//     if (!paymentResponse.payerId) {
//       console.error('Payer ID not found in payment response');
//       return res.status(400).send('Payer ID not found in payment response');
//     }
//     const subscriber = await Subscribers.getByUserId(paymentResponse.payerId);
//     if (!subscriber) {
//       console.error('Subscriber record not found');
//       return res.status(400).send('Subscriber record not found');
//     }
    
//     if (stk.ResultCode === 0) {
//       const meta = stk.CallbackMetadata.Item.reduce((acc, i) => {
//         acc[i.Name] = i.Value;
//         return acc;
//       }, {});

//       // Update payment record
//       await Payment.update(paymentResponse.paymentId, {
//         transDate: meta.TransactionDate,
//         status: "paid",
//         mpesaReference: meta.MpesaReceiptNumber,
//         paidAt: new Date(),
//         subscriberId: subscriber.id
//       });
        
        
//       // Get updated records
//       const updatedPayment = await Payment.get(paymentResponse.paymentId);
//       const updatedSubscriber = await Subscribers.get(subscriber.id);
//       const plan = await SubscriptionPlans.getSubscriptionPlan(updatedSubscriber.planId);

//       const endDate = new Date(updatedPayment.paidAt) + plan.duration * 30 * 24 * 60 * 60 * 1000;
//        // Update subscriber record
//       await Subscribers.update(subscriber.id, {
//         isActive: true,
//         paymentStatus: "paid",
//         endDate: endDate,
//         transactionId: meta.MpesaReceiptNumber,
//       });
      
//       // Generate PDF receipt
//       try {
//         const receipt = await PDFService.generateReceipt(
//           updatedPayment, 
//           updatedSubscriber, 
//           plan
//         );
        
//         // Send email with receipt
//         if (updatedPayment.email) {
//           const emailSent = await sendEmail({
//             to: updatedPayment.email,
//             subject: "Receipt for your payment",
//             text: `You have successfully made a payment of Ksh ${updatedPayment.amount}. Your receipt is attached.`,
//             html: await generateEmailTemplate(
//               updatedSubscriber,
//               updatedPayment
//             )
//           }
//           );
//           if (emailSent) { 
//             // Update payment with receipt info
//             await Payment.update(paymentResponse.paymentId, {
//               receiptUrl: receipt.url,
//               receiptSent: true,
//               receiptSentAt: new Date()
//             });
//           } else {
//             console.error("Failed to send receipt email");
//           }
//           } else {
//           console.error("No email address for subscriber, skipping email");
//         }
//       } catch (pdfError) {
//         console.error("Error generating PDF receipt:", pdfError);
//         // Don't fail the whole process if PDF generation fails
//       }
//     } else {
//       if (paymentResponse.status !== 'failed') {
//         await Payment.update(paymentResponse.paymentId, {
//           status: "failed",
//           failureReason: stk.ResultDesc,
//         });


//       } else {
//         console.error("Payment already marked as failed, skipping update:", paymentResponse.paymentId);
//       }
//     }

//     // Send response only once
//     res.json({ success: true, message: 'Callback processed successfully' });
//   } catch (err) {
//      console.error("M-Pesa callback error:", err);
    
//     // Only send error response if not already sent
//     if (!res.headersSent) {
//       res.status(500).json({ success: false, message: err.message });
//     }
//   }
// }

export async function processCardPayment({ amount, currency = "usd" }) {
  try {
    if (!stripeKey) {
      throw new Error('Stripe not initialized - STRIPE_SECRET_KEY missing');
    }
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
    if (!stripeKey) {
      return res.status(500).send('Stripe not initialized - STRIPE_SECRET_KEY missing');
    }
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

export async function mpesaCallback(req, res) {
  let responseSent = false;

  try {
    const stk = req.body.Body.stkCallback;
   
    const paymentResponse = await Payment.getByRequestID(stk.CheckoutRequestID);
    if (!paymentResponse) throw new Error('Payment record not found');
    
    if (!paymentResponse.payerId) throw new Error('Payer ID not found');
    const subscriber = await Subscribers.getByUserId(paymentResponse.payerId);
    if (!subscriber) throw new Error('Subscriber record not found');

    const processPayment = async (status, meta = {}) => {
      const updateData = {
        status,
        ...(status === 'paid' && {
          transDate: meta.TransactionDate,
          mpesaReference: meta.MpesaReceiptNumber,
          paidAt: new Date(),
          subscriberId: subscriber.id,
        }),
        ...(status === 'failed' && { failureReason: stk.ResultDesc }),
      };
      await Payment.update(paymentResponse.paymentId, updateData);

      if (status === 'paid') {
        const updatedPayment = await Payment.get(paymentResponse.paymentId);
        const updatedSubscriber = await Subscribers.get(subscriber.id);
        const plan = await SubscriptionPlans.getSubscriptionPlan(updatedSubscriber.planId);
        const user = await User.get(updatedSubscriber.userId);

        const paidAtDate = updatedPayment.paidAt.toDate();  

        const endDate = new Date(paidAtDate);  
        endDate.setMonth(endDate.getMonth() + plan.duration);  

        await Subscribers.update(subscriber.id, {
          isActive: true,
          paymentStatus: 'paid',
          endDate: admin.firestore.Timestamp.fromDate(endDate),
          transactionId: meta.MpesaReceiptNumber,
        });

        const subUpdated = await Subscribers.get(subscriber.id);

        // Generate and upload receipt PDF
        const receiptHtml = await generateReceiptHtml(updatedPayment, subUpdated, plan, user);
        const filePath = `/tmp/receipt_${updatedPayment.mpesaReference || updatedPayment.paymentId}.pdf`;
        const options = {
          format: 'A4',
          border: {
            top: '0.4in',
            right: '0.4in',
            bottom: '0.6in',
            left: '0.4in',
          },
        };

        await new Promise((resolve, reject) => {
          pdf.create(receiptHtml, options).toFile(filePath, (err, result) => {
            if (err) reject(err);
            else resolve(result);
          });
        });

        const receiptUrl = await uploadImage(filePath, 'raw'); // Upload to Cloudinary
        // await fs.unlink(filePath); // Clean up temporary file

        if (receiptUrl) {
          await Payment.update(paymentResponse.paymentId, {
            receiptUrl,
            receiptSent: true,
            receiptSentAt: new Date(),
          });

          if (updatedPayment.email) {
            const emailSent = await sendEmail({
              to: updatedPayment.email,
              subject: 'Receipt for your payment',
              text: `You have successfully made a payment of Ksh ${updatedPayment.amount}. Your receipt is attached.`,
              html: await generateEmailTemplate(updatedPayment, updatedSubscriber),
              attachments: [
                {
                  filename: 'receipt.pdf',
                  path: filePath
                },
              ],
            });
            await fs.unlink(filePath); // Clean up
          } else {
            console.warn('No email address or receipt URL, skipping email');
          }
        } else {
          console.error('Failed to upload receipt to Cloudinary');
        }
      }
    };

    if (stk.ResultCode === 0) {
      const meta = stk.CallbackMetadata.Item.reduce((acc, i) => {
        acc[i.Name] = i.Value;
        return acc;
      }, {});
      await processPayment('paid', meta);
    } else {
      await processPayment('failed');
    }

    res.json({ success: true, message: 'Callback processed successfully' });
    responseSent = true;
  } catch (err) {
    if (!responseSent) {
      console.error('M-Pesa callback error:', err);
      res.status(500).json({ success: false, message: err.message });
    } else {
      console.warn('Response already sent, suppressing duplicate error response:', err);
    }
  }
}

// Helper function to generate receipt HTML
async function generateReceiptHtml(paymentData, subscriberData, planData, userData) {
  const companyName = 'TRUK AFRICA';
  const companyAddress = '123 NAIROBI';
  const companyPhone = '+254 758-594951';
  const companyEmail = 'info@trukafrica.com';
  const companyWebsite = 'www.trukafrica.com';
  const generatedDate = moment().format('MMM D, YYYY h:mm A');

  return `
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Payment Receipt</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 15px; color: #333; font-size: 10px; }
        .header {
          display: flex;
          align-items: center;
          margin-bottom: 15px;
          border-bottom: 2px solid #4a86e8;
          padding-bottom: 10px;
        }
        .company-info {
          flex: 1;
          text-align: center;
        }
        .company-name {
          font-size: 20px;
          font-weight: bold;
          color: #4a86e8;
          margin-bottom: 3px;
        }
        .report-info {
          text-align: right;
          font-size: 9px;
        }
        .logo {
          flex: 0 0 auto;
          margin-right: 20px;
        }
        .logo img {
          width: 60px;
          height: 60px;
          object-fit: contain;
        }
        .details {
          margin: 15px 0;
          padding: 10px;
          background-color: #f9f9f9;
          border-radius: 4px;
          font-size: 9px;
        }
        .footer {
          margin-top: 20px;
          text-align: center;
          font-size: 8px;
          color: #777;
          border-top: 1px solid #ddd;
          padding-top: 8px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">
          <img src="https://res.cloudinary.com/trukapp/image/upload/v1750965061/TRUK_Logo_zp8lv3.png" alt="TRUK Logo">
        </div>
        <div class="company-info">
          <div class="company-name">${companyName}</div>
          <div>${companyAddress}</div>
          <div>${companyPhone} | ${companyEmail}</div>
          <div>${companyWebsite}</div>
        </div>
        <div class="report-info">
          <div>Receipt</div>
          <div>Generated: ${generatedDate}</div>
        </div>
      </div>

      <div class="details">
        <div><strong>Receipt Number:</strong> ${paymentData.mpesaReference || paymentData.paymentId}</div>
        <div><strong>Payment Date:</strong> ${moment(paymentData.paidAt).format('MMM D, YYYY h:mm A')}</div>
        <div><strong>Payment Method:</strong> M-PESA</div>
        <div><strong>Plan:</strong> ${planData?.name || 'N/A'}</div>
        <div><strong>Amount:</strong> KES ${paymentData.amount || planData?.price || '0'}</div>
        <div><strong>Subscriber:</strong> ${userData.name || 'N/A'}</div>
        <div><strong>Email:</strong> ${paymentData.email || 'N/A'}</div>
        <div><strong>Phone:</strong> ${userData.phone || paymentData.phoneNumber || 'N/A'}</div>
        <div><strong>Start Date:</strong> ${moment(subscriberData.startDate).format('MMM D, YYYY')}</div>
        <div><strong>End Date:</strong> ${moment(subscriberData.endDate).format('MMM D, YYYY')}</div>
      </div>

      <div class="footer">
        ${companyName} - Confidential Receipt<br>Generated on ${generatedDate}
      </div>
    </body>
    </html>
  `;
}