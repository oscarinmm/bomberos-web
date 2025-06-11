
const http = require('http');
const url = require('url');
const querystring = require('querystring');
const crypto = require('crypto');
const EventEmitter = require('events');

const PORT = process.env.PORT || 3000;

const users = [];
const sessions = new Map();
const events = new EventEmitter();

function renderTemplate(title, body) {
  return '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>' + title + '</title></head><body>' + body + '</body></html>';
}

function parseCookies(req) {
  const rc = req.headers.cookie || '';
  const obj = {};
  rc.split(';').forEach(v => {
    const parts = v.split('=');
    if (parts.length === 2) obj[parts[0].trim()] = decodeURIComponent(parts[1]);
  });
  return obj;
}

function getUserFromSession(req) {
  const cookies = parseCookies(req);
  const sid = cookies.sid;
  if (sid && sessions.has(sid)) {
    const username = sessions.get(sid);
    return users.find(u => u.username === username);
  }
  return null;
}

function handleRegister(req, res) {
  if (req.method === 'GET') {
    let body = '';
    body += '<h1>Registro</h1>';
    body += '<form method="POST" action="/register">';
    body += 'Usuario: <input name="username" required><br>';
    body += 'Clave: <input type="password" name="password" required><br>';
    body += 'Rol: <select name="role">';
    body += '<option value="voluntario">Voluntario</option>';
    body += '<option value="oficial">Oficial</option>';
    body += '<option value="admin">Admin</option>';
    body += '</select><br>';
    body += '<button type="submit">Registrar</button>';
    body += '</form>';
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end(renderTemplate('Registro', body));
  } else if (req.method === 'POST') {
    let data = '';
    req.on('data', chunk => data += chunk);
    req.on('end', () => {
      const form = querystring.parse(data);
      if (users.find(u => u.username === form.username)) {
        res.writeHead(400);
        res.end('Usuario ya existe');
        return;
      }
      users.push({username: form.username, password: form.password, role: form.role, status: 'no disponible'});
      res.writeHead(302, {'Location': '/login'});
      res.end();
    });
  }
}

function handleLogin(req, res) {
  if (req.method === 'GET') {
    let body = '';
    body += '<h1>Login</h1>';
    body += '<form method="POST" action="/login">';
    body += 'Usuario: <input name="username" required><br>';
    body += 'Clave: <input type="password" name="password" required><br>';
    body += '<button type="submit">Entrar</button>';
    body += '</form>';
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end(renderTemplate('Login', body));
  } else if (req.method === 'POST') {
    let data = '';
    req.on('data', chunk => data += chunk);
    req.on('end', () => {
      const form = querystring.parse(data);
      const user = users.find(u => u.username === form.username && u.password === form.password);
      if (!user) {
        res.writeHead(401);
        res.end('Credenciales inválidas');
        return;
      }
      const sid = crypto.randomBytes(16).toString('hex');
      sessions.set(sid, user.username);
      res.writeHead(302, {
        'Set-Cookie': 'sid=' + sid + '; HttpOnly',
        'Location': user.role === 'voluntario' ? '/voluntario' : '/oficial'
      });
      res.end();
    });
  }
}

function handleVoluntario(req, res, user) {
  if (user.role !== 'voluntario') {
    res.writeHead(403);
    res.end('Prohibido');
    return;
  }
  let body = '';
  body += '<h1>Voluntario ' + user.username + '</h1>';
  body += '<p>Estado actual: ' + user.status + '</p>';
  body += '<form method="POST" action="/actualizar">';
  body += '<select name="status">';
  body += '<option value="en casa disponible">En casa disponible</option>';
  body += '<option value="en camino">En camino</option>';
  body += '<option value="no disponible">No disponible</option>';
  body += '</select>';
  body += '<button type="submit">Actualizar</button>';
  body += '</form>';
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.end(renderTemplate('Voluntario', body));
}

function handleActualizar(req, res, user) {
  if (user.role !== 'voluntario' || req.method !== 'POST') {
    res.writeHead(403);
    res.end('Prohibido');
    return;
  }
  let data = '';
  req.on('data', chunk => data += chunk);
  req.on('end', () => {
    const form = querystring.parse(data);
    user.status = form.status;
    events.emit('update', users.filter(u => u.role === 'voluntario').map(u => ({username: u.username, status: u.status})));
    res.writeHead(302, {'Location': '/voluntario'});
    res.end();
  });
}

function handleOficial(req, res, user) {
  if (user.role !== 'oficial' && user.role !== 'admin') {
    res.writeHead(403);
    res.end('Prohibido');
    return;
  }
  const voluntarios = users.filter(u => u.role === 'voluntario');
  const list = voluntarios.map(v => '<li>' + v.username + ': ' + v.status + '</li>').join('');
  let body = '';
  body += '<h1>Oficial ' + user.username + '</h1>';
  body += '<ul id="lista">' + list + '</ul>';
  body += '<script>';
  body += 'const evt = new EventSource("/eventos");';
  body += 'evt.onmessage = (e) => {';
  body += ' const data = JSON.parse(e.data);';
  body += ' const ul = document.getElementById("lista");';
  body += ' ul.innerHTML = data.map(v => "<li>" + v.username + ": " + v.status + "</li>").join("");';
  body += '</script>';
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.end(renderTemplate('Oficial', body));
}

function handleEventos(req, res, user) {
  if (user.role !== 'oficial' && user.role !== 'admin') {
    res.writeHead(403);
    res.end('Prohibido');
    return;
  }
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  const send = data => res.write("data: " + JSON.stringify(data) + "\n\n");

  const voluntarios = users.filter(u => u.role === 'voluntario').map(u => ({username: u.username, status: u.status}));
  send(voluntarios);
  const listener = data => send(data);
  events.on('update', listener);
  req.on('close', () => events.removeListener('update', listener));
}

function handleRoot(req, res) {
  const body = '<h1>Bienvenido</h1><a href="/register">Registrarse</a><br><a href="/login">Login</a>';
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.end(renderTemplate('Inicio', body));
}

http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  const user = getUserFromSession(req);
  if (parsed.pathname === '/register') {
    handleRegister(req, res);
  } else if (parsed.pathname === '/login') {
    handleLogin(req, res);
  } else if (parsed.pathname === '/voluntario') {
    if (!user) {
      res.writeHead(302, {Location: '/login'});
      res.end();
    } else {
      handleVoluntario(req, res, user);
    }
  } else if (parsed.pathname === '/actualizar') {
    if (!user) {
      res.writeHead(302, {Location: '/login'});
      res.end();
    } else {
      handleActualizar(req, res, user);
    }
  } else if (parsed.pathname === '/oficial') {
    if (!user) {
      res.writeHead(302, {Location: '/login'});
      res.end();
    } else {
      handleOficial(req, res, user);
    }
  } else if (parsed.pathname === '/eventos') {
    if (!user) {
      res.writeHead(302, {Location: '/login'});
      res.end();
    } else {
      handleEventos(req, res, user);
    }
  } else {
    handleRoot(req, res);
  }
}).listen(PORT, () => {
  console.log('Servidor escuchando en puerto ' + PORT);
});
