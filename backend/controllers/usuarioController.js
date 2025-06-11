const Usuario = require('../models/Usuario');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.registrar = async (req, res) => {
  const { nombre, correo, password, rol } = req.body;
  try {
    const existe = await Usuario.findOne({ correo });
    if (existe) return res.status(400).json({ msg: 'Correo ya registrado' });

    const passwordHash = await bcrypt.hash(password, 10);
    const nuevo = new Usuario({ nombre, correo, passwordHash, rol });
    await nuevo.save();
    res.status(201).json({ msg: 'Usuario creado correctamente' });
  } catch (error) {
    res.status(500).json({ msg: 'Error al registrar' });
  }
};

exports.login = async (req, res) => {
  const { correo, password } = req.body;
  try {
    const usuario = await Usuario.findOne({ correo });
    if (!usuario) return res.status(400).json({ msg: 'Correo no encontrado' });

    const valido = await bcrypt.compare(password, usuario.passwordHash);
    if (!valido) return res.status(400).json({ msg: 'Contraseña incorrecta' });

    const token = jwt.sign(
      { id: usuario._id, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      usuario: {
        id: usuario._id,
        nombre: usuario.nombre,
        rol: usuario.rol,
        estado: usuario.estado
      }
    });
  } catch (error) {
    res.status(500).json({ msg: 'Error al iniciar sesión' });
  }
};

exports.cambiarEstado = async (req, res) => {
  const { estado } = req.body;
  try {
    const usuario = await Usuario.findByIdAndUpdate(
      req.usuario.id,
      { estado, ultimaActualizacion: new Date() },
      { new: true }
    );
    res.json({ msg: 'Estado actualizado', usuario });
  } catch (error) {
    res.status(500).json({ msg: 'Error al actualizar estado' });
  }
};

exports.obtenerVoluntarios = async (req, res) => {
  try {
    const voluntarios = await Usuario.find({ rol: 'voluntario' }).select('nombre estado ultimaActualizacion');
    res.json(voluntarios);
  } catch (error) {
    res.status(500).json({ msg: 'Error al obtener voluntarios' });
  }
};
