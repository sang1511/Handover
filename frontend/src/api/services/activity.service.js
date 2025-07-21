import axiosInstance from '../axios';

const ActivityService = {
  // Lấy hoạt động gần đây của người dùng
  getUserActivity: async (limit = 10) => {
    try {
      const response = await axiosInstance.get(`/activities?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching user activity:", error);
      throw error;
    }
  },
};

export default ActivityService; 