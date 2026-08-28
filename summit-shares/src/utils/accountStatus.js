// Client-side mirror of the backend account-status vocabulary
// (backend/utils/accountStatus.js). Used to label restricted accounts on the
// dashboard / transfer screen. The authoritative restriction *messages* always
// come from the API response - this file only covers local display.

export const ACCOUNT_STATUS_LABEL = {
  active: 'Active',
  inactive: 'On hold',
  frozen: 'Frozen',
  closed: 'Closed',
};

export const isRestrictedStatus = (status) => !!status && status !== 'active';

export const accountStatusLabel = (status) =>
  ACCOUNT_STATUS_LABEL[status] || (status ? status.charAt(0).toUpperCase() + status.slice(1) : '');

// Error codes the API returns for account-restriction failures. When a caught
// error carries one of these, show it in a modal ("this action can't be
// completed and here's exactly why") rather than a transient toast.
export const RESTRICTION_ERROR_CODES = new Set([
  'ACCOUNT_NOT_FOUND',
  'SENDER_ACCOUNT_RESTRICTED',
  'DESTINATION_ACCOUNT_RESTRICTED',
  'SENDER_ACCOUNT_SUSPENDED',
  'DESTINATION_ACCOUNT_SUSPENDED',
  'ACCOUNT_RESTRICTED',
]);

export const isRestrictionError = (err) => !!err && RESTRICTION_ERROR_CODES.has(err.code);
