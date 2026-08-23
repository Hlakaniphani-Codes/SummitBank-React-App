const nodemailer = require('nodemailer');
const pool = require('../config/db');

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@mysummshares.com';

let transporter = null;

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
       SET status = $1,
           error_message = $2,
           retry_count = retry_count + $3,
           sent_at = CASE WHEN $1 = 'sent' THEN CURRENT_TIMESTAMP ELSE sent_at END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
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

const getTransporter = () => {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
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

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log(`[EMAIL PLACEHOLDER] To: ${to}, Subject: ${subject}`);
    console.log(`[EMAIL PLACEHOLDER] Body: ${text || html}`);
    await markEmailNotificationStatus(notificationId, 'failed', 'SMTP credentials not configured', false);
    return { messageId: `placeholder-${Date.now()}` };
  }

  try {
    const transport = getTransporter();
    const info = await transport.sendMail({
      from: `"Summit Shares Support" <${fromAddress}>`,
      to,
      subject,
      text: text || '',
      html,
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

const formatCustomerDetails = (customer = {}) => {
  const fullName = [customer.first_name, customer.middle_name, customer.last_name].filter(Boolean).join(' ');
  const address = [customer.street, customer.apartment, customer.city, customer.state, customer.zip, customer.country].filter(Boolean).join(', ');
  const items = [
    ['Customer ID', customer.id],
    ['Full Name', fullName || 'Not provided'],
    ['Email', customer.email || 'Not provided'],
    ['Phone', customer.phone || 'Not provided'],
    ['Date of Birth', customer.date_of_birth || 'Not provided'],
    ['Address', address || 'Not provided'],
    ['Occupation', customer.occupation || 'Not provided'],
    ['Employer', customer.employer || 'Not provided'],
    ['Income Range', customer.income_range || 'Not provided'],
    ['Source of Funds', customer.source_of_funds || 'Not provided'],
    ['Country', customer.country || 'Not provided'],
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
      <div style="background: #0f172a; color: #fff; padding: 24px; border-radius: 12px 12px 0 0;">
        <h2 style="margin: 0; font-size: 28px;">Profile Approved</h2>
      </div>
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
      <div style="background: #1d4ed8; color: #fff; padding: 24px; border-radius: 12px 12px 0 0;">
        <h2 style="margin: 0; font-size: 28px;">${actionTitle}</h2>
      </div>
      <div style="padding: 24px; border: 1px solid #dbeafe; border-top: none; border-radius: 0 0 12px 12px; background: #fff;">
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
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2D9B4E;">Application Approved</h2>
      <p>Dear ${firstName},</p>
      <p>We are pleased to inform you that your <strong>${applicationType}</strong> application has been approved.</p>
      <p>You can now access the relevant features in your account dashboard.</p>
      <br/>
      <p>Best regards,</p>
      <p><strong>Summit Shares Team</strong></p>
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
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #D94352;">Application Update</h2>
      <p>Dear ${firstName},</p>
      <p>After careful review, we regret to inform you that your <strong>${applicationType}</strong> application has not been approved at this time.</p>
      ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
      <p>If you have any questions, please contact our support team.</p>
      <br/>
      <p>Best regards,</p>
      <p><strong>Summit Shares Team</strong></p>
    </div>
  `;
  return sendEmail(to, subject, html);
};

/**
 * Send custom email to a customer
 */
const sendCustomEmail = async (to, subject, message) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #C9A84C;">Summit Shares</h2>
      <p>${message.replace(/\n/g, '<br/>')}</p>
      <br/>
      <p>Best regards,</p>
      <p><strong>Summit Shares Team</strong></p>
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
  getEmailNotifications,
  retryFailedEmailNotification,
};
