const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getDb } = require('../database/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// Multer setup
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `product_${Date.now()}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// GET /api/products
router.get('/', (req, res) => {
  const { category_id, search, low_stock } = req.query;
  const db = getDb();
  let query = `
    SELECT p.*, c.name as category_name
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE 1=1
  `;
  const params = [];
  if (category_id) { query += ' AND p.category_id = ?'; params.push(category_id); }
  if (search) { query += ' AND (p.name LIKE ? OR p.sku LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  if (low_stock === 'true') { query += ' AND p.quantity_in_stock <= 5'; }
  query += ' ORDER BY p.name';
  res.json(db.prepare(query).all(...params));
});

// GET /api/products/:id
router.get('/:id', (req, res) => {
  const db = getDb();
  const product = db.prepare(`
    SELECT p.*, c.name as category_name FROM products p
    LEFT JOIN categories c ON c.id = p.category_id WHERE p.id = ?
  `).get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Товар не найден' });
  res.json(product);
});

// POST /api/products
router.post('/', upload.single('photo'), (req, res) => {
  const { name, category_id, purchase_price, selling_price, quantity_in_stock, sku, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Название обязательно' });
  const db = getDb();
  const photo_url = req.file ? `/uploads/${req.file.filename}` : null;
  const result = db.prepare(`
    INSERT INTO products (name, category_id, purchase_price, selling_price, quantity_in_stock, photo_url, sku, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, category_id || null, purchase_price || 0, selling_price || 0, quantity_in_stock || 0, photo_url, sku || null, description || '');
  db.prepare('INSERT INTO product_logs (product_id, action, details) VALUES (?, ?, ?)').run(result.lastInsertRowid, 'CREATE', `Создан товар: ${name}`);
  res.status(201).json({ id: result.lastInsertRowid, message: 'Товар добавлен' });
});

// PUT /api/products/:id
router.put('/:id', upload.single('photo'), (req, res) => {
  const { name, category_id, purchase_price, selling_price, quantity_in_stock, sku, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Название обязательно' });
  const db = getDb();
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Товар не найден' });
  const photo_url = req.file ? `/uploads/${req.file.filename}` : existing.photo_url;
  db.prepare(`
    UPDATE products SET name=?, category_id=?, purchase_price=?, selling_price=?, quantity_in_stock=?,
    photo_url=?, sku=?, description=?, updated_at=CURRENT_TIMESTAMP WHERE id=?
  `).run(name, category_id || null, purchase_price || 0, selling_price || 0, quantity_in_stock || 0, photo_url, sku || null, description || '', req.params.id);
  db.prepare('INSERT INTO product_logs (product_id, action, details) VALUES (?, ?, ?)').run(req.params.id, 'UPDATE', `Обновлён товар: ${name}`);
  res.json({ message: 'Товар обновлён' });
});

// DELETE /api/products/:id
router.delete('/:id', (req, res) => {
  const db = getDb();
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Товар не найден' });
  db.prepare('INSERT INTO product_logs (product_id, action, details) VALUES (?, ?, ?)').run(req.params.id, 'DELETE', `Удалён товар: ${product.name}`);
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.json({ message: 'Товар удалён' });
});

module.exports = router;
