import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { reportsApi } from '../services/api';

function KpiCard({ label, value, sub, color = 'var(--accent)', icon }) {
  return (
    <div className="card" style={{ borderTop: `3px solid ${color}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>{label}</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace' }}>{value}</div>
          {sub && <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>{sub}</div>}
        </div>
        <div style={{ fontSize: 28, opacity: 0.6 }}>{icon}</div>
      </div>
    </div>
  );
}

const fmt = (n) => new Intl.NumberFormat('ru-RU').format(Math.round(n || 0));
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="card" style={{ padding: '10px 14px', fontSize: 12, minWidth: 160 }}>
      <div style={{ color: 'var(--text3)', marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <span>{p.name}</span><span className="mono">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportsApi.getDashboard().then(r => setData(r.data)).finally(() => setLoading(false));
    const interval = setInterval(() => {
      reportsApi.getDashboard().then(r => setData(r.data));
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div style={{ color: 'var(--text3)', paddingTop: 60, textAlign: 'center' }}>Загрузка...</div>;
  if (!data) return null;

  // Fill missing days in last 7 days
  const today = new Date();
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today); d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    const found = data.last7Days.find(x => x.date === key);
    return { date: key.slice(5), revenue: found?.revenue || 0, profit: found?.profit || 0, count: found?.count || 0 };
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Дашборд</div>
          <div style={{ color: 'var(--text3)', fontSize: 13, marginTop: 2 }}>
            {new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => reportsApi.getDashboard().then(r => setData(r.data))}>
          ↻ Обновить
        </button>
      </div>

      {/* KPI Row */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <KpiCard label="Товаров в базе" value={data.totalProducts} sub={`${fmt(data.totalStock)} ед. на складе`} icon="⬡" color="var(--accent)" />
        <KpiCard label="Продаж сегодня" value={data.today.count} sub={`${fmt(data.today.revenue)} сум выручка`} icon="⚡" color="var(--green)" />
        <KpiCard label="Прибыль сегодня" value={`${fmt(data.today.profit)}`} sub="чистая прибыль" icon="◈" color="var(--yellow)" />
        <KpiCard label="За месяц" value={`${fmt(data.month.revenue)}`} sub={`прибыль: ${fmt(data.month.profit)}`} icon="◉" color="var(--red)" />
      </div>

      {data.lowStockCount > 0 && (
        <div style={{ background: 'var(--yellow-dim)', border: '1px solid var(--yellow)', borderRadius: 'var(--radius-sm)', padding: '10px 16px', marginBottom: 20, fontSize: 13, color: 'var(--yellow)' }}>
          ⚠ {data.lowStockCount} товаров заканчиваются на складе (≤5 шт.)
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* Revenue chart */}
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 14 }}>Выручка за 7 дней</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={last7}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: 'var(--text3)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text3)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v)} width={60} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="revenue" name="Выручка" fill="var(--accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Profit chart */}
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 14 }}>Прибыль за 7 дней</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={last7}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: 'var(--text3)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text3)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v)} width={60} />
              <Tooltip content={<CustomTooltip />} />
              <Line dataKey="profit" name="Прибыль" stroke="var(--green)" strokeWidth={2} dot={{ fill: 'var(--green)', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top products today */}
      {data.topProductsToday.length > 0 && (
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 14 }}>Топ товаров сегодня</div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Товар</th><th>Кол-во</th><th className="text-right">Выручка</th></tr>
              </thead>
              <tbody>
                {data.topProductsToday.map((p, i) => (
                  <tr key={i}>
                    <td>{p.name}</td>
                    <td><span className="badge badge-blue">{p.qty} шт.</span></td>
                    <td className="text-right mono text-green">{fmt(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data.topProductsToday.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📊</div>
            <p>Сегодня продаж ещё нет. Перейдите в раздел <strong>Продажа</strong>!</p>
          </div>
        </div>
      )}
    </div>
  );
}
