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

    // 🛡️ ALWAYS-ON sidebar sort and message handling
    newSocket.on('newMessage', (newMessage) => {
      console.log('📨 New message received via socket:', newMessage._id);
      if (!chatStoreRef) return;
      
      const { users, chatCache, selectedUser } = chatStoreRef.getState();
      const authUser = get().authUser;
      const myId = String(authUser?._id || authUser?.id || '');
      const sId = String(newMessage.senderId);
      const rId = String(newMessage.receiverId);

      // Determine which chat ID to update in cache
      const targetChatId = sId === myId ? rId : sId;

      chatStoreRef.setState((state) => {
        const { messages, chatCache } = state;
        
        // Update active messages if this chat is open
        let updatedMessages = messages;
        if (selectedUser && String(selectedUser._id) === targetChatId) {
          // Prevent duplicates (e.g. from local optimistic insert)
          const exists = messages.some(m => m._id === newMessage._id || (m._id.startsWith('temp-') && m.text === newMessage.text));
          if (exists) {
             updatedMessages = messages.map(m => (m._id === newMessage._id || m._id.startsWith('temp-')) ? newMessage : m);
          } else {
             updatedMessages = [...messages, newMessage];
          }
        }

        // Update cache
        const currentCache = chatCache[targetChatId] || [];
        const existsInCache = currentCache.some(m => m._id === newMessage._id);
        const updatedCache = {
          ...chatCache,
          [targetChatId]: existsInCache ? currentCache : [...currentCache, newMessage]
        };

        return { messages: updatedMessages, chatCache: updatedCache };
      });
      
      // Update sidebar sort
      const updatedUsers = users.map(u => {
        if (String(u._id) === sId || String(u._id) === rId) {
          return { ...u, lastMessage: newMessage.text, lastMessageTime: newMessage.createdAt };
        }
        return u;
      }).sort((a, b) => new Date(b.lastMessageTime || 0) - new Date(a.lastMessageTime || 0));

      chatStoreRef.setState({ users: updatedUsers });
      chatStoreRef.getState()._persistCache();
    });

    newSocket.on('messagesRead', ({ senderId, receiverId }) => {
      console.log('👁️ Messages read event received:', { senderId, receiverId });
      if (!chatStoreRef) return;
      
      const authUser = get().authUser;
      const myId = String(authUser?._id || authUser?.id || '');
      const sId = String(senderId);
      const rId = String(receiverId);

      // If User B read User A's messages: sId=A, rId=B
      // If I am User A: targetChatId=B
      // If I am User B: targetChatId=A
      const targetChatId = sId === myId ? rId : sId;

      chatStoreRef.setState((state) => {
        const { selectedUser, messages, chatCache } = state;

        // Update active messages if open
        let updatedMessages = messages;
        if (selectedUser && String(selectedUser._id) === targetChatId) {
          updatedMessages = messages.map(msg => 
            String(msg.senderId) === sId ? { ...msg, isRead: true } : msg
          );
        }

        // Update cache
        const currentCache = chatCache[targetChatId] || [];
        const updatedCache = {
          ...chatCache,
          [targetChatId]: currentCache.map(msg => 
            String(msg.senderId) === sId ? { ...msg, isRead: true } : msg
          )
        };

        return { chatCache: updatedCache, messages: updatedMessages };
      });
      
      chatStoreRef.getState()._persistCache();
    });

    // 🗑️ Listen for delete for everyone events
    newSocket.on('messageDeletedForEveryone', ({ messageId }) => {
      console.log('🗑️ Message deleted for everyone:', messageId);
      if (!chatStoreRef) return;

      chatStoreRef.setState((state) => {
        const { messages, chatCache } = state;

        const updateMsg = (msg) => 
          msg._id === messageId ? { ...msg, text: "Deleted message", image: null, isDeletedForEveryone: true } : msg;

        const updatedMessages = messages.map(updateMsg);
        
        const updatedCache = {};
        for (const [key, msgs] of Object.entries(chatCache)) {
           updatedCache[key] = msgs.map(updateMsg);
        }

        return { messages: updatedMessages, chatCache: updatedCache };
      });
      
      chatStoreRef.getState()._persistCache();
    });

    // ✍️ Listen for typing events
    newSocket.on('typing', (senderId) => {
      if (!chatStoreRef) return;
      const { typingUsers } = chatStoreRef.getState();
      if (!typingUsers.includes(senderId)) {
        chatStoreRef.setState({ typingUsers: [...typingUsers, senderId] });
      }
    });

    // 🛑 Listen for stop-typing events
    newSocket.on('stopTyping', (senderId) => {
      if (!chatStoreRef) return;
      const { typingUsers } = chatStoreRef.getState();
      chatStoreRef.setState({
        typingUsers: typingUsers.filter(id => id !== senderId)
      });
    });

    newSocket.on('disconnect', (reason) => {
      console.warn('⚠️ Socket disconnected:', reason);
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Socket Connection Error:', error.message);
    });
  },

  updateProfile: async (formData) => {
    try {
      const res = await authService.updateProfile(formData);
      set({ authUser: res });
      localStorage.setItem('chat-user', JSON.stringify(res));
      return res;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  },

  updatePassword: async (data) => {
    try {
      const res = await authService.updatePassword(data);
      return res;
    } catch (error) {
      console.error('Update password error:', error);
      throw error;
    }
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
