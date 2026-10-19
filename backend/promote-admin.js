require('dotenv').config();
const mongoose = require('mongoose');

async function promoteAdmin(email) {
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error('Ingresá el correo de una cuenta ya registrada.');
  }

  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('Falta configurar MONGODB_URI en backend/.env.');
  }

  await mongoose.connect(mongoUri);
  const result = await mongoose.connection.collection('usuarios').updateOne(
    { email: normalizedEmail },
    { $set: { rol: 'admin' } }
  );
  if (result.matchedCount === 0) {
    throw new Error('No existe una cuenta con ese correo; registrala primero desde la tienda.');
  }

  console.log('Rol administrador asignado. Iniciá sesión con el correo y contraseña habituales.');
}

promoteAdmin(process.argv[2])
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
