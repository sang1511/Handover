import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
});

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    
    // Set Content-Type for JSON requests (not for FormData)
    if (!(config.data instanceof FormData)) {
      config.headers['Content-Type'] = 'application/json';
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if the error is 401, not a retry request, and not the login/refresh-token endpoint
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes('/auth/login') &&
      !originalRequest.url.includes('/auth/refresh-token')
    ) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');

      if (refreshToken) {
        try {
          // Use a temporary axios instance to avoid recursive interceptors
          const tempAxios = axios.create({ baseURL: process.env.REACT_APP_API_URL });
          const res = await tempAxios.post('/auth/refresh-token', { refreshToken });
          
          const { accessToken } = res.data;
          
          // Update localStorage with the new accessToken
          localStorage.setItem('accessToken', accessToken);
          
          // Update the header of the original request
          originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;

          // Retry the original request with the new token
          return axiosInstance(originalRequest);
        } catch (refreshError) {
          // If refresh token fails, clear all auth data and redirect to login
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
          return Promise.reject(refreshError);
        }
      } else {
        // If no refresh token, clear all auth data and redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        // No need to return anything here, as we are redirecting
        return Promise.reject(new Error("No refresh token available."));
      }
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance; 