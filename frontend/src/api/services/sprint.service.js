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
    let config = {};
    if (sprintData instanceof FormData) {
      config = {};
    }
    const response = await axiosInstance.put(`/sprints/${id}`, sprintData, config);
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

  downloadFile: async (sprintId, file) => {
    const response = await axiosInstance.get(`/sprints/${sprintId}/files/${encodeURIComponent(file.publicId)}`, {
      responseType: 'blob'
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', file.fileName);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
  },

  deleteFile: async (sprintId, fileId) => {
    const response = await axiosInstance.delete(`/sprints/${sprintId}/files/${fileId}`);
    return response.data;
  },
};

export default SprintService; 