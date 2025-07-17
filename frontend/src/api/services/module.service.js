import axiosInstance from '../axios';

const ModuleService = {
  getAllModules: async (projectId) => {
    const response = await axiosInstance.get(`/modules/by-project/${projectId}`);
    return response.data;
  },

  getModuleById: async (id) => {
    const response = await axiosInstance.get(`/modules/${id}`);
    return response.data;
  },

  createModule: async (moduleData) => {
    let config = {};
    
    // Nếu moduleData là FormData (có file), không set Content-Type để browser tự động set
    if (moduleData instanceof FormData) {
      config = {
        headers: {
          // Xóa Content-Type để browser tự động set với boundary cho FormData
          'Content-Type': undefined,
        },
      };
    }
    
    const response = await axiosInstance.post('/modules', moduleData, config);
    return response.data;
  },

  updateModule: async (id, moduleData) => {
    let config = {};
    if (moduleData instanceof FormData) {
      config = {
        headers: {
          'Content-Type': undefined,
        },
      };
    }
    const response = await axiosInstance.put(`/modules/${id}`, moduleData, config);
    return response.data;
  },

  deleteModule: async (id) => {
    const response = await axiosInstance.delete(`/modules/${id}`);
    return response.data;
  },

  uploadFile: async (moduleId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axiosInstance.post(`/modules/${moduleId}/files`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getModuleFiles: async (moduleId) => {
    const response = await axiosInstance.get(`/modules/${moduleId}/files`);
    return response.data;
  },

  downloadFile: async (moduleId, file) => {
    const response = await axiosInstance.get(`/modules/${moduleId}/files/${encodeURIComponent(file.publicId)}/download`, {
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

  deleteFile: async (moduleId, fileId) => {
    const response = await axiosInstance.delete(`/modules/${moduleId}/files/${fileId}`);
    return response.data;
  },
};

export default ModuleService; 