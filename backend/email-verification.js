const crypto = require('node:crypto');

function createVerificationCode() {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
}

function hashVerificationCode(email, code, secret) {
  return crypto.createHmac('sha256', secret)
    .update(`${email.trim().toLowerCase()}:${code}`)
    .digest();
}

function verificationCodeMatches(email, code, expectedHash, secret) {
  const actualHash = hashVerificationCode(email, code, secret);
  const storedHash = Buffer.from(expectedHash || '', 'hex');
  return actualHash.length === storedHash.length && crypto.timingSafeEqual(actualHash, storedHash);
}

function createResendCodeState(lastSentAt, now = Date.now()) {
  if (Number.isFinite(lastSentAt) && now - lastSentAt < 60_000) {
    return { allowed: false, nextAllowedAt: lastSentAt + 60_000 };
  }
  return { allowed: true, nextAllowedAt: now + 60_000 };
}

module.exports = {
  createVerificationCode,
  hashVerificationCode,
  verificationCodeMatches,
  createResendCodeState
};
