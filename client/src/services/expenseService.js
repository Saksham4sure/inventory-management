import api from './api';

export const expenseService = {
  getExpenses: async (params = {}) => {
    const response = await api.get('/expenses', { params });
    return response.data.data;
  },

  getExpenseSummary: async (params = {}) => {
    const response = await api.get('/expenses/summary', { params });
    return response.data.data;
  },

  createExpense: async (expenseData) => {
    const response = await api.post('/expenses', expenseData);
    return response.data.data.expense;
  },

  updateExpense: async (id, expenseData) => {
    const response = await api.put(`/expenses/${id}`, expenseData);
    return response.data.data.expense;
  },

  deleteExpense: async (id) => {
    const response = await api.delete(`/expenses/${id}`);
    return response.data;
  },
};
