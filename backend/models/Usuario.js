const mongoose = require('mongoose');

const usuarioSchema = new mongoose.Schema({
  nombre: String,
  correo: { type: String, unique: true },
  passwordHash: String,
  rol: { type: String, enum: ['voluntario', 'oficial', 'admin'] },
  estado: {
    type: String,
    enum: ['disponible', 'en_camino', 'no_disponible'],
    default: 'no_disponible'
  },
  ultimaActualizacion: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Usuario', usuarioSchema);
