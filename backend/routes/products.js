const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { wrapper: db } = require('../models/db');
const auth = require('../middleware/auth');
const { requireAdmin } = auth;

// Cashier accounts must never see cost price — strip it out before sending the response.
function hideCostFromCashier(product, role) {
  if (!product || role === 'admin') return product;
  const { purchase_price, ...safe } = product;
  return safe;
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname)}`)
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/', auth, (req, res) => {
  const { search, category_id, low_stock } = req.query;
  let sql = `SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE 1=1`;
  const params = [];
  if (search) { sql += ` AND (p.name LIKE ? OR p.sku LIKE ?)`; params.push(`%${search}%`, `%${search}%`); }
  if (category_id) { sql += ` AND p.category_id = ?`; params.push(category_id); }
  if (low_stock === 'true') { sql += ` AND p.quantity_in_stock <= 5`; }
  sql += ` ORDER BY p.name`;
  const rows = db.prepare(sql).all(...params);
  res.json(rows.map(p => hideCostFromCashier(p, req.user.role)));
});

router.get('/:id', auth, (req, res) => {
  const p = db.prepare(`SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE p.id = ?`).get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Товар не найден' });
  res.json(hideCostFromCashier(p, req.user.role));
});

router.post('/', auth, requireAdmin, upload.single('photo'), (req, res) => {
  const { name, sku, category_id, purchase_price, selling_price, quantity_in_stock, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Название обязательно' });
  const photo_url = req.file ? `/uploads/${req.file.filename}` : null;
  try {
    const info = db.prepare(`INSERT INTO products (name, sku, category_id, purchase_price, selling_price, quantity_in_stock, photo_url, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(name, sku || null, category_id || null, parseFloat(purchase_price) || 0, parseFloat(selling_price) || 0, parseInt(quantity_in_stock) || 0, photo_url, description || null);
    res.status(201).json(db.prepare('SELECT * FROM products WHERE id = ?').get(info.lastInsertRowid));
  } catch (e) {
    if (String(e).includes('UNIQUE')) return res.status(400).json({ error: 'Такой SKU уже существует' });
    throw e;
  }
});

router.put('/:id', auth, requireAdmin, upload.single('photo'), (req, res) => {
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Товар не найден' });
  const { name, sku, category_id, purchase_price, selling_price, quantity_in_stock, description } = req.body;
  let photo_url = existing.photo_url;
  if (req.file) {
    if (existing.photo_url) { const f = path.join(__dirname, '..', existing.photo_url); if (fs.existsSync(f)) fs.unlinkSync(f); }
    photo_url = `/uploads/${req.file.filename}`;
  }
  try {
    db.prepare(`UPDATE products SET name=?, sku=?, category_id=?, purchase_price=?, selling_price=?, quantity_in_stock=?, photo_url=?, description=?, updated_at=datetime('now') WHERE id=?`)
      .run(name, sku || null, category_id || null, parseFloat(purchase_price) || 0, parseFloat(selling_price) || 0, parseInt(quantity_in_stock) || 0, photo_url, description || null, req.params.id);
    res.json(db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id));
  } catch (e) {
    if (String(e).includes('UNIQUE')) return res.status(400).json({ error: 'Такой SKU уже существует' });
    throw e;
  }
});

router.delete('/:id', auth, requireAdmin, (req, res) => {
  const p = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Товар не найден' });
  if (p.photo_url) { const f = path.join(__dirname, '..', p.photo_url); if (fs.existsSync(f)) fs.unlinkSync(f); }
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
