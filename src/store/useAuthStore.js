import { create } from 'zustand';
import { io } from 'socket.io-client';
import authService from '../services/authService';

// Chat store reference — injected by useChatStore after init to avoid circular imports
let chatStoreRef = null;
export const setChatStoreRef = (store) => { chatStoreRef = store; };

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

const useAuthStore = create((set, get) => ({
  authUser: JSON.parse(localStorage.getItem('chat-user')) || null,
  isCheckingAuth: true,
  onlineUsers: [],
  socket: null,

  checkAuth: async () => {
    try {
      const res = await authService.checkAuth();
      console.log('🔍 checkAuth response:', JSON.stringify(res));
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
      console.log('🔍 login response:', JSON.stringify(res));
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
      // 🛡️ Disconnect socket FIRST (while authUser still exists)
      get().disconnectSocket();
      await authService.logout();
      set({ authUser: null, onlineUsers: [] });
      localStorage.removeItem('chat-user');
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  },

  connectSocket: () => {
    const { authUser, socket } = get();
    if (!authUser) return;
    
    const userId = authUser._id || authUser.id;
    if (!userId) {
      console.error('❌ Cannot connect socket: No user ID found in authUser:', authUser);
      return;
    }
    
    // 🛡️ If socket exists and is connected OR still connecting, do nothing
    if (socket && (socket.connected || !socket.disconnected)) return;

    // Clean up any old fully-disconnected socket
    if (socket) {
      socket.removeAllListeners();
      socket.disconnect();
      set({ socket: null });
    }

    console.log('🔌 Creating new socket connection for:', userId);

    const newSocket = io(SOCKET_URL, {
      query: { userId: userId },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      timeout: 20000,
      withCredentials: true,
      forceNew: true,
    });

    set({ socket: newSocket });

    newSocket.on('connect', () => {
      console.log('✅ Socket connected! ID:', newSocket.id);
    });

    // Listen for real-time online users updates
    newSocket.on('getOnlineUsers', (userIds) => {
      console.log('👥 Online users updated:', userIds);
      set({ onlineUsers: userIds });
    });

    // 🛡️ ALWAYS-ON sidebar sort — works even when no chat is selected
    // Previously this only ran inside subscribeToMessages (only when ChatWindow mounted)
    newSocket.on('newMessage', (newMessage) => {
      if (!chatStoreRef) return;
      const { users, chatCache, selectedUser, messages } = chatStoreRef.getState();
      const authUser = get().authUser;
      const myId = authUser?._id || authUser?.id;

      // Update messages list if this chat is currently open
      if (selectedUser && newMessage.senderId === selectedUser._id) {
        chatStoreRef.setState({ messages: [...messages, newMessage] });
      }

      // Update cache
      const targetId = newMessage.senderId === myId ? newMessage.receiverId : newMessage.senderId;
      const currentCache = chatCache[targetId] || [];
      const newCache = { ...chatCache, [targetId]: [...currentCache, newMessage] };
      
      // Update + SORT sidebar so receiver's chat card jumps to top 🚀
      const updatedUsers = users.map(u => {
        if (u._id === newMessage.senderId || u._id === newMessage.receiverId) {
          return { ...u, lastMessage: newMessage.text, lastMessageTime: newMessage.createdAt };
        }
        return u;
      }).sort((a, b) => new Date(b.lastMessageTime || 0) - new Date(a.lastMessageTime || 0));

      chatStoreRef.setState({ chatCache: newCache, users: updatedUsers });
    });

    newSocket.on('disconnect', (reason) => {
      console.warn('⚠️ Socket disconnected:', reason);
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Socket Connection Error:', error.message);
    });
  },

  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.removeAllListeners(); // 🛡️ Kill ALL listeners to prevent ghost refs
      socket.disconnect();
      set({ socket: null, onlineUsers: [] });
    }
  },
}));

export default useAuthStore;
