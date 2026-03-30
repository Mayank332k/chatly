import api from './api';

const messageService = {
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

  sendMessage: async (userId, data, onProgress) => {
    try {
      let intervalId;
      if (onProgress && data instanceof FormData) {
        let fakeProgress = 0;
        // Start a smooth, realistic progress animation while waiting for the Node -> Cloudinary backend hop
        intervalId = setInterval(() => {
          fakeProgress += Math.random() * 15; // Randomly increment by 0-15%
          if (fakeProgress >= 90) {
            fakeProgress = 90;
            clearInterval(intervalId);
          }
          onProgress(Math.floor(fakeProgress));
        }, 300);
      }

      const response = await api.post(`/messages/send/${userId}`, data, {
        onUploadProgress: (progressEvent) => {
          // If it isn't FormData (no image), just use the raw network progress
          if (onProgress && !(data instanceof FormData) && progressEvent.total) {
             const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
             onProgress(percentCompleted);
          }
        }
      });
      
      if (intervalId) clearInterval(intervalId);
      if (onProgress) onProgress(100);

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

  // 5. CLEAR CHAT: Delete all messages for the current user
  clearChat: async (userId) => {
    try {
      const response = await api.delete(`/messages/clear/${userId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || error.response?.data?.error || 'Error clearing chat';
    }
  },

  // 6. DELETE FOR ME: Delete a specific message for the current user
  deleteForMe: async (messageId) => {
    try {
      const response = await api.delete(`/messages/delete-me/${messageId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || error.response?.data?.error || 'Error deleting message';
    }
  },

  // 7. DELETE FOR EVERYONE: Delete a message for all participants
  deleteForEveryone: async (messageId) => {
    try {
      const response = await api.delete(`/messages/delete-everyone/${messageId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || error.response?.data?.error || 'Error deleting message for everyone';
    }
  }
};

export default messageService;
