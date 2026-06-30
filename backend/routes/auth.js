const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { wrapper: db } = require('../models/db');
const auth = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'store_secret_key_2024';

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Укажите логин и пароль' });

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) return res.status(401).json({ error: 'Неверный логин или пароль' });

  if (!bcrypt.compareSync(password, user.password_hash))
    return res.status(401).json({ error: 'Неверный логин или пароль' });

  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, username: user.username, role: user.role });
});

router.post('/change-password', auth, (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(oldPassword, user.password_hash))
    return res.status(400).json({ error: 'Неверный текущий пароль' });
  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.user.id);
  res.json({ success: true });
});

// PUT /api/auth/profile — update own username and/or password.
// Self-scoped by req.user.id (whoever is authenticated edits only their own account),
// so this works the same regardless of role — no admin check needed here.
router.put('/profile', auth, (req, res) => {
  const { currentPassword, newUsername, newPassword } = req.body;
  if (!currentPassword) return res.status(400).json({ error: 'Введите текущий пароль' });

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
  if (!bcrypt.compareSync(currentPassword, user.password_hash))
    return res.status(400).json({ error: 'Неверный текущий пароль' });

  const trimmedUsername = (newUsername || '').trim();
  if (trimmedUsername && trimmedUsername !== user.username) {
    const taken = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(trimmedUsername, user.id);
    if (taken) return res.status(400).json({ error: 'Этот логин уже занят' });
    db.prepare('UPDATE users SET username = ? WHERE id = ?').run(trimmedUsername, user.id);
  }

  if (newPassword) {
    if (newPassword.length < 4) return res.status(400).json({ error: 'Новый пароль слишком короткий' });
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(newPassword, 10), user.id);
  }

  const updated = db.prepare('SELECT username, role FROM users WHERE id = ?').get(user.id);
  res.json({ username: updated.username, role: updated.role });
});

module.exports = router;
