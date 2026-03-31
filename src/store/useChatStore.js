import { create } from 'zustand';
import messageService from '../services/messageService';
import chatbotService from '../services/chatbotService'; // 🤖 AI Service
import useAuthStore, { setChatStoreRef } from './useAuthStore';

// 🛡️ localStorage helpers for chat cache persistence
const CACHE_KEY = 'chat-cache';
const CACHE_MAX_AGE = 5 * 60 * 1000; // 5 minutes staleness threshold

const loadCacheFromStorage = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const data = parsed.data || {};
    // 🛡️ Deduplicate any corrupted cache entries on load
    const cleaned = {};
    for (const [userId, msgs] of Object.entries(data)) {
      const seen = new Set();
      cleaned[userId] = msgs.filter(m => {
        if (!m._id || seen.has(m._id)) return false;
        seen.add(m._id);
        return true;
      });
    }
    return cleaned;
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
  isAiThinking: false, // 🤖 Track if AI is currently generating a response

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
      
      // 🛡️ SYNC SIDEBAR: Update lastMessage info in the users list
      const lastOne = finalData.length > 0 ? finalData[finalData.length - 1] : null;
      const updatedUsers = get().users.map(u => {
        if (String(u._id) === String(userId) && lastOne) {
          return { ...u, lastMessage: lastOne.text, lastMessageTime: lastOne.createdAt };
        }
        return u;
      }).sort((a, b) => new Date(b.lastMessageTime || 0) - new Date(a.lastMessageTime || 0));

      set({ messages: finalData, chatCache: newCache, users: updatedUsers });
      
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
      let response;
      const isAiAssistant = selectedUser.username === 'ai_assistant';

      if (isAiAssistant) {
        // 🤖 Call the AI talk endpoint instead
        const aiPayload = (messageData instanceof FormData) ? { text: messageData.get('text') } : messageData;
        set({ isAiThinking: true }); // Show "thinking" status
        try {
          response = await chatbotService.talk(aiPayload);
        } finally {
          set({ isAiThinking: false });
        }


        const currentMessages = get().messages;
        
        // Step 1: Confirm user's optimistic message as "sent" (keep temp ID for socket dedup)
        // If socket already replaced temp with real msg, this is a harmless no-op.
        const userMsgConfirmed = currentMessages.map(m => 
          m._id === tempId ? { ...m, status: 'sent' } : m
        );

        // Step 2: Append AI reply ONLY if socket hasn't already delivered it
        // Check by _id first, then fallback to text+sender match to catch all cases
        const aiReplyId = response?._id;
        const aiReplyText = response?.text;
        const aiSenderId = String(response?.senderId || '');
        
        const aiAlreadyInList = userMsgConfirmed.some(m => 
          m._id === aiReplyId || 
          (aiReplyText && String(m.senderId) === aiSenderId && m.text === aiReplyText)
        );
        
        const updatedMessages = aiAlreadyInList 
          ? userMsgConfirmed 
          : [...userMsgConfirmed, { ...response, status: 'sent' }];

        const { [tempId]: _, ...remainingProgress } = get().uploadProgress;
        const updatedCache = { ...get().chatCache, [selectedUser._id]: updatedMessages };

        set({
          messages: updatedMessages,
          chatCache: updatedCache,
          uploadProgress: remainingProgress,
          users: get().users.map(u => 
            String(u._id) === String(selectedUser._id) 
            ? { ...u, lastMessage: response.text, lastMessageTime: response.createdAt } 
            : u
          ).sort((a, b) => new Date(b.lastMessageTime || 0) - new Date(a.lastMessageTime || 0))
        });

        saveCacheToStorage(updatedCache);
        return response;
      }

      // 👤 Normal user flow
      response = await messageService.sendMessage(selectedUser._id, messageData, (percent) => {
        get().setUploadProgress(tempId, percent);
      });
      
      // 🛡️ Robust Deduplication: Check if Message already arrived via Socket
      const currentMessages = get().messages;
      const alreadyInList = currentMessages.some(m => m._id === response?._id);

      let updatedMessages;
      if (alreadyInList) {
        // Just update status of existing message
        updatedMessages = currentMessages.map(m => m._id === response?._id ? { ...m, status: 'sent' } : m);
        // And remove the temp one if it's still hanging around
        updatedMessages = updatedMessages.filter(m => m._id !== tempId);
      } else {
        // Standard replacement of optimistic placeholder
        updatedMessages = currentMessages.map(m => m._id === tempId ? { ...response, status: 'sent' } : m);
      }

      const { [tempId]: _, ...remainingProgress } = get().uploadProgress;
      const updatedCache = { ...get().chatCache, [selectedUser._id]: updatedMessages };

      set({
        messages: updatedMessages,
        chatCache: updatedCache,
        uploadProgress: remainingProgress,
        users: get().users.map(u => 
          String(u._id) === String(selectedUser._id) 
          ? { ...u, lastMessage: response.text, lastMessageTime: response.createdAt } 
          : u
        ).sort((a, b) => new Date(b.lastMessageTime || 0) - new Date(a.lastMessageTime || 0))
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

  summarizeChat: async (userId) => {
    try {
      const response = await chatbotService.summarize(userId);
      return response.summary;
    } catch (error) {
      console.error('Summarization failed:', error);
      throw error;
    }
  },

  clearChat: async (userId) => {
    try {
      await messageService.clearChat(userId);
      const { chatCache } = get();
      const newCache = { ...chatCache };
      delete newCache[userId];
      
      // 🛡️ SYNC SIDEBAR: Move user back to Explore (reset history info)
      const updatedUsers = get().users.map(u => {
        if (String(u._id) === String(userId)) {
          return { ...u, lastMessage: null, lastMessageTime: null };
        }
        return u;
      });

      set({ messages: [], chatCache: newCache, users: updatedUsers });
      saveCacheToStorage(newCache);
    } catch (error) {
      console.error('Error clearing chat:', error);
      throw error;
    }
  },

  deleteForMe: async (messageId) => {
    try {
      await messageService.deleteForMe(messageId);
      const { messages, chatCache, selectedUser } = get();
      
      const updatedMessages = messages.filter(msg => msg._id !== messageId);
      const newCache = { ...chatCache };
      
      if (selectedUser) {
         newCache[selectedUser._id] = (newCache[selectedUser._id] || []).filter(msg => msg._id !== messageId);
      } else {
         for (const key in newCache) {
             newCache[key] = newCache[key].filter(msg => msg._id !== messageId);
         }
      }

      set({ messages: updatedMessages, chatCache: newCache });
      saveCacheToStorage(newCache);
    } catch (error) {
      console.error('Error deleting message for me:', error);
      throw error;
    }
  },

  deleteForEveryone: async (messageId) => {
    try {
      await messageService.deleteForEveryone(messageId);
      const { messages, chatCache, selectedUser } = get();
      
      const updateMsg = (msg) => 
        msg._id === messageId ? { ...msg, text: "Deleted message", image: null, isDeletedForEveryone: true } : msg;
      
      const updatedMessages = messages.map(updateMsg);
      const newCache = { ...chatCache };
      
      if (selectedUser) {
         newCache[selectedUser._id] = (newCache[selectedUser._id] || []).map(updateMsg);
      } else {
         for (const key in newCache) {
             newCache[key] = newCache[key].map(updateMsg);
         }
      }

      set({ messages: updatedMessages, chatCache: newCache });
      saveCacheToStorage(newCache);
    } catch (error) {
      console.error('Error deleting message for everyone:', error);
      throw error;
    }
  },

  handleAiChunk: (tempId, chunk, senderId, receiverId) => {
    const { messages, chatCache } = get();
    const myId = String(useAuthStore.getState().authUser?._id || useAuthStore.getState().authUser?.id || '');
    
    // Determine which chat ID to update (the partner's ID)
    const targetChatId = String(senderId) === myId ? String(receiverId) : String(senderId);

    set((state) => {
        // 🛡️ Find if this streaming message already exists in the ACTIVE view
        const msgIndex = state.messages.findIndex(m => m.tempId === tempId || m._id === tempId);
        
        let updatedMessages = [...state.messages];
        if (msgIndex !== -1) {
            updatedMessages[msgIndex] = {
                ...updatedMessages[msgIndex],
                text: (updatedMessages[msgIndex].text || "") + chunk,
                isStreaming: true
            };
        } else {
            // Add new streaming message placeholder
            updatedMessages.push({
                _id: tempId,
                tempId,
                senderId,
                receiverId,
                text: chunk,
                createdAt: new Date().toISOString(),
                isStreaming: true
            });
        }

        // 🛡️ Update the cache as well for consistency
        const currentCache = state.chatCache[targetChatId] || [];
        const cacheIndex = currentCache.findIndex(m => m.tempId === tempId || m._id === tempId);
        let updatedCacheArr = [...currentCache];

        if (cacheIndex !== -1) {
            updatedCacheArr[cacheIndex] = {
                ...updatedCacheArr[cacheIndex],
                text: (updatedCacheArr[cacheIndex].text || "") + chunk,
                isStreaming: true
            };
        } else {
            updatedCacheArr.push({
                _id: tempId,
                tempId,
                senderId,
                receiverId,
                text: chunk,
                createdAt: new Date().toISOString(),
                isStreaming: true
            });
        }

        const newChatCache = { ...state.chatCache, [targetChatId]: updatedCacheArr };
        
        // 🛡️ Sync with sidebar user list
        const updatedUsers = state.users.map(u => {
          if (String(u._id) === targetChatId) {
            const currentText = (msgIndex !== -1 ? updatedMessages[msgIndex].text : chunk);
            return { ...u, lastMessage: currentText, lastMessageTime: new Date().toISOString() };
          }
          return u;
        }).sort((a, b) => new Date(b.lastMessageTime || 0) - new Date(a.lastMessageTime || 0));

        return { 
            messages: updatedMessages,
            chatCache: newChatCache,
            users: updatedUsers
        };
    });
  },

  subscribeToMessages: () => {},
  unsubscribeFromMessages: () => {},
}));

setChatStoreRef(useChatStore);

export default useChatStore;
