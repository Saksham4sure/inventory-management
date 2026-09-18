import api from './api';

export const adminService = {
  // 1. Overview & Metrics
  getOverview: async () => {
    const res = await api.get('/admin/overview');
    return res.data.data;
  },

  // 2. Businesses Management
  getBusinesses: async (params = {}) => {
    const res = await api.get('/admin/businesses', { params });
    return res.data.data;
  },

  getBusinessById: async (id) => {
    const res = await api.get(`/admin/businesses/${id}`);
    return res.data.data.business;
  },

  updateBusiness: async (id, data) => {
    const res = await api.patch(`/admin/businesses/${id}`, data);
    return res.data.data.business;
  },

  updateBusinessSubscription: async (id, data) => {
    const res = await api.patch(`/admin/businesses/${id}/subscription`, data);
    return res.data.data.business;
  },

  deleteBusiness: async (id) => {
    const res = await api.delete(`/admin/businesses/${id}`);
    return res.data;
  },

  // 3. Users Management
  getUsers: async (params = {}) => {
    const res = await api.get('/admin/users', { params });
    return res.data.data;
  },

  getUserById: async (id) => {
    const res = await api.get(`/admin/users/${id}`);
    return res.data.data.user;
  },

  updateUser: async (id, data) => {
    const res = await api.patch(`/admin/users/${id}`, data);
    return res.data.data.user;
  },

  deleteUser: async (id) => {
    const res = await api.delete(`/admin/users/${id}`);
    return res.data;
  },

  getUserKyc: async (id) => {
    const res = await api.get(`/admin/users/${id}/kyc`);
    return res.data.data;
  },

  verifyUserKyc: async (id, data) => {
    const res = await api.post(`/admin/users/${id}/verify-kyc`, data);
    return res.data.data;
  },

  // 4. Dynamic Subscription Tiers Management
  getPlans: async () => {
    const res = await api.get('/admin/plans');
    return res.data.data.plans;
  },

  createPlan: async (data) => {
    const res = await api.post('/admin/plans', data);
    return res.data.data.plan;
  },

  updatePlan: async (id, data) => {
    const res = await api.put(`/admin/plans/${id}`, data);
    return res.data.data.plan;
  },

  deletePlan: async (id) => {
    const res = await api.delete(`/admin/plans/${id}`);
    return res.data;
  },

  setDefaultTrialPlan: async (id) => {
    const res = await api.post(`/admin/plans/${id}/make-trial`);
    return res.data.data;
  },

  // 5. Platform Settings & Dynamic Trial System
  getSettings: async () => {
    const res = await api.get('/admin/settings');
    return res.data.data;
  },

  updateSettings: async (data) => {
    const res = await api.put('/admin/settings', data);
    return res.data.data.settings;
  },

  // 6. Subscription Applications & Approval Workflow
  getSubscriptionRequests: async (params = {}) => {
    const res = await api.get('/admin/subscription-requests', { params });
    return res.data.data;
  },

  approveSubscriptionRequest: async (id, data = {}) => {
    const res = await api.post(`/admin/subscription-requests/${id}/approve`, data);
    return res.data.data;
  },

  rejectSubscriptionRequest: async (id, data = {}) => {
    const res = await api.post(`/admin/subscription-requests/${id}/reject`, data);
    return res.data.data;
  },
};

export default adminService;
