const express = require('express');
const router = express.Router();
const { wrapper: db } = require('../models/db');
const auth = require('../middleware/auth');

router.get('/dashboard', auth, (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`;

  const totalProducts = db.prepare('SELECT COUNT(*) as c FROM products').get().c;
  const totalStock    = db.prepare('SELECT COALESCE(SUM(quantity_in_stock),0) as s FROM products').get().s;
  const lowStockCount = db.prepare('SELECT COUNT(*) as c FROM products WHERE quantity_in_stock <= 5 AND quantity_in_stock > 0').get().c;

  const todayStats = db.prepare(`SELECT COALESCE(COUNT(*),0) as count, COALESCE(SUM(total_amount),0) as revenue, COALESCE(SUM(total_profit),0) as profit FROM sales WHERE date(sale_date) = date(?)`).get(today);
  const monthStats = db.prepare(`SELECT COALESCE(SUM(total_amount),0) as revenue, COALESCE(SUM(total_profit),0) as profit FROM sales WHERE date(sale_date) >= date(?)`).get(monthStart);

  const last7Days = db.prepare(`
    SELECT date(sale_date) as date, SUM(total_amount) as revenue, SUM(total_profit) as profit, COUNT(*) as count
    FROM sales WHERE date(sale_date) >= date('now', '-6 days')
    GROUP BY date(sale_date) ORDER BY date
  `).all();

  const topProductsToday = db.prepare(`
    SELECT si.product_name as name, SUM(si.quantity_sold) as qty, SUM(si.unit_price * si.quantity_sold) as revenue
    FROM sale_items si JOIN sales s ON s.id = si.sale_id
    WHERE date(s.sale_date) = date(?)
    GROUP BY si.product_name ORDER BY qty DESC LIMIT 5
  `).all(today);

  res.json({ totalProducts, totalStock, lowStockCount, today: todayStats, month: monthStats, last7Days, topProductsToday });
});

router.get('/sales', auth, (req, res) => {
  const { from, to, group_by = 'day' } = req.query;
  let groupExpr = group_by === 'month' ? `strftime('%Y-%m', sale_date)` : group_by === 'year' ? `strftime('%Y', sale_date)` : `date(sale_date)`;

  let sql = `SELECT ${groupExpr} as period, COUNT(*) as sales_count, COALESCE(SUM(total_amount),0) as revenue, COALESCE(SUM(total_profit),0) as profit FROM sales WHERE 1=1`;
  const params = [];
  if (from) { sql += ` AND date(sale_date) >= date(?)`; params.push(from); }
  if (to)   { sql += ` AND date(sale_date) <= date(?)`; params.push(to); }
  sql += ` GROUP BY period ORDER BY period`;

  const data = db.prepare(sql).all(...params);
  const summary = data.reduce((acc, r) => ({
    total_sales: acc.total_sales + r.sales_count,
    total_revenue: acc.total_revenue + r.revenue,
    total_profit: acc.total_profit + r.profit
  }), { total_sales: 0, total_revenue: 0, total_profit: 0 });

  res.json({ summary, data });
});

router.get('/top-products', auth, (req, res) => {
  const { from, to, limit = 10 } = req.query;
  let sql = `SELECT si.product_name as name, SUM(si.quantity_sold) as total_qty, SUM(si.unit_price * si.quantity_sold) as total_revenue, SUM((si.unit_price - si.unit_cost) * si.quantity_sold) as total_profit FROM sale_items si JOIN sales s ON s.id = si.sale_id WHERE 1=1`;
  const params = [];
  if (from) { sql += ` AND date(s.sale_date) >= date(?)`; params.push(from); }
  if (to)   { sql += ` AND date(s.sale_date) <= date(?)`; params.push(to); }
  sql += ` GROUP BY si.product_name ORDER BY total_qty DESC LIMIT ?`;
  params.push(parseInt(limit));
  res.json(db.prepare(sql).all(...params));
});

module.exports = router;
