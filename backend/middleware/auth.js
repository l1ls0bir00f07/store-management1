const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'store_secret_key_2024';

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'Нет токена' });

  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(403).json({ error: 'Недействительный токен' });
  }
}

// Must be used AFTER authMiddleware on a route (relies on req.user already being set).
// Blocks cashier accounts from admin-only data (inventory management, reports, QR export).
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Доступ только для администратора' });
  }
  next();
}

module.exports = authMiddleware;
module.exports.requireAdmin = requireAdmin;
