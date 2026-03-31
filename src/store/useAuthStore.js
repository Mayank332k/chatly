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
    // ⚡ Optimality: If we already have a user in localStorage, connect immediately
    // so they appear online right away on refresh.
    const cachedUser = get().authUser;
    if (cachedUser) {
      console.log('🚀 Hydrated user found, connecting socket instantly...');
      get().connectSocket();
    }

    try {
      const res = await authService.checkAuth();
      console.log('🔍 checkAuth response:', JSON.stringify(res));
      set({ authUser: res });
      localStorage.setItem('chat-user', JSON.stringify(res)); // 🛡️ Persist for instant refresh
      get().connectSocket(); // Verify/Reconnect on successful response
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
    
    // 🛡️ Only guard if the socket is ACTIVELY connected
    if (socket?.connected) return;

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

    // ⚡ Real-time status updates (incremental)
    newSocket.on('user_online', (userId) => {
      console.log('✨ User came online:', userId);
      set((state) => ({
        onlineUsers: state.onlineUsers.includes(userId) 
          ? state.onlineUsers 
          : [...state.onlineUsers, userId]
      }));
    });

    newSocket.on('user_offline', (userId) => {
      console.log('🌙 User went offline:', userId);
      set((state) => ({
        onlineUsers: state.onlineUsers.filter(id => String(id) !== String(userId))
      }));
    });

    // 🛡️ Request initial online list
    newSocket.emit('request_online_users');

    // 🛡️ ALWAYS-ON sidebar sort and message handling
    newSocket.on('newMessage', (newMessage) => {
      console.log('📨 New message received via socket:', newMessage._id);
      if (!chatStoreRef) return;
      
      const authUser = get().authUser;
      const myId = String(authUser?._id || authUser?.id || '');
      const sId = String(newMessage.senderId);
      const rId = String(newMessage.receiverId);

      // 🛡️ SKIP messages I sent myself — those are handled by the HTTP response
      // in sendMessage(). Processing them here too causes duplicates.
      const iSentThis = sId === myId;
      
      // Determine which chat ID to update in cache
      const targetChatId = iSentThis ? rId : sId;

      const { selectedUser } = chatStoreRef.getState();

      chatStoreRef.setState((state) => {
        const { messages, chatCache, users } = state;
        
        let updatedMessages = messages;
        if (selectedUser && String(selectedUser._id) === targetChatId) {
          // Check if this exact message _id already exists
          const existsByRealId = messages.some(m => m._id === newMessage._id);
          
          if (existsByRealId) {
            // Already here (e.g. from HTTP response) — just update it in place
            updatedMessages = messages.map(m => m._id === newMessage._id ? { ...newMessage, status: 'sent' } : m);
          } else if (iSentThis) {
            // I sent this — find & replace my temp/pending placeholder by matching text + receiverId
            const tempIdx = messages.findIndex(m => 
              (m._id.startsWith?.('temp-') || m._id.startsWith?.('sent-')) && 
              String(m.receiverId) === rId && 
              m.text === newMessage.text
            );
            if (tempIdx !== -1) {
              updatedMessages = [...messages];
              updatedMessages[tempIdx] = { ...newMessage, status: 'sent' };
            }
            // If no temp found, skip — HTTP response will handle it
          } else {
            // Someone else sent this to me — just append
            updatedMessages = [...messages, newMessage];
          }
        }

        // Update cache with dedup
        const currentCache = chatCache[targetChatId] || [];
        const existsInCache = currentCache.some(m => m._id === newMessage._id);
        let updatedCacheArr;
        if (existsInCache) {
          updatedCacheArr = currentCache.map(m => m._id === newMessage._id ? newMessage : m);
        } else if (iSentThis) {
          // Replace temp in cache
          const tempCacheIdx = currentCache.findIndex(m => 
            (m._id.startsWith?.('temp-') || m._id.startsWith?.('sent-')) && 
            String(m.receiverId) === rId && 
            m.text === newMessage.text
          );
          if (tempCacheIdx !== -1) {
            updatedCacheArr = [...currentCache];
            updatedCacheArr[tempCacheIdx] = newMessage;
          } else {
            updatedCacheArr = currentCache; // Don't add — HTTP will handle
          }
        } else {
          updatedCacheArr = [...currentCache, newMessage];
        }
        
        const updatedCache = { ...chatCache, [targetChatId]: updatedCacheArr };

        // 3. Update sidebar sort
        let userWasFound = false;
        const updatedUsers = users.map(u => {
          if (String(u._id) === targetChatId) {
            userWasFound = true;
            return { ...u, lastMessage: newMessage.text, lastMessageTime: newMessage.createdAt };
          }
          return u;
        }).sort((a, b) => new Date(b.lastMessageTime || 0) - new Date(a.lastMessageTime || 0));

        // 🚨 CRITICAL FIX: If this message is from a new user (not in our current list),
        // we MUST refresh the users list/history so they appear in our sidebar!
        if (!userWasFound) {
           console.log('🔰 Message from new contact. Syncing users list...');
           setTimeout(() => chatStoreRef.getState().getUsers(), 500); 
        }

        return { 
          messages: updatedMessages, 
          chatCache: updatedCache,
          users: updatedUsers 
        };
      });
      
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

    // 🤖 ChatyAi Streaming Listeners
    newSocket.on('chatyAiStreamStart', ({ senderId }) => {
      console.log('🤖🔵 [Socket] chatyAiStreamStart from:', senderId);
      if (!chatStoreRef) return;
      chatStoreRef.setState({ isAiThinking: true });
    });

    newSocket.on('chatyAiChunk', ({ content, senderId }) => {
      console.log('🤖📦 [Socket] chatyAiChunk:', content?.slice(0, 20), '...');
      if (!chatStoreRef) return;
      chatStoreRef.getState().handleAiChunk('ai-streaming-active', content, senderId, get().authUser?._id);
    });

    newSocket.on('chatyAiStreamEnd', (finalMessage) => {
      console.log('🤖✅ [Socket] chatyAiStreamEnd. msgId:', finalMessage?._id, '| text:', finalMessage?.text?.slice(0, 30));
      if (!chatStoreRef) return;
      chatStoreRef.setState({ isAiThinking: false });
      
      chatStoreRef.setState((state) => {
        const { messages, chatCache } = state;
        const tempId = 'ai-streaming-active';
        const targetChatId = String(finalMessage.senderId);

        // Replace the streaming placeholder with the final message
        const hasStreaming = messages.some(m => m.tempId === tempId || m._id === tempId);
        console.log('🤖✅ [Socket] StreamEnd merge. hasStreaming:', hasStreaming, '| msg count:', messages.length);
        
        let updatedMessages;
        if (hasStreaming) {
          updatedMessages = messages.map(m => (m.tempId === tempId || m._id === tempId) ? finalMessage : m);
        } else {
          // Streaming placeholder was never added (no chunks arrived) — append directly
          updatedMessages = [...messages, finalMessage];
        }
        
        const currentCache = chatCache[targetChatId] || [];
        const hasCacheStreaming = currentCache.some(m => m.tempId === tempId || m._id === tempId);
        let updatedCacheArr;
        if (hasCacheStreaming) {
          updatedCacheArr = currentCache.map(m => (m.tempId === tempId || m._id === tempId) ? finalMessage : m);
        } else {
          updatedCacheArr = [...currentCache, finalMessage];
        }

        return { 
          messages: updatedMessages,
          chatCache: { ...chatCache, [targetChatId]: updatedCacheArr }
        };
      });
      chatStoreRef.getState()._persistCache();
    });

    newSocket.on('disconnect', (reason) => {
      console.warn('⚠️ Socket disconnected:', reason);
      // Auto-reconnect if it's not a manual user disconnect
      if (reason === "io server disconnect" || reason === "transport close") {
         setTimeout(() => get().connectSocket(), 3000);
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Socket Connection Error:', error.message);
      // Retry connection every 5s if failed
      setTimeout(() => get().connectSocket(), 5000);
    });

    // 🛡️ Tab Visibility Re-Sync: If user comes back to the tab, ensure socket is alive
    const hv = () => {
      if (document.visibilityState === 'visible') {
        const s = get().socket;
        if (!s || !s.connected) get().connectSocket();
      }
    };
    document.addEventListener('visibilitychange', hv);
    newSocket._hv = hv; // Store for cleanup
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
      if (socket._hv) document.removeEventListener('visibilitychange', socket._hv);
      socket.removeAllListeners();
      socket.disconnect();
      set({ socket: null, onlineUsers: [] });
    }
  },
}));

export default useAuthStore;
