import api from './api';

const chatbotService = {
  // 1. TALK: Context-aware chat with AI
  talk: async (messageData) => {
    try {
      console.log('🤖 [chatbotService] Sending to /chatbot/talk:', messageData);
      // AI responses can take a while (cold start, long generation) — 2 minute timeout
      const response = await api.post('/chatbot/talk', messageData, { timeout: 120000 });
      console.log('🤖 [chatbotService] Got response:', response.data?._id, response.data?.text?.slice(0, 50));
      return response.data;
    } catch (error) {
      console.error('🤖 [chatbotService] FAILED:', error.code, error.message);
      throw error.response?.data?.message || 'Error talking to AI';
    }
  },

  // 2. SUMMARIZE: Get an objective summary of the last 20 messages
  summarize: async (userId) => {
    try {
      const response = await api.get(`/chatbot/summarize/${userId}`, { timeout: 120000 });
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Error generating summary';
    }
  }
};

export default chatbotService;
