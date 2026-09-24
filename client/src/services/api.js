import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercept requests to add JWT Authorization header
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('kisansetu_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  registerFarmer: (data) => api.post('/auth/register-farmer', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
};

export const centresAPI = {
  getAll: (params) => api.get('/centres', { params }),
  getById: (id) => api.get(`/centres/${id}`),
  create: (data) => api.post('/centres', data),
  update: (id, data) => api.put(`/centres/${id}`, data),
};

export const slotsAPI = {
  getAvailable: (centreId, date) => api.get('/slots', { params: { centre_id: centreId, date } }),
  bookSlot: (bookingData) => api.post('/slots/book', bookingData),
  getMyBookings: () => api.get('/slots/my'),
  getBookingPass: (id) => api.get(`/slots/${id}`),
  cancelBooking: (id) => api.post(`/slots/${id}/cancel`),
  rescheduleBooking: (id, data) => api.post(`/slots/${id}/reschedule`, data),
};

export const queueAPI = {
  getLiveQueue: (centreId) => api.get(`/queue/${centreId}/live`),
  checkIn: (centreId, data) => api.post(`/queue/${centreId}/check-in`, data),
  callNext: (centreId, data) => api.post(`/queue/${centreId}/call-next`, data),
  updateStatus: (centreId, data) => api.post(`/queue/${centreId}/update-status`, data),
};

export const procurementAPI = {
  submitQualityCheck: (data) => api.post('/procurement/quality-check', data),
  submitWeighbridge: (data) => api.post('/procurement/weighbridge', data),
  getReceipt: (bookingId) => api.get(`/procurement/receipt/${bookingId}`),
  getAnalytics: () => api.get('/procurement/analytics'),
  getMarketPrices: () => api.get('/procurement/market-prices'),
};

export const aiAPI = {
  getRecommendations: (data) => api.post('/ai/recommend-slot', data),
  predictWaitTime: (bookingId) => api.get(`/ai/predict-wait-time/${bookingId}`),
  chatAssistant: (data) => api.post('/ai/chat-assistant', data),
};

export const adminAPI = {
  getOverview: () => api.get('/admin/overview'),
  getFarmers: (params) => api.get('/admin/farmers', { params }),
  getFarmerById: (id) => api.get(`/admin/farmers/${id}`),
  updateFarmer: (id, data) => api.put(`/admin/farmers/${id}`, data),
  getOfficers: (params) => api.get('/admin/officers', { params }),
  createOfficer: (data) => api.post('/admin/officers', data),
  updateOfficer: (id, data) => api.put(`/admin/officers/${id}`, data),
  getCentres: (params) => api.get('/admin/centres', { params }),
  createCentre: (data) => api.post('/admin/centres', data),
  updateCentre: (id, data) => api.put(`/admin/centres/${id}`, data),
  getSlots: (centreId, params) => api.get(`/admin/slots/${centreId}`, { params }),
  updateSlot: (slotId, data) => api.put(`/admin/slots/${slotId}`, data),
  getAuditLogs: () => api.get('/admin/audit-logs'),
};

export default api;
