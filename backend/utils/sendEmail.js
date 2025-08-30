const nodemailer = require("nodemailer");

async function sendEmail({ to, subject, text, html, attachments = []}) {
    const transporter = nodemailer.createTransport({
    service: "gmail",
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
        from: process.env.EMAIL_USER,
        to: to,
        subject: subject,
        text: text,
        html: html,
        attachments: attachments
    });
}
module.exports = sendEmail;