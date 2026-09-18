import api from './api';

export const notificationService = {
  async getNotifications() {
    const response = await api.get('/notifications');
    return response.data?.data || { notifications: [], unreadCount: 0 };
  },

  async markAsRead(id) {
    const response = await api.put(`/notifications/${id}/read`);
    return response.data?.data?.notification;
  },

  async markAllAsRead() {
    const response = await api.put('/notifications/read-all');
    return response.data;
  },

  async respondToInvitation(invitationId, action) {
    const response = await api.post(`/notifications/invitations/${invitationId}/respond`, {
      action,
    });
    return response.data?.data;
  },
};

export default notificationService;
