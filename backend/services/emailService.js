const nodemailer = require('nodemailer');
const path = require('path');
const pool = require('../config/db');

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@mysummshares.com';
const LOGO_PATH = path.join(__dirname, '../assets/logo.jpeg');
const LOGO_CID = 'summitshareslogo';

// Shared branded header used at the top of every outgoing email - same dark
// mark (#0B0B0B) and gold/white logo used across the site's own nav/sidebar.
const renderEmailHeader = (title) => `
  <div style="background: #0B0B0B; padding: 28px 24px; border-radius: 12px 12px 0 0; text-align: center;">
    <img src="cid:${LOGO_CID}" alt="Summit Shares" style="height: 32px; width: auto; display: inline-block; margin-bottom: 14px;" />
    <h2 style="margin: 0; font-size: 22px; color: #fff; font-weight: 700;">${title}</h2>
  </div>
`;

// The committed .env ships documented placeholder values, not real credentials -
// treat those the same as "unset" so a fresh checkout doesn't attempt (and fail)
// a real SMTP handshake on every admin action.
const PLACEHOLDER_SMTP_VALUES = new Set(['your-email@gmail.com', 'your-app-specific-password']);
const isSmtpConfigured = () => {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) return false;
  if (PLACEHOLDER_SMTP_VALUES.has(user) || PLACEHOLDER_SMTP_VALUES.has(pass)) return false;
  return true;
};

let transporter = null;
const getTransporter = () => {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    // Afrihost's shared mail server advertises an IPv6 address that most
    // networks can't route to; force IPv4 so the connection doesn't hang/fail.
    family: 4,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
};

const upsertEmailNotification = async ({ userId, eventType, referenceId, recipientEmail, subject, htmlBody, textBody }) => {
  if (!userId || !eventType || referenceId === undefined || referenceId === null || !recipientEmail || !subject) {
    return null;
  }

  try {
    const result = await pool.query(
      `INSERT INTO email_notifications (user_id, event_type, reference_id, recipient_email, subject, html_body, text_body, status, retry_count, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, event_type, reference_id)
       DO UPDATE SET
         recipient_email = EXCLUDED.recipient_email,
         subject = EXCLUDED.subject,
         html_body = EXCLUDED.html_body,
         text_body = EXCLUDED.text_body,
         status = 'pending',
         error_message = NULL,
         updated_at = CURRENT_TIMESTAMP
       RETURNING id`,
      [userId, eventType, referenceId, recipientEmail, subject, htmlBody || '', textBody || '']
    );

    return result.rows[0]?.id || null;
  } catch (error) {
    console.error('[EMAIL LOG ERROR]', error.message);
    return null;
  }
};

const markEmailNotificationStatus = async (notificationId, status, errorMessage = null, incrementRetry = false) => {
  if (!notificationId) return;

  try {
    await pool.query(
      `UPDATE email_notifications
       SET status = $1::varchar,
           error_message = $2::text,
           retry_count = retry_count + $3::integer,
           sent_at = CASE WHEN $1::varchar = 'sent' THEN CURRENT_TIMESTAMP ELSE sent_at END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4::bigint`,
      [status, errorMessage, incrementRetry ? 1 : 0, notificationId]
    );
  } catch (error) {
    console.error('[EMAIL STATUS UPDATE ERROR]', error.message);
  }
};

const getEmailNotifications = async (filters = {}) => {
  let sql = 'SELECT * FROM email_notifications WHERE 1=1';
  const params = [];
  let idx = 1;

  if (filters.userId) {
    sql += ` AND user_id = $${idx}`;
    params.push(filters.userId);
    idx++;
  }

  if (filters.status) {
    sql += ` AND status = $${idx}`;
    params.push(filters.status);
    idx++;
  }

  if (filters.eventType) {
    sql += ` AND event_type = $${idx}`;
    params.push(filters.eventType);
    idx++;
  }

  sql += ' ORDER BY created_at DESC LIMIT 100';

  const result = await pool.query(sql, params);
  return result.rows;
};

const retryFailedEmailNotification = async (notificationId) => {
  const result = await pool.query(
    `SELECT * FROM email_notifications WHERE id = $1 AND status = 'failed'`,
    [notificationId]
  );

  if (result.rows.length === 0) {
    return { ok: false, message: 'Notification not found or not failed' };
  }

  const notification = result.rows[0];
  try {
    await sendEmail(notification.recipient_email, notification.subject, notification.html_body, notification.text_body, {
      userId: notification.user_id,
      eventType: notification.event_type,
      referenceId: notification.reference_id,
    });
    return { ok: true, message: 'Retry scheduled or sent', notificationId };
  } catch (error) {
    return { ok: false, message: error.message, notificationId };
  }
};

/**
 * Send an email to a customer
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} html - HTML body content
 * @param {string} text - Plain text fallback (optional)
 * @returns {Promise<object>} - Nodemailer response
 */
const sendEmail = async (to, subject, html, text = '', options = {}) => {
  const { userId = null, eventType = null, referenceId = null } = options;
  const fromAddress = process.env.SMTP_FROM || process.env.SUPPORT_EMAIL || SUPPORT_EMAIL || process.env.SMTP_USER;
  const notificationId = await upsertEmailNotification({
    userId,
    eventType,
    referenceId,
    recipientEmail: to,
    subject,
    htmlBody: html,
    textBody: text,
  });

  if (!isSmtpConfigured()) {
    console.log(`[EMAIL PLACEHOLDER] To: ${to}, Subject: ${subject}`);
    console.log(`[EMAIL PLACEHOLDER] Body: ${text || html}`);
    await markEmailNotificationStatus(notificationId, 'failed', 'SMTP credentials not configured', false);
    throw new Error('SMTP credentials not configured');
  }

  try {
    const transport = getTransporter();
    const info = await transport.sendMail({
      from: `"Summit Shares Support" <${fromAddress}>`,
      to,
      subject,
      text: text || '',
      html,
      attachments: [
        { filename: 'logo.jpeg', path: LOGO_PATH, cid: LOGO_CID },
      ],
    });
    console.log(`[EMAIL SENT] To: ${to}, Subject: "${subject}", MessageID: ${info.messageId}`);
    await markEmailNotificationStatus(notificationId, 'sent', null, false);
    return info;
  } catch (error) {
    console.error(`[EMAIL ERROR] To: ${to}, Subject: "${subject}", Error: ${error.message}`);
    await markEmailNotificationStatus(notificationId, 'failed', error.message, true);
    throw error;
  }
};

// Emails are plaintext over an inherently insecure channel (forwarding, shared
// inboxes, provider breaches) - only ever include ordinary contact details a
// customer already knows about themselves. Never re-broadcast KYC/financial
// data (DOB, address, occupation, employer, income, source of funds) or
// internal identifiers (customer ID) that have no reason to leave the app.
const formatCustomerDetails = (customer = {}) => {
  const fullName = [customer.first_name, customer.middle_name, customer.last_name].filter(Boolean).join(' ');
  const items = [
    ['Full Name', fullName || 'Not provided'],
    ['Email', customer.email || 'Not provided'],
    ['Phone', customer.phone || 'Not provided'],
  ].filter(([, value]) => value !== undefined && value !== null && value !== '' && value !== 'Not provided');

  return items;
};

const renderDetailRows = (items = []) => {
  if (!items.length) return '<p>No additional details available.</p>';

  return `
    <table style="width: 100%; border-collapse: collapse; margin: 18px 0; font-size: 14px;">
      <tbody>
        ${items.map(([label, value]) => `
          <tr>
            <td style="padding: 8px 10px; border: 1px solid #e5e7eb; background: #f9fafb; font-weight: 600; color: #111827; width: 35%;">${label}</td>
            <td style="padding: 8px 10px; border: 1px solid #e5e7eb; color: #374151;">${value}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
};

const sendProfileApprovedEmail = async (customer = {}, options = {}) => {
  const recipient = customer.email;
  if (!recipient) {
    console.log('[EMAIL SKIPPED] Profile approval email missing recipient:', customer);
    return { messageId: `placeholder-${Date.now()}` };
  }

  const firstName = customer.first_name || 'Customer';
  const detailRows = formatCustomerDetails(customer);
  const subject = 'Your profile has been approved';
  const text = `Dear ${firstName},\n\nCongratulations! Your Summit Shares profile has been approved.\n\nYour profile details are listed below:\n${detailRows.map(([label, value]) => `${label}: ${value}`).join('\n')}\n\nYou can now access your account and begin banking with us.\n\nSupport: ${SUPPORT_EMAIL}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; color: #111827;">
      ${renderEmailHeader('Profile Approved')}
      <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; background: #fff;">
        <p>Dear ${firstName},</p>
        <p>Congratulations! We are pleased to confirm that your Summit Shares profile has been approved.</p>
        <p>Your account is now active and ready for use. Below is the profile information we have on file:</p>
        ${renderDetailRows(detailRows)}
        <p>You can now log in, create additional accounts, request cards, and complete banking activities securely with Summit Shares.</p>
        <p>If you need help, please contact our support team at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
        <br/>
        <p>Best regards,</p>
        <p><strong>Summit Shares Support</strong></p>
      </div>
    </div>
  `;

  return sendEmail(recipient, subject, html, text, {
    userId: customer.id || options.userId,
    eventType: options.eventType || 'profile_approved',
    referenceId: options.referenceId || customer.id,
  });
};

const sendOtpEmail = async (user = {}, code) => {
  const recipient = user.email;
  if (!recipient) {
    console.log('[EMAIL SKIPPED] OTP email missing recipient:', user);
    return { messageId: `placeholder-${Date.now()}` };
  }

  const firstName = user.first_name || 'there';
  const subject = 'Your Summit Shares verification code';
  const text = `Hi ${firstName},\n\nYour verification code is ${code}.\n\nThis code expires in ${process.env.OTP_EXPIRY_MINUTES || 5} minutes and can only be used once.\n\nIf you did not attempt to log in, please contact support immediately at ${SUPPORT_EMAIL}.`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; color: #111827;">
      ${renderEmailHeader('Verify Your Login')}
      <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; background: #fff;">
        <p>Hi ${firstName},</p>
        <p>Use the code below to finish signing in to Summit Shares:</p>
        <div style="text-align: center; margin: 24px 0;">
          <span style="display: inline-block; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #0f172a; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px 24px;">${code}</span>
        </div>
        <p style="color: #6b7280; font-size: 13px;">This code expires in ${process.env.OTP_EXPIRY_MINUTES || 5} minutes and can only be used once.</p>
        <p style="color: #6b7280; font-size: 13px;">If you did not attempt to log in, please contact our support team immediately at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
        <br/>
        <p>Best regards,</p>
        <p><strong>Summit Shares Support</strong></p>
      </div>
    </div>
  `;

  return sendEmail(recipient, subject, html, text, {
    userId: user.id,
    eventType: 'login_otp',
    referenceId: user.id,
  });
};

const sendPasswordResetEmail = async (user = {}, resetUrl) => {
  const recipient = user.email;
  if (!recipient) {
    console.log('[EMAIL SKIPPED] Password reset email missing recipient:', user);
    return { messageId: `placeholder-${Date.now()}` };
  }

  const firstName = user.first_name || 'there';
  const subject = 'Reset your Summit Shares password';
  const text = `Hi ${firstName},\n\nYou requested a password reset. Use the link below to set a new password:\n${resetUrl}\n\nThis link expires in 1 hour. If you did not request this, you can safely ignore this email.`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; color: #111827;">
      ${renderEmailHeader('Password Reset Request')}
      <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; background: #fff;">
        <p>Hi ${firstName},</p>
        <p>You requested a password reset. Click the button below to set a new password:</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${resetUrl}" style="display: inline-block; background: #C9A84C; color: #0f172a; font-weight: 700; text-decoration: none; padding: 12px 28px; border-radius: 8px;">Reset Password</a>
        </div>
        <p style="color: #6b7280; font-size: 13px;">This link expires in 1 hour. If you did not request this, you can safely ignore this email.</p>
        <br/>
        <p>Best regards,</p>
        <p><strong>Summit Shares Support</strong></p>
      </div>
    </div>
  `;

  return sendEmail(recipient, subject, html, text, {
    userId: user.id,
    eventType: 'password_reset',
    referenceId: user.id,
  });
};

// Sent when a customer-initiated money movement (transfer / wire / bill
// payment) is declined because an account restriction stopped it. Looks the
// customer's email up itself so callers only need the userId. Fire-and-forget:
// callers should not await this or let its failure affect the API response.
const sendTransactionDeclinedEmail = async (userId, details = {}) => {
  let user = null;
  try {
    const { rows } = await pool.query('SELECT id, first_name, email FROM users WHERE id = $1', [userId]);
    user = rows[0] || null;
  } catch (error) {
    console.error('[EMAIL] declined-notice lookup failed:', error.message);
  }

  if (!user || !user.email) {
    console.log('[EMAIL SKIPPED] Declined-transaction notice missing recipient for user', userId);
    return { messageId: `placeholder-${Date.now()}` };
  }

  const firstName = user.first_name || 'Customer';
  const operation = details.operation || 'Transaction'; // e.g. "Wire transfer"
  const reason = details.reason || 'Your account is currently unable to process this request.';
  const amountText = details.amount != null && !Number.isNaN(Number(details.amount))
    ? `${(details.currency || 'USD').toUpperCase()} ${Number(details.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : null;

  const detailRows = [
    ['Request', operation],
    amountText ? ['Amount', amountText] : null,
    details.beneficiary ? ['Recipient', details.beneficiary] : null,
    ['Date', new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })],
    ['Status', 'Declined'],
  ].filter(Boolean);

  const subject = `${operation} declined`;
  const text = `Dear ${firstName},\n\nWe were unable to process your ${operation.toLowerCase()}${amountText ? ` of ${amountText}` : ''}.\n\nReason: ${reason}\n\n${detailRows.map(([label, value]) => `${label}: ${value}`).join('\n')}\n\nNo funds have left your account. If you believe this restriction is in error, please contact us at ${SUPPORT_EMAIL} or visit your nearest branch.`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; color: #111827;">
      ${renderEmailHeader('Transaction Declined')}
      <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; background: #fff;">
        <p>Dear ${firstName},</p>
        <p>We were unable to process your <strong>${operation.toLowerCase()}</strong>${amountText ? ` of <strong>${amountText}</strong>` : ''}.</p>
        <p style="background: #fdecec; border: 1px solid #f5c2c7; border-radius: 8px; padding: 12px 14px; color: #8a2b36;">
          <strong>Reason:</strong> ${reason}
        </p>
        ${renderDetailRows(detailRows)}
        <p>No funds have left your account. If you believe this restriction is in error, please contact our support team at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a> or visit your nearest branch.</p>
        <br/>
        <p>Best regards,</p>
        <p><strong>Summit Shares Support</strong></p>
      </div>
    </div>
  `;

  return sendEmail(user.email, subject, html, text, {
    userId: user.id,
    eventType: 'transaction_declined',
    referenceId: details.referenceId || Date.now(),
  });
};

const sendAdminActionEmail = async (customer = {}, actionTitle, actionDescription, extraDetails = {}, options = {}) => {
  const recipient = customer.email;
  if (!recipient) {
    console.log('[EMAIL SKIPPED] Action email missing recipient:', { customer, actionTitle });
    return { messageId: `placeholder-${Date.now()}` };
  }

  const firstName = customer.first_name || 'Customer';
  const detailRows = [
    ...formatCustomerDetails(customer),
    ...Object.entries(extraDetails).filter(([, value]) => value !== undefined && value !== null && value !== '').map(([label, value]) => [label, value]),
  ];
  const subject = `Account update: ${actionTitle}`;
  const text = `Dear ${firstName},\n\n${actionDescription}\n\nDetails:\n${detailRows.map(([label, value]) => `${label}: ${value}`).join('\n')}\n\nSupport: ${SUPPORT_EMAIL}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; color: #111827;">
      ${renderEmailHeader(actionTitle)}
      <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; background: #fff;">
        <p>Dear ${firstName},</p>
        <p>${actionDescription}</p>
        ${renderDetailRows(detailRows)}
        <p>If you did not authorize this change, please contact our support team immediately at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
        <br/>
        <p>Best regards,</p>
        <p><strong>Summit Shares Support</strong></p>
      </div>
    </div>
  `;

  return sendEmail(recipient, subject, html, text, {
    userId: customer.id || options.userId,
    eventType: options.eventType || 'account_action',
    referenceId: options.referenceId || customer.id,
  });
};

/**
 * Send approval email for an application
 */
const sendApprovalEmail = async (to, firstName, applicationType) => {
  const subject = `Your ${applicationType} application has been approved`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; color: #111827;">
      ${renderEmailHeader('Application Approved')}
      <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; background: #fff;">
        <p>Dear ${firstName},</p>
        <p>We are pleased to inform you that your <strong>${applicationType}</strong> application has been approved.</p>
        <p>You can now access the relevant features in your account dashboard.</p>
        <br/>
        <p>Best regards,</p>
        <p><strong>Summit Shares Team</strong></p>
      </div>
    </div>
  `;
  return sendEmail(to, subject, html);
};

/**
 * Send rejection email for an application
 */
const sendRejectionEmail = async (to, firstName, applicationType, reason = '') => {
  const subject = `Update on your ${applicationType} application`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; color: #111827;">
      ${renderEmailHeader('Application Update')}
      <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; background: #fff;">
        <p>Dear ${firstName},</p>
        <p>After careful review, we regret to inform you that your <strong>${applicationType}</strong> application has not been approved at this time.</p>
        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
        <p>If you have any questions, please contact our support team.</p>
        <br/>
        <p>Best regards,</p>
        <p><strong>Summit Shares Team</strong></p>
      </div>
    </div>
  `;
  return sendEmail(to, subject, html);
};

/**
 * Send custom email to a customer
 */
const sendCustomEmail = async (to, subject, message) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; color: #111827;">
      ${renderEmailHeader('Summit Shares')}
      <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; background: #fff;">
        <p>${message.replace(/\n/g, '<br/>')}</p>
        <br/>
        <p>Best regards,</p>
        <p><strong>Summit Shares Team</strong></p>
      </div>
    </div>
  `;
  return sendEmail(to, subject, html);
};

/**
 * Send broadcast notification email
 */
const sendBroadcastEmail = async (recipients, subject, message) => {
  const results = [];
  for (const recipient of recipients) {
    try {
      const result = await sendCustomEmail(recipient.email, subject, message);
      results.push({ email: recipient.email, success: true, messageId: result.messageId });
    } catch (error) {
      results.push({ email: recipient.email, success: false, error: error.message });
    }
  }
  return results;
};

module.exports = {
  sendEmail,
  sendApprovalEmail,
  sendRejectionEmail,
  sendCustomEmail,
  sendBroadcastEmail,
  sendProfileApprovedEmail,
  sendAdminActionEmail,
  sendTransactionDeclinedEmail,
  sendOtpEmail,
  sendPasswordResetEmail,
  getEmailNotifications,
  retryFailedEmailNotification,
};
