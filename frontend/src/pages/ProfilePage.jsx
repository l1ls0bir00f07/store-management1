import React, { useState } from 'react';
import { authApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/useToast';
import ToastContainer from '../components/common/Toast';

export default function ProfilePage() {
  const { username, updateProfile } = useAuth();
  const { toasts, success, error } = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newUsername, setNewUsername] = useState(username || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const usernameChanged = newUsername.trim() && newUsername.trim() !== username;
  const wantsPasswordChange = newPassword.length > 0 || confirmPassword.length > 0;
  const passwordsMatch = newPassword === confirmPassword;
  const canSubmit = currentPassword.length > 0 && (usernameChanged || (wantsPasswordChange && passwordsMatch && newPassword.length >= 4));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (wantsPasswordChange && !passwordsMatch) {
      error('Новые пароли не совпадают');
      return;
    }
    if (wantsPasswordChange && newPassword.length < 4) {
      error('Новый пароль слишком короткий (минимум 4 символа)');
      return;
    }

    setLoading(true);
    try {
      const payload = { currentPassword };
      if (usernameChanged) payload.newUsername = newUsername.trim();
      if (wantsPasswordChange) payload.newPassword = newPassword;

      const res = await authApi.updateProfile(payload);
      if (res.data.username && res.data.username !== username) {
        updateProfile(res.data.username);
      }
      success('Профиль обновлён');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e) {
      error(e.response?.data?.error || 'Не удалось обновить профиль');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <ToastContainer toasts={toasts} />
      <div className="page-header">
        <div className="page-title">Профиль</div>
      </div>

      <div className="card" style={{ maxWidth: 460 }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Данные администратора</div>
        <p style={{ color: 'var(--text3)', fontSize: 12, marginBottom: 20 }}>
          Измените логин и/или пароль. Текущий пароль нужен для подтверждения.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Логин</label>
            <input
              className="form-input"
              value={newUsername}
              onChange={e => setNewUsername(e.target.value)}
            />
          </div>

          <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />

          <div className="form-group">
            <label className="form-label">Новый пароль</label>
            <input
              className="form-input"
              type="password"
              placeholder="Оставьте пустым, если не меняете"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
            />
          </div>

          {wantsPasswordChange && (
            <div className="form-group">
              <label className="form-label">Подтвердите новый пароль</label>
              <input
                className="form-input"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
              />
              {!passwordsMatch && confirmPassword.length > 0 && (
                <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 4 }}>Пароли не совпадают</div>
              )}
            </div>
          )}

          <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />

          <div className="form-group">
            <label className="form-label">Текущий пароль (для подтверждения) *</label>
            <input
              className="form-input"
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              required
            />
          </div>

          <button className="btn btn-primary" type="submit" disabled={loading || !canSubmit} style={{ justifyContent: 'center', padding: '12px' }}>
            {loading ? 'Сохранение...' : 'Сохранить изменения'}
          </button>
        </form>
      </div>
    </div>
  );
}
