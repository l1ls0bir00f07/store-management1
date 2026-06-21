import React, { useState, useEffect, useCallback } from 'react';
import { productsApi, categoriesApi, qrApi } from '../services/api';
import { useToast } from '../hooks/useToast';
import ToastContainer from '../components/common/Toast';

const EMPTY_PRODUCT = { name: '', category_id: '', purchase_price: '', selling_price: '', quantity_in_stock: '', sku: '', description: '' };

function ProductModal({ product, categories, onClose, onSave }) {
  const [form, setForm] = useState(product || EMPTY_PRODUCT);
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isEdit = !!product?.id;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => v !== '' && fd.append(k, v));
      if (photo) fd.append('photo', photo);
      if (isEdit) await productsApi.update(product.id, fd);
      else await productsApi.create(fd);
      onSave();
    } catch (err) { setError(err.response?.data?.error || 'Ошибка'); }
    finally { setLoading(false); }
  };

  const f = (field) => ({ value: form[field], onChange: e => setForm(p => ({ ...p, [field]: e.target.value })) });

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div className="modal-title">{isEdit ? 'Редактировать товар' : 'Добавить товар'}</div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="grid-2" style={{ gap: 16, marginBottom: 16 }}>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Название *</label>
              <input className="form-input" placeholder="Название товара" {...f('name')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Категория</label>
              <select className="form-select" {...f('category_id')}>
                <option value="">— Без категории —</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Артикул (SKU)</label>
              <input className="form-input" placeholder="SKU-001" {...f('sku')} />
            </div>
            <div className="form-group">
              <label className="form-label">Цена закупки</label>
              <input className="form-input" type="number" step="0.01" placeholder="0" {...f('purchase_price')} />
            </div>
            <div className="form-group">
              <label className="form-label">Цена продажи</label>
              <input className="form-input" type="number" step="0.01" placeholder="0" {...f('selling_price')} />
            </div>
            <div className="form-group">
              <label className="form-label">Количество на складе</label>
              <input className="form-input" type="number" placeholder="0" {...f('quantity_in_stock')} />
            </div>
            <div className="form-group">
              <label className="form-label">Фото товара</label>
              <input className="form-input" type="file" accept="image/*" onChange={e => setPhoto(e.target.files[0])} style={{ paddingTop: 6 }} />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Описание</label>
              <textarea className="form-textarea" placeholder="Описание товара..." {...f('description')} />
            </div>
          </div>

          {form.purchase_price && form.selling_price && (
            <div style={{ background: 'var(--bg3)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
              Маржа: <span className="text-green mono">{((form.selling_price - form.purchase_price) / form.selling_price * 100).toFixed(1)}%</span>
              {' · '}Прибыль с ед.: <span className="text-green mono">{(form.selling_price - form.purchase_price).toFixed(0)}</span>
            </div>
          )}

          {error && <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>⚠ {error}</div>}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Отмена</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Сохранение...' : 'Сохранить'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CategoryModal({ category, onClose, onSave }) {
  const [form, setForm] = useState({ name: category?.name || '', description: category?.description || '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      if (category?.id) await categoriesApi.update(category.id, form);
      else await categoriesApi.create(form);
      onSave();
    } catch { } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <div className="modal-title">{category?.id ? 'Редактировать' : 'Новая'} категория</div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Название *</label>
            <input className="form-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label className="form-label">Описание</label>
            <input className="form-input" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Отмена</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? '...' : 'Сохранить'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

const fmt = (n) => new Intl.NumberFormat('ru-RU').format(Math.round(n || 0));

export default function InventoryPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterLow, setFilterLow] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [editCategory, setEditCategory] = useState(null);
  const [activeTab, setActiveTab] = useState('products');
  const [bulkQrLoading, setBulkQrLoading] = useState(false);
  const { toasts, success, error } = useToast();

  const load = useCallback(async () => {
    const [p, c] = await Promise.all([
      productsApi.getAll({ search, category_id: filterCat, low_stock: filterLow }),
      categoriesApi.getAll()
    ]);
    setProducts(p.data);
    setCategories(c.data);
    setLoading(false);
  }, [search, filterCat, filterLow]);

  useEffect(() => { load(); }, [load]);

  const handleDeleteProduct = async (id, name) => {
    if (!window.confirm(`Удалить "${name}"?`)) return;
    try { await productsApi.delete(id); success(`Товар "${name}" удалён`); load(); }
    catch (e) { error(e.response?.data?.error || 'Ошибка удаления'); }
  };

  const handleDeleteCat = async (id, name) => {
    if (!window.confirm(`Удалить категорию "${name}"?`)) return;
    try { await categoriesApi.delete(id); success('Категория удалена'); load(); }
    catch (e) { error(e.response?.data?.error || 'Ошибка'); }
  };

  const handleDownloadQR = async (id, name) => {
    try {
      await qrApi.downloadOne(id, `qrcode_${name}.png`);
      success(`QR-код для "${name}" скачан`);
    } catch (e) { error('Не удалось скачать QR-код'); }
  };

  const handleDownloadAllQR = async () => {
    setBulkQrLoading(true);
    try {
      await qrApi.downloadBulk(filterCat || null);
      success(`QR-коды скачаны (${filterCat ? 'по категории' : 'все товары'})`);
    } catch (e) {
      error(e.response?.data?.error || 'Не удалось скачать QR-коды');
    } finally {
      setBulkQrLoading(false);
    }
  };

  return (
    <div>
      <ToastContainer toasts={toasts} />
      <div className="page-header">
        <div className="page-title">Товары</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={handleDownloadAllQR} disabled={bulkQrLoading}>
            {bulkQrLoading ? 'Генерация...' : `🔲 Скачать все QR${filterCat ? ' (по категории)' : ''}`}
          </button>
          <button className="btn btn-ghost" onClick={() => { setEditCategory(null); setShowCatModal(true); }}>+ Категория</button>
          <button className="btn btn-primary" onClick={() => { setEditProduct(null); setShowProductModal(true); }}>+ Товар</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--bg2)', padding: 4, borderRadius: 'var(--radius-sm)', width: 'fit-content', border: '1px solid var(--border)' }}>
        {['products', 'categories'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className="btn btn-sm" style={{
            background: activeTab === tab ? 'var(--accent)' : 'transparent',
            color: activeTab === tab ? '#fff' : 'var(--text2)'
          }}>
            {tab === 'products' ? `Товары (${products.length})` : `Категории (${categories.length})`}
          </button>
        ))}
      </div>

      {activeTab === 'products' && (
        <>
          {/* Filters */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
            <input className="form-input" placeholder="🔍 Поиск по названию или SKU..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ maxWidth: 300 }} />
            <select className="form-select" value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ maxWidth: 200 }}>
              <option value="">Все категории</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button className={`btn ${filterLow ? 'btn-danger' : 'btn-ghost'} btn-sm`} onClick={() => setFilterLow(p => !p)}>
              ⚠ Мало на складе
            </button>
          </div>

          <div className="card">
            {loading ? <div style={{ color: 'var(--text3)', padding: 20 }}>Загрузка...</div> : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Товар</th>
                      <th>SKU</th>
                      <th>Категория</th>
                      <th>Закупка</th>
                      <th>Продажа</th>
                      <th>Маржа</th>
                      <th>Склад</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map(p => {
                      const margin = p.selling_price > 0 ? ((p.selling_price - p.purchase_price) / p.selling_price * 100).toFixed(0) : 0;
                      return (
                        <tr key={p.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              {p.photo_url
                                ? <img src={p.photo_url} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover' }} />
                                : <div style={{ width: 36, height: 36, borderRadius: 6, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>⬡</div>
                              }
                              <span style={{ color: 'var(--text)', fontWeight: 600 }}>{p.name}</span>
                            </div>
                          </td>
                          <td><span className="mono" style={{ fontSize: 12, color: 'var(--text3)' }}>{p.sku || '—'}</span></td>
                          <td>{p.category_name ? <span className="badge badge-blue">{p.category_name}</span> : <span style={{ color: 'var(--text3)' }}>—</span>}</td>
                          <td className="mono">{fmt(p.purchase_price)}</td>
                          <td className="mono text-green">{fmt(p.selling_price)}</td>
                          <td><span className={`badge ${margin >= 30 ? 'badge-green' : margin >= 15 ? 'badge-yellow' : 'badge-red'}`}>{margin}%</span></td>
                          <td>
                            <span className={`badge ${p.quantity_in_stock <= 0 ? 'badge-red' : p.quantity_in_stock <= 5 ? 'badge-yellow' : 'badge-green'}`}>
                              {p.quantity_in_stock} шт.
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button className="btn btn-ghost btn-sm" title="Скачать QR-код" onClick={() => handleDownloadQR(p.id, p.name)}>🔲</button>
                              <button className="btn btn-ghost btn-sm" onClick={() => { setEditProduct(p); setShowProductModal(true); }}>✎</button>
                              <button className="btn btn-danger btn-sm" onClick={() => handleDeleteProduct(p.id, p.name)}>✕</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {products.length === 0 && (
                  <div className="empty-state"><div className="empty-state-icon">📦</div><p>Товары не найдены</p></div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'categories' && (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Название</th><th>Описание</th><th>Товаров</th><th></th></tr></thead>
              <tbody>
                {categories.map(c => (
                  <tr key={c.id}>
                    <td style={{ color: 'var(--text)', fontWeight: 600 }}>{c.name}</td>
                    <td>{c.description || '—'}</td>
                    <td><span className="badge badge-blue">{c.product_count}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => { setEditCategory(c); setShowCatModal(true); }}>✎</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDeleteCat(c.id, c.name)}>✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {categories.length === 0 && <div className="empty-state"><div className="empty-state-icon">🗂</div><p>Нет категорий</p></div>}
          </div>
        </div>
      )}

      {showProductModal && (
        <ProductModal
          product={editProduct}
          categories={categories}
          onClose={() => { setShowProductModal(false); setEditProduct(null); }}
          onSave={() => { setShowProductModal(false); setEditProduct(null); load(); success(editProduct ? 'Товар обновлён' : 'Товар добавлен'); }}
        />
      )}
      {showCatModal && (
        <CategoryModal
          category={editCategory}
          onClose={() => { setShowCatModal(false); setEditCategory(null); }}
          onSave={() => { setShowCatModal(false); setEditCategory(null); load(); success('Категория сохранена'); }}
        />
      )}
    </div>
  );
}
