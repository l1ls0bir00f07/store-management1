import axios from 'axios';

const API = axios.create({ baseURL: '/api' });

API.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401 || err.response?.status === 403) {
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authApi = {
  login: (data) => API.post('/auth/login', data),
  changePassword: (data) => API.post('/auth/change-password', data),
};

export const categoriesApi = {
  getAll: () => API.get('/categories'),
  create: (data) => API.post('/categories', data),
  update: (id, data) => API.put(`/categories/${id}`, data),
  delete: (id) => API.delete(`/categories/${id}`),
};

export const productsApi = {
  getAll: (params) => API.get('/products', { params }),
  getOne: (id) => API.get(`/products/${id}`),
  create: (formData) => API.post('/products', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id, formData) => API.put(`/products/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete: (id) => API.delete(`/products/${id}`),
};

export const salesApi = {
  getAll: (params) => API.get('/sales', { params }),
  getOne: (id) => API.get(`/sales/${id}`),
  create: (data) => API.post('/sales', data),
  cancel: (id) => API.delete(`/sales/${id}`),
};

export const reportsApi = {
  getDashboard: () => API.get('/reports/dashboard'),
  getSalesReport: (params) => API.get('/reports/sales', { params }),
  getTopProducts: (params) => API.get('/reports/top-products', { params }),
};

export const qrApi = {
  // Returns the direct download URL for a single product's QR PNG.
  // Auth header can't travel through a plain <a href>, so callers either
  // use this for an <img>/manual fetch, or use downloadOne() below for a
  // proper authenticated download.
  singleUrl: (productId) => `/api/qrcodes/${productId}`,
  bulkUrl: (categoryId) => `/api/qrcodes/bulk/all${categoryId ? `?category_id=${categoryId}` : ''}`,

  // Downloads a single product's QR code as a PNG file, attaching the auth token
  // (a plain <a href="/api/qrcodes/:id" download> would hit the API without auth headers).
  downloadOne: async (productId, suggestedName) => {
    const res = await API.get(`/qrcodes/${productId}`, { responseType: 'blob' });
    triggerBlobDownload(res.data, suggestedName || `qrcode_${productId}.png`);
  },

  // Downloads a ZIP with QR codes for all products (optionally filtered by category).
  downloadBulk: async (categoryId) => {
    const res = await API.get('/qrcodes/bulk/all', {
      params: categoryId ? { category_id: categoryId } : {},
      responseType: 'blob'
    });
    triggerBlobDownload(res.data, `qrcodes_${new Date().toISOString().slice(0, 10)}.zip`);
  },
};

function triggerBlobDownload(blobData, filename) {
  const url = window.URL.createObjectURL(new Blob([blobData]));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export default API;
