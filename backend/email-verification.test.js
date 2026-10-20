const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createVerificationCode,
  hashVerificationCode,
  verificationCodeMatches,
  createResendCodeState
} = require('./email-verification');

test('verification codes are six digits, including leading zeroes', () => {
  for (let index = 0; index < 100; index += 1) {
    assert.match(createVerificationCode(), /^\d{6}$/);
  }
});

test('email verification resend is throttled to one request per minute', () => {
  const now = 1_800_000_000_000;
  assert.deepEqual(createResendCodeState(now, now), {
    allowed: false,
    nextAllowedAt: now + 60_000
  });
  assert.equal(createResendCodeState(now, now + 59_999).allowed, false);
  assert.equal(createResendCodeState(now, now + 60_000).allowed, true);
  assert.equal(createResendCodeState(null, now).allowed, true);
});

test('verification code hashes are bound to the normalized email and secret', () => {
  const secret = 'a-secret-that-is-long-enough-for-testing';
  const hash = hashVerificationCode('Customer@Example.com', '012345', secret).toString('hex');

  assert.equal(verificationCodeMatches('customer@example.com', '012345', hash, secret), true);
  assert.equal(verificationCodeMatches('other@example.com', '012345', hash, secret), false);
  assert.equal(verificationCodeMatches('customer@example.com', '012346', hash, secret), false);
  assert.equal(verificationCodeMatches('customer@example.com', '012345', hash, 'different-secret'), false);
  assert.equal(verificationCodeMatches('customer@example.com', '012345', 'invalid', secret), false);
});
