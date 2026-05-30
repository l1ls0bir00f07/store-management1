import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await authApi.login(form);
      login(res.data.token, res.data.username);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка входа');
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div className="card" style={{ width: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🏪</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Store Manager</h1>
          <p style={{ color: 'var(--text3)', fontSize: 13 }}>Система управления магазином</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Логин</label>
            <input
              className="form-input"
              placeholder="admin"
              value={form.username}
              onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Пароль</label>
            <input
              className="form-input"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              required
            />
          </div>

          {error && (
            <div style={{ background: 'var(--red-dim)', border: '1px solid var(--red)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', color: 'var(--red)', fontSize: 13 }}>
              {error}
            </div>
          )}

          <button className="btn btn-primary" type="submit" disabled={loading} style={{ justifyContent: 'center', padding: '12px' }}>
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>

        <p style={{ color: 'var(--text3)', fontSize: 11, textAlign: 'center', marginTop: 20 }}>
          По умолчанию: admin / admin123
        </p>
      </div>
    </div>
  );
}
