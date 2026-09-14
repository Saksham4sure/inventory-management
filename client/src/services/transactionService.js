import api from './api';

export const transactionService = {
  createTransaction: async (transactionData) => {
    const response = await api.post('/transactions', transactionData);
    return response.data.data.transaction;
  },

  getTransactions: async (params = {}) => {
    const response = await api.get('/transactions', { params });
    return response.data.data;
  },

  getDashboardSummary: async () => {
    const response = await api.get('/transactions/dashboard');
    return response.data.data;
  },
};
