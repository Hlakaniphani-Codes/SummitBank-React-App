const assert = require('assert');
const emailService = require('./services/emailService');

assert.ok(typeof emailService.sendProfileApprovedEmail === 'function', 'sendProfileApprovedEmail should exist');
assert.ok(typeof emailService.sendAdminActionEmail === 'function', 'sendAdminActionEmail should exist');
assert.ok(typeof emailService.getEmailNotifications === 'function', 'getEmailNotifications should exist');
assert.ok(typeof emailService.retryFailedEmailNotification === 'function', 'retryFailedEmailNotification should exist');
assert.ok(typeof emailService.sendEmail === 'function', 'sendEmail should exist');

console.log('email feature checks passed');
