import api from './api';

export const teamService = {
  async getTeam() {
    const response = await api.get('/team');
    return response.data?.data || {};
  },

  async inviteMember({ email, role, limits }) {
    const response = await api.post('/team/invite', { email, role, limits });
    return response.data?.data?.invitation;
  },

  async updateMemberLimits(memberId, { role, limits }) {
    const response = await api.put(`/team/members/${memberId}/limits`, { role, limits });
    return response.data?.data?.member;
  },

  async removeMember(memberId) {
    const response = await api.delete(`/team/members/${memberId}`);
    return response.data;
  },

  async cancelInvitation(invitationId) {
    const response = await api.delete(`/team/invitations/${invitationId}`);
    return response.data;
  },
};

export default teamService;
