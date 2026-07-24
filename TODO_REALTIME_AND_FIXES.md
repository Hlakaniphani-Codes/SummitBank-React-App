# TODO - Real-Time Events & Banking Workflow Fixes

## Backend: adminStore.js - Add real-time event emissions ✅ COMPLETE
- [x] Import `emitToUser`, `emitToAdmins` from eventEmitter
- [x] `approveApplication`: emit `new-notification` to user
- [x] `rejectApplication`: emit `new-notification` to user
- [x] `setAccountStatus`: emit `new-notification` + `account-update` to user
- [x] `setAccountHold`: emit `new-notification` to user
- [x] `setAccountBalance`: emit `balance-update` + `new-notification` to user
- [x] `creditAccount`: emit `balance-update` + `new-transaction` + `new-notification` to user
- [x] `debitAccount`: emit `balance-update` + `new-transaction` + `new-notification` to user
- [x] `issueCard`: emit `card-update` + `new-notification` to user
- [x] `setCardStatus` (admin): emit `card-update` + `new-notification` to user
- [x] `approveCardRequest`: emit `card-update` + `new-notification` to user
- [x] `rejectCardRequest`: emit `card-update` + `new-notification` to user
- [x] `replaceCard`: emit `card-update` + `new-notification` to user
- [x] `cancelCard`: emit `card-update` + `new-notification` to user

## Backend: postgresStore.js ✅ COMPLETE
- [x] Import `emitToAdmins`
- [x] `requestCard`: emit `admin-notification` to admin sockets
- [x] `transferMoney` + `payBill`: check if source account on hold → reject with pending

## Backend: controllers/adminCards.js ✅ COMPLETE (events handled in adminStore.js)
- [x] Real-time emissions already handled by adminStore.js functions called by this controller

## Backend: controllers/adminAccounts.js ✅ COMPLETE (events handled in adminStore.js)
- [x] Real-time emissions already handled by adminStore.js functions called by this controller

## Frontend: GenerateStatementModal.jsx ✅ COMPLETE
- [x] Added CSV download functionality on statement generation

## Frontend: DashboardPage.jsx ✅ COMPLETE
- [x] Added fallback polling interval (30s) as insurance for WebSocket disconnects
