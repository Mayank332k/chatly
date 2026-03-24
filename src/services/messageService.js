import api from './api';

const messageService = {
  // 1. GET USERS: Fetch sidebar contacts
  getUsers: async () => {
    try {
      // Bypassing Safari caching with a unique timestamp
      const response = await api.get(`/messages/users?t=${Date.now()}`);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Error fetching users';
    }
  },

  // 2. GET CHAT HISTORY: Load previous messages
  getChatHistory: async (userId) => {
    try {
      const response = await api.get(`/messages/${userId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Error loading chat history';
    }
  },

  // 3. SEND MESSAGE: Let Axios handle Content-Type (FormData vs JSON)
  sendMessage: async (userId, data, onProgress) => {
    try {
      // Direct pass without manual headers for proper Boundary detection
      const response = await api.post(`/messages/send/${userId}`, data, {
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percentCompleted);
          }
        }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Error sending message';
    }
  },

  // 4. MARK AS READ: Notify the server that messages from a sender have been read
  markMessagesAsRead: async (senderId) => {
    try {
      const response = await api.put(`/messages/read/${senderId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Error marking messages as read';
    }
  },
};

export default messageService;
