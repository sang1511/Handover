import axiosInstance from '../axios';

const ReleaseService = {
  getAllReleases: async (moduleId) => {
    const response = await axiosInstance.get(`/releases?moduleId=${moduleId}`);
    return response.data;
  },

  getReleaseById: async (id) => {
    const response = await axiosInstance.get(`/releases/${id}`);
    return response.data;
  },

  createRelease: async (releaseData) => {
    const response = await axiosInstance.post('/releases', releaseData);
    return response.data;
  },

  updateRelease: async (id, releaseData) => {
    const response = await axiosInstance.put(`/releases/${id}`, releaseData);
    return response.data;
  },

  deleteRelease: async (id) => {
    const response = await axiosInstance.delete(`/releases/${id}`);
    return response.data;
  },

  uploadFile: async (releaseId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axiosInstance.post(`/releases/${releaseId}/files`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getReleaseFiles: async (releaseId) => {
    const response = await axiosInstance.get(`/releases/${releaseId}/files`);
    return response.data;
  },

  downloadFile: async (releaseId, fileId) => {
    const response = await axiosInstance.get(`/releases/${releaseId}/files/${fileId}/download`, {
      responseType: 'blob'
    });
    return response.data;
  }
};

export default ReleaseService; 