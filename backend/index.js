const crypto = require('node:crypto');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const { hashPassword, verifyPassword, createToken, verifyToken } = require('./auth');

const app = express();
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:4200')
  .split(',')
  .map((origin) => origin.trim());

app.use(cors({
  origin: allowedOrigins,
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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

app.post('/api/auth/registro', async (req, res) => {
  try {
    const nombre = typeof req.body.nombre === 'string' ? req.body.nombre.trim() : '';
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    if (!nombre || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 10) {
      return sendError(res, 400, 'Ingresá un nombre, un correo válido y una contraseña de al menos 10 caracteres.');
    }

    const passwordHash = await hashPassword(password);
    const user = await Usuario.create({ nombre, email, password: passwordHash, rol: 'cliente' });
    return res.status(201).json({ message: 'Cuenta creada.', usuario: publicUser(user) });
  } catch (error) {
    if (error.code === 11000) {
      return sendError(res, 409, 'Ese correo ya está registrado.');
    }
    console.error('Error al registrar usuario:', error.message);
    return sendError(res, 500, 'No se pudo crear la cuenta.');
  }
});

app.post('/api/auth/login', async (req, res) => {
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

app.get('/api/productos', async (req, res) => {
  try {
    await liberarReservasVencidas();
    const productos = await Producto.find().sort({ createdAt: -1 }).lean();
    return res.json(productos.map((producto) => ({
      ...producto,
      imagenUrl: producto.imagenes?.[0] || ''
    })));
  } catch (error) {
    console.error('Error al consultar productos:', error.message);
    return sendError(res, 500, 'No se pudieron consultar los productos.');
  }
});

app.get('/api/productos/:id', async (req, res) => {
  try {
    await liberarReservasVencidas();
    if (!mongoose.isValidObjectId(req.params.id)) {
      return sendError(res, 400, 'El identificador del producto no es válido.');
    }
    const product = await Producto.findById(req.params.id).lean();
    if (!product) {
      return sendError(res, 404, 'No se encontró el producto.');
    }
    return res.json({ ...product, imagenUrl: product.imagenes?.[0] || '' });
  } catch (error) {
    console.error('Error al consultar el producto:', error.message);
    return sendError(res, 500, 'No se pudo consultar el producto.');
  }
});

app.post('/api/productos', requireAuth, requireAdmin, async (req, res) => {
  try {
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
    } = req.body;
    const numericPrice = Number(precio);
    const validCategories = ['REMERAS', 'BUZOS Y CAMPERAS', 'PANTALONES', 'ACCESORIOS'];
    const validVariants = Array.isArray(variantes) && variantes.every((variant) =>
      variant && typeof variant.talle === 'string' && variant.talle.trim().length > 0 &&
      variant.talle.trim().length <= 20 && Number.isInteger(variant.stock) &&
      variant.stock >= 0 && variant.stock <= 10000);
    const variantSizes = validVariants ? variantes.map((variant) => variant.talle.trim().toUpperCase()) : [];
    const validColors = Array.isArray(colores) && colores.length <= 20 &&
      colores.every((color) => typeof color === 'string' && color.trim().length > 0 && color.trim().length <= 40);
    if (typeof nombre !== 'string' || !nombre.trim() || nombre.trim().length > 120 ||
        typeof categoria !== 'string' || !validCategories.includes(categoria.trim()) ||
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
      return sendError(res, 400, 'Revisá el nombre, categoría, precio, talles, stock, colores e imágenes.');
    }

    const productSizes = variantSizes.length
      ? variantSizes
      : talle.map((size) => size.trim().toUpperCase());
    const product = await Producto.create({
      nombre: nombre.trim(),
      descripcion: typeof descripcion === 'string' ? descripcion.trim() : '',
      precio: numericPrice,
      categoria: categoria.trim(),
      talle: productSizes,
      variantes: variantes.map((variant) => ({
        talle: variant.talle.trim().toUpperCase(),
        stock: variant.stock
      })),
      colores: colores.map((color) => color.trim()),
      guiaTalles: guiaTalles.trim(),
      imagenes
    });
    return res.status(201).json({ message: 'Producto creado.', producto: product });
  } catch (error) {
    console.error('Error al guardar producto:', error.message);
    return sendError(res, 500, 'No se pudo guardar el producto.');
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

app.post('/api/pedidos/checkout', requireAuth, async (req, res) => {
  if (req.sessionUser.role !== 'cliente') {
    return sendError(res, 403, 'Solo las cuentas de cliente pueden crear pedidos.');
  }
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    return sendError(res, 503, 'Falta configurar MP_ACCESS_TOKEN en backend/.env para habilitar pagos con Mercado Pago.');
  }

  try {
    const { items, envio } = req.body;
    if (!Array.isArray(items) || items.length === 0 || items.length > 50 ||
        !envio || !['direccion', 'ciudad', 'codigoPostal', 'telefono'].every((field) =>
          typeof envio[field] === 'string' && envio[field].trim()) ||
        envio.direccion.trim().length > 160 || envio.ciudad.trim().length > 100 ||
        envio.codigoPostal.trim().length > 20 || envio.telefono.trim().length > 30) {
      return sendError(res, 400, 'Completá los datos de envío y agregá al menos un producto.');
    }

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
        imagen: product.imagenes?.[0] || ''
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

    const total = orderItems.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
    const buyer = req.sessionUser;
    const reservaStockExpira = reservas.length > 0
      ? new Date(Date.now() + 30 * 60 * 1000)
      : undefined;
    const order = new Pedido({
      cliente: buyer.id,
      clienteNombre: buyer.nombre,
      email: buyer.email,
      envio: {
        direccion: envio.direccion.trim(),
        ciudad: envio.ciudad.trim(),
        codigoPostal: envio.codigoPostal.trim(),
        telefono: envio.telefono.trim()
      },
      items: orderItems,
      total,
      reservaStockActiva: reservas.length > 0,
      reservaStockExpira
    });
    try {
      await order.save();
    } catch (error) {
      await devolverStock(reservas);
      throw error;
    }

    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:4200').split(',')[0].trim();
    const preferenceResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        items: orderItems.map((item) => ({
          id: String(item.producto),
          title: [item.nombre, item.talle, item.color].filter(Boolean).join(' - '),
          quantity: item.cantidad,
          unit_price: item.precio,
          currency_id: 'ARS'
        })),
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
    if (!order.reservaStockActiva) {
      const reservasTardias = [];
      let stockDisponible = true;
      for (const item of order.items) {
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
        order.estado = 'error_pago';
        order.pagoId = String(payment.id);
        await order.save();
        console.error(`Pago ${payment.id} aprobado después de vencer la reserva y no queda stock; requiere revisión manual.`);
        return order;
      }
    }
    order.estado = 'pagado';
    order.pagoId = String(payment.id);
    order.reservaStockActiva = false;
    order.reservaStockExpira = undefined;
    await order.save();
  } else if (payment.status === 'rejected' || payment.status === 'cancelled') {
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
