const express = require('express');
const { getDb } = require('../database/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// GET /api/reports/dashboard - main dashboard stats
router.get('/dashboard', (req, res) => {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);

  const totalProducts = db.prepare('SELECT COUNT(*) as count, SUM(quantity_in_stock) as total_stock FROM products').get();
  const lowStock = db.prepare('SELECT COUNT(*) as count FROM products WHERE quantity_in_stock <= 5').get();
  const todaySales = db.prepare("SELECT COUNT(*) as count, COALESCE(SUM(total_amount),0) as revenue, COALESCE(SUM(total_profit),0) as profit FROM sales WHERE DATE(sale_date) = ?").get(today);
  const monthSales = db.prepare("SELECT COALESCE(SUM(total_amount),0) as revenue, COALESCE(SUM(total_profit),0) as profit FROM sales WHERE strftime('%Y-%m', sale_date) = strftime('%Y-%m', 'now')").get();

  // Last 7 days chart data
  const last7 = db.prepare(`
    SELECT DATE(sale_date) as date, COALESCE(SUM(total_amount),0) as revenue, COALESCE(SUM(total_profit),0) as profit, COUNT(*) as count
    FROM sales WHERE DATE(sale_date) >= DATE('now', '-6 days')
    GROUP BY DATE(sale_date) ORDER BY date
  `).all();

  // Top 5 products today
  const topToday = db.prepare(`
    SELECT p.name, SUM(si.quantity_sold) as qty, SUM(si.total_amount) as revenue
    FROM sale_items si JOIN products p ON p.id = si.product_id
    JOIN sales s ON s.id = si.sale_id WHERE DATE(s.sale_date) = ?
    GROUP BY si.product_id ORDER BY qty DESC LIMIT 5
  `).all(today);

  res.json({
    totalProducts: totalProducts.count,
    totalStock: totalProducts.total_stock || 0,
    lowStockCount: lowStock.count,
    today: todaySales,
    month: monthSales,
    last7Days: last7,
    topProductsToday: topToday
  });
});

// GET /api/reports/sales - detailed sales report
router.get('/sales', (req, res) => {
  const { from, to, group_by = 'day' } = req.query;
  const db = getDb();

  let dateFormat;
  if (group_by === 'month') dateFormat = "%Y-%m";
  else if (group_by === 'year') dateFormat = "%Y";
  else dateFormat = "%Y-%m-%d";

  let query = `
    SELECT strftime('${dateFormat}', sale_date) as period,
    COUNT(*) as sales_count,
    SUM(total_amount) as revenue,
    SUM(total_profit) as profit
    FROM sales WHERE 1=1
  `;
  const params = [];
  if (from) { query += ' AND DATE(sale_date) >= ?'; params.push(from); }
  if (to) { query += ' AND DATE(sale_date) <= ?'; params.push(to); }
  query += ' GROUP BY period ORDER BY period';

  const data = db.prepare(query).all(...params);

  // Summary
  let sumQuery = 'SELECT COUNT(*) as total_sales, COALESCE(SUM(total_amount),0) as total_revenue, COALESCE(SUM(total_profit),0) as total_profit FROM sales WHERE 1=1';
  const sumParams = [];
  if (from) { sumQuery += ' AND DATE(sale_date) >= ?'; sumParams.push(from); }
  if (to) { sumQuery += ' AND DATE(sale_date) <= ?'; sumParams.push(to); }
  const summary = db.prepare(sumQuery).get(...sumParams);

  res.json({ data, summary });
});

// GET /api/reports/top-products
router.get('/top-products', (req, res) => {
  const { from, to, limit = 10 } = req.query;
  const db = getDb();
  let query = `
    SELECT p.id, p.name, p.sku, c.name as category,
    SUM(si.quantity_sold) as total_qty,
    SUM(si.total_amount) as total_revenue,
    SUM((si.price_per_unit - si.purchase_price_per_unit) * si.quantity_sold) as total_profit
    FROM sale_items si
    JOIN products p ON p.id = si.product_id
    LEFT JOIN categories c ON c.id = p.category_id
    JOIN sales s ON s.id = si.sale_id WHERE 1=1
  `;
  const params = [];
  if (from) { query += ' AND DATE(s.sale_date) >= ?'; params.push(from); }
  if (to) { query += ' AND DATE(s.sale_date) <= ?'; params.push(to); }
  query += ` GROUP BY si.product_id ORDER BY total_qty DESC LIMIT ?`;
  params.push(Number(limit));
  res.json(db.prepare(query).all(...params));
});

module.exports = router;
