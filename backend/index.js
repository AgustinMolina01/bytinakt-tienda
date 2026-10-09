const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

let productos = [
  {
    id: 1,
    nombre: 'Tapado de Paño',
    categoria: 'abrigos',
    precio: 45000,
    talle: 'M',
    imagenUrl: 'https://via.placeholder.com/300x400'
  },
  {
    id: 2,
    nombre: 'Vestido Noche Fiesta',
    categoria: 'fiesta',
    precio: 38000,
    talle: 'S',
    imagenUrl: 'https://via.placeholder.com/300x400'
  }
];

app.get('/api/productos', (req, res) => {
  res.json(productos);
});

app.post('/api/productos', (req, res) => {
  const nuevoProducto = {
    id: Date.now(),
    ...req.body
  };
  productos.push(nuevoProducto);
  res.status(201).json(nuevoProducto);
});

app.delete('/api/productos/:id', (req, res) => {
  const id = parseInt(req.params.id);
  productos = productos.filter(p => p.id !== id);
  res.json({ message: 'Producto eliminado correctamente' });
});

app.listen(PORT, () => {
  console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
});