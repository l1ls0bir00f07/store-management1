const express = require('express');
const { getDb } = require('../database/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// GET /api/categories
router.get('/', (req, res) => {
  const db = getDb();
  const categories = db.prepare(`
    SELECT c.*, COUNT(p.id) as product_count
    FROM categories c
    LEFT JOIN products p ON p.category_id = c.id
    GROUP BY c.id
    ORDER BY c.name
  `).all();
  res.json(categories);
});

// POST /api/categories
router.post('/', (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Название обязательно' });
  const db = getDb();
  const result = db.prepare('INSERT INTO categories (name, description) VALUES (?, ?)').run(name, description || '');
  res.status(201).json({ id: result.lastInsertRowid, name, description });
});

// PUT /api/categories/:id
router.put('/:id', (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Название обязательно' });
  const db = getDb();
  db.prepare('UPDATE categories SET name = ?, description = ? WHERE id = ?').run(name, description || '', req.params.id);
  res.json({ message: 'Категория обновлена' });
});

// DELETE /api/categories/:id
router.delete('/:id', (req, res) => {
  const db = getDb();
  const count = db.prepare('SELECT COUNT(*) as c FROM products WHERE category_id = ?').get(req.params.id);
  if (count.c > 0) return res.status(400).json({ error: 'Нельзя удалить: есть товары в этой категории' });
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.json({ message: 'Категория удалена' });
});

module.exports = router;
