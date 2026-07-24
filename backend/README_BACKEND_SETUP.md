# SummitFinTech Backend - PostgreSQL Setup

## Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm

## 1) Install Dependencies
```bash
cd backend
npm install
```

## 2) Configure Environment
Copy the `.env.example` file to `.env` and configure your settings:
```bash
cp ../.env.example .env
# OR create manually:
# DATABASE_URL=postgresql://postgres:password@localhost:5432/summitdb
# JWT_SECRET=your-secret-key
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-app-password
# FRONTEND_URL=http://localhost:5173
```

## 3) Create PostgreSQL Database & Schema
Connect to PostgreSQL and run the unified schema:
```bash
psql -U postgres -c "CREATE DATABASE summitdb;"
psql -U postgres -d summitdb -f backend/schema/summit_schema.sql
```

The schema creates all tables including:
- users (customers + admins)
- accounts (checking + savings)
- cards (debit + credit)
- transactions
- notifications
- applications
- beneficiaries
- payees
- bills
- invoice_payments
- documents
- wire_transfers
- deposited_cheques
- user_sessions
- password_resets
- login_history
- audit_logs

## 4) Seed Admin User (Optional)
After creating the schema, run the seed script to create an initial admin account:
```sql
INSERT INTO users (first_name, last_name, email, password_hash, pin_hash, role, is_active)
VALUES ('Admin', 'User', 'admin@summitshares.com', '$2b$10$...', '$2b$10$...', 'super_admin', true);
```
Generate a password hash using bcrypt before inserting.

## 5) Run Backend
```bash
npm run dev   # Development (with hot reload)
# OR
npm start     # Production
```

## Available Scripts
- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server
- `npm test` - Run tests (when implemented)

## Environment Variables
| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 5000 |
| NODE_ENV | Environment | development |
| DATABASE_URL | PostgreSQL connection string | Required |
| JWT_SECRET | JWT signing secret | Required |
| SMTP_HOST | Email SMTP host | smtp.gmail.com |
| SMTP_PORT | Email SMTP port | 587 |
| SMTP_USER | SMTP username | Required for email |
| SMTP_PASS | SMTP password | Required for email |
| FRONTEND_URL | Frontend URL for reset links | http://localhost:5173 |
| ALLOWED_ORIGINS | CORS allowed origins | http://localhost:5173 |

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/test | Health check |
| POST | /api/auth/register | Register new customer |
| POST | /api/auth/login | Login (returns JWT) |
| POST | /api/auth/forgot-password | Request password reset |
| POST | /api/auth/reset-password | Reset password with token |
| POST | /api/auth/upload-kyc | Upload KYC documents |

### Customer Portal
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/dashboard | Bearer | Get dashboard data |
| GET | /api/transactions | Bearer | List transactions |
| POST | /api/transactions/transfer | Bearer | Internal transfer |
| GET | /api/cards | Bearer | List cards |
| GET | /api/cards/:cardId | Bearer | View card details |
| POST | /api/cards/:cardId/block | Bearer | Block card |
| POST | /api/cards/:cardId/activate | Bearer | Activate card |
| POST | /api/cards/request | Bearer | Request new card |
| GET | /api/beneficiaries | Bearer | List beneficiaries |
| POST | /api/beneficiaries | Bearer | Add beneficiary |
| DELETE | /api/beneficiaries/:id | Bearer | Remove beneficiary |
| GET | /api/payments/payees | Bearer | List payees |
| POST | /api/payments/payees | Bearer | Add payee |
| GET | /api/payments/bills | Bearer | List bills |
| POST | /api/payments/bills | Bearer | Add bill |
| POST | /api/payments/bills/pay | Bearer | Pay bill |
| GET | /api/payments/documents | Bearer | List documents |
| POST | /api/payments/documents/statement | Bearer | Generate statement |
| GET | /api/wires | Bearer | List wire transfers |
| POST | /api/wires/create | Bearer | Create wire transfer |
| GET | /api/wires/:id | Bearer | Get wire details |
| GET | /api/cheques | Bearer | List cheque deposits |
| POST | /api/cheques/deposit | Bearer | Deposit cheque |
| GET | /api/sessions | Bearer | List sessions |
| POST | /api/sessions/:id/signout | Bearer | Sign out session |
| GET | /api/user/profile | Bearer | Get profile |
| PUT | /api/user/profile | Bearer | Update profile |
| PUT | /api/user/password | Bearer | Change password |
| GET | /api/notifications | Bearer | List notifications |
| PUT | /api/notifications/:id/read | Bearer | Mark read |
| GET | /api/support/faq | None | Get FAQ |

### Admin Portal
All admin endpoints require Bearer token with admin or super_admin role.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/admin/dashboard | Dashboard stats |
| GET | /api/admin/customers | List customers |
| GET | /api/admin/customers/:id | Get customer details |
| GET | /api/admin/applications | List applications |
| POST | /api/admin/applications/:id/approve | Approve application |
| POST | /api/admin/applications/:id/reject | Reject application |
| POST | /api/admin/applications/:id/review | Place under review |
| POST | /api/admin/customers/:id/send-email | Send email to customer |
| GET | /api/admin/accounts | List all accounts |
| POST | /api/admin/accounts/:id/credit | Credit account |
| POST | /api/admin/accounts/:id/debit | Debit account |
| POST | /api/admin/accounts/:id/balance | Edit balance |
| POST | /api/admin/accounts/:id/hold | Place hold |
| POST | /api/admin/accounts/:id/unhold | Remove hold |
| GET | /api/admin/cards | List all cards |
| PUT | /api/admin/cards/:id/activate | Activate card |
| PUT | /api/admin/cards/:id/deactivate | Deactivate card |
| PUT | /api/admin/cards/:id/visibility | Hide/show card |
| POST | /api/admin/cards/:id/approve | Approve card request |
| GET | /api/admin/transfers | List pending transfers |
| PUT | /api/admin/transfers/:id/approve | Approve transfer |
| PUT | /api/admin/transfers/:id/block | Block transfer |
| PUT | /api/admin/transfers/:id/hold | Hold transfer |
| PUT | /api/admin/transfers/:id/sent | Mark as sent |
| POST | /api/admin/transfers/:id/error | Set error message |
| POST | /api/admin/notifications/popup | Send popup |
| POST | /api/admin/notifications/email | Email customer |
| POST | /api/admin/notifications/broadcast | Broadcast |
| GET | /api/admin/audit/login-history | Login history |
| GET | /api/admin/audit/user-activity | User activity |
| GET | /api/admin/audit/admin-activity | Admin activity |
| GET | /api/admin/audit/logs | Audit logs |

## Tech Stack
- **Runtime:** Node.js + Express.js
- **Database:** PostgreSQL
- **Authentication:** JWT + bcrypt
- **Email:** Nodemailer (SMTP)
- **File Upload:** Multer
- **Security:** Helmet, CORS, Rate Limiting
- **Logging:** Morgan + Winston

