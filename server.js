// server.js — Laishaz Studio backend (single-file)
// Serves the website and provides /api endpoints for customers + appointments.

const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Database connection ──
// Reads DATABASE_URL from your hosting provider (Replit / Render / Railway etc.)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost')
    ? false
    : { rejectUnauthorized: false },
});

// ── Create tables on first run ──
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS customers (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL UNIQUE,
      email TEXT,
      password TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS appointments (
      id SERIAL PRIMARY KEY,
      customer_id INTEGER,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      service TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
  console.log('✓ Database ready');
}

app.use(express.json());

// ════════ CUSTOMER ROUTES ════════

// Sign up a new customer
app.post('/api/customers/signup', async (req, res) => {
  try {
    const { name, phone, email, password } = req.body || {};
    if (!name || !phone || !password) {
      return res.status(400).json({ error: 'Name, phone, and password are required.' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const existing = await pool.query(
      email
        ? 'SELECT * FROM customers WHERE phone = $1 OR email = $2 LIMIT 1'
        : 'SELECT * FROM customers WHERE phone = $1 LIMIT 1',
      email ? [phone, email] : [phone]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this phone or email already exists.' });
    }

    const result = await pool.query(
      `INSERT INTO customers (name, phone, email, password)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, phone, email, created_at`,
      [name, phone, email || null, password]
    );
    res.json({ customer: result.rows[0] });
  } catch (err) {
    console.error('signup error', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// Customer login (by phone or email)
app.post('/api/customers/login', async (req, res) => {
  try {
    const { id, password } = req.body || {};
    if (!id || !password) {
      return res.status(400).json({ error: 'Login and password are required.' });
    }
    const found = await pool.query(
      'SELECT * FROM customers WHERE phone = $1 OR email = $1 LIMIT 1',
      [id]
    );
    const cust = found.rows[0];
    if (!cust || cust.password !== password) {
      return res.status(401).json({ error: 'Invalid login. Please check your details.' });
    }
    const { password: _pw, ...safe } = cust;
    res.json({ customer: safe });
  } catch (err) {
    console.error('login error', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ════════ APPOINTMENT ROUTES ════════

// All appointments (admin)
app.get('/api/appointments', async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM appointments ORDER BY created_at DESC');
    res.json({ appointments: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// Appointments for a specific customer
app.get('/api/appointments/customer', async (req, res) => {
  try {
    const customerId = req.query.customerId ? Number(req.query.customerId) : null;
    const phone = req.query.phone || null;
    const email = req.query.email || null;

    const conditions = [];
    const params = [];
    if (customerId) { params.push(customerId); conditions.push(`customer_id = $${params.length}`); }
    if (phone) { params.push(phone); conditions.push(`phone = $${params.length}`); }
    if (email) { params.push(email); conditions.push(`email = $${params.length}`); }

    if (conditions.length === 0) return res.json({ appointments: [] });

    const result = await pool.query(
      `SELECT * FROM appointments WHERE ${conditions.join(' OR ')} ORDER BY date DESC`,
      params
    );
    res.json({ appointments: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// Create appointment
app.post('/api/appointments', async (req, res) => {
  try {
    const { customerId, name, phone, email, service, date, time, notes } = req.body || {};
    if (!name || !phone || !service || !date || !time) {
      return res.status(400).json({ error: 'Missing required appointment fields.' });
    }
    const result = await pool.query(
      `INSERT INTO appointments (customer_id, name, phone, email, service, date, time, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
       RETURNING *`,
      [customerId || null, name, phone, email || null, service, date, time, notes || null]
    );
    res.json({ appointment: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// Update appointment status (confirm / done)
app.patch('/api/appointments/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body || {};
    if (!status) return res.status(400).json({ error: 'Status is required.' });
    const result = await pool.query(
      'UPDATE appointments SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );
    res.json({ appointment: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// Delete appointment
app.delete('/api/appointments/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    await pool.query('DELETE FROM appointments WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// ── Serve the website (index.html) ──
app.use(express.static(path.join(__dirname)));
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ── Start server ──
initDb()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✓ Laishaz Studio running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to start:', err);
    process.exit(1);
  });
