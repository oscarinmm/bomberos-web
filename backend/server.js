const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());
app.use('/api/usuarios', require('./routes/usuarios'));

// Socket.io para notificaciones en tiempo real
io.on('connection', socket => {
  console.log('🔌 Cliente conectado');
  socket.on('estadoActualizado', () => {
    io.emit('actualizarEstados');
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚒 Servidor corriendo en puerto ${PORT}`);
});
