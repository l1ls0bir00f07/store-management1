import React, { useState, useEffect, useCallback } from 'react';
import { productsApi, salesApi } from '../services/api';
import { useToast } from '../hooks/useToast';
import ToastContainer from '../components/common/Toast';
import QRScannerModal from '../components/common/QRScannerModal';

const fmt = (n) => new Intl.NumberFormat('ru-RU').format(Math.round(n || 0));

// ── Discount Modal ────────────────────────────────────────────────────────────
function DiscountModal({ total, discount, onApply, onClose }) {
  const [value, setValue] = useState(discount > 0 ? String(discount) : '');
  const [mode, setMode] = useState('sum'); // 'sum' | 'percent'

  const numVal   = parseFloat(value) || 0;
  const absolute = mode === 'percent' ? Math.round((numVal / 100) * total) : numVal;
  const finalTotal = Math.max(0, total - absolute);
  const isValid  = absolute >= 0 && absolute <= total;

  const handleApply = () => {
    if (!isValid) return;
    onApply(absolute);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div className="card" style={{ width: 360, padding: 28 }}>
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 20 }}>🏷️ Скидка покупателю</div>

        {/* mode toggle */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'var(--bg2)', padding: 4, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
          {[['sum', 'Сумма (сум)'], ['percent', 'Процент (%)']].map(([key, label]) => (
            <button key={key} onClick={() => { setMode(key); setValue(''); }}
              className="btn btn-sm"
              style={{ flex: 1, justifyContent: 'center', background: mode === key ? 'var(--accent)' : 'transparent', color: mode === key ? '#fff' : 'var(--text2)' }}>
              {label}
            </button>
          ))}
        </div>

        <div className="form-group" style={{ marginBottom: 16 }}>
          <label className="form-label">{mode === 'percent' ? 'Скидка (%)' : 'Скидка (сум)'}</label>
          <input
            className="form-input"
            type="number"
            min="0"
            max={mode === 'percent' ? 100 : total}
            placeholder={mode === 'percent' ? 'Например: 10' : 'Например: 5000'}
            value={value}
            onChange={e => setValue(e.target.value)}
            autoFocus
            style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 18 }}
          />
          {!isValid && numVal > 0 && (
            <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 4 }}>
              Скидка не может превышать сумму заказа
            </div>
          )}
        </div>

        {/* Preview */}
        <div style={{ background: 'var(--bg2)', borderRadius: 'var(--radius-sm)', padding: '14px 16px', marginBottom: 20, border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, color: 'var(--text2)', fontSize: 13 }}>
            <span>Итого без скидки:</span>
            <span className="mono">{fmt(total)}</span>
          </div>
          {absolute > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, color: 'var(--red)', fontSize: 13 }}>
              <span>Скидка:</span>
              <span className="mono">− {fmt(absolute)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 17, borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 4 }}>
            <span>К оплате:</span>
            <span className="mono text-green">{fmt(finalTotal)}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          {discount > 0 && (
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => onApply(0)}>
              Убрать скидку
            </button>
          )}
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Отмена</button>
          <button className="btn btn-success" style={{ flex: 1 }} onClick={handleApply} disabled={!isValid || numVal === 0}>
            Применить
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SalesPage() {
  const [products, setProducts]         = useState([]);
  const [sales, setSales]               = useState([]);
  const [cart, setCart]                 = useState([]);
  const [search, setSearch]             = useState('');
  const [activeTab, setActiveTab]       = useState('pos');
  const [loading, setLoading]           = useState(false);
  const [historyFrom, setHistoryFrom]   = useState('');
  const [historyTo, setHistoryTo]       = useState('');
  const [discount, setDiscount]         = useState(0);
  const [showDiscount, setShowDiscount] = useState(false);
  const [showScanner, setShowScanner]   = useState(false);
  const { toasts, success, error }      = useToast();

  const loadProducts = useCallback(() => {
    productsApi.getAll({ search }).then(r => setProducts(r.data));
  }, [search]);

  const loadSales = useCallback(() => {
    const params = {};
    if (historyFrom) params.from = historyFrom;
    if (historyTo)   params.to   = historyTo;
    salesApi.getAll(params).then(r => setSales(r.data));
  }, [historyFrom, historyTo]);

  useEffect(() => { loadProducts(); }, [loadProducts]);
  useEffect(() => { if (activeTab === 'history') loadSales(); }, [activeTab, loadSales]);

  const addToCart = (product) => {
    setCart(prev => {
      const exists = prev.find(i => i.product_id === product.id);
      if (exists) {
        if (exists.quantity >= product.quantity_in_stock) return prev;
        return prev.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { product_id: product.id, name: product.name, price: product.selling_price, purchase_price: product.purchase_price, max: product.quantity_in_stock, quantity: 1 }];
    });
  };

  // Called by QRScannerModal whenever a QR code is decoded.
  // Re-fetches the product from the server (not just trusting the QR payload)
  // so price/stock changes since the QR was printed are always respected.
  const handleQRScan = async (payload, { onSuccess, onError }) => {
    try {
      const res = await productsApi.getOne(payload.id);
      const product = res.data;
      if (!product) { onError('Товар не найден в базе'); return; }
      if (product.quantity_in_stock <= 0) { onError(`«${product.name}» — нет в наличии`); return; }

      const inCartQty = cart.find(i => i.product_id === product.id)?.quantity || 0;
      if (inCartQty >= product.quantity_in_stock) {
        onError(`«${product.name}» — достигнут максимум на складе`);
        return;
      }

      addToCart(product);
      onSuccess(product.name);
    } catch (e) {
      onError(e.response?.data?.error || 'Товар не найден');
    }
  };

  const updateQty = (product_id, qty) => {
    if (qty <= 0) { removeFromCart(product_id); return; }
    setCart(prev => prev.map(i => i.product_id === product_id ? { ...i, quantity: Math.min(qty, i.max) } : i));
  };

  const removeFromCart = (product_id) => setCart(prev => prev.filter(i => i.product_id !== product_id));

  const rawTotal   = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const finalTotal = Math.max(0, rawTotal - discount);
  const totalProfit = cart.reduce((s, i) => s + (i.price - i.purchase_price) * i.quantity, 0) - discount;

  const clearCart = () => { setCart([]); setDiscount(0); };

  const completeSale = async () => {
    if (!cart.length) return;
    setLoading(true);
    try {
      await salesApi.create({ items: cart.map(i => ({ product_id: i.product_id, quantity: i.quantity })), discount });
      const msg = discount > 0
        ? `Продажа завершена! Сумма: ${fmt(finalTotal)} (скидка: ${fmt(discount)})`
        : `Продажа завершена! Сумма: ${fmt(finalTotal)}`;
      success(msg);
      clearCart();
      loadProducts();
    } catch (e) { error(e.response?.data?.error || 'Ошибка продажи'); }
    finally { setLoading(false); }
  };

  const cancelSale = async (id) => {
    if (!window.confirm('Отменить эту продажу и вернуть товары на склад?')) return;
    try { await salesApi.cancel(id); success('Продажа отменена'); loadSales(); }
    catch (e) { error(e.response?.data?.error || 'Ошибка'); }
  };

  return (
    <div>
      <ToastContainer toasts={toasts} />
      {showDiscount && (
        <DiscountModal
          total={rawTotal}
          discount={discount}
          onApply={(val) => { setDiscount(val); setShowDiscount(false); }}
          onClose={() => setShowDiscount(false)}
        />
      )}
      {showScanner && (
        <QRScannerModal
          onClose={() => setShowScanner(false)}
          onScan={handleQRScan}
        />
      )}

      <div className="page-header">
        <div className="page-title">Продажа</div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--bg2)', padding: 4, borderRadius: 'var(--radius-sm)', width: 'fit-content', border: '1px solid var(--border)' }}>
        {['pos', 'history'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className="btn btn-sm" style={{
            background: activeTab === tab ? 'var(--accent)' : 'transparent',
            color: activeTab === tab ? '#fff' : 'var(--text2)'
          }}>
            {tab === 'pos' ? '⚡ Касса' : '📋 История'}
          </button>
        ))}
      </div>

      {activeTab === 'pos' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, alignItems: 'start' }}>
          {/* Product catalog */}
          <div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <input className="form-input" placeholder="🔍 Поиск товара..."
                value={search} onChange={e => setSearch(e.target.value)}
                style={{ flex: 1 }} />
              <button className="btn btn-primary" onClick={() => setShowScanner(true)} style={{ whiteSpace: 'nowrap' }}>
                📷 Сканировать QR
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
              {products.filter(p => p.quantity_in_stock > 0).map(p => (
                <div key={p.id}
                  onClick={() => addToCart(p)}
                  className="card"
                  style={{ cursor: 'pointer', transition: 'all 0.15s', userSelect: 'none', padding: 14 }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  {p.photo_url
                    ? <img src={p.photo_url} alt="" style={{ width: '100%', height: 90, objectFit: 'cover', borderRadius: 6, marginBottom: 10 }} />
                    : <div style={{ width: '100%', height: 90, background: 'var(--bg3)', borderRadius: 6, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>⬡</div>
                  }
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, color: 'var(--text)' }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 6 }}>{p.category_name || ''}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="mono text-green" style={{ fontWeight: 700, fontSize: 14 }}>{fmt(p.selling_price)}</span>
                    <span className={`badge ${p.quantity_in_stock <= 3 ? 'badge-yellow' : 'badge-green'}`} style={{ fontSize: 10 }}>{p.quantity_in_stock} шт.</span>
                  </div>
                </div>
              ))}
              {products.filter(p => p.quantity_in_stock > 0).length === 0 && (
                <div className="empty-state" style={{ gridColumn: '1/-1' }}>
                  <div className="empty-state-icon">📦</div>
                  <p>Нет товаров в наличии</p>
                </div>
              )}
            </div>
          </div>

          {/* Cart */}
          <div className="card" style={{ position: 'sticky', top: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              Корзина
              {cart.length > 0 && <button className="btn btn-ghost btn-sm" onClick={clearCart}>Очистить</button>}
            </div>

            {cart.length === 0 && (
              <div className="empty-state" style={{ padding: '40px 20px' }}>
                <div className="empty-state-icon">🛒</div>
                <p>Нажмите на товар, чтобы добавить</p>
              </div>
            )}

            {cart.map(item => (
              <div key={item.product_id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, flex: 1, marginRight: 8 }}>{item.name}</div>
                  <button className="btn btn-ghost btn-sm" style={{ padding: '2px 6px' }} onClick={() => removeFromCart(item.product_id)}>✕</button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button className="btn btn-ghost btn-sm" style={{ padding: '2px 8px' }} onClick={() => updateQty(item.product_id, item.quantity - 1)}>−</button>
                    <input type="number" value={item.quantity} min={1} max={item.max}
                      onChange={e => updateQty(item.product_id, parseInt(e.target.value) || 1)}
                      style={{ width: 48, textAlign: 'center', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 6px', color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace' }} />
                    <button className="btn btn-ghost btn-sm" style={{ padding: '2px 8px' }} onClick={() => updateQty(item.product_id, item.quantity + 1)}>+</button>
                  </div>
                  <span className="mono text-green" style={{ fontWeight: 700 }}>{fmt(item.price * item.quantity)}</span>
                </div>
              </div>
            ))}

            {cart.length > 0 && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>

                {/* Totals */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: 'var(--text2)' }}>Сумма:</span>
                  <span className="mono" style={{ color: discount > 0 ? 'var(--text3)' : 'var(--text)', textDecoration: discount > 0 ? 'line-through' : 'none', fontSize: 15 }}>{fmt(rawTotal)}</span>
                </div>

                {discount > 0 && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ color: 'var(--red)', fontSize: 13 }}>Скидка:</span>
                      <span className="mono" style={{ color: 'var(--red)', fontSize: 13 }}>− {fmt(discount)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontWeight: 700 }}>Итого:</span>
                      <span className="mono" style={{ fontWeight: 800, fontSize: 18, color: 'var(--text)' }}>{fmt(finalTotal)}</span>
                    </div>
                  </>
                )}

                {discount === 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontWeight: 700 }}>Итого:</span>
                    <span className="mono" style={{ fontWeight: 800, fontSize: 18 }}>{fmt(rawTotal)}</span>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                  <span style={{ color: 'var(--text3)', fontSize: 12 }}>Прибыль:</span>
                  <span className="mono" style={{ fontSize: 13, color: totalProfit >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmt(totalProfit)}</span>
                </div>

                {/* Discount button */}
                <button
                  className="btn btn-ghost"
                  style={{ width: '100%', justifyContent: 'center', marginBottom: 8, borderColor: discount > 0 ? 'var(--red)' : 'var(--border)', color: discount > 0 ? 'var(--red)' : 'var(--text2)' }}
                  onClick={() => setShowDiscount(true)}
                >
                  🏷️ {discount > 0 ? `Скидка: −${fmt(discount)}` : 'Добавить скидку'}
                </button>

                <button className="btn btn-success" style={{ width: '100%', justifyContent: 'center', padding: '13px' }}
                  onClick={completeSale} disabled={loading}>
                  {loading ? 'Оформление...' : `✓ Продать · ${fmt(finalTotal)}`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <label className="form-label" style={{ whiteSpace: 'nowrap' }}>С:</label>
              <input className="form-input" type="date" value={historyFrom} onChange={e => setHistoryFrom(e.target.value)} style={{ width: 160 }} />
            </div>
            <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <label className="form-label" style={{ whiteSpace: 'nowrap' }}>По:</label>
              <input className="form-input" type="date" value={historyTo} onChange={e => setHistoryTo(e.target.value)} style={{ width: 160 }} />
            </div>
            <button className="btn btn-primary btn-sm" onClick={loadSales}>Применить</button>
          </div>

          <div className="card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Дата</th><th>Товары</th><th>Сумма</th><th>Скидка</th><th>Прибыль</th><th></th></tr>
                </thead>
                <tbody>
                  {sales.map(s => (
                    <React.Fragment key={s.id}>
                      <tr>
                        <td style={{ color: 'var(--text)' }}>{new Date(s.sale_date).toLocaleString('ru-RU')}</td>
                        <td>
                          {s.items.map(i => (
                            <div key={i.id} style={{ fontSize: 12 }}>{i.product_name} × {i.quantity_sold}</div>
                          ))}
                        </td>
                        <td className="mono text-green" style={{ fontWeight: 700 }}>{fmt(s.total_amount)}</td>
                        <td className="mono" style={{ color: s.discount > 0 ? 'var(--red)' : 'var(--text3)', fontSize: 13 }}>
                          {s.discount > 0 ? `−${fmt(s.discount)}` : '—'}
                        </td>
                        <td className="mono" style={{ color: 'var(--yellow)' }}>{fmt(s.total_profit)}</td>
                        <td>
                          <button className="btn btn-danger btn-sm" onClick={() => cancelSale(s.id)}>Отменить</button>
                        </td>
                      </tr>
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
              {sales.length === 0 && <div className="empty-state"><div className="empty-state-icon">📋</div><p>Нет продаж за выбранный период</p></div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
