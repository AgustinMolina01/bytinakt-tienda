const mongoose = require('mongoose');

const emailVerificationSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  nombre: { type: String, required: true, trim: true },
  password: { type: String, required: true },
  codeHash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  lastSentAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true, expires: 0 }
}, { timestamps: true });

module.exports = mongoose.models.EmailVerification ||
  mongoose.model('EmailVerification', emailVerificationSchema);
