import axiosInstance from '../axios';

const UserService = {
  getAllUsers: async () => {
    const response = await axiosInstance.get('/users');
    return response.data;
  },

  getAllEmails: async () => {
    const response = await axiosInstance.get('/users/emails');
    return response.data;
  },

  getUserById: async (id) => {
    const response = await axiosInstance.get(`/users/${id}`);
    return response.data;
  },

  createUser: async (userData) => {
    const response = await axiosInstance.post('/users', userData);
    return response.data;
  },

  updateUser: async (id, userData) => {
    const response = await axiosInstance.put(`/users/${id}`, userData);
    return response.data;
  },

  deleteUser: async (id) => {
    const response = await axiosInstance.delete(`/users/${id}`);
    return response.data;
  },

  updateUserRole: async (id, role) => {
    const response = await axiosInstance.patch(`/users/${id}/role`, { role });
    return response.data;
  },
};

export default UserService; 