exports.getMFATemplate = function (code, location, ip, device) {
  return `
    <div style="max-width: 500px; margin: auto; padding: 20px; font-family: Arial, sans-serif; border-radius: 10px; border: 1px solid #ddd;">
      <div style="text-align: center;">
        <img src="https://res.cloudinary.com/trukapp/image/upload/v1750965061/TRUK_Logo_zp8lv3.png" alt="Truk Logo" style="width: 60px; margin-bottom: 20px;" />
        <h2 style="color: #000;">Truk SignUp Verification</h2>
        <p>Use this code to authenticate your truk app Sign up.</p>
        <h1 style="letter-spacing: 5px; font-size: 40px; margin: 20px 0;">${code}</h1>
        <p>The code will remain valid for the <strong>next 10 minutes</strong>.</p>
        <hr style="margin: 30px 0;" />
        <div style="font-size: 14px; color: #555;">
          <p><strong>Requested from:</strong> ${device}</p>
          <p><strong>Location:</strong> ${location}</p>
          <p><strong>IP:</strong> ${ip}</p>
        </div>
      </div>
    </div>
  `;
};

exports.getSuccessTemplate = function (location, ip, device) {

  return `
    <div style="max-width: 500px; margin: auto; padding: 20px; font-family: Arial, sans-serif; border-radius: 10px; border: 1px solid #ddd;">
      <div style="text-align: center;">
        <img src="https://res.cloudinary.com/trukapp/image/upload/v1750965061/TRUK_Logo_zp8lv3.png" alt="Truk Logo" style="width: 60px; margin-bottom: 20px;" />
        <h2 style="color: #28a745;">✅ Email Verified Successfully</h2>
        <p style="font-size: 16px;">Your email has been successfully verified. You can now log in and continue using Truk services.</p>

        <a href="" style="display: inline-block; margin: 20px auto; padding: 12px 25px; background-color: #28a745; color: white; text-decoration: none; font-size: 16px; border-radius: 5px;">
          Go to Truk
        </a>

        <hr style="margin: 30px 0;" />
        <div style="font-size: 14px; color: #555;">
          <p><strong>Verified from:</strong> ${device}</p>
          <p><strong>Location:</strong> ${location}</p>
          <p><strong>IP Address:</strong> ${ip}</p>
        </div>

        <p style="margin-top: 30px; font-size: 13px; color: #999;">If you did not perform this verification, please secure your account immediately.</p>
      </div>
    </div>
  `;
};

exports.getResetPasswordTemplate = function (code, location, ip, device) {
  return `
    <div style="max-width: 500px; margin: auto; padding: 20px; font-family: Arial, sans-serif; border-radius: 10px; border: 1px solid #ddd;">
      <div style="text-align: center;">
        <img src="https://res.cloudinary.com/trukapp/image/upload/v1750965061/TRUK_Logo_zp8lv3.png" alt="Ubiquiti Logo" style="width: 60px; margin-bottom: 20px;" />
        <h2 style="color: #000;">Truk Password Reset</h2>
        <p>Use this code to reset your Truk account password.</p>
        <h1 style="letter-spacing: 5px; font-size: 40px; margin: 20px 0;">${code}</h1>
        <p>The code will remain valid for the <strong>next 10 minutes</strong>.</p>
        <hr style="margin: 30px 0;" />
        <div style="font-size: 14px; color: #555;">
          <p><strong>Requested from:</strong> ${device}</p>
          <p><strong>Location:</strong> ${location}</p>
          <p><strong>IP:</strong> ${ip}</p>
        </div>
      </div>
    </div>
  `;
};

exports.generateEmailTemplate = function  (paymentData, userData) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Thank You for Your Subscription!</h1>
          </div>
          <div class="content">
            <p>Hello ${userData.name || 'Valued Customer'},</p>
            <p>Your subscription payment has been processed successfully. Below are your payment details:</p>
            
            <h3>Payment Information</h3>
            <p><strong>Transaction ID:</strong> ${paymentData.mpesaReference}</p>
            <p><strong>Amount:</strong> KES ${paymentData.amount}</p>
            <p><strong>Date:</strong> ${new Date(paymentData.paidAt).toLocaleString()}</p>
            <p><strong>Payment Method:</strong> M-PESA</p>
            
            <p>Your receipt is attached to this email. Please keep it for your records.</p>
            
            <p>If you have any questions about your subscription, please contact our support team.</p>
            
            <p>Best regards,<br>The Truk Team</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Truk Limited. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
};

exports.getBrokerTemplate = function (userData, location, ip, device) {
  return `
    <div style="max-width: 500px; margin: auto; padding: 20px; font-family: Arial, sans-serif; border-radius: 10px; border: 1px solid #ddd;">
      <div style="text-align: center;">
        <img src="https://res.cloudinary.com/trukapp/image/upload/v1750965061/TRUK_Logo_zp8lv3.png" alt="Truk Logo" style="width: 60px; margin-bottom: 20px;" />
        <h2 style="color: #28a745;"> ${userData.name || User} Approved Successfully</h2>
        <p style="font-size: 16px;">Your account has been successfully approved. You can now log in and continue using Truk services.</p>

        <a href="" style="display: inline-block; margin: 20px auto; padding: 12px 25px; background-color: #28a745; color: white; text-decoration: none; font-size: 16px; border-radius: 5px;">
          Go to Truk
        </a>

        <hr style="margin: 30px 0;" />

        <p style="margin-top: 30px; font-size: 13px; color: #999;">All rights reserved &copy; ${new Date().getFullYear()} Truk</p>
      </div>
    </div>
  `;
};

exports.getRejectTemplate = function (subject, message, userData) {
  return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8">
      <title>${subject}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc3545; color: white; padding: 20px; text-align: center; }
        .content { background: #f9f9f9; padding: 20px; }
        .footer { background: #eee; padding: 10px; text-align: center; font-size: 12px; }
        .urgent { color: #dc3545; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <div style="max-width: 500px; margin: auto; padding: 20px; font-family: Arial, sans-serif; border-radius: 10px; border: 1px solid #ddd;">
          <div style="text-align: center;">
            <img src="https://res.cloudinary.com/trukapp/image/upload/v1750965061/TRUK_Logo_zp8lv3.png" 
                 alt="Truk Logo" 
                 style="width: 60px; margin-bottom: 20px;" />
            <h2 style="color: #28a745;"> Hello ${userData?.name || 'User'} </h2>
            <p style="font-size: 16px;">${message}</p>

            <a href="" style="display: inline-block; margin: 20px auto; padding: 12px 25px; background-color: #28a745; color: white; text-decoration: none; font-size: 16px; border-radius: 5px;">
              Go to Truk
            </a>

            <hr style="margin: 30px 0;" />

            <p style="margin-top: 30px; font-size: 13px; color: #999;">
              All rights reserved &copy; ${new Date().getFullYear()} Truk
            </p>
          </div>
        </div>
      </div>
    </body>
  </html>
  `;
};

exports.adminNotification = function( subject, message, userData) {
  return `
  <div style="max-width: 500px; margin: auto; padding: 20px; font-family: Arial, sans-serif; border-radius: 10px; border: 1px solid #ddd;">
      <div style="text-align: center;">
        <img src="https://res.cloudinary.com/trukapp/image/upload/v1750965061/TRUK_Logo_zp8lv3.png" alt="Truk Logo" style="width: 60px; margin-bottom: 20px;" />
        <h2 style="color: #28a745;">${subject}</h2>
        <p style="font-size: 16px;">Hello Admin</p>
        <p style="font-size: 16px;">${message}</p>
        <p style="font-size: 16px;">${userData}</p>
        <p style="margin-top: 30px; font-size: 13px; color: #999;">All rights reserved &copy; ${new Date().getFullYear()} Truk</p>
      </div>
    </div>
  `
}

exports.sendDriverWelcomeEmail = async function (data) {
  const sendEmail = require('./sendEmail');

  const subject = `Welcome to ${data.companyName} - Driver Account Created`;
  const html = `
    <div style="max-width: 500px; margin: auto; padding: 20px; font-family: Arial, sans-serif; border-radius: 10px; border: 1px solid #ddd;">
      <div style="text-align: center;">
        <img src="https://res.cloudinary.com/trukapp/image/upload/v1750965061/TRUK_Logo_zp8lv3.png" alt="Truk Logo" style="width: 60px; margin-bottom: 20px;" />
        <h2 style="color: #0F2B04;">Welcome to ${data.companyName}!</h2>
        <p style="font-size: 16px;">Hello ${data.firstName} ${data.lastName},</p>
        <p style="font-size: 16px;">Your driver account has been created and you can now access the Truk platform to manage your assigned jobs.</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #0F2B04; margin-top: 0;">Your Login Credentials</h3>
          <p><strong>Email:</strong> ${data.email}</p>
          <p><strong>Phone:</strong> ${data.phone}</p>
          <p><strong>Password:</strong> ${data.defaultPassword}</p>
          <p style="font-size: 14px; color: #666; margin-top: 10px;">
            <strong>Sign in options:</strong> You can sign in using either your email address or phone number with the password above.
          </p>
          <p style="font-size: 14px; color: #666;">
            <strong>Important:</strong> Please change your password after your first login for security.
          </p>
        </div>

        <a href="${data.loginUrl}" style="display: inline-block; margin: 20px auto; padding: 12px 25px; background-color: #0F2B04; color: white; text-decoration: none; font-size: 16px; border-radius: 5px;">
          Login to Driver Dashboard
        </a>

        <div style="margin-top: 30px; text-align: left; font-size: 14px; color: #555;">
          <h4 style="color: #0F2B04;">What you can do:</h4>
          <ul>
            <li>View and accept assigned jobs</li>
            <li>Update job status in real-time</li>
            <li>Communicate with customers</li>
            <li>Manage your driver documents</li>
            <li>View your assigned vehicle details</li>
          </ul>
        </div>

        <p style="margin-top: 30px; font-size: 13px; color: #999;">If you have any questions, please contact your company administrator.</p>
        <p style="font-size: 13px; color: #999;">All rights reserved &copy; ${new Date().getFullYear()} Truk</p>
      </div>
    </div>
  `;

  return await sendEmail(data.email, subject, html);
}

exports.sendDriverWelcomeMail = function(data, defaultPassword) {
  const subject = `Welcome to TRUK - Driver Account Created`;

  const html = `
    <div style="max-width: 500px; margin: auto; padding: 20px; font-family: Arial, sans-serif; border-radius: 10px; border: 1px solid #ddd;">
      <div style="text-align: center;">
        <img src="https://res.cloudinary.com/trukapp/image/upload/v1750965061/TRUK_Logo_zp8lv3.png" alt="Truk Logo" style="width: 60px; margin-bottom: 20px;" />
        <h2 style="color: #0F2B04;">Welcome to TRUK!</h2>
        <p style="font-size: 16px;">Hello ${data.firstName} ${data.lastName},</p>
        <p style="font-size: 16px;">Your driver account has been created and you can now access the Truk platform to manage your assigned jobs.</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #0F2B04; margin-top: 0;">Your Login Credentials</h3>
          <p><strong>Email:</strong> ${data.email}</p>
          <p><strong>Phone:</strong> ${data.phone}</p>
          <p><strong>Password:</strong> ${defaultPassword}</p>
          <p style="font-size: 14px; color: #666; margin-top: 10px;">
            <strong>Sign in options:</strong> You can sign in using either your email address or phone number with the password above.
          </p>
          <p style="font-size: 14px; color: #666;">
            <strong>Important:</strong> Please change your password after your first login for security.
          </p>
        </div>

        <a href="${data.loginUrl}" style="display: inline-block; margin: 20px auto; padding: 12px 25px; background-color: #0F2B04; color: white; text-decoration: none; font-size: 16px; border-radius: 5px;">
          Login to Driver Dashboard
        </a>

        <div style="margin-top: 30px; text-align: left; font-size: 14px; color: #555;">
          <h4 style="color: #0F2B04;">What you can do:</h4>
          <ul>
            <li>View and accept assigned jobs</li>
            <li>Update job status in real-time</li>
            <li>Communicate with customers</li>
            <li>Manage your driver documents</li>
            <li>View your assigned vehicle details</li>
          </ul>
        </div>

        <p style="margin-top: 30px; font-size: 13px; color: #999;">If you have any questions, please contact your company administrator.</p>
        <p style="font-size: 13px; color: #999;">All rights reserved &copy; ${new Date().getFullYear()} Truk</p>
      </div>
    </div>
  `;

  return { subject, html };
};

exports.sendChatNotificationMail = function (data) {
  // Dynamic defaults
  const {
    type, 
    senderName,
    senderType,
    receiverName,
    message,
    chatUrl,
    brand = {
      name: 'Truk',
      logo: 'https://res.cloudinary.com/trukapp/image/upload/v1750965061/TRUK_Logo_zp8lv3.png',
      color: '#0F2B04'
    }
  } = data;

  // Dynamic subject and title
  const subject =
    type === 'chatRequest'
      ? `New Chat Request from ${senderName}`
      : `New Message from ${senderName || senderType}`;

  const title =
    type === 'chatRequest'
      ? 'New Chat Request'
      : 'New Message Received';

  const messageIntro =
    type === 'chatRequest'
      ? `You have received a new chat request from <strong>${senderName}</strong> (${senderType}).`
      : `<strong>${senderName || senderType}</strong> sent you a message.`;

  const buttonLabel =
    type === 'chatRequest'
      ? 'Open Chat'
      : 'View Message';

  // HTML Template
  const html = `
    <div style="max-width: 520px; margin: auto; padding: 20px; font-family: Arial, sans-serif; border-radius: 10px; border: 1px solid #ddd; background-color: #ffffff;">
      <div style="text-align: center;">
        <img src="${brand.logo}" alt="${brand.name} Logo" style="width: 60px; margin-bottom: 20px;" />
        <h2 style="color: ${brand.color};">${title}</h2>
        <p style="font-size: 16px; color: #333;">Hello ${receiverName},</p>
        <p style="font-size: 16px; color: #555;">${messageIntro}</p>

        ${
          message
            ? `
          <div style="background-color: #f8f9fa; padding: 15px 20px; border-radius: 8px; margin: 20px 0; text-align: left;">
            <p style="font-size: 15px; color: #333; margin: 0 0 10px;"><strong>Message:</strong></p>
            <p style="font-size: 15px; color: #555; margin: 0;">${message}</p>
          </div>`
            : ''
        }

        ${
          chatUrl
            ? `<a href="${chatUrl}" style="display: inline-block; margin: 20px auto; padding: 12px 25px; background-color: ${brand.color}; color: white; text-decoration: none; font-size: 16px; border-radius: 5px;">
              ${buttonLabel}
            </a>`
            : ''
        }

        <div style="margin-top: 30px; text-align: left; font-size: 14px; color: #555;">
          <h4 style="color: ${brand.color}; margin-bottom: 10px;">Chat Guidelines:</h4>
          <ul style="margin: 0; padding-left: 20px;">
            <li>Respond promptly to maintain active communication</li>
            <li>Be professional and polite in your messages</li>
            <li>Do not share sensitive or personal data</li>
          </ul>
        </div>

        <p style="margin-top: 30px; font-size: 13px; color: #999;">If you have any issues, please contact our support team.</p>
        <p style="font-size: 13px; color: #999;">All rights reserved &copy; ${new Date().getFullYear()} ${brand.name}</p>
      </div>
    </div>
  `;

  return { subject, html };
};

exports.getDeleteAccountTemplate = function (userName, deadlineDate, restoreLink, location, ip, device) {
  return `
    <div style="max-width: 500px; margin: auto; padding: 20px; font-family: Arial, sans-serif; border-radius: 10px; border: 1px solid #ddd;">
      <div style="text-align: center;">
        <img src="https://res.cloudinary.com/trukapp/image/upload/v1750965061/TRUK_Logo_zp8lv3.png" alt="Truk Logo" style="width: 60px; margin-bottom: 20px;" />
        
        <h2 style="color: #000;">Account Deletion Request</h2>
        <p>Hello <strong>${userName}</strong>,</p>

        <p>We received a request to <strong>delete your Truk account</strong>. Your account has been temporarily disabled and scheduled for permanent deletion.</p>

        <p>You have <strong>30 days</strong> to cancel this request.  
        If you log in before the deadline below, your account will be fully restored:</p>

        <h3 style="margin: 20px 0; color: #d9534f;">Deletion Deadline: ${deadlineDate}</h3>

        <p>If you did not request this, you can restore your account immediately:</p>

        <a href="${restoreLink}" 
          style="display:inline-block; padding: 12px 20px; background:#1a73e8; 
                  color:#fff; text-decoration:none; border-radius:6px; margin-top:10px;">
          Restore My Account
        </a>

        <hr style="margin: 30px 0;" />

        <div style="font-size: 14px; color: #555;">
          <p><strong>Request Details:</strong></p>
          <p><strong>Device:</strong> ${device}</p>
          <p><strong>Location:</strong> ${location}</p>
          <p><strong>IP Address:</strong> ${ip}</p>
        </div>

        <hr style="margin: 30px 0;" />

        <p style="font-size: 13px; color: #777;">
          If you do nothing, your account will be permanently deleted after the 30-day period.
        </p>
      </div>
    </div>
  `;
};
