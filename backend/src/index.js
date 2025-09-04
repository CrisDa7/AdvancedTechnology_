require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { pool } = require('./db');

const app = express();

// CORS: solo tu frontend
app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET','POST','PATCH','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// Helpers
const isHash = (s) => typeof s === 'string' && s.startsWith('$2');
const signToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET || 'dev_secret', {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  });

// Middlewares
function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ ok: false, error: 'No token' });
  try {
    const data = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
    req.user = data;
    next();
  } catch {
    return res.status(401).json({ ok: false, error: 'Token inválido' });
  }
}
function requireAdmin(req, res, next) {
  if (req.user?.rol !== 'administrador') {
    return res.status(403).json({ ok: false, error: 'Solo administradores' });
  }
  next();
}

// Health
app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'backend', time: new Date().toISOString() });
});

// DB time
app.get('/db-time', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT NOW() AS db_time;');
    res.json({ ok: true, db_time: rows[0].db_time });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'DB connection failed' });
  }
});

// LOGIN
app.post('/api/login', async (req, res) => {
  try {
    const { usuario, contrasena } = req.body;
    if (!usuario || !contrasena) {
      return res.status(400).json({ ok: false, error: 'Usuario y contraseña son obligatorios' });
    }

    const { rows } = await pool.query(
      'SELECT id, nombre_completo, usuario, contrasena, rol, estado, fecha_registro FROM users WHERE usuario = $1 LIMIT 1',
      [usuario]
    );
    const user = rows[0];
    if (!user) return res.status(401).json({ ok: false, error: 'Credenciales inválidas' });

    let ok = false;
    if (isHash(user.contrasena)) {
      ok = await bcrypt.compare(contrasena, user.contrasena);
    } else {
      // Soporta los que quedaron en texto plano y re-hashea al vuelo si coincide
      ok = contrasena === user.contrasena;
      if (ok) {
        const newHash = await bcrypt.hash(contrasena, 10);
        await pool.query('UPDATE users SET contrasena=$1 WHERE id=$2', [newHash, user.id]);
      }
    }
    if (!ok) return res.status(401).json({ ok: false, error: 'Credenciales inválidas' });

    const token = signToken({ id: user.id, nombre: user.nombre_completo, rol: user.rol });
    res.json({
      ok: true,
      token,
      user: {
        id: user.id,
        nombre_completo: user.nombre_completo,
        usuario: user.usuario,
        rol: user.rol,
        estado: user.estado,
        fecha_registro: user.fecha_registro,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Error en login' });
  }
});

// Perfil (verifica token y devuelve usuario actualizado)
app.get('/api/profile', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, nombre_completo, usuario, rol, estado, fecha_registro FROM users WHERE id = $1',
      [req.user.id]
    );
    const u = rows[0];
    if (!u) return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
    res.json({ ok: true, user: u });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Error obteniendo perfil' });
  }
});

// Listar usuarios — solo admin
app.get('/api/users', auth, requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, nombre_completo, usuario, celular, cedula, rol, estado, fecha_registro
      FROM users
      ORDER BY id ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Error al obtener usuarios' });
  }
});

// Crear usuario — solo admin (y se hashea antes de guardar)
app.post('/api/users', auth, requireAdmin, async (req, res) => {
  try {
    const { nombre_completo, usuario, contrasena, celular, cedula, rol, estado } = req.body;
    if (!nombre_completo || !usuario || !contrasena || !celular || !cedula || !rol || !estado) {
      return res.status(400).json({ ok: false, error: 'Faltan campos obligatorios' });
    }
    // Valida políticas antes de hashear
    if (!/[A-Z]/.test(contrasena)) {
      return res.status(400).json({ ok: false, error: 'La contraseña debe tener al menos 1 mayúscula' });
    }
    const hash = await bcrypt.hash(contrasena, 10);

    const query = `
      INSERT INTO users (nombre_completo, usuario, contrasena, celular, cedula, rol, estado)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, nombre_completo, usuario, celular, cedula, rol, estado, fecha_registro;
    `;
    const values = [nombre_completo, usuario, hash, celular, cedula, rol, estado];
    const { rows } = await pool.query(query, values);

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      return res.status(409).json({ ok: false, error: 'Dato duplicado (usuario/cédula/celular ya existe)' });
    }
    if (err.code === '23514') {
      return res.status(400).json({ ok: false, error: 'Datos no cumplen las reglas (revisa formato/valores)' });
    }
    res.status(500).json({ ok: false, error: 'Error al crear usuario' });
  }
});

// Arranque
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
