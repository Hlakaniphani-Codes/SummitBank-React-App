// Consistent JSON error envelope for the API.
//
// Business-rule failures (utils/accountStatus.js RestrictionError, otpService
// OTP_COOLDOWN, ...) carry a stable UPPER_SNAKE `code` and often their own
// `httpStatus` / `field`. Everything else falls back to a generic status.
//
// Response shape (top-level `message` kept for backward compatibility):
//   {
//     "success": false,
//     "message": "...",
//     "code": "ACCOUNT_FROZEN",
//     "error": { "code": "ACCOUNT_FROZEN", "message": "...", "field": "destination_account" }
//   }
const looksLikeBusinessCode = (code) => typeof code === 'string' && /^[A-Z][A-Z0-9_]*$/.test(code);

function sendError(res, err, { fallbackStatus = 400, fallbackMessage = 'Request failed', logLabel } = {}) {
  if (logLabel) console.error(`${logLabel}:`, err && err.message ? err.message : err);

  const hasCode = err && looksLikeBusinessCode(err.code);
  const status = (err && Number.isInteger(err.httpStatus) && err.httpStatus) || fallbackStatus;
  const code = hasCode ? err.code : 'REQUEST_FAILED';
  const message = (err && err.message) || fallbackMessage;
  const field = (err && err.field) || null;

  const body = {
    success: false,
    message,
    code,
    error: { code, message, field },
  };
  if (err && err.waitSeconds !== undefined) body.waitSeconds = err.waitSeconds;

  return res.status(status).json(body);
}

module.exports = { sendError };
