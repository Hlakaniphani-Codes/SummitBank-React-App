const {
  listCustomers,
  getCustomerDetails,
  updateCustomer,
  setCustomerStatus,
  setCustomerSuspended,
  deleteCustomer,
  getCustomerActivity,
  listApplications,
  updateApplicationStatus,
  createAuditLog,
  approveApplication: approveApplicationStore,
  rejectApplication: rejectApplicationStore,
  setCreditScore,
} = require('../utils/adminStore');
const { sendCustomEmail, sendApprovalEmail, sendRejectionEmail } = require('../services/emailService');
const pool = require('../config/db');  // Needed for direct queries

// GET /api/admin/customers
exports.getCustomers = async (req, res) => {
  const { search, status } = req.query;
  try {
    const customers = await listCustomers({ search, status });
    return res.json({ success: true, customers });
  } catch (error) {
    console.error('List customers error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/admin/customers/:id
exports.getCustomer = async (req, res) => {
  const { id } = req.params;
  try {
    const customer = await getCustomerDetails(id);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
    return res.json({ success: true, customer });
  } catch (error) {
    console.error('Get customer error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/admin/customers/:id
exports.updateCustomer = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const adminId = req.userId;

  try {
    const oldCustomer = await getCustomerDetails(id);
    if (!oldCustomer) return res.status(404).json({ success: false, message: 'Customer not found' });

    const customer = await updateCustomer(id, updates);

    await createAuditLog({
      adminId,
      action: 'update',
      entityType: 'user',
      entityId: Number(id),
      description: `Updated customer #${id} profile fields`,
      metadata: { previous: oldCustomer, current: customer },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.json({ success: true, message: 'Customer updated', customer });
  } catch (error) {
    console.error('Update customer error:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

// POST /api/admin/customers/:id/activate
exports.activateCustomer = async (req, res) => {
  const { id } = req.params;
  const adminId = req.userId;

  try {
    const customer = await setCustomerStatus(id, true);
    await createAuditLog({
      adminId,
      action: 'activate',
      entityType: 'user',
      entityId: Number(id),
      description: `Activated customer #${id}: ${customer.first_name} ${customer.last_name}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return res.json({ success: true, message: 'Customer activated', customer });
  } catch (error) {
    console.error('Activate customer error:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

// POST /api/admin/customers/:id/deactivate
exports.deactivateCustomer = async (req, res) => {
  const { id } = req.params;
  const adminId = req.userId;

  try {
    const customer = await setCustomerStatus(id, false);
    await createAuditLog({
      adminId,
      action: 'deactivate',
      entityType: 'user',
      entityId: Number(id),
      description: `Deactivated customer #${id}: ${customer.first_name} ${customer.last_name}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return res.json({ success: true, message: 'Customer deactivated', customer });
  } catch (error) {
    console.error('Deactivate customer error:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

// POST /api/admin/customers/:id/suspend
exports.suspendCustomer = async (req, res) => {
  const { id } = req.params;
  const adminId = req.userId;

  try {
    const customer = await setCustomerSuspended(id, true);
    await createAuditLog({
      adminId,
      action: 'suspend',
      entityType: 'user',
      entityId: Number(id),
      description: `Suspended customer #${id}: ${customer.first_name} ${customer.last_name}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return res.json({ success: true, message: 'Customer suspended', customer });
  } catch (error) {
    console.error('Suspend customer error:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

// POST /api/admin/customers/:id/reinstate
exports.reinstateCustomer = async (req, res) => {
  const { id } = req.params;
  const adminId = req.userId;

  try {
    const customer = await setCustomerSuspended(id, false);
    await createAuditLog({
      adminId,
      action: 'reinstate',
      entityType: 'user',
      entityId: Number(id),
      description: `Reinstated customer #${id}: ${customer.first_name} ${customer.last_name}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return res.json({ success: true, message: 'Customer reinstated', customer });
  } catch (error) {
    console.error('Reinstate customer error:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

// DELETE /api/admin/customers/:id
exports.deleteCustomer = async (req, res) => {
  const { id } = req.params;
  const adminId = req.userId;

  try {
    const result = await deleteCustomer(id);
    await createAuditLog({
      adminId,
      action: 'delete',
      entityType: 'user',
      entityId: Number(id),
      description: `Deleted customer #${id}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return res.json({ success: true, message: 'Customer deleted', ...result });
  } catch (error) {
    console.error('Delete customer error:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

// GET /api/admin/customers/:id/activity
exports.getCustomerActivity = async (req, res) => {
  const { id } = req.params;
  const { action, startDate, endDate } = req.query;

  try {
    const activity = await getCustomerActivity(id, { action, startDate, endDate });
    return res.json({ success: true, activity });
  } catch (error) {
    console.error('Get customer activity error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/admin/applications
exports.getApplications = async (req, res) => {
  const { status, type } = req.query;
  try {
    const applications = await listApplications({ status, type });
    return res.json({ success: true, applications });
  } catch (error) {
    console.error('List applications error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/admin/applications/:id (NEW)
exports.getApplicationDetails = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT a.*, 
              u.first_name, u.last_name, u.email, u.phone, 
              u.street, u.apartment, u.city, u.state, u.zip, u.country,
              u.date_of_birth, u.occupation, u.employer, u.income_range, u.source_of_funds,
              u.doc_type, u.ssn_encrypted
       FROM applications a
       JOIN users u ON u.id = a.user_id
       WHERE a.id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }
    return res.json({ success: true, application: result.rows[0] });
  } catch (error) {
    console.error('Get application details error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/admin/applications/:id/approve
exports.approveApplication = async (req, res) => {
  const { id } = req.params;
  const { notes } = req.body;
  const adminId = req.userId;
  try {
    // Use the complete approveApplication from adminStore which:
    // 1. Updates application status to 'approved'
    // 2. Updates user: status='approved', login_enabled=true, is_active=true
    // 3. Creates a notification for the user
    const result = await approveApplicationStore(id, adminId, notes);
    await createAuditLog({
      adminId,
      action: 'approve',
      entityType: 'application',
      entityId: Number(id),
      description: `Approved application for user ${result.userId}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return res.json({ success: true, message: 'Application approved', application: result });
  } catch (error) {
    console.error('Approve application error:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

// POST /api/admin/applications/:id/reject
exports.rejectApplication = async (req, res) => {
  const { id } = req.params;
  const { notes } = req.body;
  const adminId = req.userId;
  try {
    // Use the complete rejectApplication from adminStore which:
    // 1. Updates application status to 'rejected'
    // 2. Updates user: status='rejected', rejected_reason set
    // 3. Creates a notification for the user
    const result = await rejectApplicationStore(id, adminId, notes);
    await createAuditLog({
      adminId,
      action: 'reject',
      entityType: 'application',
      entityId: Number(id),
      description: `Rejected application for user ${result.userId}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return res.json({ success: true, message: 'Application rejected', application: result });
  } catch (error) {
    console.error('Reject application error:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

// POST /api/admin/applications/:id/review
exports.reviewApplication = async (req, res) => {
  const { id } = req.params;
  const { notes } = req.body;
  const adminId = req.userId;
  try {
    const app = await updateApplicationStatus(id, 'review', adminId, notes);
    await createAuditLog({
      adminId,
      action: 'update',
      entityType: 'application',
      entityId: Number(id),
      description: `Placed ${app.application_type} application under review for user ${app.user_id}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return res.json({ success: true, message: 'Application placed under review', application: app });
  } catch (error) {
    console.error('Review application error:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

// POST /api/admin/customers/:id/credit-score
exports.updateCreditScore = async (req, res) => {
  const { id } = req.params;
  const { creditScore } = req.body;
  const adminId = req.userId;

  if (creditScore === undefined || creditScore === null) {
    return res.status(400).json({ success: false, message: 'creditScore is required' });
  }

  try {
    const customer = await setCreditScore(id, creditScore, adminId);
    return res.json({ success: true, message: 'Credit score updated', customer });
  } catch (error) {
    console.error('Update credit score error:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

// POST /api/admin/applications/fix-status/:userId
// FIX ENDPOINT: Manually updates a user's status to 'approved' with login enabled
// This fixes users who were approved by the old buggy code that only updated the applications table
exports.fixUserApprovalStatus = async (req, res) => {
  const { userId } = req.params;
  const adminId = req.userId;
  try {
    const result = await pool.query(
      `UPDATE users 
       SET status = 'approved', login_enabled = true, is_active = true,
           approved_by = $1, approved_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND role = 'customer'
       RETURNING id, first_name, last_name, email, status, login_enabled, is_active`,
      [adminId, userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Customer not found or not a customer' });
    }
    const user = result.rows[0];
    await createAuditLog({
      adminId,
      action: 'approve',
      entityType: 'user',
      entityId: Number(userId),
      description: `Fixed approval status for user #${userId}: ${user.first_name} ${user.last_name}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return res.json({ success: true, message: 'User approval status fixed', user });
  } catch (error) {
    console.error('Fix user approval error:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

// POST /api/admin/customers/:id/send-email
exports.sendCustomerEmail = async (req, res) => {
  const { id } = req.params;
  const { subject, message } = req.body;
  const adminId = req.userId;
 
  if (!subject || !message) {
    return res.status(400).json({ success: false, message: 'Subject and message are required' });
  }

  try {
    const customer = await getCustomerDetails(id);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });

    // Not awaited: a slow/unreachable SMTP server must not stall this request.
    // Delivery status is still tracked in the email_notifications log.
    sendCustomEmail(customer.email, subject, message).catch((emailError) => {
      console.error('[EMAIL ERROR] Failed to send custom email:', emailError.message);
    });

    await createAuditLog({
      adminId,
      action: 'send_email',
      entityType: 'user',
      entityId: Number(id),
      description: `Sent email to ${customer.email}: ${subject}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.json({ success: true, message: 'Email sent successfully' });
  } catch (error) {
    console.error('Send email error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};