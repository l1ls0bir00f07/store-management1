const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'store_secret_key_2024';

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Требуется авторизация' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(403).json({ error: 'Недействительный токен' });
  }
}

module.exports = { authMiddleware, JWT_SECRET };
