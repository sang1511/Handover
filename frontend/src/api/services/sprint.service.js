import axiosInstance from '../axios';

const SprintService = {
  getAllSprints: async (releaseId) => {
    const response = await axiosInstance.get(`/sprints?releaseId=${releaseId}`);
    return response.data;
  },

  getSprintById: async (id) => {
    const response = await axiosInstance.get(`/sprints/${id}`);
    return response.data;
  },

  createSprint: async (sprintData) => {
    const response = await axiosInstance.post('/sprints', sprintData);
    return response.data;
  },

  updateSprint: async (id, sprintData) => {
    const response = await axiosInstance.put(`/sprints/${id}`, sprintData);
    return response.data;
  },

  deleteSprint: async (id) => {
    const response = await axiosInstance.delete(`/sprints/${id}`);
    return response.data;
  },

  uploadFile: async (sprintId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axiosInstance.post(`/sprints/${sprintId}/files`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getSprintFiles: async (sprintId) => {
    const response = await axiosInstance.get(`/sprints/${sprintId}/files`);
    return response.data;
  },

  downloadFile: async (sprintId, fileId) => {
    const response = await axiosInstance.get(`/sprints/${sprintId}/files/${fileId}`, {
      responseType: 'blob'
    });
    return response.data;
  }
};

export default SprintService; 