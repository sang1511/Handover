import axiosInstance from '../axios';

const ProjectService = {
  getAllProjects: async () => {
    const response = await axiosInstance.get('/projects');
    return response.data;
  },

  getProjectById: async (id) => {
    const response = await axiosInstance.get(`/projects/${id}`);
    return response.data;
  },

  createProject: async (projectData) => {
    const response = await axiosInstance.post('/projects', projectData);
    return response.data;
  },

  updateProject: async (id, projectData) => {
    let config = {};
    if (projectData instanceof FormData) {
      config = {};
    }
    const response = await axiosInstance.put(`/projects/${id}`, projectData, config);
    return response.data;
  },

  deleteProject: async (id) => {
    const response = await axiosInstance.delete(`/projects/${id}`);
    return response.data;
  },

  uploadFile: async (projectId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axiosInstance.post(`/projects/${projectId}/files`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getProjectFiles: async (projectId) => {
    const response = await axiosInstance.get(`/projects/${projectId}/files`);
    return response.data;
  },

  downloadFile: async (projectId, file) => {
    const response = await axiosInstance.get(`/projects/${projectId}/files/${encodeURIComponent(file.publicId)}/download`, {
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

  deleteFile: async (projectId, fileId) => {
    const response = await axiosInstance.delete(`/projects/${projectId}/files/${fileId}`);
    return response.data;
  },
};

export default ProjectService; 