require('dotenv').config();

const express = require('express');
const cors = require('cors');

// 1. Agregamos la conexión a MongoDB y el modelo de productos
require('./database'); 
const Producto = require('./models/Producto');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Ruta de prueba
app.get('/', (req, res) => {
  res.send('API de ByTinaKt funcionando con MongoDB 🚀');
});

// 2. GET: Obtener todos los productos desde MongoDB
app.get('/api/productos', async (req, res) => {
  try {
    const productos = await Producto.find();
    res.json(productos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. POST: Guardar un nuevo producto en MongoDB
app.post('/api/productos', async (req, res) => {
  try {
    const nuevoProducto = new Producto(req.body);
    await nuevoProducto.save();
    res.status(201).json(nuevoProducto);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 4. DELETE: Eliminar un producto por su ID de MongoDB
app.delete('/api/productos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await Producto.findByIdAndDelete(id);
    res.json({ message: 'Producto eliminado correctamente de la base de datos' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor backend corriendo en http://localhost:${PORT}`);
});

