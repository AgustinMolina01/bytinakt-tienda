const crypto = require('node:crypto');
const { promisify } = require('node:util');

const scrypt = promisify(crypto.scrypt);
const developmentSecret = crypto.randomBytes(32).toString('hex');

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = await scrypt(password, salt, 64);
  return `scrypt$${salt}$${hash.toString('hex')}`;
}

async function verifyPassword(password, storedHash) {
  const [algorithm, salt, expectedHash] = String(storedHash || '').split('$');
  if (algorithm !== 'scrypt' || !salt || !expectedHash || !/^[a-f0-9]{128}$/i.test(expectedHash)) {
    return false;
  }
  const actualHash = await scrypt(password, salt, 64);
  return crypto.timingSafeEqual(actualHash, Buffer.from(expectedHash, 'hex'));
}

function tokenSecret() {
  return process.env.AUTH_TOKEN_SECRET || developmentSecret;
}

function createToken(user, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({
    id: String(user.id || user._id),
    name: user.nombre,
    email: user.email,
    role: user.rol,
    exp: Math.floor(now / 1000) + 60 * 60 * 8
  })).toString('base64url');
  const signature = crypto.createHmac('sha256', tokenSecret()).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function verifyToken(token, now = Date.now()) {
  if (typeof token !== 'string') {
    return null;
  }
  const [payload, suppliedSignature, ...extra] = token.split('.');
  if (!payload || !suppliedSignature || extra.length) {
    return null;
  }
  const expectedSignature = crypto.createHmac('sha256', tokenSecret()).update(payload).digest();
  let actualSignature;
  try {
    actualSignature = Buffer.from(suppliedSignature, 'base64url');
  } catch {
    return null;
  }
  if (actualSignature.length !== expectedSignature.length ||
      !crypto.timingSafeEqual(actualSignature, expectedSignature)) {
    return null;
  }
  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!session.id || !session.email || !['admin', 'cliente'].includes(session.role) ||
        !Number.isInteger(session.exp) || session.exp <= Math.floor(now / 1000)) {
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

module.exports = { hashPassword, verifyPassword, createToken, verifyToken };
