const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
  fs.mkdirSync(path.join(__dirname, 'uploads'), { recursive: true });
}

const { initDb, wrapper } = require('./models/db');

initDb().then(async () => {
  app.use('/api/auth',       require('./routes/auth'));
  app.use('/api/categories', require('./routes/categories'));
  app.use('/api/products',   require('./routes/products'));
  app.use('/api/sales',      require('./routes/sales'));
  app.use('/api/reports',    require('./routes/reports'));

  // Serve React frontend (built static files)
  // In Railway: frontend is built before start, lives at ../frontend/build
  const frontendBuild = path.join(__dirname, '../frontend/build');
  if (fs.existsSync(frontendBuild)) {
    app.use(express.static(frontendBuild));
    app.get('*', (req, res) => {
      res.sendFile(path.join(frontendBuild, 'index.html'));
    });
    console.log('✅ Serving frontend from build folder');
  } else {
    console.log('ℹ️  No frontend build found — running API only');
  }

  app.listen(PORT, () => console.log(`🚀 Server on http://localhost:${PORT}`));
}).catch(err => {
  console.error('DB init failed:', err);
  process.exit(1);
});
