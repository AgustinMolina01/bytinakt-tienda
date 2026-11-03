const mongoose = require('mongoose');

// Código de 6 dígitos que se manda por correo para cambiar la contraseña. Vence solo (índice TTL).
const passwordResetSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  codeHash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  lastSentAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true, expires: 0 }
}, { timestamps: true });

module.exports = mongoose.models.PasswordReset ||
  mongoose.model('PasswordReset', passwordResetSchema);
