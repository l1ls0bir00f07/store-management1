const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'store_secret_key_2024';

module.exports = function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'Нет токена' });

  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(403).json({ error: 'Недействительный токен' });
  }
};
