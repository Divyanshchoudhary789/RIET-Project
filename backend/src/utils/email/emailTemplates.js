const APP_NAME = 'RIET Platform';
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@riet.edu';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

/**
 * Escapes HTML special characters to prevent XSS when user-controlled
 * content is interpolated directly into an HTML email body.
 * @param {*} value
 * @returns {string}
 */
const escapeHtml = (value) => {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
};

const baseLayout = (content) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(APP_NAME)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:#1a2b4a;padding:24px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:0.5px;">${escapeHtml(APP_NAME)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="background:#f4f5f7;padding:16px 32px;text-align:center;">
              <p style="margin:0;color:#6b7280;font-size:12px;">
                This is an automated message from ${escapeHtml(APP_NAME)}. Do not reply to this email.
                <br>For support, contact <a href="mailto:${escapeHtml(SUPPORT_EMAIL)}" style="color:#1a2b4a;">${escapeHtml(SUPPORT_EMAIL)}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

const welcomeEmail = (name, email, tempPassword, role) => ({
  subject: `Your ${APP_NAME} account has been created`,
  html: baseLayout(`
    <h2 style="color:#1a2b4a;margin-top:0;">Welcome to ${escapeHtml(APP_NAME)}</h2>
    <p style="color:#374151;">Hello <strong>${escapeHtml(name)}</strong>,</p>
    <p style="color:#374151;">Your account has been created with the role of <strong>${escapeHtml(role)}</strong>.</p>
    <p style="color:#374151;">Here are your login credentials:</p>
    <table cellpadding="0" cellspacing="0" style="background:#f4f5f7;border-radius:6px;padding:16px;margin:16px 0;width:100%;">
      <tr>
        <td style="color:#6b7280;font-size:13px;">Email</td>
        <td style="color:#111827;font-weight:600;">${escapeHtml(email)}</td>
      </tr>
      <tr>
        <td style="color:#6b7280;font-size:13px;padding-top:8px;">Temporary Password</td>
        <td style="color:#111827;font-weight:600;font-family:monospace;padding-top:8px;">${escapeHtml(tempPassword)}</td>
      </tr>
    </table>
    <p style="color:#374151;font-size:13px;background:#fef3c7;border-left:3px solid #f59e0b;padding:12px;border-radius:4px;">
      You will be required to change your password on first login. This temporary password is for one-time use only.
    </p>
    <a href="${escapeHtml(CLIENT_URL)}/login" style="display:inline-block;background:#1a2b4a;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:600;margin-top:16px;">Login to Platform</a>
  `),
});

const passwordResetEmail = (name, otp) => ({
  subject: `Password reset request - ${APP_NAME}`,
  html: baseLayout(`
    <h2 style="color:#1a2b4a;margin-top:0;">Password Reset Request</h2>
    <p style="color:#374151;">Hello <strong>${escapeHtml(name)}</strong>,</p>
    <p style="color:#374151;">We received a request to reset your password. Use the OTP below to proceed:</p>
    <div style="text-align:center;margin:24px 0;">
      <span style="display:inline-block;background:#1a2b4a;color:#ffffff;font-size:32px;font-weight:700;letter-spacing:8px;padding:16px 32px;border-radius:8px;font-family:monospace;">${escapeHtml(otp)}</span>
    </div>
    <p style="color:#374151;font-size:13px;background:#fef3c7;border-left:3px solid #f59e0b;padding:12px;border-radius:4px;">
      This OTP is valid for 15 minutes and can only be used once. If you did not request a password reset, please ignore this email and contact support immediately.
    </p>
  `),
});

const documentActionEmail = (recipientName, actionType, documentType, documentId, note = '') => ({
  subject: `Action required: ${escapeHtml(documentType)} ${escapeHtml(actionType)} - ${APP_NAME}`,
  html: baseLayout(`
    <h2 style="color:#1a2b4a;margin-top:0;">${escapeHtml(documentType)} ${escapeHtml(actionType)}</h2>
    <p style="color:#374151;">Hello <strong>${escapeHtml(recipientName)}</strong>,</p>
    <p style="color:#374151;">
      A <strong>${escapeHtml(documentType)}</strong> has been
      <strong>${escapeHtml(actionType.toLowerCase())}</strong> and requires your attention.
    </p>
    ${
      note
        ? `<div style="background:#fef3c7;border-left:3px solid #f59e0b;padding:12px;border-radius:4px;margin:16px 0;">
             <strong style="color:#92400e;">Note from reviewer:</strong>
             <p style="color:#374151;margin:4px 0 0 0;white-space:pre-wrap;">${escapeHtml(note)}</p>
           </div>`
        : ''
    }
    <a href="${escapeHtml(CLIENT_URL)}/dashboard" style="display:inline-block;background:#1a2b4a;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:600;margin-top:16px;">View in Dashboard</a>
  `),
});

module.exports = { welcomeEmail, passwordResetEmail, documentActionEmail, escapeHtml };
