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
    const response = await axiosInstance.put(`/projects/${id}`, projectData);
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
};

export default ProjectService; 