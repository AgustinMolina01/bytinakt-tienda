const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://agstinmolina_db_user:4qffmT6qqgk9YV41@bytinakt.bnhao37.mongodb.net/bytina_db?retryWrites=true&w=majority';
mongoose.connect(MONGODB_URI) 
  .then(() => console.log('🟢 Conectado exitosamente a MongoDB (bytina_db)'))
    .catch((err) => console.error('🔴 Error al conectar a MongoDB:', err));

    module. exports = mongoose;