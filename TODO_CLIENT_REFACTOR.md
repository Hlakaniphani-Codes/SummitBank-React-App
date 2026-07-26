# Client Portal Refactoring Plan

## Goal
Restructure the monolithic `DashboardPage.jsx` into a proper `client` folder structure like the admin portal, with separate page files and a shared layout component.

## New Structure

```
summit-shares/src/
  pages/client/
    ClientDashboard.jsx      (main dashboard view - accounts, cards, widgets)
    ClientTransfer.jsx       (fund transfer page)
    ClientWires.jsx          (wire transfers page)
    ClientCheques.jsx        (cheque deposits page)
    ClientCards.jsx          (cards management page)
    ClientTransactions.jsx   (transaction history page)
    ClientBills.jsx          (pay bills page)
    ClientBeneficiaries.jsx  (beneficiaries page)
    ClientStatements.jsx     (statements & documents page)
    ClientNotifications.jsx  (notifications page)
    ClientSecurity.jsx       (security settings page)
    ClientSupport.jsx        (support center page)

  components/client/
    ClientLayout.jsx         (shared layout - sidebar, top-nav, toast, modals, state)
    AddBeneficiaryModal.jsx  (moved from components/)
    AddPayeeModal.jsx        (moved from components/)
    AddBillModal.jsx         (moved from components/)
    GenerateStatementModal.jsx (moved from components/)
```

## Architecture

### ClientLayout.jsx (the "brain")
- Manages ALL shared state: dashboardData, currentUser, notifications, transactions, etc.
- Handles ALL API calls: loadDashboard, loadTransactions, loadNotifications, etc.
- Manages ALL shared UI: sidebar, top-nav, toast, modals (sign out, profile, account settings, preferences, help, invoice)
- Manages WebSocket real-time connections
- Uses React Context to provide state and actions to child pages
- Renders `<Outlet />` from react-router-dom for page content

### Page Components (the "views")
- Each receives state and action handlers via Context
- Renders only its specific section content (no layout chrome)
- Example: `ClientDashboard.jsx` renders just the dashboard cards, widgets, etc.

### App.jsx Changes
- Add nested routes under `/dashboard/*` using ClientLayout
- Old `/dashboard` route becomes a redirect to `/dashboard/home`
- Remove direct import of DashboardPage

## Implementation Steps

1. Create `components/client/ClientLayout.jsx` - Extract all shared state, layout, modals, WebSocket logic
2. Create `pages/client/ClientDashboard.jsx` - Extract dashboard section
3. Create `pages/client/ClientTransfer.jsx` - Extract transfer section
4. Create `pages/client/ClientWires.jsx` - Extract wires section
5. Create `pages/client/ClientCheques.jsx` - Extract cheques section
6. Create `pages/client/ClientCards.jsx` - Extract cards section
7. Create `pages/client/ClientTransactions.jsx` - Extract transactions section
8. Create `pages/client/ClientBills.jsx` - Extract bills section
9. Create `pages/client/ClientBeneficiaries.jsx` - Extract beneficiaries section
10. Create `pages/client/ClientStatements.jsx` - Extract statements section
11. Create `pages/client/ClientNotifications.jsx` - Extract notifications section
12. Create `pages/client/ClientSecurity.jsx` - Extract security section
13. Create `pages/client/ClientSupport.jsx` - Extract support section
14. Move modal components to `components/client/`
15. Update `App.jsx` with new nested routes
16. Keep old `DashboardPage.jsx` as redirect or remove
17. Update imports in all files
18. Test thoroughly

## Risk Mitigation
- All logic is preserved exactly - just reorganized
- React Context ensures state flows correctly
- Each page component is a pure extraction of existing JSX
- No functionality changes, only structural
