const express = require('express');
const router = express.Router();
const { wrapper: db } = require('../models/db');
const auth = require('../middleware/auth');

router.get('/', auth, (req, res) => {
  const { from, to } = req.query;
  let sql = `SELECT id, total_amount, total_profit, sale_date FROM sales WHERE 1=1`;
  const params = [];
  if (from) { sql += ` AND date(sale_date) >= date(?)`; params.push(from); }
  if (to)   { sql += ` AND date(sale_date) <= date(?)`; params.push(to); }
  sql += ` ORDER BY sale_date DESC`;

  const sales = db.prepare(sql).all(...params);
  const result = sales.map(s => ({
    ...s,
    items: db.prepare(`
      SELECT si.id, si.quantity_sold, si.unit_price, si.unit_cost,
             COALESCE(p.name, si.product_name) as product_name
      FROM sale_items si LEFT JOIN products p ON p.id = si.product_id
      WHERE si.sale_id = ?
    `).all(s.id)
  }));
  res.json(result);
});

router.get('/:id', auth, (req, res) => {
  const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(req.params.id);
  if (!sale) return res.status(404).json({ error: 'Продажа не найдена' });
  sale.items = db.prepare(`SELECT si.*, COALESCE(p.name, si.product_name) as product_name FROM sale_items si LEFT JOIN products p ON p.id = si.product_id WHERE si.sale_id = ?`).all(sale.id);
  res.json(sale);
});

router.post('/', auth, (req, res) => {
  const { items } = req.body;
  if (!items || !items.length) return res.status(400).json({ error: 'Корзина пуста' });

  const createSale = db.transaction(() => {
    let total = 0, profit = 0;
    const resolved = [];

    for (const item of items) {
      const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.product_id);
      if (!product) throw { status: 400, error: `Товар #${item.product_id} не найден` };
      if (product.quantity_in_stock < item.quantity)
        throw { status: 400, error: `Недостаточно "${product.name}" на складе (есть: ${product.quantity_in_stock})` };
      total  += product.selling_price * item.quantity;
      profit += (product.selling_price - product.purchase_price) * item.quantity;
      resolved.push({ product, quantity: item.quantity });
    }

    const info = db.prepare('INSERT INTO sales (total_amount, total_profit) VALUES (?, ?)').run(total, profit);
    const saleId = info.lastInsertRowid;

    for (const { product, quantity } of resolved) {
      db.prepare(`INSERT INTO sale_items (sale_id, product_id, product_name, quantity_sold, unit_price, unit_cost) VALUES (?, ?, ?, ?, ?, ?)`)
        .run(saleId, product.id, product.name, quantity, product.selling_price, product.purchase_price);
      db.prepare(`UPDATE products SET quantity_in_stock = quantity_in_stock - ?, updated_at = datetime('now') WHERE id = ?`)
        .run(quantity, product.id);
    }

    return db.prepare('SELECT * FROM sales WHERE id = ?').get(saleId);
  });

  try {
    res.status(201).json(createSale());
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.error });
    throw e;
  }
});

router.delete('/:id', auth, (req, res) => {
  const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(req.params.id);
  if (!sale) return res.status(404).json({ error: 'Продажа не найдена' });

  db.transaction(() => {
    const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(req.params.id);
    for (const item of items) {
      if (item.product_id)
        db.prepare(`UPDATE products SET quantity_in_stock = quantity_in_stock + ?, updated_at = datetime('now') WHERE id = ?`)
          .run(item.quantity_sold, item.product_id);
    }
    db.prepare('DELETE FROM sales WHERE id = ?').run(req.params.id);
  })();

  res.json({ success: true });
});

module.exports = router;
