const test = require('node:test');
const assert = require('node:assert/strict');
const { hashPassword, verifyPassword, createToken, verifyToken } = require('./auth');

test('password hashing verifies the original password without storing it as plain text', async () => {
  const hash = await hashPassword('correct horse battery');
  assert.notEqual(hash, 'correct horse battery');
  assert.match(hash, /^scrypt\$/);
  assert.equal(await verifyPassword('correct horse battery', hash), true);
  assert.equal(await verifyPassword('wrong password', hash), false);
});

test('session tokens are signed and expire after eight hours', () => {
  const now = Date.UTC(2026, 0, 1);
  const user = { id: 'user-1', nombre: 'Test', email: 'test@example.com', rol: 'cliente' };
  const token = createToken(user, now);

  assert.equal(verifyToken(token, now).id, user.id);
  assert.equal(verifyToken(`${token}tampered`, now), null);
  assert.equal(verifyToken(token, now + 8 * 60 * 60 * 1000), null);
  assert.equal(verifyToken(undefined, now), null);
});
