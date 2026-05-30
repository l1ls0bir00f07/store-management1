import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import { reportsApi } from '../services/api';

const fmt = (n) => new Intl.NumberFormat('ru-RU').format(Math.round(n || 0));

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="card" style={{ padding: '10px 14px', fontSize: 12, minWidth: 180 }}>
      <div style={{ color: 'var(--text3)', marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <span>{p.name}</span><span className="mono">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

const PRESET = [
  { label: 'Сегодня', from: () => new Date().toISOString().slice(0,10), to: () => new Date().toISOString().slice(0,10) },
  { label: '7 дней', from: () => { const d = new Date(); d.setDate(d.getDate()-6); return d.toISOString().slice(0,10); }, to: () => new Date().toISOString().slice(0,10) },
  { label: '30 дней', from: () => { const d = new Date(); d.setDate(d.getDate()-29); return d.toISOString().slice(0,10); }, to: () => new Date().toISOString().slice(0,10) },
  { label: 'Этот месяц', from: () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`; }, to: () => new Date().toISOString().slice(0,10) },
  { label: 'Этот год', from: () => `${new Date().getFullYear()}-01-01`, to: () => new Date().toISOString().slice(0,10) },
];

const COLORS = ['var(--accent)', 'var(--green)', 'var(--yellow)', 'var(--red)', '#a78bfa', '#f472b6'];

export default function ReportsPage() {
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}-01`;

  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [groupBy, setGroupBy] = useState('day');
  const [report, setReport] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, t] = await Promise.all([
        reportsApi.getSalesReport({ from, to, group_by: groupBy }),
        reportsApi.getTopProducts({ from, to, limit: 8 })
      ]);
      setReport(r.data);
      setTopProducts(t.data);
    } finally { setLoading(false); }
  }, [from, to, groupBy]);

  useEffect(() => { load(); }, [load]);

  const applyPreset = (preset) => { setFrom(preset.from()); setTo(preset.to()); };

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Отчёты</div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {PRESET.map(p => (
              <button key={p.label} className="btn btn-ghost btn-sm" onClick={() => applyPreset(p)}>{p.label}</button>
            ))}
          </div>
          <div style={{ borderLeft: '1px solid var(--border)', height: 28, margin: '0 4px' }} />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input className="form-input" type="date" value={from} onChange={e => setFrom(e.target.value)} style={{ width: 160 }} />
            <span style={{ color: 'var(--text3)' }}>—</span>
            <input className="form-input" type="date" value={to} onChange={e => setTo(e.target.value)} style={{ width: 160 }} />
            <select className="form-select" value={groupBy} onChange={e => setGroupBy(e.target.value)} style={{ width: 140 }}>
              <option value="day">По дням</option>
              <option value="month">По месяцам</option>
              <option value="year">По годам</option>
            </select>
          </div>
        </div>
      </div>

      {loading && <div style={{ textAlign: 'center', color: 'var(--text3)', padding: 60 }}>Загрузка...</div>}

      {!loading && report && (
        <>
          {/* Summary cards */}
          <div className="grid-3" style={{ marginBottom: 24 }}>
            {[
              { label: 'Продаж за период', value: report.summary.total_sales, icon: '⚡', color: 'var(--accent)' },
              { label: 'Выручка', value: fmt(report.summary.total_revenue), icon: '◉', color: 'var(--green)' },
              { label: 'Чистая прибыль', value: fmt(report.summary.total_profit), icon: '◈', color: 'var(--yellow)' },
            ].map((c, i) => (
              <div key={i} className="card" style={{ borderTop: `3px solid ${c.color}` }}>
                <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, marginBottom: 8 }}>{c.label}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace' }}>{c.value}</div>
                  <span style={{ fontSize: 24, opacity: 0.5 }}>{c.icon}</span>
                </div>
              </div>
            ))}
          </div>

          {report.summary.total_revenue > 0 && (
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px 16px', marginBottom: 20, fontSize: 13, color: 'var(--text2)' }}>
              Средний чек: <span className="mono text-green">{fmt(report.summary.total_revenue / report.summary.total_sales)}</span>
              {' · '}Маржа: <span className="mono text-yellow">{report.summary.total_revenue > 0 ? (report.summary.total_profit / report.summary.total_revenue * 100).toFixed(1) : 0}%</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
            {/* Revenue chart */}
            <div className="card">
              <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 14 }}>Выручка по периодам</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={report.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="period" tick={{ fill: 'var(--text3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text3)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v)} width={70} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="revenue" name="Выручка" fill="var(--accent)" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Profit chart */}
            <div className="card">
              <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 14 }}>Прибыль по периодам</div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={report.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="period" tick={{ fill: 'var(--text3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text3)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v)} width={70} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line dataKey="profit" name="Прибыль" stroke="var(--green)" strokeWidth={2.5} dot={{ fill: 'var(--green)', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
            {/* Top products bar */}
            <div className="card">
              <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 14 }}>Топ товаров по количеству</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: 'var(--text3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" tick={{ fill: 'var(--text2)', fontSize: 11 }} axisLine={false} tickLine={false} width={110} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="total_qty" name="Кол-во" fill="var(--yellow)" radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie chart */}
            <div className="card">
              <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 14 }}>Доля выручки по товарам</div>
              {topProducts.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={topProducts} dataKey="total_revenue" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {topProducts.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => fmt(v)} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: 'var(--text2)' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <div className="empty-state" style={{ height: 220, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}><div className="empty-state-icon">📊</div><p>Нет данных</p></div>}
            </div>
          </div>

          {/* Detailed table */}
          <div className="card">
            <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 14 }}>Детализация по периодам</div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Период</th><th>Продаж</th><th className="text-right">Выручка</th><th className="text-right">Прибыль</th><th className="text-right">Маржа</th></tr></thead>
                <tbody>
                  {report.data.map((row, i) => (
                    <tr key={i}>
                      <td className="mono" style={{ color: 'var(--text)' }}>{row.period}</td>
                      <td><span className="badge badge-blue">{row.sales_count}</span></td>
                      <td className="text-right mono text-green">{fmt(row.revenue)}</td>
                      <td className="text-right mono" style={{ color: 'var(--yellow)' }}>{fmt(row.profit)}</td>
                      <td className="text-right">
                        <span className={`badge ${row.revenue > 0 && row.profit/row.revenue > 0.25 ? 'badge-green' : 'badge-yellow'}`}>
                          {row.revenue > 0 ? (row.profit/row.revenue*100).toFixed(1) : 0}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {report.data.length === 0 && <div className="empty-state"><div className="empty-state-icon">📊</div><p>Нет данных за выбранный период</p></div>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
