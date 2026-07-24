# Banking Workflow Redesign - TODO

## Phase 1: Database Schema + Auth Changes ✅
- [x] Add schema migration for `status`, `login_enabled`, `approved_by`, `approved_at`, `rejected_reason` columns
- [x] Update `register` in authController - only create user, no accounts/cards
- [x] Update `login` in authController - check approval status
- [x] Update `createUser` in postgresStore - no accounts/cards
- [x] Add admin approve/reject endpoints in adminAccounts controller
- [x] Add admin approve/reject routes
- [x] Return pending message on registration

## Phase 2: Admin Dashboard (Pending Applications)
- [ ] Add pending applications section to admin dashboard page
- [ ] Add approve/reject UI

## Phase 3: Admin Customer Management
- [ ] Status badges: Pending, Approved, Rejected, Active, Suspended
- [ ] Approve/Reject from customer list

## Phase 4: Frontend Registration Changes
- [ ] Enroll page shows pending message
- [ ] Login shows appropriate messages

## Phase 5: Frontend Dashboard Guard
- [ ] Redirect unapproved users
- [ ] Show setup-in-progress if no accounts
