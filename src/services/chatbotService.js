import api from './api';

const chatbotService = {
  // 1. TALK: Context-aware chat with AI
  talk: async (messageData) => {
    try {
      // The backend expects messageData containing { text }
      const response = await api.post('/chatbot/talk', messageData);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Error talking to AI';
    }
  },

  // 2. SUMMARIZE: Get an objective summary of the last 20 messages
  summarize: async (userId) => {
    try {
      const response = await api.get(`/chatbot/summarize/${userId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Error generating summary';
    }
  }
};

export default chatbotService;
