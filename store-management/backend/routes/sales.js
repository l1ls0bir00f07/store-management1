const express = require('express');
const { getDb } = require('../database/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// GET /api/sales - list with filters
router.get('/', (req, res) => {
  const { from, to, limit = 50, offset = 0 } = req.query;
  const db = getDb();
  let query = 'SELECT * FROM sales WHERE 1=1';
  const params = [];
  if (from) { query += ' AND DATE(sale_date) >= ?'; params.push(from); }
  if (to) { query += ' AND DATE(sale_date) <= ?'; params.push(to); }
  query += ' ORDER BY sale_date DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));
  const sales = db.prepare(query).all(...params);

  // Attach items to each sale
  const itemStmt = db.prepare(`
    SELECT si.*, p.name as product_name, p.sku FROM sale_items si
    JOIN products p ON p.id = si.product_id WHERE si.sale_id = ?
  `);
  const result = sales.map(s => ({ ...s, items: itemStmt.all(s.id) }));
  res.json(result);
});

// GET /api/sales/:id
router.get('/:id', (req, res) => {
  const db = getDb();
  const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(req.params.id);
  if (!sale) return res.status(404).json({ error: 'Продажа не найдена' });
  const items = db.prepare(`
    SELECT si.*, p.name as product_name, p.sku FROM sale_items si
    JOIN products p ON p.id = si.product_id WHERE si.sale_id = ?
  `).all(sale.id);
  res.json({ ...sale, items });
});

// POST /api/sales - create new sale
router.post('/', (req, res) => {
  const { items, notes } = req.body;
  if (!items || items.length === 0) return res.status(400).json({ error: 'Нет товаров в продаже' });

  const db = getDb();

  // Validate stock
  for (const item of items) {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.product_id);
    if (!product) return res.status(404).json({ error: `Товар ID ${item.product_id} не найден` });
    if (product.quantity_in_stock < item.quantity) {
      return res.status(400).json({ error: `Недостаточно товара: ${product.name} (в наличии: ${product.quantity_in_stock})` });
    }
  }

  const createSale = db.transaction(() => {
    let total_amount = 0;
    let total_profit = 0;
    const saleResult = db.prepare('INSERT INTO sales (total_amount, total_profit, notes) VALUES (0, 0, ?)').run(notes || '');
    const saleId = saleResult.lastInsertRowid;

    for (const item of items) {
      const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.product_id);
      const itemTotal = product.selling_price * item.quantity;
      const itemProfit = (product.selling_price - product.purchase_price) * item.quantity;
      total_amount += itemTotal;
      total_profit += itemProfit;

      db.prepare(`
        INSERT INTO sale_items (sale_id, product_id, quantity_sold, price_per_unit, purchase_price_per_unit, total_amount)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(saleId, item.product_id, item.quantity, product.selling_price, product.purchase_price, itemTotal);

      db.prepare('UPDATE products SET quantity_in_stock = quantity_in_stock - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(item.quantity, item.product_id);
    }

    db.prepare('UPDATE sales SET total_amount = ?, total_profit = ? WHERE id = ?').run(total_amount, total_profit, saleId);
    return { saleId, total_amount, total_profit };
  });

  const result = createSale();
  res.status(201).json({ id: result.saleId, total_amount: result.total_amount, total_profit: result.total_profit });
});

// DELETE /api/sales/:id - cancel sale (restore stock)
router.delete('/:id', (req, res) => {
  const db = getDb();
  const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(req.params.id);
  if (!sale) return res.status(404).json({ error: 'Продажа не найдена' });

  const cancel = db.transaction(() => {
    const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(sale.id);
    for (const item of items) {
      db.prepare('UPDATE products SET quantity_in_stock = quantity_in_stock + ? WHERE id = ?').run(item.quantity_sold, item.product_id);
    }
    db.prepare('DELETE FROM sales WHERE id = ?').run(sale.id);
  });
  cancel();
  res.json({ message: 'Продажа отменена, товары возвращены на склад' });
});

module.exports = router;
