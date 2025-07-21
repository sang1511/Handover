import axiosInstance from '../axios';

const ReleaseService = {
  // Lấy tất cả release
  getAllReleases: async () => {
    const response = await axiosInstance.get('/releases');
    return response.data;
  },

  // Lấy release theo moduleId (nếu cần)
  getReleasesByModule: async (moduleId) => {
    if (!moduleId) throw new Error('moduleId is required');
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
    let config = {};
    if (releaseData instanceof FormData) {
      config = {};
    }
    const response = await axiosInstance.put(`/releases/${id}`, releaseData, config);
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

  downloadFile: async (releaseId, file) => {
    const response = await axiosInstance.get(`/releases/${releaseId}/files/${encodeURIComponent(file.publicId)}/download`, {
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

  deleteFile: async (releaseId, fileId) => {
    const response = await axiosInstance.delete(`/releases/${releaseId}/files/${fileId}`);
    return response.data;
  },
};

export default ReleaseService; 