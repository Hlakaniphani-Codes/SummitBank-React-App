// ============================================================
// ACCOUNT STATUS / RESTRICTION - SINGLE SOURCE OF TRUTH
// ============================================================
// Every financial operation (transfers, bill pay, wires, cheque deposits,
// card requests, managing beneficiaries/payees) asks this module whether an
// account + its owner may perform the operation, and - when the answer is no -
// what to tell the customer.
//
// The admin notification + email layer (utils/adminStore.js) imports its
// status wording from here too, so the language a customer reads in an
// account-status email always matches what a blocked transaction tells them.
// Do NOT hard-code status phrases anywhere else.

const pool = require('../config/db');

// The DB `account_status` enum. 'inactive' is what the admin "deactivate
// account" / "place on hold" action sets, and is shown to customers as
// "on hold" (matching setAccountStatus in adminStore.js).
const ACCOUNT_STATUS_LABEL = {
  active: 'active',
  inactive: 'on hold',
  frozen: 'frozen',
  closed: 'closed',
};

// Past-tense phrasing for the admin "Your account #X has been ___" notification
// and email. Kept beside the labels so the two can never drift apart.
const ACCOUNT_STATUS_ACTION = {
  active: 'activated',
  inactive: 'placed on hold',
  frozen: 'frozen',
  closed: 'closed',
};

// What each account status permits. Anything other than 'active' blocks money
// movement in both directions today; listing every status explicitly leaves
// room for finer per-operation rules later without touching call sites.
const ACCOUNT_CAPABILITIES = {
  active: { canSend: true, canReceive: true },
  inactive: { canSend: false, canReceive: false },
  frozen: { canSend: false, canReceive: false },
  closed: { canSend: false, canReceive: false },
};

const ERROR_CODES = {
  ACCOUNT_NOT_FOUND: 'ACCOUNT_NOT_FOUND',
  SENDER_ACCOUNT_RESTRICTED: 'SENDER_ACCOUNT_RESTRICTED',
  DESTINATION_ACCOUNT_RESTRICTED: 'DESTINATION_ACCOUNT_RESTRICTED',
  SENDER_ACCOUNT_SUSPENDED: 'SENDER_ACCOUNT_SUSPENDED',
  DESTINATION_ACCOUNT_SUSPENDED: 'DESTINATION_ACCOUNT_SUSPENDED',
  ACCOUNT_RESTRICTED: 'ACCOUNT_RESTRICTED',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  SAME_ACCOUNT: 'SAME_ACCOUNT',
};

// "Not found" is the ONLY 404. An account that exists but is restricted is a
// business-rule failure -> 409 (conflict with current account state).
// Amount / same-account problems are 422 (unprocessable).
const HTTP_STATUS_BY_CODE = {
  ACCOUNT_NOT_FOUND: 404,
  SENDER_ACCOUNT_RESTRICTED: 409,
  DESTINATION_ACCOUNT_RESTRICTED: 409,
  SENDER_ACCOUNT_SUSPENDED: 409,
  DESTINATION_ACCOUNT_SUSPENDED: 409,
  ACCOUNT_RESTRICTED: 409,
  INSUFFICIENT_FUNDS: 422,
  SAME_ACCOUNT: 422,
};

// Business-rule error. Carries a stable machine code, the HTTP status the API
// should answer with, and (optionally) which request field the problem is on.
// Mirrors the enriched-Error pattern already used by otpService.js
// (error.code / error.waitSeconds).
class RestrictionError extends Error {
  constructor(code, message, { field = null, httpStatus } = {}) {
    super(message);
    this.name = 'RestrictionError';
    this.code = code;
    this.field = field;
    this.httpStatus = httpStatus || HTTP_STATUS_BY_CODE[code] || 400;
  }
}

// "is currently frozen" / "is currently on hold" / "has been closed"
const statusPhrase = (label) => (label === 'closed' ? 'has been closed' : `is currently ${label}`);

// ------------------------------------------------------------
// Core guard: can this account take part in this operation?
// Runs inside the caller's transaction (pass the pg client) so the check and
// the debit/credit that follows see - and lock - the same row.
//
//   role: 'sender'      -> the account funds being moved out of / charged
//         'destination' -> the account receiving an incoming transfer
//   ownerId: when set, the account must belong to this user (a customer moving
//            their own money); omit for a destination that may be another
//            customer's account.
//
// Throws RestrictionError; on success returns the locked account row
// { id, status, balance, user_id, account_number, owner_active }.
// ------------------------------------------------------------
async function assertAccountUsable(client, accountId, { role = 'sender', ownerId = null } = {}) {
  const isDestination = role === 'destination';
  const field = isDestination ? 'destination_account' : 'source_account';
  const which = isDestination ? 'destination' : 'source';
  const capability = isDestination ? 'canReceive' : 'canSend';

  const params = [accountId];
  let sql = `SELECT a.id, a.status, a.balance, a.user_id, a.account_number, u.is_active AS owner_active
             FROM accounts a
             JOIN users u ON u.id = a.user_id
             WHERE a.id = $1`;
  if (ownerId != null) {
    params.push(ownerId);
    sql += ` AND a.user_id = $${params.length}`;
  }
  sql += ' FOR UPDATE OF a';

  const { rows } = await client.query(sql, params);

  // Genuinely not identifiable - the ONLY case that is a "not found".
  if (rows.length === 0) {
    throw new RestrictionError(
      ERROR_CODES.ACCOUNT_NOT_FOUND,
      `The ${which} account could not be found.`,
      { field }
    );
  }

  const account = rows[0];

  // Owner's profile suspended / deactivated - blocks both directions on every
  // account they hold.
  if (!account.owner_active) {
    throw new RestrictionError(
      isDestination ? ERROR_CODES.DESTINATION_ACCOUNT_SUSPENDED : ERROR_CODES.SENDER_ACCOUNT_SUSPENDED,
      isDestination
        ? 'This transfer cannot be completed because the destination account is currently restricted.'
        : 'You cannot complete this transaction because your account is currently restricted.',
      { field }
    );
  }

  // Account-level restriction (on hold / frozen / closed).
  const caps = ACCOUNT_CAPABILITIES[account.status] || { canSend: false, canReceive: false };
  if (!caps[capability]) {
    const label = ACCOUNT_STATUS_LABEL[account.status] || account.status;
    throw new RestrictionError(
      isDestination ? ERROR_CODES.DESTINATION_ACCOUNT_RESTRICTED : ERROR_CODES.SENDER_ACCOUNT_RESTRICTED,
      isDestination
        ? `This transfer cannot be completed because the destination account ${statusPhrase(label)}.`
        : `This transaction cannot be completed because your account ${statusPhrase(label)}.`,
      { field }
    );
  }

  return account;
}

// Lightweight guard for non-money actions that still must be blocked for a
// suspended/deactivated customer (adding or removing beneficiaries / payees).
// Uses the pool by default; pass a client to run inside a transaction.
async function assertOwnerActive(userId, db = pool) {
  const { rows } = await db.query('SELECT is_active FROM users WHERE id = $1', [userId]);
  if (rows.length === 0) {
    throw new RestrictionError(ERROR_CODES.ACCOUNT_NOT_FOUND, 'Your account could not be found.', {
      httpStatus: 404,
    });
  }
  if (!rows[0].is_active) {
    throw new RestrictionError(
      ERROR_CODES.ACCOUNT_RESTRICTED,
      'Your account is currently restricted. This action is unavailable until the restriction is removed.',
      { field: 'account' }
    );
  }
}

module.exports = {
  ACCOUNT_STATUS_LABEL,
  ACCOUNT_STATUS_ACTION,
  ACCOUNT_CAPABILITIES,
  ERROR_CODES,
  HTTP_STATUS_BY_CODE,
  RestrictionError,
  assertAccountUsable,
  assertOwnerActive,
};
