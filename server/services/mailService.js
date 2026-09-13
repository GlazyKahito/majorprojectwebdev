const nodemailer = require("nodemailer");
const { smtp } = require("../config/env");

let transporter;

const isMailConfigured = () => Boolean(smtp.host && smtp.user && smtp.pass);

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.port === 465,
      auth: { user: smtp.user, pass: smtp.pass },
    });
  }
  return transporter;
};

const sendPasswordResetEmail = async ({ to, name, resetUrl }) => {
  if (!isMailConfigured()) return false;

  await getTransporter().sendMail({
    from: smtp.from,
    to,
    subject: "Reset your CRM360 password",
    text: `Hi ${name},\n\nWe received a request to reset your CRM360 password. Use the link below within 30 minutes:\n\n${resetUrl}\n\nIf you did not request this, you can safely ignore this email.\n\nCRM360`,
    html: `<div style="font-family:system-ui,sans-serif;font-size:14px;color:#111;line-height:1.6;max-width:480px">
      <p>Hi ${name},</p>
      <p>We received a request to reset your CRM360 password. This link is valid for 30 minutes.</p>
      <p><a href="${resetUrl}" style="display:inline-block;padding:10px 16px;background:#111;color:#fff;border-radius:6px;text-decoration:none">Reset password</a></p>
      <p style="color:#666">If you did not request this, you can safely ignore this email.</p>
    </div>`,
  });

  return true;
};

module.exports = { isMailConfigured, sendPasswordResetEmail };
