import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { to: '/dashboard', icon: '◉', label: 'Дашборд' },
  { to: '/inventory', icon: '⬡', label: 'Товары' },
  { to: '/sales', icon: '⚡', label: 'Продажа' },
  { to: '/reports', icon: '◈', label: 'Отчёты' },
];

export default function Layout() {
  const { username, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside style={{
        width: 220, background: 'var(--bg2)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', flexShrink: 0
      }}>
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.5px' }}>
            🏪 StoreMS
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>Система управления</div>
        </div>

        <nav style={{ flex: 1, padding: '12px 10px' }}>
          {navItems.map(({ to, icon, label }) => (
            <NavLink key={to} to={to} style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', borderRadius: 'var(--radius-sm)',
              margin: '2px 0', textDecoration: 'none',
              color: isActive ? 'var(--accent2)' : 'var(--text2)',
              background: isActive ? 'var(--accent-dim)' : 'transparent',
              fontWeight: isActive ? 700 : 500, fontSize: 13,
              transition: 'all 0.15s'
            })}>
              <span style={{ fontSize: 16 }}>{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        <div style={{ padding: '16px', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8 }}>
            👤 {username}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={handleLogout} style={{ width: '100%', justifyContent: 'center' }}>
            Выйти
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'auto', padding: '28px 32px', background: 'var(--bg)' }}>
        <Outlet />
      </main>
    </div>
  );
}
