// src/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { pool } = require('./db');

const app = express();

/* =========================================================
   Configuración básica
   ========================================================= */
app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

/* =========================================================
   Utilidades y helpers
   ========================================================= */
const isHash = (s) => typeof s === 'string' && s.startsWith('$2');

const signToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET || 'dev_secret', {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  });

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

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user?.rol || !roles.includes(req.user.rol)) {
      return res.status(403).json({ ok: false, error: 'No autorizado' });
    }
    next();
  };
}

/* ---- Helpers compartidos para servicios (evitar duplicados) ---- */
async function canAccessService(req, servicioId) {
  const { rows } = await pool.query('SELECT id, usuario FROM servicios WHERE id=$1', [servicioId]);
  const s = rows[0];
  if (!s) return { ok:false, code:404, error:'Servicio no existe' };

  if (req.user?.rol === 'administrador' || req.user?.rol === 'empleado') return { ok:true, srv:s };
  if (req.user?.rol === 'cliente' && req.user?.usuario === s.usuario) return { ok:true, srv:s };

  return { ok:false, code:403, error:'No autorizado' };
}

async function getUsuarioFromToken(req) {
  if (req.user?.usuario) return req.user.usuario;
  if (req.user?.rol === 'administrador' || req.user?.rol === 'empleado') {
    const { rows } = await pool.query('SELECT usuario FROM users WHERE id=$1', [req.user.id]);
    return rows[0]?.usuario || 'sistema';
  }
  return 'sistema';
}

/* =========================================================
   Health & utilidades
   ========================================================= */
app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'backend', time: new Date().toISOString() });
});

app.get('/db-time', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT NOW() AS db_time;');
    res.json({ ok: true, db_time: rows[0].db_time });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'DB connection failed' });
  }
});

/* =========================================================
   Autenticación
   ========================================================= */
// LOGIN (users -> servicios)
app.post('/api/login', async (req, res) => {
  try {
    const { usuario, contrasena } = req.body;
    if (!usuario || !contrasena) {
      return res.status(400).json({ ok: false, error: 'Usuario y contraseña son obligatorios' });
    }

    // 1) Intentar en USERS (admin/empleado)
    const { rows: urows } = await pool.query(
      'SELECT id, nombre_completo, usuario, contrasena, rol, estado, fecha_registro FROM users WHERE usuario = $1 LIMIT 1',
      [usuario]
    );
    const u = urows[0];

    if (u) {
      let ok = false;

      if (isHash(u.contrasena)) {
        ok = await bcrypt.compare(contrasena, u.contrasena);
      } else {
        ok = contrasena === u.contrasena;
        if (ok) {
          const newHash = await bcrypt.hash(contrasena, 10);
          await pool.query('UPDATE users SET contrasena=$1 WHERE id=$2', [newHash, u.id]);
        }
      }
      if (!ok) return res.status(401).json({ ok: false, error: 'Credenciales inválidas' });

      // 👉 Bloquear acceso si no está activo
      if (u.estado !== 'activo') {
        return res.status(403).json({ ok:false, error:'Cuenta inactiva o dada de baja' });
      }

      const token = signToken({ id: u.id, usuario: u.usuario, nombre: u.nombre_completo, rol: u.rol });
      return res.json({
        ok: true,
        token,
        user: {
          id: u.id,
          nombre_completo: u.nombre_completo,
          usuario: u.usuario,
          rol: u.rol,
          estado: u.estado,
          fecha_registro: u.fecha_registro,
        },
      });
    }

    // 2) Si no está en users, intentar como CLIENTE en SERVICIOS (texto plano)
    const { rows: srows } = await pool.query(
      `SELECT id, nombre_completo, usuario, contrasena, fecha_recepcion
       FROM servicios
       WHERE usuario = $1 AND contrasena = $2
       ORDER BY fecha_recepcion DESC
       LIMIT 1`,
      [usuario, contrasena]
    );
    const s = srows[0];
    if (!s) return res.status(401).json({ ok: false, error: 'Credenciales inválidas' });

    // Firmamos como CLIENTE (rol='cliente')
    const token = signToken({ id: s.id, usuario: s.usuario, nombre: s.nombre_completo, rol: 'cliente' });
    return res.json({
      ok: true,
      token,
      user: {
        id: s.id,
        nombre_completo: s.nombre_completo,
        usuario: s.usuario,
        rol: 'cliente',
        estado: 'activo',                // servicios no maneja estado → asumimos activo
        fecha_registro: s.fecha_recepcion,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Error en login' });
  }
});

// Perfil (admin/empleado desde users, cliente desde servicios)
app.get('/api/profile', auth, async (req, res) => {
  try {
    if (req.user.rol === 'cliente') {
      const { rows } = await pool.query(
        `SELECT id, nombre_completo, usuario, fecha_recepcion
         FROM servicios
         WHERE usuario = $1
         ORDER BY fecha_recepcion DESC
         LIMIT 1`,
        [req.user.usuario]
      );
      const s = rows[0];
      if (!s) return res.status(404).json({ ok: false, error: 'Cliente no encontrado' });
      return res.json({
        ok: true,
        user: {
          id: s.id,
          nombre_completo: s.nombre_completo,
          usuario: s.usuario,
          rol: 'cliente',
          estado: 'activo',
          fecha_registro: s.fecha_recepcion,
        },
      });
    }

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

/* =========================================================
   Usuarios (Admin)
   ========================================================= */
// Listar usuarios
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

// Crear usuario (hashea contraseña)
app.post('/api/users', auth, requireAdmin, async (req, res) => {
  try {
    const { nombre_completo, usuario, contrasena, celular, cedula, rol, estado } = req.body;
    if (!nombre_completo || !usuario || !contrasena || !celular || !cedula || !rol || !estado) {
      return res.status(400).json({ ok: false, error: 'Faltan campos obligatorios' });
    }
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
      return res.status(400).json({ ok: false, error: 'Datos no cumplen las reglas' });
    }
    res.status(500).json({ ok: false, error: 'Error al crear usuario' });
  }
});

// Actualizar usuario (password opcional)
app.patch('/api/users/:id', auth, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok:false, error:'ID inválido' });
    }

    const { nombre_completo, usuario, contrasena, celular, cedula, rol, estado } = req.body;

    const sets = [];
    const vals = [];
    let i = 1;

    if (nombre_completo != null) { sets.push(`nombre_completo=$${i++}`); vals.push(nombre_completo); }
    if (usuario != null)        { sets.push(`usuario=$${i++}`);         vals.push(usuario); }
    if (celular != null)        { sets.push(`celular=$${i++}`);         vals.push(celular); }
    if (cedula != null)         { sets.push(`cedula=$${i++}`);          vals.push(cedula); }
    if (rol != null)            { sets.push(`rol=$${i++}`);             vals.push(rol); }
    if (estado != null)         { sets.push(`estado=$${i++}`);          vals.push(estado); }

    if (contrasena != null && contrasena !== "") {
      if (!/[A-Z]/.test(contrasena)) {
        return res.status(400).json({ ok:false, error:'La contraseña debe tener al menos 1 mayúscula' });
      }
      const hash = await bcrypt.hash(contrasena, 10);
      sets.push(`contrasena=$${i++}`); vals.push(hash);
    }

    if (!sets.length) return res.status(400).json({ ok:false, error:'Nada para actualizar' });

    vals.push(id);

    const { rows } = await pool.query(
      `UPDATE users SET ${sets.join(', ')} WHERE id=$${i}
       RETURNING id, nombre_completo, usuario, celular, cedula, rol, estado, fecha_registro`,
      vals
    );
    if (!rows.length) return res.status(404).json({ ok:false, error:'Usuario no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    if (err.code === '23505') return res.status(409).json({ ok:false, error:'Dato duplicado (usuario/cédula/celular)' });
    if (err.code === '23514') return res.status(400).json({ ok:false, error:'Datos no cumplen reglas' });
    res.status(500).json({ ok:false, error:'Error al actualizar usuario' });
  }
});

// Eliminar usuario (solo si estado='dado de baja')
app.delete('/api/users/:id', auth, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ ok:false, error:'ID inválido' });

    const { rows: chk } = await pool.query('SELECT id, estado FROM users WHERE id=$1', [id]);
    const u = chk[0];
    if (!u) return res.status(404).json({ ok:false, error:'Usuario no encontrado' });
    if (u.estado !== 'dado de baja') {
      return res.status(400).json({ ok:false, error:'Solo puedes eliminar usuarios dados de baja' });
    }

    await pool.query('DELETE FROM users WHERE id=$1', [id]);
    res.json({ ok:true, id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok:false, error:'Error al eliminar usuario' });
  }
});

/* =========================================================
   Estadísticas Admin
   ========================================================= */
app.get('/api/admin/stats', auth, requireAdmin, async (req, res) => {
  try {
    const sumQuery = `
      SELECT
        COUNT(*)::int AS total,
        SUM((rol='administrador')::int)::int AS admins,
        SUM((rol='empleado')::int)::int AS empleados,
        SUM((estado='activo')::int)::int AS activos,
        SUM((estado='inactivo')::int)::int AS inactivos,
        SUM((estado='dado de baja')::int)::int AS dados_de_baja
      FROM users;
    `;
    const lastQuery = `
      SELECT id, nombre_completo, usuario, rol, estado, fecha_registro
      FROM users
      ORDER BY fecha_registro DESC
      LIMIT 5;
    `;

    const [{ rows: [summary] }, { rows: last_users }] = await Promise.all([
      pool.query(sumQuery),
      pool.query(lastQuery),
    ]);

    res.json({ ok: true, summary, last_users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Error obteniendo estadísticas' });
  }
});

/* =========================================================
   Productos
   ========================================================= */

// Listar productos — ahora con filtros por querystring (?codigo=...&nombre=...)
app.get('/api/productos', auth, requireRole('administrador', 'empleado'), async (req, res) => {
  try {
    // Filtros opcionales
    const codigo = (req.query.codigo || '').trim(); // empieza por...
    const nombre = (req.query.nombre || '').trim(); // contiene...

    const conds = [];
    const vals = [];

    if (codigo) {
      vals.push(codigo);
      conds.push(`codigo ILIKE $${vals.length} || '%'`);
    }
    if (nombre) {
      vals.push(nombre);
      conds.push(`nombre ILIKE '%' || $${vals.length} || '%'`);
    }

    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

    const sql = `
      SELECT id, codigo, nombre, categoria, marca,
             precio_compra, precio_venta, stock_inicial, stock_actual,
             descripcion, fecha_registro
      FROM productos
      ${where}
      ORDER BY id ASC
      LIMIT 500;
    `;

    const { rows } = await pool.query(sql, vals);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Error al obtener productos' });
  }
});

// Crear producto — admin o empleado
app.post('/api/productos', auth, requireRole('administrador', 'empleado'), async (req, res) => {
  try {
    let {
      codigo, nombre, categoria, marca,
      precio_compra, precio_venta, stock_inicial, descripcion,
    } = req.body;

    if (!codigo || !nombre || !categoria || precio_compra == null || precio_venta == null || stock_inicial == null) {
      return res.status(400).json({ ok: false, error: 'Faltan campos obligatorios' });
    }

    precio_compra = Number(precio_compra);
    precio_venta  = Number(precio_venta);
    stock_inicial = Number(stock_inicial);

    if (Number.isNaN(precio_compra) || precio_compra < 0) {
      return res.status(400).json({ ok: false, error: 'precio_compra inválido' });
    }
    if (Number.isNaN(precio_venta) || precio_venta < 0) {
      return res.status(400).json({ ok: false, error: 'precio_venta inválido' });
    }
    if (precio_venta < precio_compra) {
      return res.status(400).json({ ok: false, error: 'precio_venta debe ser ≥ precio_compra' });
    }
    if (!Number.isInteger(stock_inicial) || stock_inicial < 0) {
      return res.status(400).json({ ok: false, error: 'stock_inicial inválido' });
    }

    const { rows } = await pool.query(
      `INSERT INTO productos
        (codigo, nombre, categoria, marca, precio_compra, precio_venta, stock_inicial, descripcion)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id, codigo, nombre, categoria, marca,
                 precio_compra, precio_venta, stock_inicial,
                 descripcion, fecha_registro`,
      [codigo, nombre, categoria, marca || null, precio_compra, precio_venta, stock_inicial, descripcion || null]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      return res.status(409).json({ ok: false, error: 'Código de producto duplicado' });
    }
    if (err.code === '23514') {
      return res.status(400).json({ ok: false, error: 'Datos no cumplen las reglas' });
    }
    res.status(500).json({ ok: false, error: 'Error al crear producto' });
  }
});

// Buscador rápido (autocomplete)
app.get('/api/productos/search', auth, requireRole('administrador', 'empleado'), async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json([]);
    const { rows } = await pool.query(
      `SELECT id, codigo, nombre, precio_venta
       FROM productos
       WHERE codigo ILIKE $1 || '%' OR nombre ILIKE '%' || $1 || '%'
       ORDER BY nombre
       LIMIT 10`,
      [q]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Error buscando productos' });
  }
});
/* =========================================================
   Ventas (línea) + Comprobantes + Órdenes
   ========================================================= */
// Venta simple
app.post('/api/ventas', auth, requireRole('administrador', 'empleado'), async (req, res) => {
  try {
    let { cliente_nombre, cedula, telefono, producto_id, cantidad, precio_unitario, descripcion } = req.body;

    if (!cliente_nombre || !cedula || !telefono || !producto_id || !cantidad) {
      return res.status(400).json({ ok: false, error: 'Faltan campos obligatorios' });
    }

    producto_id = Number(producto_id);
    cantidad    = Number(cantidad);
    if (!Number.isInteger(producto_id) || producto_id <= 0) {
      return res.status(400).json({ ok: false, error: 'producto_id inválido' });
    }
    if (!Number.isInteger(cantidad) || cantidad < 1) {
      return res.status(400).json({ ok: false, error: 'cantidad inválida' });
    }

    if (precio_unitario != null) {
      precio_unitario = Number(precio_unitario);
      if (Number.isNaN(precio_unitario) || precio_unitario < 0) {
        return res.status(400).json({ ok: false, error: 'precio_unitario inválido' });
      }
    }

    const { rows } = await pool.query(
      `INSERT INTO ventas
        (cliente_nombre, cedula, telefono, producto_id, precio_unitario, cantidad, descripcion)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id, cliente_nombre, cedula, telefono, producto_id,
                 producto_nombre, precio_unitario, cantidad, total, descripcion, fecha_venta`,
      [cliente_nombre, cedula, telefono, producto_id, precio_unitario ?? null, cantidad, descripcion || null]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    if (String(err.message || '').toLowerCase().includes('stock insuficiente')) {
      return res.status(400).json({ ok: false, error: 'Stock insuficiente' });
    }
    res.status(500).json({ ok: false, error: 'Error al crear venta' });
  }
});

// Ventas recientes
app.get('/api/ventas', auth, requireRole('administrador', 'empleado'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, cliente_nombre, cedula, telefono, producto_id, producto_nombre,
              precio_unitario, cantidad, total, descripcion, fecha_venta
       FROM ventas
       ORDER BY fecha_venta DESC
       LIMIT 50`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Error al obtener ventas' });
  }
});

// Ventas en lote → comprobante
app.post('/api/ventas/lote', auth, requireRole('administrador', 'empleado'), async (req, res) => {
  const client = await pool.connect();
  try {
    let { cliente_nombre, cedula, telefono, descripcion, items } = req.body;

    if (!cliente_nombre || !cedula || !telefono || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ ok: false, error: 'Faltan datos o items vacío' });
    }

    items = items.map(it => ({
      producto_id: Number(it.producto_id),
      cantidad: Number(it.cantidad),
      precio_unitario: it.precio_unitario != null && it.precio_unitario !== ''
        ? Number(it.precio_unitario)
        : null
    })).filter(it =>
      Number.isInteger(it.producto_id) && it.producto_id > 0 &&
      Number.isInteger(it.cantidad) && it.cantidad >= 1
    );

    if (!items.length) {
      return res.status(400).json({ ok: false, error: 'Items inválidos' });
    }

    // Consolidar productos repetidos
    const merged = new Map();
    for (const it of items) {
      const k = it.producto_id;
      if (!merged.has(k)) merged.set(k, { ...it });
      else merged.get(k).cantidad += it.cantidad;
    }
    items = Array.from(merged.values());

    await client.query('BEGIN');

    const { rows: [comp] } = await client.query(
      `INSERT INTO venta_comprobantes (cliente_nombre, cedula, telefono, descripcion, usuario)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [cliente_nombre, cedula, telefono, descripcion || null, req.user?.nombre || req.user?.usuario || null]
    );

    const creadas = [];
    let total = 0;

    for (const it of items) {
      const { rows: [v] } = await client.query(
        `INSERT INTO ventas
          (cliente_nombre, cedula, telefono, producto_id, precio_unitario, cantidad, descripcion, comprobante_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         RETURNING id, cliente_nombre, cedula, telefono, producto_id,
                   producto_nombre, precio_unitario, cantidad, total, descripcion, fecha_venta, comprobante_id`,
        [
          cliente_nombre,
          cedula,
          telefono,
          it.producto_id,
          it.precio_unitario,
          it.cantidad,
          descripcion || null,
          comp.id
        ]
      );
      creadas.push(v);
      total += Number(v.total);
    }

    await client.query('UPDATE venta_comprobantes SET total = $1 WHERE id = $2', [total, comp.id]);

    await client.query('COMMIT');
    return res.status(201).json({ ok: true, comprobante: { ...comp, total }, items: creadas });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    if (String(err.message || '').toLowerCase().includes('stock insuficiente')) {
      return res.status(400).json({ ok: false, error: 'Stock insuficiente' });
    }
    return res.status(500).json({ ok: false, error: 'Error creando venta en lote' });
  } finally {
    client.release();
  }
});

// Listar comprobantes
app.get('/api/ventas/comprobantes', auth, requireRole('administrador','empleado'), async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT c.id, c.cliente_nombre, c.cedula, c.telefono, c.descripcion, c.total, c.fecha,
             COUNT(v.id)::int AS lineas
      FROM venta_comprobantes c
      LEFT JOIN ventas v ON v.comprobante_id = c.id
      GROUP BY c.id
      ORDER BY c.fecha DESC
      LIMIT 50;
    `);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, error:'Error listando comprobantes' });
  }
});

// Detalle de comprobante
app.get('/api/ventas/comprobantes/:id', auth, requireRole('administrador','empleado'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ ok:false, error:'ID inválido' });

    const { rows: cab } = await pool.query(`SELECT * FROM venta_comprobantes WHERE id=$1`, [id]);
    if (!cab.length) return res.status(404).json({ ok:false, error:'Comprobante no existe' });

    const { rows: items } = await pool.query(`
      SELECT id, producto_id, producto_nombre, precio_unitario, cantidad, total, fecha_venta, descripcion
      FROM ventas
      WHERE comprobante_id = $1
      ORDER BY id ASC
    `, [id]);

    res.json({ comprobante: cab[0], items });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, error:'Error obteniendo comprobante' });
  }
});

/* ---- Órdenes (encabezado/detalle) ---- */
app.post('/api/ordenes', auth, requireRole('administrador','empleado'), async (req, res) => {
  const client = await pool.connect();
  try {
    let { cliente_nombre, cedula, telefono, descripcion, items } = req.body;

    if (!cliente_nombre || !cedula || !telefono || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ ok:false, error:'Faltan datos o no hay items' });
    }

    items = items.map(it => ({
      producto_id: Number(it.producto_id),
      cantidad: Number(it.cantidad),
      precio_unitario: (it.precio_unitario === '' || it.precio_unitario == null)
        ? null
        : Number(it.precio_unitario)
    })).filter(it =>
      Number.isInteger(it.producto_id) && it.producto_id > 0 &&
      Number.isInteger(it.cantidad) && it.cantidad >= 1
    );
    if (!items.length) return res.status(400).json({ ok:false, error:'Items inválidos' });

    await client.query('BEGIN');

    const { rows: [ord] } = await client.query(
      `INSERT INTO ventas_ordenes (cliente_nombre, cedula, telefono, descripcion, vendedor_usuario)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [cliente_nombre, cedula, telefono, descripcion || null, req.user?.usuario || null]
    );

    for (const it of items) {
      await client.query(
        `INSERT INTO ventas_items (orden_id, producto_id, precio_unitario, cantidad, producto_nombre, subtotal)
         VALUES ($1,$2,$3,$4,'',0)`,
        [ord.id, it.producto_id, it.precio_unitario, it.cantidad]
      );
    }

    const { rows: [enc] } = await client.query('SELECT * FROM ventas_ordenes WHERE id=$1', [ord.id]);
    const { rows: det }   = await client.query('SELECT * FROM ventas_items WHERE orden_id=$1 ORDER BY id', [ord.id]);

    await client.query('COMMIT');
    res.status(201).json({ ok:true, orden: enc, items: det });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    if (String(err.message || '').toLowerCase().includes('stock insuficiente')) {
      return res.status(400).json({ ok:false, error:'Stock insuficiente' });
    }
    res.status(500).json({ ok:false, error:'Error creando orden' });
  } finally {
    client.release();
  }
});

app.get('/api/ordenes', auth, requireRole('administrador','empleado'), async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        o.id, o.fecha_venta, o.cliente_nombre, o.cedula, o.telefono,
        o.total, o.estado, o.vendedor_usuario,
        COUNT(i.id)::int AS lineas
      FROM ventas_ordenes o
      LEFT JOIN ventas_items i ON i.orden_id = o.id
      GROUP BY o.id
      ORDER BY o.fecha_venta DESC
      LIMIT 50
    `);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, error:'Error listando órdenes' });
  }
});

app.get('/api/ordenes/:id', auth, requireRole('administrador','empleado'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ ok:false, error:'ID inválido' });

    const { rows: [o] } = await pool.query('SELECT * FROM ventas_ordenes WHERE id=$1', [id]);
    if (!o) return res.status(404).json({ ok:false, error:'Orden no existe' });

    const { rows: items } = await pool.query(
      'SELECT * FROM ventas_items WHERE orden_id=$1 ORDER BY id', [id]
    );

    res.json({ ok:true, orden:o, items });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, error:'Error obteniendo orden' });
  }
});

app.post('/api/ordenes/:id/anular', auth, requireRole('administrador','empleado'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ ok:false, error:'ID inválido' });

    await pool.query('SELECT ventas_orden_anular($1)', [id]);
    const { rows:[o] } = await pool.query('SELECT * FROM ventas_ordenes WHERE id=$1', [id]);
    res.json({ ok:true, orden:o });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, error:'Error anulando orden' });
  }
});

/* =========================================================
   Servicios
   ========================================================= */
// Listar servicios
app.get('/api/servicios', auth, requireRole('administrador', 'empleado'), async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, codigo,
             nombre_completo, usuario, ciudad, telefono, cedula, direccion, rol,
             fecha_recepcion, tipo_equipo, modelo, descripcion_equipo, proceso,
             valor_total, pago_tipo, monto_abono, valor_restante, estado
      FROM servicios
      ORDER BY fecha_recepcion DESC
      LIMIT 100
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Error al obtener servicios' });
  }
});

// Crear servicio
app.post('/api/servicios', auth, requireRole('administrador', 'empleado'), async (req, res) => {
  try {
    let {
      nombre_completo, usuario, contrasena, ciudad, telefono, cedula, direccion,
      tipo_equipo, modelo, descripcion_equipo, proceso,
      valor_total, pago_tipo, monto_abono, observaciones
    } = req.body;

    const required = [
      nombre_completo, usuario, contrasena, ciudad, telefono, cedula, direccion,
      tipo_equipo, modelo, descripcion_equipo, proceso, valor_total, pago_tipo
    ];
    if (required.some(v => v === undefined || v === null || v === "")) {
      return res.status(400).json({ ok: false, error: 'Faltan campos obligatorios' });
    }

    valor_total = Number(valor_total);
    if (Number.isNaN(valor_total) || valor_total < 0) {
      return res.status(400).json({ ok: false, error: 'valor_total inválido' });
    }

    if (pago_tipo === 'abono') {
      monto_abono = Number(monto_abono ?? 0);
      if (Number.isNaN(monto_abono) || monto_abono < 0) {
        return res.status(400).json({ ok: false, error: 'monto_abono inválido' });
      }
    } else {
      monto_abono = null;
    }

    const { rows } = await pool.query(
      `INSERT INTO servicios
   (nombre_completo, usuario, contrasena, ciudad, telefono, cedula, direccion,
    tipo_equipo, modelo, descripcion_equipo, proceso,
    valor_total, pago_tipo, monto_abono)
   VALUES ($1,$2,$3,$4,$5,$6,$7,
           $8,$9,$10,$11,
           $12,$13,$14)
   RETURNING id, codigo,
             nombre_completo, usuario, ciudad, telefono, cedula, direccion, rol,
             fecha_recepcion, tipo_equipo, modelo, descripcion_equipo, proceso,
             valor_total, pago_tipo, monto_abono, valor_restante, estado`,
      [
        nombre_completo, usuario, contrasena, ciudad, telefono, cedula, direccion,
        tipo_equipo, modelo, descripcion_equipo, proceso,
        valor_total, pago_tipo, pago_tipo === 'abono' ? monto_abono : null
      ]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    if (err.code === '23514') return res.status(400).json({ ok: false, error: 'Datos no cumplen validaciones' });
    if (err.code === '23505') return res.status(409).json({ ok: false, error: 'Código duplicado' });
    res.status(500).json({ ok: false, error: 'Error al crear servicio' });
  }
});

// Actualizar servicio (algunos campos)
app.patch('/api/servicios/:id', auth, requireRole('administrador', 'empleado'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ ok: false, error: 'ID inválido' });

    const editable = ['observaciones', 'proceso', 'valor_total', 'pago_tipo', 'monto_abono'];
    const sets = [];
    const vals = [];
    let i = 1;
    for (const k of editable) {
      if (k in req.body) { sets.push(`${k} = $${i++}`); vals.push(req.body[k]); }
    }
    if (!sets.length) return res.status(400).json({ ok: false, error: 'Nada para actualizar' });

    vals.push(id);

    const { rows } = await pool.query(
      `UPDATE servicios
       SET ${sets.join(', ')}
       WHERE id = $${i}
       RETURNING id, codigo,
                 nombre_completo, usuario, ciudad, telefono, cedula, direccion, rol,
                 fecha_recepcion, tipo_equipo, modelo, descripcion_equipo, proceso,
                 valor_total, pago_tipo, monto_abono, valor_restante, estado`,
      vals
    );
    if (!rows.length) return res.status(404).json({ ok: false, error: 'Servicio no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    if (err.code === '23514') return res.status(400).json({ ok: false, error: 'Datos no cumplen validaciones' });
    res.status(500).json({ ok: false, error: 'Error al actualizar servicio' });
  }
});

// Servicios del cliente autenticado
app.get('/api/servicios/mios', auth, requireRole('cliente'), async (req, res) => {
  try {
    const { usuario } = req.user;
    const { rows } = await pool.query(
      `SELECT id, codigo, nombre_completo, usuario, fecha_recepcion,
              tipo_equipo, modelo, descripcion_equipo, proceso,
              valor_total, pago_tipo, monto_abono, valor_restante, estado
       FROM servicios
       WHERE usuario = $1
       ORDER BY fecha_recepcion DESC
       LIMIT 100`,
      [usuario]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Error al obtener tus servicios' });
  }
});

// Comentarios (listar/crear)
app.get('/api/servicios/:id/comentarios',
  auth, requireRole('administrador','empleado','cliente'),
  async (req,res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ ok:false, error:'ID inválido' });

      const chk = await canAccessService(req, id);
      if (!chk.ok) return res.status(chk.code).json({ ok:false, error: chk.error });

      const { rows } = await pool.query(
        `SELECT id, servicio_id, autor_tipo, autor_usuario, mensaje, created_at
         FROM servicio_comentarios
         WHERE servicio_id=$1
         ORDER BY created_at ASC`,
        [id]
      );
      res.json(rows);
    } catch (e) {
      console.error(e);
      res.status(500).json({ ok:false, error:'Error obteniendo comentarios' });
    }
  }
);

app.post('/api/servicios/:id/comentarios',
  auth, requireRole('administrador','empleado','cliente'),
  async (req,res) => {
    try {
      const id = Number(req.params.id);
      const { mensaje } = req.body;
      if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ ok:false, error:'ID inválido' });
      if (!mensaje || !mensaje.trim()) return res.status(400).json({ ok:false, error:'Mensaje vacío' });

      const chk = await canAccessService(req, id);
      if (!chk.ok) return res.status(chk.code).json({ ok:false, error: chk.error });

      const autor_tipo = req.user.rol;
      const autor_usuario = await getUsuarioFromToken(req);

      const { rows } = await pool.query(
        `INSERT INTO servicio_comentarios (servicio_id, autor_tipo, autor_usuario, mensaje)
         VALUES ($1,$2,$3,$4)
         RETURNING id, servicio_id, autor_tipo, autor_usuario, mensaje, created_at`,
        [id, autor_tipo, autor_usuario, mensaje.trim()]
      );
      res.status(201).json(rows[0]);
    } catch (e) {
      console.error(e);
      res.status(500).json({ ok:false, error:'Error creando comentario' });
    }
  }
);

/* =========================================================
   Inventario
   ========================================================= */
app.get('/api/inventario', auth, requireRole('administrador','empleado'), async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, codigo, nombre, categoria, marca, precio_venta, stock_inicial, stock_actual
      FROM productos
      ORDER BY nombre ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok:false, error:'Error al obtener inventario' });
  }
});

app.get('/api/inventario/kardex/:id', auth, requireRole('administrador','empleado'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const limit = Math.min(Number(req.query.limit ?? 30), 200);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ ok:false, error:'ID inválido' });

    const { rows } = await pool.query(`
      SELECT id, fecha, tipo, cantidad, stock_antes, stock_despues,
             referencia_tipo, referencia_id, comentario, usuario
      FROM movimientos_inventario
      WHERE producto_id = $1
      ORDER BY fecha DESC
      LIMIT $2
    `, [id, limit]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok:false, error:'Error obteniendo kardex' });
  }
});

// Ajuste manual
app.post('/api/inventario/ajuste', auth, requireRole('administrador','empleado'), async (req, res) => {
  const client = await pool.connect();
  try {
    let { producto_id, tipo, cantidad, comentario } = req.body;
    producto_id = Number(producto_id);
    cantidad    = Number(cantidad);
    if (!Number.isInteger(producto_id) || producto_id <= 0) {
      return res.status(400).json({ ok:false, error:'producto_id inválido' });
    }
    if (!['entrada','salida'].includes(tipo)) {
      return res.status(400).json({ ok:false, error:'tipo debe ser entrada o salida' });
    }
    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      return res.status(400).json({ ok:false, error:'cantidad inválida' });
    }

    await client.query('BEGIN');

    const { rows: [p] } = await client.query(
      'SELECT id, codigo, nombre, stock_actual FROM productos WHERE id=$1 FOR UPDATE',
      [producto_id]
    );
    if (!p) { await client.query('ROLLBACK'); return res.status(404).json({ ok:false, error:'Producto no existe' }); }

    const stock_antes = p.stock_actual;
    let stock_despues = stock_antes;
    if (tipo === 'entrada') {
      stock_despues = stock_antes + cantidad;
    } else {
      if (stock_antes < cantidad) { await client.query('ROLLBACK'); return res.status(400).json({ ok:false, error:'Stock insuficiente' }); }
      stock_despues = stock_antes - cantidad;
    }

    await client.query('UPDATE productos SET stock_actual=$1 WHERE id=$2', [stock_despues, producto_id]);

    const { rows: [mov] } = await client.query(
      `INSERT INTO movimientos_inventario
       (producto_id, tipo, cantidad, stock_antes, stock_despues, referencia_tipo, referencia_id, comentario, usuario)
       VALUES ($1,$2,$3,$4,$5,'ajuste',NULL,$6,$7)
       RETURNING *`,
      [producto_id, tipo, cantidad, stock_antes, stock_despues, comentario || null, req.user?.nombre || null]
    );

    await client.query('COMMIT');
    res.json({ ok:true, producto: { ...p, stock_actual: stock_despues }, movimiento: mov });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ ok:false, error:'Error al registrar ajuste' });
  } finally {
    client.release();
  }
});

/* =========================================================
   Reportes
   ========================================================= */
function parseRange(q) {
  const g = String(q.granularity || "day").toLowerCase();
  const allowed = new Set(["day","week","month","year"]);
  const granularity = allowed.has(g) ? g : "day";

  const today = new Date();
  const to   = q.to ? new Date(q.to) : today;
  const from = q.from ? new Date(q.from) : new Date(to.getTime() - 30*24*3600*1000);

  return { granularity, from: from.toISOString().slice(0,10), to: to.toISOString().slice(0,10) };
}

app.get('/api/reportes/ventas', auth, requireRole('administrador','empleado'), async (req, res) => {
  try {
    const { granularity, from, to } = parseRange(req.query);
    const sql = `
      SELECT date_trunc('${granularity}', v.fecha_venta) AS periodo,
             SUM(v.total)::numeric(12,2)     AS ingresos,
             SUM(v.cantidad)::int            AS unidades
      FROM ventas v
      WHERE v.fecha_venta >= $1::date
        AND v.fecha_venta <  ($2::date + INTERVAL '1 day')
      GROUP BY 1
      ORDER BY 1;
    `;
    const { rows } = await pool.query(sql, [from, to]);
    res.json({ ok:true, granularity, from, to, rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok:false, error:'Error en reporte de ventas' });
  }
});

app.get('/api/reportes/utilidad', auth, requireRole('administrador','empleado'), async (req, res) => {
  try {
    const { granularity, from, to } = parseRange(req.query);
    const sql = `
      SELECT date_trunc('${granularity}', v.fecha_venta) AS periodo,
             SUM(v.total)::numeric(12,2) AS ingresos,
             SUM(v.cantidad * p.precio_compra)::numeric(12,2) AS cogs_aprox,
             (SUM(v.total) - SUM(v.cantidad * p.precio_compra))::numeric(12,2) AS utilidad
      FROM ventas v
      JOIN productos p ON p.id = v.producto_id
      WHERE v.fecha_venta >= $1::date
        AND v.fecha_venta <  ($2::date + INTERVAL '1 day')
      GROUP BY 1
      ORDER BY 1;
    `;
    const { rows } = await pool.query(sql, [from, to]);
    res.json({ ok:true, granularity, from, to, rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok:false, error:'Error en reporte de utilidad' });
  }
});

app.get('/api/reportes/movimientos', auth, requireRole('administrador','empleado'), async (req, res) => {
  try {
    const { granularity, from, to } = parseRange(req.query);
    const sql = `
      SELECT date_trunc('${granularity}', m.fecha) AS periodo,
             SUM(CASE WHEN m.tipo = 'entrada' THEN m.cantidad ELSE 0 END)::int            AS entradas,
             SUM(CASE WHEN m.tipo IN ('venta','salida') THEN m.cantidad ELSE 0 END)::int   AS salidas,
             SUM(CASE WHEN m.tipo = 'anulacion' THEN m.cantidad ELSE 0 END)::int          AS anulaciones
      FROM movimientos_inventario m
      WHERE m.fecha >= $1::date
        AND m.fecha <  ($2::date + INTERVAL '1 day')
      GROUP BY 1
      ORDER BY 1;
    `;
    const { rows } = await pool.query(sql, [from, to]);
    res.json({ ok:true, granularity, from, to, rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok:false, error:'Error en reporte de movimientos' });
  }
});

app.get('/api/reportes/inventario-valor', auth, requireRole('administrador','empleado'), async (req, res) => {
  try {
    const { rows:[r] } = await pool.query(`
      SELECT
        COALESCE(SUM(p.stock_actual * p.precio_compra),0)::numeric(14,2) AS valor_costo,
        COALESCE(SUM(p.stock_actual * p.precio_venta),0)::numeric(14,2)  AS valor_venta
      FROM productos p;
    `);
    res.json({ ok:true, resumen: r });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok:false, error:'Error en valor de inventario' });
  }
});
// ===================== Conversaciones (listado / borrar) =====================

// Admin/Empleado: lista "conversaciones" (servicios) con último mensaje
app.get('/api/conversaciones', auth, requireRole('administrador','empleado'), async (req, res) => {
  try {
    const { q } = req.query; // filtro opcional por nombre/código/usuario/equipo/modelo
    const vals = [];
    let where = '';
    if (q && String(q).trim() !== '') {
      vals.push(`%${q.trim()}%`);
      where = `
        WHERE s.nombre_completo ILIKE $1
           OR s.usuario ILIKE $1
           OR s.codigo ILIKE $1
           OR s.tipo_equipo ILIKE $1
           OR s.modelo ILIKE $1
      `;
    }

    const { rows } = await pool.query(
      `
      SELECT
        s.id, s.codigo, s.nombre_completo, s.usuario, s.tipo_equipo, s.modelo,
        s.estado, s.fecha_recepcion,
        (
          SELECT sc.mensaje FROM servicio_comentarios sc
          WHERE sc.servicio_id = s.id
          ORDER BY sc.created_at DESC
          LIMIT 1
        ) AS ultimo_mensaje,
        (
          SELECT sc.created_at FROM servicio_comentarios sc
          WHERE sc.servicio_id = s.id
          ORDER BY sc.created_at DESC
          LIMIT 1
        ) AS ultimo_fecha
      FROM servicios s
      ${where}
      ORDER BY (ultimo_fecha IS NULL), ultimo_fecha DESC, s.fecha_recepcion DESC
      LIMIT 200
      `,
      vals
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, error:'Error listando conversaciones' });
  }
});

// Cliente: borrar su "conversación" (sus mensajes) de un servicio
app.delete('/api/servicios/:id/comentarios', auth, requireRole('cliente','administrador','empleado'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ ok:false, error:'ID inválido' });

    const chk = await canAccessService(req, id);
    if (!chk.ok) return res.status(chk.code).json({ ok:false, error: chk.error });

    // admin/empleado puede borrar todo si ?all=1
    if (req.user.rol !== 'cliente' && req.query.all === '1') {
      const { rowCount } = await pool.query(
        'DELETE FROM servicio_comentarios WHERE servicio_id = $1', [id]
      );
      return res.json({ ok:true, borrados: rowCount });
    }

    // cliente: borra solo sus propios mensajes
    const { rowCount } = await pool.query(
      `DELETE FROM servicio_comentarios
       WHERE servicio_id = $1 AND autor_tipo = $2`,
      [id, 'cliente']
    );
    res.json({ ok:true, borrados: rowCount });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, error:'Error borrando conversación' });
  }
});

// Admin/Empleado: borrar un mensaje puntual
app.delete('/api/servicios/:id/comentarios/:cid', auth, requireRole('administrador','empleado'), async (req, res) => {
  try {
    const id  = Number(req.params.id);
    const cid = Number(req.params.cid);
    if (!Number.isInteger(id) || id <= 0)  return res.status(400).json({ ok:false, error:'ID inválido' });
    if (!Number.isInteger(cid) || cid <= 0) return res.status(400).json({ ok:false, error:'Comentario inválido' });

    const chk = await canAccessService(req, id);
    if (!chk.ok) return res.status(chk.code).json({ ok:false, error: chk.error });

    const { rowCount } = await pool.query(
      'DELETE FROM servicio_comentarios WHERE id=$1 AND servicio_id=$2',
      [cid, id]
    );
    if (!rowCount) return res.status(404).json({ ok:false, error:'Comentario no encontrado' });
    res.json({ ok:true, id: cid });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, error:'Error borrando comentario' });
  }
});
/* ========= SSE (Server-Sent Events) para chat ========= */
const sseClients = new Map(); // servicioId -> Set(res)

function sseSubscribe(servicioId, res) {
  if (!sseClients.has(servicioId)) sseClients.set(servicioId, new Set());
  sseClients.get(servicioId).add(res);
}

function sseUnsubscribe(servicioId, res) {
  const set = sseClients.get(servicioId);
  if (!set) return;
  set.delete(res);
  if (set.size === 0) sseClients.delete(servicioId);
}

function sseBroadcast(servicioId, payload) {
  const set = sseClients.get(servicioId);
  if (!set) return;
  const data = `event: comentario\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const res of set) {
    try { res.write(data); } catch {}
  }
}

// helper para verificar token desde query (?token=) o header
function authFromQueryOrHeader(req) {
    let token = null;
    const h = req.headers.authorization || '';
    if (h.startsWith('Bearer ')) token = h.slice(7);
    if (!token && req.query.token) token = String(req.query.token);
    if (!token) throw new Error('No token');
    const data = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
    return data;
}

// Stream SSE de comentarios de un servicio
app.get('/api/servicios/:id/stream', async (req, res) => {
  try {
    // auth por query o header (SSE no permite headers custom fácilmente)
    const user = authFromQueryOrHeader(req);
    req.user = user;

    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).end();

    // validar acceso (admin/empleado/ese cliente)
    const chk = await canAccessService(req, id);
    if (!chk.ok) return res.status(chk.code).end();

    // cabeceras SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    // si tu CORS solo permite 5173:
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');

    // suscribir
    sseSubscribe(id, res);

    // primer ping (útil para que el cliente sepa que está conectado)
    res.write(`event: ready\ndata: ${JSON.stringify({ ok: true, serviceId: id })}\n\n`);

    // heartbeat cada 25s para mantener viva la conexión en proxies
    const hb = setInterval(() => {
      try { res.write(`event: hb\ndata: 1\n\n`); } catch {}
    }, 25000);

    // al cerrar
    req.on('close', () => {
      clearInterval(hb);
      sseUnsubscribe(id, res);
      try { res.end(); } catch {}
    });
  } catch (e) {
    // token inválido o cualquier otro error
    try { res.status(401).end(); } catch {}
  }
});
app.post('/api/servicios/:id/comentarios',
  auth, requireRole('administrador','empleado','cliente'),
  async (req,res) => {
    try {
      const id = Number(req.params.id);
      const { mensaje } = req.body;
      if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ ok:false, error:'ID inválido' });
      if (!mensaje || !mensaje.trim()) return res.status(400).json({ ok:false, error:'Mensaje vacío' });

      const chk = await canAccessService(req, id);
      if (!chk.ok) return res.status(chk.code).json({ ok:false, error: chk.error });

      const autor_tipo = req.user.rol;
      const autor_usuario = await getUsuarioFromToken(req);

      const { rows } = await pool.query(
        `INSERT INTO servicio_comentarios (servicio_id, autor_tipo, autor_usuario, mensaje)
         VALUES ($1,$2,$3,$4)
         RETURNING id, servicio_id, autor_tipo, autor_usuario, mensaje, created_at`,
        [id, autor_tipo, autor_usuario, mensaje.trim()]
      );
      const created = rows[0];

      // >>> Notificar a clientes SSE conectados a este servicio:
      sseBroadcast(id, created);

      res.status(201).json(created);
    } catch (e) {
      console.error(e);
      res.status(500).json({ ok:false, error:'Error creando comentario' });
    }
  }
);

/* =========================================================
   Arranque
   ========================================================= */
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
