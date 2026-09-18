import api from './api';

export const authService = {
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data.data;
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
};
