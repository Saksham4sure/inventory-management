import api from './api';

export const partyService = {
  getParties: async (params = {}) => {
    const response = await api.get('/parties', { params });
    return response.data.data;
  },

  getPartyById: async (id) => {
    const response = await api.get(`/parties/${id}`);
    return response.data.data;
  },

  createParty: async (partyData) => {
    const response = await api.post('/parties', partyData);
    return response.data.data.party;
  },

  updateParty: async (id, partyData) => {
    const response = await api.put(`/parties/${id}`, partyData);
    return response.data.data.party;
  },

  deleteParty: async (id) => {
    const response = await api.delete(`/parties/${id}`);
    return response.data.data;
  },

  recordCreditTransaction: async (partyId, creditData) => {
    const response = await api.post(`/parties/${partyId}/credit`, creditData);
    return response.data.data;
  },

  getPartyCreditHistory: async (partyId, params = {}) => {
    const response = await api.get(`/parties/${partyId}/history`, { params });
    return response.data.data;
  },

  getPartiesCreditSummary: async () => {
    const response = await api.get('/parties/summary');
    return response.data.data;
  },
};
