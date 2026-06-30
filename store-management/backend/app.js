const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/products', require('./routes/products'));
app.use('/api/sales', require('./routes/sales'));
app.use('/api/reports', require('./routes/reports'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

app.listen(PORT, () => {
  console.log(`\n🚀 Store API запущен на http://localhost:${PORT}`);
  console.log(`📦 Инвентарь: http://localhost:${PORT}/api/products`);
  console.log(`📊 Дашборд:   http://localhost:${PORT}/api/reports/dashboard\n`);
});
