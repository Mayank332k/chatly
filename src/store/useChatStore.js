import { create } from 'zustand';
import messageService from '../services/messageService';
import useAuthStore, { setChatStoreRef } from './useAuthStore';

// 🛡️ localStorage helpers for chat cache persistence
const CACHE_KEY = 'chat-cache';
const CACHE_MAX_AGE = 5 * 60 * 1000; // 5 minutes staleness threshold

const loadCacheFromStorage = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed.data || {};
  } catch { return {}; }
};

const saveCacheToStorage = (cache) => {
  try {
    // Only store last 50 messages per chat to keep localStorage lean
    const trimmed = {};
    for (const [userId, msgs] of Object.entries(cache)) {
      trimmed[userId] = msgs.slice(-50);
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data: trimmed, ts: Date.now() }));
  } catch (e) {
    console.warn('Cache save failed (storage full?):', e);
  }
};

const useChatStore = create((set, get) => ({
  users: [],
  messages: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  chatCache: loadCacheFromStorage(), // 🛡️ Hydrate from localStorage on app start
  typingUsers: [], // ✍️ Track who is typing to us in real-time

  pendingQueue: JSON.parse(localStorage.getItem('pending-messages') || '[]'),
  uploadProgress: {},

  setUploadProgress: (msgId, progress) => {
    set((state) => ({
      uploadProgress: { ...state.uploadProgress, [msgId]: progress }
    }));
  },

  setTypingUsers: (users) => {
    set({ typingUsers: users });
  },

  setSelectedUser: (user) => {
    const { selectedUser: currentSelected, chatCache, getMessages } = get();
    if (currentSelected?._id === user?._id) return;
    
    // ⚡ Load from cache INSTANTLY — zero wait
    const cachedMessages = user ? (chatCache[user._id] || []) : [];
    set({ selectedUser: user, messages: cachedMessages }); 
    
    // 🛡️ If cache has data, show it and do a SILENT background refresh
    // If no cache, do a normal fetch with loading spinner
    if (user) getMessages(user._id, cachedMessages.length > 0);
  },

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const usersList = await messageService.getUsers();
      
      const usersWithLastMsg = await Promise.all(
        usersList.map(async (u) => {
          try {
             // Check cache first for last message preview
             const cached = get().chatCache[u._id];
             if (cached && cached.length > 0) {
               const lastOne = cached[cached.length - 1];
               return { ...u, lastMessage: lastOne?.text || null, lastMessageTime: lastOne?.createdAt || null };
             }
             const history = await messageService.getChatHistory(u._id);
             const lastOne = history[history.length - 1];
             return {
                ...u,
                lastMessage: lastOne?.text || null,
                lastMessageTime: lastOne?.createdAt || null
             };
          } catch (e) {
             return u;
          }
        })
      );

      set({ users: usersWithLastMsg });
    } catch (error) {
      console.error('Error fetching users/history:', error);
      throw error;
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId, silentRefresh = false) => {
    // 🛡️ Only show loading spinner if no cached data
    if (!silentRefresh) set({ isMessagesLoading: true });

    try {
      const serverMessages = await messageService.getChatHistory(userId);
      const localPending = get().pendingQueue.filter(m => m.receiverId === userId);
      const finalData = [...serverMessages, ...localPending];

      const newCache = { ...get().chatCache, [userId]: finalData };
      set({ messages: finalData, chatCache: newCache });
      
      // 💾 Persist to localStorage
      saveCacheToStorage(newCache);
    } catch (error) {
      // If silent refresh fails, keep showing cached data — no crash
      if (!silentRefresh) {
        console.error('Error fetching messages:', error);
        throw error;
      }
    } finally {
      if (!silentRefresh) set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages, pendingQueue, chatCache } = get();
    if (!selectedUser) return;

    const authUser = useAuthStore.getState().authUser;
    const tempId = `temp-${Date.now()}`;

    const optimisticMessage = {
      _id: tempId,
      senderId: authUser?._id || authUser?.id || 'me',
      receiverId: selectedUser._id,
      text: (messageData instanceof FormData) ? messageData.get('text') : messageData.text,
      image: (messageData instanceof FormData && messageData.get('image')) ? URL.createObjectURL(messageData.get('image')) : null,
      createdAt: new Date().toISOString(),
      status: 'sending' 
    };

    const newMessages = [...messages, optimisticMessage];
    const newCache = { ...chatCache, [selectedUser._id]: newMessages };
    set({ messages: newMessages, chatCache: newCache });
    saveCacheToStorage(newCache);

    try {
      const response = await messageService.sendMessage(selectedUser._id, messageData, (percent) => {
        get().setUploadProgress(tempId, percent);
      });
      
      const updatedMessages = get().messages.map(m => m._id === tempId ? { ...response, status: 'sent' } : m);
      const { [tempId]: _, ...remainingProgress } = get().uploadProgress;
      
      const updatedCache = { ...get().chatCache, [selectedUser._id]: updatedMessages };
      set({
        messages: updatedMessages,
        chatCache: updatedCache,
        uploadProgress: remainingProgress,
        users: get().users.map(u => u._id === selectedUser._id 
          ? { ...u, lastMessage: response.text, lastMessageTime: response.createdAt } 
          : u
        ).sort((a, b) => {
          const dateA = new Date(a.lastMessageTime || 0);
          const dateB = new Date(b.lastMessageTime || 0);
          return dateB - dateA;
        })
      });
      saveCacheToStorage(updatedCache);
      return response;
    } catch (error) {
      console.error('Send error (offline/slow):', error);
      
      const failedMessage = { ...optimisticMessage, status: 'failed' };
      set({ messages: get().messages.map(m => m._id === tempId ? failedMessage : m) });

      if (!window.navigator.onLine || error.message?.includes('Network Error')) {
        const newQueue = [...pendingQueue, failedMessage];
        set({ pendingQueue: newQueue });
        localStorage.setItem('pending-messages', JSON.stringify(newQueue));
      }
      
      throw error;
    }
  },

  syncPendingMessages: async () => {
    const { pendingQueue } = get();
    if (pendingQueue.length === 0) return;

    console.log(`Syncing ${pendingQueue.length} pending messages... 🔄`);
    const successfulIds = [];

    for (const msg of pendingQueue) {
       try {
          const data = { text: msg.text };
          await messageService.sendMessage(msg.receiverId, data);
          successfulIds.push(msg._id);
       } catch (e) {
          console.error('Sync retry failed for msg:', msg._id);
       }
    }

    const remainingQueue = pendingQueue.filter(m => !successfulIds.includes(m._id));
    set({ pendingQueue: remainingQueue });
  },

  markMessagesAsRead: async (senderId) => {
    const { messages, chatCache } = get();
    try {
      await messageService.markMessagesAsRead(senderId);
      
      // Optimistically update local messages
      const updatedMessages = messages.map(msg => 
        String(msg.senderId) === String(senderId) ? { ...msg, isRead: true } : msg
      );
      
      const newCache = { ...chatCache, [senderId]: updatedMessages };
      set({ messages: updatedMessages, chatCache: newCache });
      
      saveCacheToStorage(newCache);
    } catch (error) {
      console.error('Error in markMessagesAsRead action:', error);
    }
  },

  _persistCache: () => {
    saveCacheToStorage(get().chatCache);
  },

  subscribeToMessages: () => {},
  unsubscribeFromMessages: () => {},
}));

setChatStoreRef(useChatStore);

export default useChatStore;
