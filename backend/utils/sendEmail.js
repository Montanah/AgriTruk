const nodemailer = require("nodemailer");

async function sendEmail({ to, subject, text, html, attachments = []}) {
    const transporter = nodemailer.createTransport({
    // service: "gmail",
    host: "mail.privateemail.com", 
    port: 465, 
    secure: true, 
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
    });

    transporter.verify((error, success) => {
    if (error) {
        console.error("Email transport error:", error);
    } else {
        console.log("Email transport is ready");
    }
    });

    await transporter.sendMail({
        from: `"TrukAfrica" <${process.env.EMAIL_USER || "noreply@trukafrica.com"}>`,
        to: to,
        subject: subject,
        text: text,
        html: html,
        attachments: attachments
    });
}
module.exports = sendEmail;