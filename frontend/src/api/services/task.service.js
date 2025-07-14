import axiosInstance from '../axios';

const TaskService = {
  getAllTasks: async (sprintId) => {
    const response = await axiosInstance.get(`/tasks/by-sprint/${sprintId}`);
    return response.data;
  },

  getTaskById: async (id) => {
    const response = await axiosInstance.get(`/tasks/${id}`);
    return response.data;
  },

  createTask: async (taskData) => {
    const response = await axiosInstance.post('/tasks', taskData);
    return response.data;
  },

  updateTask: async (id, taskData) => {
    const response = await axiosInstance.put(`/tasks/${id}`, taskData);
    return response.data;
  },

  deleteTask: async (id) => {
    const response = await axiosInstance.delete(`/tasks/${id}`);
    return response.data;
  },

  updateStatus: async (id, status) => {
    const response = await axiosInstance.patch(`/tasks/${id}/status`, { status });
    return response.data;
  },

  addHistory: async (id, historyData) => {
    const response = await axiosInstance.post(`/tasks/${id}/history`, historyData);
    return response.data;
  },

  uploadFile: async (taskId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axiosInstance.post(`/tasks/${taskId}/files`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getTaskFiles: async (taskId) => {
    const response = await axiosInstance.get(`/tasks/${taskId}/files`);
    return response.data;
  },

  downloadFile: async (taskId, fileId) => {
    const response = await axiosInstance.get(`/tasks/${taskId}/files/${fileId}/download`, {
      responseType: 'blob'
    });
    return response.data;
  }
};

export default TaskService; 