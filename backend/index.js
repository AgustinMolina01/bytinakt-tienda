const crypto = require('node:crypto');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const nodemailer = require('nodemailer');
const admin = require('firebase-admin');
const { getAuth: getFirebaseAdminAuth } = require('firebase-admin/auth');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
require('dotenv').config();

const { hashPassword, verifyPassword, createToken, verifyToken } = require('./auth');
const {
  createVerificationCode,
  hashVerificationCode,
  verificationCodeMatches,
  createResendCodeState
} = require('./email-verification');
const EmailVerification = require('./models/EmailVerification');

const app = express();
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:4200')
  .split(',')
  .map((origin) => origin.trim());

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: allowedOrigins,
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
}));

// Solo la carga de productos acepta cuerpos grandes (imágenes en base64).
const smallJson = express.json({ limit: '100kb' });
const productJson = express.json({ limit: '20mb' });
const isProductWrite = (req) => req.path.startsWith('/api/productos') && ['POST', 'PUT'].includes(req.method);
app.use((req, res, next) => (isProductWrite(req) ? productJson : smallJson)(req, res, next));

const rateLimitMessage = { error: 'Demasiados intentos. Esperá unos minutos e intentá de nuevo.' };
const limiterOptions = { standardHeaders: 'draft-7', legacyHeaders: false, message: rateLimitMessage };
const authLimiter = rateLimit({ ...limiterOptions, windowMs: 15 * 60_000, limit: 20 });
const codeLimiter = rateLimit({ ...limiterOptions, windowMs: 60 * 60_000, limit: 10 });
const checkoutLimiter = rateLimit({ ...limiterOptions, windowMs: 15 * 60_000, limit: 30 });
const apiLimiter = rateLimit({ ...limiterOptions, windowMs: 60_000, limit: 300 });
app.use('/api', apiLimiter);

app.get('/api/health', (req, res) => {
  const databaseConnected = mongoose.connection.readyState === 1;
  return res.status(databaseConnected ? 200 : 503).json({
    status: databaseConnected ? 'ok' : 'unavailable',
    database: databaseConnected ? 'connected' : 'disconnected'
  });
});

app.get('/api/checkout/config', (req, res) => {
  const shippingRate = Number(process.env.SHIPPING_FLAT_RATE);
  const transferDiscountPercent = Number(process.env.TRANSFER_DISCOUNT_PERCENT || 20);
  const bankAlias = (process.env.BANK_TRANSFER_ALIAS || '').trim();
  const bankCbu = (process.env.BANK_TRANSFER_CBU || '').trim();
  const accountHolder = (process.env.BANK_ACCOUNT_HOLDER || '').trim();

  return res.json({
    pickup: {
      address: process.env.LOCAL_PICKUP_ADDRESS || 'San Martín 4175, Mar del Plata',
      postalCode: process.env.LOCAL_PICKUP_POSTAL_CODE || '7600'
    },
    homeDelivery: {
      available: Number.isFinite(shippingRate) && shippingRate > 0,
      cost: Number.isFinite(shippingRate) && shippingRate > 0 ? shippingRate : null
    },
    mercadopago: { available: Boolean(process.env.MP_ACCESS_TOKEN) },
    bankTransfer: {
      available: Boolean(accountHolder && (bankAlias || bankCbu)),
      bank: process.env.BANK_TRANSFER_BANK || 'Banco Provincia',
      alias: bankAlias,
      cbu: bankCbu,
      accountHolder,
      discountPercent: Number.isFinite(transferDiscountPercent)
        ? Math.max(0, Math.min(100, transferDiscountPercent))
        : 20
    }
  });
});

const usuarioSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: false },
  rol: { type: String, enum: ['cliente', 'admin'], default: 'cliente' },
  telefono: { type: String, trim: true, maxlength: 30, default: '' },
  direccion: { type: String, trim: true, maxlength: 160, default: '' },
  ciudad: { type: String, trim: true, maxlength: 100, default: '' },
  codigoPostal: { type: String, trim: true, maxlength: 20, default: '' }
}, { timestamps: true });

const productoSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true },
  descripcion: { type: String, default: '' },
  precio: { type: Number, required: true, min: 0.01 },
  categoria: { type: String, required: true },
  talle: [String],
  variantes: [{
    talle: { type: String, required: true, trim: true },
    stock: { type: Number, required: true, min: 0, default: 0 }
  }],
  colores: [{ type: String, trim: true }],
  guiaTalles: { type: String, trim: true, maxlength: 2000, default: '' },
  imagenes: [String]
}, { timestamps: true });

const pedidoSchema = new mongoose.Schema({
  cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  clienteNombre: { type: String, required: true },
  email: { type: String, required: true },
  envio: {
    direccion: { type: String, required: true },
    ciudad: { type: String, required: true },
    codigoPostal: { type: String, required: true },
    telefono: { type: String, required: true }
  },
  metodoEntrega: { type: String, enum: ['retiro', 'envio'], default: 'envio' },
  costoEnvio: { type: Number, min: 0, default: 0 },
  metodoPago: { type: String, enum: ['mercadopago', 'transferencia'], default: 'mercadopago' },
  descuentoTransferencia: { type: Number, min: 0, default: 0 },
  items: [{
    producto: { type: mongoose.Schema.Types.ObjectId, ref: 'Producto', required: true },
    nombre: { type: String, required: true },
    talle: { type: String, default: '' },
    color: { type: String, default: '' },
    precio: { type: Number, required: true },
    cantidad: { type: Number, required: true, min: 1 },
    imagen: { type: String, default: '' }
  }],
  total: { type: Number, required: true },
  estado: { type: String, enum: ['pendiente', 'pagado', 'cancelado', 'error_pago'], default: 'pendiente' },
  reservaStockActiva: { type: Boolean, default: false },
  reservaStockExpira: Date,
  preferenciaPago: String,
  pagoId: String
}, { timestamps: true });

const Usuario = mongoose.models.Usuario || mongoose.model('Usuario', usuarioSchema);
const Producto = mongoose.models.Producto || mongoose.model('Producto', productoSchema);
const Pedido = mongoose.models.Pedido || mongoose.model('Pedido', pedidoSchema);

const emailVerificationSecret = process.env.AUTH_TOKEN_SECRET || crypto.randomBytes(32).toString('hex');
let firebaseAuth;

app.get('/', (req, res) => res.json({ message: 'API de Bytinakt funcionando.' }));

function timingSafeTextEqual(value, expected) {
  const left = Buffer.from(value);
  const right = Buffer.from(expected);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function sendError(res, status, error) {
  return res.status(status).json({ error });
}

function requireAuth(req, res, next) {
  const authorization = req.get('authorization') || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  const session = verifyToken(token);
  if (!session) {
    return sendError(res, 401, 'Iniciá sesión para continuar.');
  }
  req.sessionUser = session;
  return next();
}

function requireAdmin(req, res, next) {
  if (req.sessionUser?.role !== 'admin') {
    return sendError(res, 403, 'Esta acción requiere una cuenta administradora.');
  }
  return next();
}

function publicUser(user) {
  return {
    id: user._id,
    nombre: user.nombre,
    email: user.email,
    rol: user.rol,
    telefono: user.telefono || '',
    direccion: user.direccion || '',
    ciudad: user.ciudad || '',
    codigoPostal: user.codigoPostal || ''
  };
}

function issueSession(res, user) {
  const safeUser = publicUser(user);
  return res.json({ token: createToken(safeUser), usuario: safeUser });
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getEmailTransporter() {
  const emailUser = process.env.EMAIL_USER;
  const emailPassword = process.env.EMAIL_APP_PASSWORD;
  if (!emailUser || !emailPassword) {
    return null;
  }
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: emailUser, pass: emailPassword.replace(/\s/g, '') }
  });
}

function getFirebaseAuth() {
  if (firebaseAuth) {
    return firebaseAuth;
  }
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountJson) {
    return null;
  }
  let serviceAccount;
  try {
    serviceAccount = JSON.parse(serviceAccountJson);
  } catch (error) {
    console.error('FIREBASE_SERVICE_ACCOUNT_JSON no contiene JSON válido.');
    throw new Error('Firebase Admin no está configurado correctamente.');
  }
  const app = admin.apps.length
    ? admin.app()
    : admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  firebaseAuth = getFirebaseAdminAuth(app);
  return firebaseAuth;
}

async function devolverStock(items) {
  for (const item of items) {
    if (!item.talle) {
      continue;
    }
    await Producto.updateOne(
      { _id: item.producto, variantes: { $elemMatch: { talle: item.talle } } },
      { $inc: { 'variantes.$.stock': item.cantidad } }
    );
  }
}

async function liberarStockDePedido(orderId, estado = 'cancelado') {
  const order = await Pedido.findOneAndUpdate(
    { _id: orderId, reservaStockActiva: true },
    { $set: { reservaStockActiva: false, estado } },
    { new: true }
  );
  if (order) {
    await devolverStock(order.items);
  }
  return order;
}

async function liberarReservasVencidas() {
  const expiredOrders = await Pedido.find({
    estado: 'pendiente',
    reservaStockActiva: true,
    reservaStockExpira: { $lte: new Date() }
  }).select('_id');
  for (const order of expiredOrders) {
    await liberarStockDePedido(order._id);
  }
}

app.post('/api/auth/registro/codigo', codeLimiter, async (req, res) => {
  try {
    const nombre = typeof req.body.nombre === 'string' ? req.body.nombre.trim() : '';
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    if (!nombre || nombre.length > 120 || !validEmail(email) || password.length < 10) {
      return sendError(res, 400, 'Ingresá tus datos y una contraseña de al menos 10 caracteres.');
    }
    const transporter = getEmailTransporter();
    if (!transporter) {
      return sendError(res, 503, 'El envío de códigos por correo todavía no está configurado.');
    }
    if (await Usuario.exists({ email })) {
      return sendError(res, 409, 'Ese correo ya está registrado.');
    }

    const existingVerification = await EmailVerification.findOne({ email });
    const resendState = createResendCodeState(
      existingVerification?.lastSentAt?.getTime()
    );
    if (!resendState.allowed) {
      return sendError(res, 429, 'Esperá un minuto antes de pedir otro código.');
    }

    const code = createVerificationCode();
    const passwordHash = await hashPassword(password);
    const now = new Date();
    const codeHash = hashVerificationCode(email, code, emailVerificationSecret).toString('hex');
    await EmailVerification.findOneAndUpdate(
      { email },
      {
        $set: {
          nombre,
          password: passwordHash,
          codeHash,
          attempts: 0,
          expiresAt: new Date(now.getTime() + 10 * 60_000),
          lastSentAt: now
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await transporter.sendMail({
      from: `Bytinakt <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Tu código para crear una cuenta en Bytinakt',
      text: `Tu código de verificación es ${code}. Vence en 10 minutos.`,
      html: `<p>Tu código de verificación para crear una cuenta en Bytinakt es:</p><p style="font-size:24px;font-weight:bold;letter-spacing:5px">${code}</p><p>Vence en 10 minutos. Si no solicitaste este código, podés ignorar este correo.</p>`
    });

    return res.json({ message: 'Te enviamos un código de verificación por correo.' });
  } catch (error) {
    if (error.code === 11000) {
      return sendError(res, 409, 'Ese correo ya está registrado.');
    }
    if (req.body?.email) {
      await EmailVerification.deleteOne({
        email: String(req.body.email).trim().toLowerCase()
      }).catch((cleanupError) => {
        console.error('No se pudo limpiar la verificación sin enviar:', cleanupError.message);
      });
    }
    console.error('Error al enviar código de registro:', error.message);
    return sendError(res, 500, 'No se pudo enviar el código. Revisá el correo e intentá de nuevo.');
  }
});

app.post('/api/auth/registro/verificar', authLimiter, async (req, res) => {
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  try {
    const code = typeof req.body.code === 'string' ? req.body.code.trim() : '';
    if (!validEmail(email) || !/^\d{6}$/.test(code)) {
      return sendError(res, 400, 'Ingresá el correo y el código de 6 dígitos.');
    }
    const verification = await EmailVerification.findOne({ email });
    if (!verification || verification.expiresAt <= new Date()) {
      return sendError(res, 400, 'El código venció o no existe. Pedí uno nuevo.');
    }
    if (!verificationCodeMatches(email, code, verification.codeHash, emailVerificationSecret)) {
      verification.attempts += 1;
      if (verification.attempts >= 5) {
        await verification.deleteOne();
        return sendError(res, 429, 'Se agotaron los intentos. Pedí un código nuevo.');
      }
      await verification.save();
      return sendError(res, 400, 'El código no es correcto.');
    }

    const user = await Usuario.create({
      nombre: verification.nombre,
      email,
      password: verification.password,
      rol: 'cliente'
    });
    await verification.deleteOne();
    return issueSession(res, user);
  } catch (error) {
    if (error.code === 11000) {
      await EmailVerification.deleteOne({ email });
      return sendError(res, 409, 'Ese correo ya está registrado.');
    }
    console.error('Error al verificar código de registro:', error.message);
    return sendError(res, 500, 'No se pudo verificar el código.');
  }
});

app.post('/api/auth/google', authLimiter, async (req, res) => {
  try {
    const idToken = typeof req.body.idToken === 'string' ? req.body.idToken : '';
    if (!idToken) {
      return sendError(res, 400, 'Iniciá sesión con Google para continuar.');
    }
    const firebase = getFirebaseAuth();
    if (!firebase) {
      return sendError(res, 503, 'El acceso con Google todavía no está configurado.');
    }
    let decodedToken;
    try {
      decodedToken = await firebase.verifyIdToken(idToken);
    } catch (error) {
      return sendError(res, 401, 'No se pudo verificar la cuenta de Google. Intentá de nuevo.');
    }
    const email = typeof decodedToken.email === 'string' ? decodedToken.email.trim().toLowerCase() : '';
    const nombre = typeof decodedToken.name === 'string' ? decodedToken.name.trim() : '';
    if (!decodedToken.email_verified || !validEmail(email)) {
      return sendError(res, 401, 'Usá una cuenta de Google con correo verificado.');
    }

    let user = await Usuario.findOne({ email });
    if (!user) {
      user = await Usuario.create({
        nombre: nombre || email.split('@')[0],
        email,
        password: await hashPassword(crypto.randomBytes(32).toString('hex')),
        rol: 'cliente'
      });
    }
    return issueSession(res, user);
  } catch (error) {
    if (error.code === 11000) {
      return sendError(res, 409, 'No se pudo crear la cuenta. Volvé a intentarlo.');
    }
    console.error('Error al iniciar sesión con Google:', error.message);
    return sendError(res, 500, 'No se pudo iniciar sesión con Google.');
  }
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    if (!email || !password) {
      return sendError(res, 400, 'Ingresá tu correo y contraseña.');
    }

    const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || '';
    if (adminEmail && email === adminEmail && adminPassword &&
        timingSafeTextEqual(password, adminPassword)) {
      return issueSession(res, { _id: 'admin', nombre: 'Administración', email: adminEmail, rol: 'admin' });
    }

    const user = await Usuario.findOne({ email }).select('+password');
    if (!user) {
      return sendError(res, 401, 'Correo o contraseña incorrectos.');
    }

    let validPassword = await verifyPassword(password, user.password);
    if (!validPassword && !user.password.startsWith('scrypt$')) {
      validPassword = timingSafeTextEqual(password, user.password);
      if (validPassword) {
        user.password = await hashPassword(password);
        await user.save();
      }
    }
    if (!validPassword) {
      return sendError(res, 401, 'Correo o contraseña incorrectos.');
    }
    return issueSession(res, user);
  } catch (error) {
    console.error('Error al iniciar sesión:', error.message);
    return sendError(res, 500, 'No se pudo iniciar sesión.');
  }
});

app.get('/api/auth/perfil', requireAuth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.sessionUser.id)) {
      return sendError(res, 403, 'El perfil personal no está disponible para esta cuenta.');
    }
    const user = await Usuario.findById(req.sessionUser.id);
    if (!user) {
      return sendError(res, 404, 'No se encontró tu cuenta.');
    }
    return res.json({ usuario: publicUser(user) });
  } catch (error) {
    console.error('Error al consultar el perfil:', error.message);
    return sendError(res, 500, 'No se pudo cargar el perfil.');
  }
});

app.put('/api/auth/perfil', requireAuth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.sessionUser.id)) {
      return sendError(res, 403, 'El perfil personal no está disponible para esta cuenta.');
    }
    const fields = ['nombre', 'telefono', 'direccion', 'ciudad', 'codigoPostal'];
    const profile = {};
    for (const field of fields) {
      const value = req.body[field];
      if (typeof value !== 'string') {
        return sendError(res, 400, 'Completá los datos del perfil con valores de texto.');
      }
      profile[field] = value.trim();
    }
    if (!profile.nombre || profile.nombre.length > 120 ||
        profile.telefono.length > 30 || profile.direccion.length > 160 ||
        profile.ciudad.length > 100 || profile.codigoPostal.length > 20) {
      return sendError(res, 400, 'Revisá los datos y límites de caracteres del perfil.');
    }

    const user = await Usuario.findByIdAndUpdate(
      req.sessionUser.id,
      { $set: profile },
      { new: true, runValidators: true }
    );
    if (!user) {
      return sendError(res, 404, 'No se encontró tu cuenta.');
    }
    return res.json({ message: 'Perfil actualizado.', usuario: publicUser(user) });
  } catch (error) {
    console.error('Error al guardar el perfil:', error.message);
    return sendError(res, 500, 'No se pudo guardar el perfil.');
  }
});

// Las imágenes subidas se guardan como data URI; al listar se reemplazan por una URL
// cacheable para no mandar megas de base64 en cada consulta.
function publicBaseUrl(req) {
  return (process.env.PUBLIC_API_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
}

function withImageUrls(req, product) {
  const imagenes = (product.imagenesRef || []).map((ref, index) =>
    ref || `${publicBaseUrl(req)}/api/productos/${product._id}/imagen/${index}?v=${new Date(product.updatedAt || 0).getTime()}`
  );
  const { imagenesRef, ...rest } = product;
  return { ...rest, imagenes, imagenUrl: imagenes[0] || '' };
}

const productImageProjection = {
  imagenesRef: {
    $map: {
      input: { $ifNull: ['$imagenes', []] },
      as: 'imagen',
      in: { $cond: [{ $regexMatch: { input: '$$imagen', regex: /^data:/ } }, null, '$$imagen'] }
    }
  }
};

app.get('/api/productos', async (req, res) => {
  try {
    const productos = await Producto.aggregate([
      { $sort: { createdAt: -1 } },
      { $addFields: productImageProjection },
      { $project: { imagenes: 0 } }
    ]);
    res.set('Cache-Control', 'public, max-age=30');
    return res.json(productos.map((producto) => withImageUrls(req, producto)));
  } catch (error) {
    console.error('Error al consultar productos:', error.message);
    return sendError(res, 500, 'No se pudieron consultar los productos.');
  }
});

app.get('/api/productos/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return sendError(res, 400, 'El identificador del producto no es válido.');
    }
    const [product] = await Producto.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(req.params.id) } },
      { $addFields: productImageProjection },
      { $project: { imagenes: 0 } }
    ]);
    if (!product) {
      return sendError(res, 404, 'No se encontró el producto.');
    }
    return res.json(withImageUrls(req, product));
  } catch (error) {
    console.error('Error al consultar el producto:', error.message);
    return sendError(res, 500, 'No se pudo consultar el producto.');
  }
});

app.get('/api/productos/:id/imagen/:index', async (req, res) => {
  try {
    const index = Number(req.params.index);
    if (!mongoose.isValidObjectId(req.params.id) || !Number.isInteger(index) || index < 0 || index > 2) {
      return res.sendStatus(404);
    }
    const product = await Producto.findById(req.params.id).select('imagenes').lean();
    const image = product?.imagenes?.[index];
    if (!image) {
      return res.sendStatus(404);
    }
    const match = /^data:(image\/(?:png|jpe?g|webp|gif|avif));base64,(.+)$/s.exec(image);
    if (!match) {
      return /^https?:\/\//.test(image) ? res.redirect(image) : res.sendStatus(404);
    }
    res.set({
      'Content-Type': match[1],
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff'
    });
    return res.send(Buffer.from(match[2], 'base64'));
  } catch (error) {
    console.error('Error al servir imagen de producto:', error.message);
    return res.sendStatus(500);
  }
});

const PRODUCT_CATEGORIES = ['REMERAS', 'BUZOS Y CAMPERAS', 'PANTALONES', 'ACCESORIOS'];

// Valida el cuerpo de alta/edición y devuelve los datos limpios o un error.
function parseProductBody(body) {
  const {
    nombre,
    descripcion = '',
    precio,
    categoria,
    talle = [],
    variantes = [],
    colores = [],
    guiaTalles = '',
    imagenes = []
  } = body || {};
  const numericPrice = Number(precio);
  const validVariants = Array.isArray(variantes) && variantes.every((variant) =>
    variant && typeof variant.talle === 'string' && variant.talle.trim().length > 0 &&
    variant.talle.trim().length <= 20 && Number.isInteger(variant.stock) &&
    variant.stock >= 0 && variant.stock <= 10000);
  const variantSizes = validVariants ? variantes.map((variant) => variant.talle.trim().toUpperCase()) : [];
  const validColors = Array.isArray(colores) && colores.length <= 20 &&
    colores.every((color) => typeof color === 'string' && color.trim().length > 0 && color.trim().length <= 40);
  if (typeof nombre !== 'string' || !nombre.trim() || nombre.trim().length > 120 ||
      typeof categoria !== 'string' || !PRODUCT_CATEGORIES.includes(categoria.trim()) ||
      !Number.isFinite(numericPrice) || numericPrice <= 0 ||
      !Array.isArray(talle) || talle.length > 10 ||
      !talle.every((size) => typeof size === 'string' && size.length <= 20) ||
      !validVariants || variantSizes.length > 10 || new Set(variantSizes).size !== variantSizes.length ||
      new Set(talle.map((size) => size.trim().toUpperCase())).size !== talle.length ||
      !validColors || new Set(colores.map((color) => color.trim().toLowerCase())).size !== colores.length ||
      typeof guiaTalles !== 'string' || guiaTalles.length > 2000 ||
      !Array.isArray(imagenes) || imagenes.length > 3 ||
      !imagenes.every((image) => typeof image === 'string' && image.length <= 5 * 1024 * 1024) ||
      typeof descripcion !== 'string' || descripcion.length > 2000) {
    return { error: 'Revisá el nombre, categoría, precio, talles, stock, colores e imágenes.' };
  }

  return {
    data: {
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      precio: numericPrice,
      categoria: categoria.trim(),
      talle: variantSizes.length ? variantSizes : talle.map((size) => size.trim().toUpperCase()),
      variantes: variantes.map((variant) => ({
        talle: variant.talle.trim().toUpperCase(),
        stock: variant.stock
      })),
      colores: colores.map((color) => color.trim()),
      guiaTalles: guiaTalles.trim(),
      imagenes
    }
  };
}

app.post('/api/productos', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { data, error } = parseProductBody(req.body);
    if (error) {
      return sendError(res, 400, error);
    }
    const product = await Producto.create(data);
    return res.status(201).json({ message: 'Producto creado.', producto: product });
  } catch (error) {
    console.error('Error al guardar producto:', error.message);
    return sendError(res, 500, 'No se pudo guardar el producto.');
  }
});

// Las imágenes que ya son URL del catálogo (/imagen/N) se conservan sin volver a subirlas.
app.put('/api/productos/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return sendError(res, 400, 'El identificador del producto no es válido.');
    }
    const existing = await Producto.findById(req.params.id).select('imagenes').lean();
    if (!existing) {
      return sendError(res, 404, 'No se encontró el producto.');
    }
    const keptImages = (Array.isArray(req.body?.imagenes) ? req.body.imagenes : []).map((image) => {
      const match = typeof image === 'string'
        ? new RegExp(`/api/productos/${req.params.id}/imagen/(\d)(?:\?|$)`).exec(image)
        : null;
      return match ? existing.imagenes?.[Number(match[1])] || '' : image;
    }).filter(Boolean);
    const { data, error } = parseProductBody({ ...req.body, imagenes: keptImages });
    if (error) {
      return sendError(res, 400, error);
    }
    const product = await Producto.findByIdAndUpdate(req.params.id, { $set: data }, { new: true, runValidators: true });
    return res.json({ message: 'Producto actualizado.', producto: product });
  } catch (error) {
    console.error('Error al actualizar producto:', error.message);
    return sendError(res, 500, 'No se pudo actualizar el producto.');
  }
});

app.delete('/api/productos/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return sendError(res, 400, 'El identificador del producto no es válido.');
    }
    const product = await Producto.findByIdAndDelete(req.params.id);
    if (!product) {
      return sendError(res, 404, 'No se encontró el producto.');
    }
    return res.json({ message: 'Producto eliminado.' });
  } catch (error) {
    console.error('Error al eliminar producto:', error.message);
    return sendError(res, 500, 'No se pudo eliminar el producto.');
  }
});

app.post('/api/pedidos/checkout', checkoutLimiter, requireAuth, async (req, res) => {
  if (req.sessionUser.role !== 'cliente') {
    return sendError(res, 403, 'Solo las cuentas de cliente pueden crear pedidos.');
  }
  if ((req.body.metodoEntrega && !['retiro', 'envio'].includes(req.body.metodoEntrega)) ||
      (req.body.metodoPago && !['mercadopago', 'transferencia'].includes(req.body.metodoPago))) {
    return sendError(res, 400, 'La forma de entrega o pago no es válida.');
  }
  const metodoEntrega = req.body.metodoEntrega === 'retiro' ? 'retiro' : 'envio';
  const metodoPago = req.body.metodoPago === 'transferencia' ? 'transferencia' : 'mercadopago';
  const accessToken = process.env.MP_ACCESS_TOKEN;
  const bankAlias = (process.env.BANK_TRANSFER_ALIAS || '').trim();
  const bankCbu = (process.env.BANK_TRANSFER_CBU || '').trim();
  const accountHolder = (process.env.BANK_ACCOUNT_HOLDER || '').trim();
  const shippingRate = Number(process.env.SHIPPING_FLAT_RATE);
  if (metodoPago === 'mercadopago' && !accessToken) {
    return sendError(res, 503, 'Falta configurar MP_ACCESS_TOKEN en backend/.env para habilitar pagos con Mercado Pago.');
  }
  if (metodoPago === 'transferencia' && !(accountHolder && (bankAlias || bankCbu))) {
    return sendError(res, 503, 'Faltan configurar los datos de la cuenta bancaria para habilitar transferencias.');
  }
  if (metodoEntrega === 'envio' && (!Number.isFinite(shippingRate) || shippingRate <= 0)) {
    return sendError(res, 503, 'El envío a domicilio todavía no está configurado. Elegí retiro en el local.');
  }

  try {
    const { items, envio } = req.body;
    if (!Array.isArray(items) || items.length === 0 || items.length > 50 ||
        !envio || typeof envio.telefono !== 'string' || !envio.telefono.trim() ||
        envio.telefono.trim().length > 30 ||
        (metodoEntrega === 'envio' &&
          !['direccion', 'ciudad', 'codigoPostal'].every((field) =>
            typeof envio[field] === 'string' && envio[field].trim()))) {
      return sendError(res, 400, 'Completá los datos de envío y agregá al menos un producto.');
    }
    if (metodoEntrega === 'envio' &&
        (envio.direccion.trim().length > 160 || envio.ciudad.trim().length > 100 ||
          envio.codigoPostal.trim().length > 20)) {
      return sendError(res, 400, 'Revisá la dirección, ciudad y código postal del envío.');
    }

    const pickupAddress = process.env.LOCAL_PICKUP_ADDRESS || 'San Martín 4175, Mar del Plata';
    const pickupPostalCode = process.env.LOCAL_PICKUP_POSTAL_CODE || '7600';
    const envioPedido = metodoEntrega === 'retiro'
      ? {
          direccion: `Retiro en el local: ${pickupAddress}`,
          ciudad: 'Mar del Plata',
          codigoPostal: pickupPostalCode,
          telefono: envio.telefono.trim()
        }
      : {
          direccion: envio.direccion.trim(),
          ciudad: envio.ciudad.trim(),
          codigoPostal: envio.codigoPostal.trim(),
          telefono: envio.telefono.trim()
        };

    await liberarReservasVencidas();
    const requestedItems = new Map();
    for (const item of items) {
      const id = typeof item.productoId === 'string' ? item.productoId : '';
      const cantidad = Number(item.cantidad);
      const talle = typeof item.talle === 'string' ? item.talle.trim().toUpperCase() : '';
      const color = typeof item.color === 'string' ? item.color.trim() : '';
      if (!mongoose.isValidObjectId(id) || !Number.isInteger(cantidad) || cantidad < 1 || cantidad > 20 ||
          talle.length > 20 || color.length > 40) {
        return sendError(res, 400, 'Hay un producto o una cantidad inválida en el carrito.');
      }
      const key = JSON.stringify([id, talle, color]);
      const requestedQuantity = (requestedItems.get(key)?.cantidad || 0) + cantidad;
      if (requestedQuantity > 20) {
        return sendError(res, 400, 'La cantidad máxima por talle y color es 20.');
      }
      requestedItems.set(key, { id, talle, color, cantidad: requestedQuantity });
    }

    const requestedLines = [...requestedItems.values()];
    const productIds = [...new Set(requestedLines.map((item) => item.id))];
    const products = await Producto.find({ _id: { $in: productIds } }).lean();
    if (products.length !== productIds.length) {
      return sendError(res, 400, 'Uno o más productos ya no están disponibles.');
    }
    const productsById = new Map(products.map((product) => [String(product._id), product]));

    for (const line of requestedLines) {
      const product = productsById.get(line.id);
      const availableSizes = product.variantes?.length
        ? product.variantes.map((variant) => variant.talle)
        : product.talle || [];
      if (availableSizes.length && !availableSizes.includes(line.talle)) {
        return sendError(res, 400, `Elegí un talle válido para ${product.nombre}.`);
      }
      if (product.colores?.length && !product.colores.includes(line.color)) {
        return sendError(res, 400, `Elegí un color válido para ${product.nombre}.`);
      }
      const variant = product.variantes?.find((option) => option.talle === line.talle);
      if (variant && variant.stock < line.cantidad) {
        return sendError(res, 409, `No hay suficiente stock del talle ${line.talle} de ${product.nombre}.`);
      }
      if (!product.variantes?.length && product.colores?.length && !line.color) {
        return sendError(res, 400, `Elegí un color para ${product.nombre}.`);
      }
      if (product.variantes?.length && !line.talle) {
        return sendError(res, 400, `Elegí un talle para ${product.nombre}.`);
      }
    }

    const orderItems = requestedLines.map((line) => {
      const product = productsById.get(line.id);
      return {
        producto: product._id,
        nombre: product.nombre,
        talle: line.talle,
        color: line.color,
        precio: product.precio,
        cantidad: line.cantidad,
        imagen: product.imagenes?.[0] && !product.imagenes[0].startsWith('data:') ? product.imagenes[0] : ''
      };
    });

    const reservas = [];
    for (const line of requestedLines) {
      if (!line.talle) {
        continue;
      }
      const product = productsById.get(line.id);
      if (!product.variantes?.some((variant) => variant.talle === line.talle)) {
        continue;
      }
      const reserved = await Producto.findOneAndUpdate(
        {
          _id: line.id,
          variantes: { $elemMatch: { talle: line.talle, stock: { $gte: line.cantidad } } }
        },
        { $inc: { 'variantes.$.stock': -line.cantidad } },
        { new: true }
      );
      if (!reserved) {
        await devolverStock(reservas);
        return sendError(res, 409, `El stock del talle ${line.talle} de ${product.nombre} acaba de cambiar.`);
      }
      reservas.push({ producto: product._id, talle: line.talle, cantidad: line.cantidad });
    }

    const buyer = req.sessionUser;
    const reservaStockExpira = reservas.length > 0
      ? new Date(Date.now() + (metodoPago === 'transferencia' ? 24 * 60 * 60 * 1000 : 30 * 60 * 1000))
      : undefined;
    const subtotal = orderItems.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
    const costoEnvio = metodoEntrega === 'envio' ? shippingRate : 0;
    const configuredDiscount = Number(process.env.TRANSFER_DISCOUNT_PERCENT || 20);
    const discountPercent = metodoPago === 'transferencia'
      ? (Number.isFinite(configuredDiscount) ? Math.max(0, Math.min(100, configuredDiscount)) : 20)
      : 0;
    const descuentoTransferencia = Math.round(subtotal * discountPercent / 100);
    const order = new Pedido({
      cliente: buyer.id,
      clienteNombre: buyer.nombre,
      email: buyer.email,
      envio: envioPedido,
      metodoEntrega,
      costoEnvio,
      metodoPago,
      descuentoTransferencia,
      items: orderItems,
      total: subtotal + costoEnvio - descuentoTransferencia,
      reservaStockActiva: reservas.length > 0,
      reservaStockExpira
    });
    try {
      await order.save();
    } catch (error) {
      await devolverStock(reservas);
      throw error;
    }

    if (metodoPago === 'transferencia') {
      return res.status(201).json({
        pedidoId: order._id,
        estado: order.estado,
        metodoPago,
        total: order.total
      });
    }

    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:4200').split(',')[0].trim();
    const preferenceResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        items: [
          ...orderItems.map((item) => ({
          id: String(item.producto),
          title: [item.nombre, item.talle, item.color].filter(Boolean).join(' - '),
          quantity: item.cantidad,
          unit_price: item.precio,
          currency_id: 'ARS'
          })),
          ...(costoEnvio > 0 ? [{
            id: 'envio',
            title: 'Envío a domicilio',
            quantity: 1,
            unit_price: costoEnvio,
            currency_id: 'ARS'
          }] : [])
        ],
        payer: { name: buyer.nombre, email: buyer.email },
        external_reference: String(order._id),
        ...(reservaStockExpira ? {
          expires: true,
          expiration_date_from: new Date().toISOString(),
          expiration_date_to: reservaStockExpira.toISOString()
        } : {}),
        back_urls: {
          success: `${frontendUrl}/pago/resultado?pedido=${order._id}`,
          pending: `${frontendUrl}/pago/resultado?pedido=${order._id}`,
          failure: `${frontendUrl}/pago/resultado?pedido=${order._id}`
        },
        auto_return: 'approved',
        ...(process.env.MP_NOTIFICATION_URL ? { notification_url: process.env.MP_NOTIFICATION_URL } : {})
      })
    });

    const preference = await preferenceResponse.json();
    if (!preferenceResponse.ok || !preference.init_point || !preference.id) {
      order.estado = 'error_pago';
      await order.save();
      await liberarStockDePedido(order._id, 'error_pago');
      console.error('Mercado Pago rechazó la preferencia:', preference.message || preferenceResponse.status);
      return sendError(res, 502, 'Mercado Pago no pudo iniciar el cobro. Revisá la configuración de la cuenta.');
    }

    order.preferenciaPago = preference.id;
    await order.save();
    return res.status(201).json({ pedidoId: order._id, checkoutUrl: preference.init_point });
  } catch (error) {
    console.error('Error al crear pedido:', error.message);
    return sendError(res, 500, 'No se pudo crear el pedido.');
  }
});

app.get('/api/pedidos/mios', requireAuth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.sessionUser.id)) {
      return res.json([]);
    }
    const orders = await Pedido.find({ cliente: req.sessionUser.id }).sort({ createdAt: -1 }).limit(50).lean();
    return res.json(orders.map((order) => ({
      _id: order._id,
      estado: order.estado,
      metodoPago: order.metodoPago,
      metodoEntrega: order.metodoEntrega,
      costoEnvio: order.costoEnvio,
      descuentoTransferencia: order.descuentoTransferencia,
      total: order.total,
      createdAt: order.createdAt,
      reservaStockExpira: order.reservaStockExpira,
      items: order.items.map((item) => ({
        producto: item.producto,
        nombre: item.nombre,
        talle: item.talle,
        color: item.color,
        precio: item.precio,
        cantidad: item.cantidad,
        imagen: item.imagen && !item.imagen.startsWith('data:')
          ? item.imagen
          : `${publicBaseUrl(req)}/api/productos/${item.producto}/imagen/0`
      }))
    })));
  } catch (error) {
    console.error('Error al consultar los pedidos del cliente:', error.message);
    return sendError(res, 500, 'No se pudieron consultar tus pedidos.');
  }
});

app.get('/api/pedidos/:id', requireAuth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return sendError(res, 400, 'El identificador del pedido no es válido.');
    }
    const order = await Pedido.findById(req.params.id).lean();
    if (!order) {
      return sendError(res, 404, 'No se encontró el pedido.');
    }
    if (req.sessionUser.role !== 'admin' && String(order.cliente) !== req.sessionUser.id) {
      return sendError(res, 403, 'No tenés permiso para consultar este pedido.');
    }
    return res.json(order);
  } catch (error) {
    console.error('Error al consultar pedido:', error.message);
    return sendError(res, 500, 'No se pudo consultar el pedido.');
  }
});

async function updatePaymentStatus(paymentId, expectedOrderId = '') {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) {
    throw new Error('Falta configurar MP_ACCESS_TOKEN.');
  }
  const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!paymentResponse.ok) {
    throw new Error(`Mercado Pago devolvió HTTP ${paymentResponse.status}.`);
  }

  const payment = await paymentResponse.json();
  const paymentOrderId = String(payment.external_reference || '');
  if (!mongoose.isValidObjectId(paymentOrderId) ||
      (expectedOrderId && paymentOrderId !== expectedOrderId)) {
    return null;
  }
  const order = await Pedido.findById(paymentOrderId);
  if (!order || Number(payment.transaction_amount) !== order.total || payment.currency_id !== 'ARS') {
    return null;
  }

  if (payment.status === 'approved') {
    // Se "reclama" el pedido de forma atómica: si el webhook y /pagos/estado llegan a la vez,
    // solo uno pasa de no-pagado a pagado y descuenta stock una única vez.
    const previous = await Pedido.findOneAndUpdate(
      { _id: order._id, estado: { $ne: 'pagado' } },
      {
        $set: { estado: 'pagado', pagoId: String(payment.id), reservaStockActiva: false },
        $unset: { reservaStockExpira: '' }
      },
      { new: false }
    );
    if (!previous) {
      return Pedido.findById(order._id);
    }
    if (!previous.reservaStockActiva) {
      const reservasTardias = [];
      let stockDisponible = true;
      for (const item of previous.items) {
        if (!item.talle) {
          continue;
        }
        const product = await Producto.findById(item.producto).select('variantes').lean();
        if (!product?.variantes?.some((variant) => variant.talle === item.talle)) {
          continue;
        }
        const reserved = await Producto.findOneAndUpdate(
          {
            _id: item.producto,
            variantes: { $elemMatch: { talle: item.talle, stock: { $gte: item.cantidad } } }
          },
          { $inc: { 'variantes.$.stock': -item.cantidad } }
        );
        if (!reserved) {
          stockDisponible = false;
          break;
        }
        reservasTardias.push(item);
      }
      if (!stockDisponible) {
        await devolverStock(reservasTardias);
        console.error(`Pago ${payment.id} aprobado después de vencer la reserva y no queda stock; requiere revisión manual.`);
        return Pedido.findByIdAndUpdate(order._id, { $set: { estado: 'error_pago' } }, { new: true });
      }
    }
    return Pedido.findById(order._id);
  } else if (payment.status === 'rejected' || payment.status === 'cancelled') {
    if (order.estado === 'pagado') {
      return order;
    }
    if (order.reservaStockActiva) {
      await liberarStockDePedido(order._id);
      order.reservaStockActiva = false;
    }
    order.estado = 'cancelado';
    order.pagoId = String(payment.id);
    await order.save();
  }
  return order;
}

app.get('/api/pagos/estado', requireAuth, async (req, res) => {
  const orderId = typeof req.query.pedido === 'string' ? req.query.pedido : '';
  const paymentId = typeof req.query.payment_id === 'string' ? req.query.payment_id : '';
  if (!mongoose.isValidObjectId(orderId) || !/^\d+$/.test(paymentId)) {
    return sendError(res, 400, 'Faltan los datos para consultar el pago.');
  }
  try {
    const existingOrder = await Pedido.findById(orderId).lean();
    if (!existingOrder) {
      return sendError(res, 404, 'No se encontró el pedido.');
    }
    if (req.sessionUser.role !== 'admin' && String(existingOrder.cliente) !== req.sessionUser.id) {
      return sendError(res, 403, 'No tenés permiso para consultar este pedido.');
    }
    const order = await updatePaymentStatus(paymentId, orderId);
    if (!order) {
      return sendError(res, 400, 'El pago informado no corresponde a este pedido.');
    }
    return res.json({ estado: order.estado });
  } catch (error) {
    console.error('Error al verificar pago:', error.message);
    return sendError(res, 502, 'No se pudo verificar el pago con Mercado Pago.');
  }
});

app.get('/api/admin/pedidos', requireAuth, requireAdmin, async (req, res) => {
  try {
    const orders = await Pedido.find().sort({ createdAt: -1 }).limit(100).lean();
    return res.json(orders);
  } catch (error) {
    console.error('Error al consultar pedidos para administración:', error.message);
    return sendError(res, 500, 'No se pudieron consultar los pedidos.');
  }
});

app.patch('/api/admin/pedidos/:id/confirmar-transferencia', requireAuth, requireAdmin, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return sendError(res, 400, 'El identificador del pedido no es válido.');
  }
  try {
    await liberarReservasVencidas();
    const order = await Pedido.findOne({
      _id: req.params.id,
      metodoPago: 'transferencia',
      estado: 'pendiente'
    });
    if (!order) {
      return sendError(res, 409, 'El pedido no está pendiente de confirmación por transferencia.');
    }
    if (order.reservaStockExpira && order.reservaStockExpira <= new Date()) {
      return sendError(res, 409, 'La reserva de stock venció. Revisá la disponibilidad antes de confirmar el pago.');
    }
    order.estado = 'pagado';
    order.reservaStockActiva = false;
    order.reservaStockExpira = undefined;
    await order.save();
    return res.json({ message: 'Transferencia confirmada.', estado: order.estado });
  } catch (error) {
    console.error('Error al confirmar transferencia:', error.message);
    return sendError(res, 500, 'No se pudo confirmar la transferencia.');
  }
});

app.post('/api/pagos/webhook', async (req, res) => {
  const paymentId = String(req.query['data.id'] || req.body?.data?.id || req.body?.id || '');
  if (!paymentId || !/^\d+$/.test(paymentId)) {
    return res.sendStatus(200);
  }
  try {
    if (!process.env.MP_ACCESS_TOKEN) {
      console.error('Webhook de Mercado Pago recibido sin MP_ACCESS_TOKEN configurado.');
      return res.sendStatus(503);
    }
    await updatePaymentStatus(paymentId);
    return res.sendStatus(200);
  } catch (error) {
    console.error('Error al procesar notificación de pago:', error.message);
    return res.sendStatus(500);
  }
});

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGODB_URI;
const authSecretIsWeak = !process.env.AUTH_TOKEN_SECRET || process.env.AUTH_TOKEN_SECRET.length < 32;
if (process.env.NODE_ENV === 'production' && authSecretIsWeak) {
  console.error('Configurá AUTH_TOKEN_SECRET con al menos 32 caracteres en producción.');
  process.exitCode = 1;
}
if (authSecretIsWeak && process.env.NODE_ENV !== 'production') {
  console.warn('AUTH_TOKEN_SECRET no está configurado; las sesiones se invalidan al reiniciar el backend.');
}
if (!MONGO_URI) {
  console.error('Falta configurar MONGODB_URI en backend/.env.');
  process.exitCode = 1;
}
if (MONGO_URI && process.exitCode !== 1) {
  mongoose.connect(MONGO_URI)
    .then(() => {
      setInterval(() => {
        liberarReservasVencidas().catch((error) => console.error('No se pudieron liberar reservas vencidas:', error.message));
      }, 60_000).unref();
      app.listen(PORT, () => console.log(`Servidor backend conectado a MongoDB y escuchando en http://localhost:${PORT}`));
      if (!process.env.MP_ACCESS_TOKEN) {
        console.warn('Configura MP_ACCESS_TOKEN en backend/.env para habilitar checkout de Mercado Pago.');
      }
    })
    .catch((error) => {
      console.error('No se pudo conectar a MongoDB:', error.message);
      process.exitCode = 1;
    });
}

module.exports = { app };
