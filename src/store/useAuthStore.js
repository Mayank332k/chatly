import { create } from 'zustand';
import { io } from 'socket.io-client';
import authService from '../services/authService';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

const useAuthStore = create((set, get) => ({
  authUser: JSON.parse(localStorage.getItem('chat-user')) || null,
  isCheckingAuth: true,
  onlineUsers: [],
  socket: null,

  checkAuth: async () => {
    try {
      const res = await authService.checkAuth();
      set({ authUser: res });
      localStorage.setItem('chat-user', JSON.stringify(res)); // 🛡️ Persist for instant refresh
      get().connectSocket(); // Initialize socket on successful auth
    } catch (error) {
      console.log('Error in checkAuth:', error);
      set({ authUser: null });
      localStorage.removeItem('chat-user');
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (formData) => {
    try {
      const res = await authService.signup(formData);
      set({ authUser: res });
      localStorage.setItem('chat-user', JSON.stringify(res)); // 🪄 Sync Store and Storage
      get().connectSocket();
      return res;
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  },

  login: async (username, password) => {
    try {
      const res = await authService.login(username, password);
      set({ authUser: res });
      localStorage.setItem('chat-user', JSON.stringify(res)); // 🪄 Sync Store and Storage
      get().connectSocket();
      return res;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  logout: async () => {
    try {
      await authService.logout();
      set({ authUser: null });
      localStorage.removeItem('chat-user'); // Fallback clear
      get().disconnectSocket();
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  },

  connectSocket: () => {
    const { authUser, socket } = get();
    // 🛡️ Guard: Avoid multiple socket connections (Infinite Loop Fix)
    if (!authUser || socket) return;

    const newSocket = io(SOCKET_URL, {
      query: { userId: authUser._id },
    });

    set({ socket: newSocket });

    // Listen for real-time online users updates
    newSocket.on('getOnlineUsers', (userIds) => {
      set({ onlineUsers: userIds });
    });
  },

  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, onlineUsers: [] });
    }
  },
}));

export default useAuthStore;
