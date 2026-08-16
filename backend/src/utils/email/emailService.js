const nodemailer = require('nodemailer');

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.warn('SMTP credentials not configured. Email sending will be skipped.');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT, 10) || 587,
    secure: parseInt(SMTP_PORT, 10) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    pool: true,
    maxConnections: 5,
  });

  return transporter;
};

/**
 * Sends a transactional email.
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} html - HTML body content
 */
const sendEmail = async (to, subject, html) => {
  const transport = getTransporter();
  if (!transport) return;

  const from = `"${process.env.EMAIL_FROM_NAME || 'RIET Platform'}" <${process.env.SMTP_USER}>`;

  try {
    await transport.sendMail({ from, to, subject, html });
  } catch (err) {
    // Log but do not throw — email failures must not break the primary workflow
    console.error(`Email send failed to ${to}: ${err.message}`);
  }
};

module.exports = { sendEmail };
