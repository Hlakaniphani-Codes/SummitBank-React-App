const nodemailer = require('nodemailer');

let transporter = null;

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
const sendEmail = async (to, subject, html, text = '') => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log(`[EMAIL PLACEHOLDER] To: ${to}, Subject: ${subject}`);
    console.log(`[EMAIL PLACEHOLDER] Body: ${text || html}`);
    return { messageId: `placeholder-${Date.now()}` };
  }

  try {
    const transport = getTransporter();
    const info = await transport.sendMail({
      from: `"Summit Shares" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to,
      subject,
      text: text || '',
      html,
    });
    console.log(`[EMAIL SENT] To: ${to}, Subject: "${subject}", MessageID: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`[EMAIL ERROR] To: ${to}, Subject: "${subject}", Error: ${error.message}`);
    throw error;
  }
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
};
