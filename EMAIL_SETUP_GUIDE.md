# Email System Setup & Migration Guide

## Current Status

The email notification system has been fully implemented in code:
- ✅ Email service with approval, account, and card notifications
- ✅ Retry and ledger tracking infrastructure  
- ✅ Admin UI for email log and retry management
- ⏳ **PENDING**: Database migration + SMTP configuration

---

## Step 1: Apply the Database Migration

You need to run the SQL migration to create the `email_notifications` ledger table.

### Option A: Using PowerShell (Recommended for Windows)

Open PowerShell and run:

```powershell
cd 'C:\Users\sbo63\Desktop\SummitBank-React-App\backend'
node run_migration.js
```

**Expected output:**
```
🔄 Running email_notifications migration...
✅ Migration applied successfully!
   - email_notifications table created (if not exists)
   - Indexes created for user_id, status, event_type, created_at
   - Trigger for updated_at timestamp configured
```

### Option B: Using psql (if psql is installed)

```powershell
psql -h localhost -U postgres -d SummitSB -f 'C:\Users\sbo63\Desktop\SummitBank-React-App\backend\schema\add_email_notifications_table.sql'
```

Then enter the password: `Sibongile@60`

### Option C: Using pgAdmin

1. Open pgAdmin and connect to your PostgreSQL server
2. Navigate to: Databases → SummitSB → Query Tool
3. Copy the SQL from: `backend\schema\add_email_notifications_table.sql`
4. Paste and execute

---

## Step 2: Configure SMTP Credentials

The `.env` file has been updated with placeholder SMTP settings. Edit it with your actual email credentials:

**File:** `C:\Users\sbo63\Desktop\SummitBank-React-App\backend\.env`

### For Gmail:
1. Enable 2-Factor Authentication in your Google Account
2. Generate an **App Password** at: https://myaccount.google.com/apppasswords
3. Update these lines in `.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-actual-email@gmail.com
SMTP_PASS=your-16-character-app-password
SMTP_FROM=support@mysummshares.com
SUPPORT_EMAIL=support@mysummshares.com
APP_URL=http://localhost:3000
```

### For Other Providers (SendGrid, Mailgun, AWS SES):
Contact your provider for SMTP credentials and update accordingly.

---

## Step 3: Test the Email System

Once migration and SMTP are configured:

```powershell
cd 'C:\Users\sbo63\Desktop\SummitBank-React-App\backend'
node -e "
  require('dotenv').config();
  const emailService = require('./services/emailService');
  
  // Verify exports exist
  console.log('Email service loaded:', {
    sendEmail: typeof emailService.sendEmail,
    sendProfileApprovedEmail: typeof emailService.sendProfileApprovedEmail,
    sendAdminActionEmail: typeof emailService.sendAdminActionEmail,
    getEmailNotifications: typeof emailService.getEmailNotifications,
    retryFailedEmailNotification: typeof emailService.retryFailedEmailNotification
  });
"
```

---

## Step 4: Verify the Admin UI

1. Start the backend: `npm start` (in `backend/` folder)
2. Start the frontend: `npm run dev` (in `summit-shares/` folder)
3. Log in as admin
4. Navigate to the Admin Dashboard → Notifications tab
5. You should see "Email Notifications" section with:
   - Send popup email option
   - Send custom email option
   - Email delivery log table with retry button

---

## Key Files Modified

| File | Change |
|------|--------|
| `backend/services/emailService.js` | Added email sending, retry, and ledger tracking |
| `backend/utils/adminStore.js` | Added email hooks to approval, account, card actions |
| `backend/controllers/adminNotifications.js` | Added retry and log endpoints |
| `backend/routes/admin.js` | Added /admin/emails/* endpoints |
| `backend/.env` | Added SMTP placeholders (needs credentials) |
| `backend/schema/add_email_notifications_table.sql` | New migration (needs to be applied) |
| `summit-shares/src/pages/admin/AdminNotificationsPage.jsx` | Added email log UI |

---

## Email Flow Summary

1. **User Profile Approved** → Email sent with profile details to customer
2. **Account Created by Admin** → Email notification to customer
3. **Account Status Changed** → Email notification (active/inactive/suspended)
4. **Account Put on Hold** → Email notification
5. **Card Issued** → Email notification with card details
6. **Card Status Changed** → Email notification

Each email is logged in the `email_notifications` table with:
- Status: `pending`, `sent`, or `failed`
- Retry count and error messages
- Unique constraint on (user_id, event_type, reference_id) to prevent duplicates

---

## Troubleshooting

**Email not sending?**
- Verify SMTP_USER and SMTP_PASS in .env match your email provider
- Check backend logs: `[EMAIL ERROR]` or `[EMAIL PLACEHOLDER]`
- If SMTP not configured, emails will log as placeholders (useful for dev)

**Migration failed?**
- Verify PostgreSQL is running: `psql -U postgres -c "SELECT version();"`
- Check DB credentials in .env match your setup
- Ensure `email_notifications` table doesn't already exist (safely idempotent, but check)

**Admin UI not showing emails?**
- Clear browser cache
- Verify you're logged in as admin (role='admin')
- Check browser console for network errors

---

## Next Steps (Production)

- Configure production SMTP provider (SendGrid, AWS SES, etc.)
- Set `NODE_ENV=production` in deployed backend
- Configure SSL in production environment
- Set up email retry cron job (optional, for failed emails)
- Monitor email delivery logs in admin dashboard
