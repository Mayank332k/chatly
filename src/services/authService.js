import api from './api';

const authService = {
  // 0. CHECK AUTH: Verify JWT cookie
  checkAuth: async () => {
    try {
      const response = await api.get('/auth/check');
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Error occurred during auth check';
    }
  },

  // 1. SIGNUP: User Registration (With Profile Pic)
  signup: async (formData) => {
    try {
      // Let Axios auto-set multipart boundary from FormData
      const response = await api.post('/auth/register', formData);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Error occurred during registration';
    }
  },

  // 2. LOGIN: User Authentication
  login: async (username, password) => {
    try {
      const response = await api.post('/auth/login', { username, password });
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Invalid username or password';
    }
  },

  // 3. LOGOUT: Flush Session
  logout: async () => {
    try {
      const response = await api.post('/auth/logout');
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Error occurred during logout';
    }
  },
};

export default authService;
