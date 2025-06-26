exports.getMFATemplate = function (code, location, ip, device) {
  return `
    <div style="max-width: 500px; margin: auto; padding: 20px; font-family: Arial, sans-serif; border-radius: 10px; border: 1px solid #ddd;">
      <div style="text-align: center;">
        <img src="https://res.cloudinary.com/dr1rttpke/image/upload/v1750965061/TRUK_Logo_zp8lv3.png" alt="Ubiquiti Logo" style="width: 60px; margin-bottom: 20px;" />
        <h2 style="color: #000;">AgriTruk SignUp Verification</h2>
        <p>Use this code to authenticate your agritruk app Sign up.</p>
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
  const loginUrl = "https://agritruk.app/login";

  return `
    <div style="max-width: 500px; margin: auto; padding: 20px; font-family: Arial, sans-serif; border-radius: 10px; border: 1px solid #ddd;">
      <div style="text-align: center;">
        <img src="https://res.cloudinary.com/dr1rttpke/image/upload/v1750965061/TRUK_Logo_zp8lv3.png" alt="AgriTruk Logo" style="width: 60px; margin-bottom: 20px;" />
        <h2 style="color: #28a745;">✅ Email Verified Successfully</h2>
        <p style="font-size: 16px;">Your email has been successfully verified. You can now log in and continue using AgriTruk services.</p>

        <a href="${loginUrl}" style="display: inline-block; margin: 20px auto; padding: 12px 25px; background-color: #28a745; color: white; text-decoration: none; font-size: 16px; border-radius: 5px;">
          Continue to Login
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
        <img src="https://res.cloudinary.com/dr1rttpke/image/upload/v1750965061/TRUK_Logo_zp8lv3.png" alt="Ubiquiti Logo" style="width: 60px; margin-bottom: 20px;" />
        <h2 style="color: #000;">AgriTruk Password Reset</h2>
        <p>Use this code to reset your AgriTruk account password.</p>
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
