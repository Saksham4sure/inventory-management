import api from './api';

export const authService = {
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data.data;
  },

  verifyEmail: async (token) => {
    const response = await api.get('/auth/verify-email', { params: { token } });
    return response.data.data;
  },

  resendVerification: async (email) => {
    const response = await api.post('/auth/resend-verification', { email });
    return response.data;
  },

  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data.data;
  },

  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data.data;
  },

  updateProfile: async (data) => {
    const response = await api.put('/auth/profile', data);
    return response.data.data;
  },

  updateOnboarding: async (data) => {
    const response = await api.put('/auth/onboarding', data);
    return response.data.data;
  },

  uploadKyc: async (data) => {
    const response = await api.post('/auth/kyc', data);
    return response.data.data;
  },

  searchUsers: async (query) => {
    const response = await api.get('/auth/users/search', { params: { query } });
    return response.data.data;
  },

  getCustomerPurchases: async () => {
    const response = await api.get('/auth/customer/purchases');
    return response.data.data;
  },

  getCustomerCredits: async () => {
    const response = await api.get('/auth/customer/credits');
    return response.data.data;
  },
};

export default authService;
