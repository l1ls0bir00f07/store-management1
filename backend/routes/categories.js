const express = require('express');
const router = express.Router();
const { wrapper: db } = require('../models/db');
const auth = require('../middleware/auth');

router.get('/', auth, (req, res) => {
  const rows = db.prepare(`
    SELECT c.id, c.name, c.description, c.created_at,
           COUNT(p.id) as product_count
    FROM categories c
    LEFT JOIN products p ON p.category_id = c.id
    GROUP BY c.id
    ORDER BY c.name
  `).all();
  res.json(rows);
});

router.post('/', auth, (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Название обязательно' });
  const info = db.prepare('INSERT INTO categories (name, description) VALUES (?, ?)').run(name, description || null);
  const created = db.prepare('SELECT * FROM categories WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(created);
});

router.put('/:id', auth, (req, res) => {
  const { name, description } = req.body;
  db.prepare('UPDATE categories SET name = ?, description = ? WHERE id = ?').run(name, description || null, req.params.id);
  res.json(db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id));
});

router.delete('/:id', auth, (req, res) => {
  db.prepare('UPDATE products SET category_id = NULL WHERE category_id = ?').run(req.params.id);
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
