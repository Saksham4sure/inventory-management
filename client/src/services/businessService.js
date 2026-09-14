import api from './api';

export const businessService = {
  setupBusiness: async (businessData) => {
    const response = await api.post('/business/setup', businessData);
    return response.data.data;
  },

  getMyBusiness: async () => {
    const response = await api.get('/business/my-business');
    return response.data.data.business;
  },

  updateBusiness: async (businessData) => {
    const response = await api.put('/business/my-business', businessData);
    return response.data.data.business;
  },
};
