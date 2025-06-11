const express = require('express');
const router = express.Router();
const {
  registrar,
  login,
  cambiarEstado,
  obtenerVoluntarios
} = require('../controllers/usuarioController');
const auth = require('../middleware/auth');

router.post('/registro', registrar);
router.post('/login', login);
router.put('/estado', auth, cambiarEstado);
router.get('/voluntarios', auth, obtenerVoluntarios);

module.exports = router;
