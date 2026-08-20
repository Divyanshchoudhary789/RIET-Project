const nodemailer = require('nodemailer');

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.warn('[Email] SMTP credentials not fully configured. Missing:', {
      SMTP_HOST: !!SMTP_HOST,
      SMTP_USER: !!SMTP_USER,
      SMTP_PASS: !!SMTP_PASS,
    });
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
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
    tls: {
      rejectUnauthorized: false,
    },
  });

  return transporter;
};

/**
 * Verifies SMTP connection health.
 */
const verifyTransporter = async () => {
  const transport = getTransporter();
  if (!transport) {
    console.warn('[Email] SMTP verification skipped — configuration missing.');
    return false;
  }
  try {
    await transport.verify();
    console.log('[Email] SMTP Transporter successfully connected and verified.');
    return true;
  } catch (err) {
    console.error(`[Email] SMTP Verification failed: ${err.message}`);
    return false;
  }
};

/**
 * Sends a transactional email. Throws an error if sending fails.
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} html - HTML body content
 */
const sendEmail = async (to, subject, html) => {
  const transport = getTransporter();
  if (!transport) {
    console.warn('[Email] Skipped — SMTP credentials missing in environment.');
    throw new Error('Email service is not configured on the server.');
  }

  const senderAddress = process.env.EMAIL_FROM || process.env.SMTP_USER;
  const from = `"${process.env.EMAIL_FROM_NAME || 'RIET Platform'}" <${senderAddress}>`;

  try {
    const info = await transport.sendMail({ from, to, subject, html });
    console.log(`[Email] Sent to ${to} | Subject: "${subject}" | MessageId: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error(`[Email] Failed to send to ${to} | Subject: "${subject}" | Error: ${err.message}`);
    throw new Error(`Email delivery failed: ${err.message}`);
  }
};

module.exports = { sendEmail, verifyTransporter };

