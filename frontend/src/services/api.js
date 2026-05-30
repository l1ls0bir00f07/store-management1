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

export default API;
