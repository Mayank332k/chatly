import { create } from 'zustand';
import messageService from '../services/messageService';
import useAuthStore from './useAuthStore';

const useChatStore = create((set, get) => ({
  users: [],
  messages: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  chatCache: {}, // RAM Storage: { userId: messages[] } 🛡️

  pendingQueue: JSON.parse(localStorage.getItem('pending-messages') || '[]'),
  uploadProgress: {}, // 📊 { [msgId]: percentage }

  setUploadProgress: (msgId, progress) => {
    set((state) => ({
      uploadProgress: { ...state.uploadProgress, [msgId]: progress }
    }));
  },

  setSelectedUser: (user) => {
    const { selectedUser: currentSelected, chatCache, getMessages } = get();
    // 🛡️ Prevent redundant set/fetch if same user selected
    if (currentSelected?._id === user?._id) return;
    
    // Check Cache FIRST for instant UI update ⚡
    const cachedMessages = user ? (chatCache[user._id] || []) : [];
    set({ selectedUser: user, messages: cachedMessages }); 
    
    if (user) getMessages(user._id);
  },

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const usersList = await messageService.getUsers();
      
      // 🕵️ Fetch ACTUAL history snippets for each user to replace placeholders
      const usersWithLastMsg = await Promise.all(
        usersList.map(async (u) => {
          try {
             const history = await messageService.getChatHistory(u._id);
             const lastOne = history[history.length - 1];
             return {
                ...u,
                lastMessage: lastOne?.text || null,
                lastMessageTime: lastOne?.createdAt || null
             };
          } catch (e) {
             return u; // Fallback to basic user if history fetch fails
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

  getMessages: async (userId) => {
    // 🛡️ NO LOADING if we already have data in RAM
    const hasCache = get().chatCache[userId] && get().chatCache[userId].length > 0;
    if (!hasCache) set({ isMessagesLoading: true });

    try {
      const serverMessages = await messageService.getChatHistory(userId);
      const localPending = get().pendingQueue.filter(m => m.receiverId === userId);
      const finalData = [...serverMessages, ...localPending];

      set({ 
        messages: finalData,
        chatCache: { ...get().chatCache, [userId]: finalData } 
      });
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    } finally {
      // Only reset if we actually turned it ON
      if (!hasCache) set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages, pendingQueue, chatCache } = get();
    if (!selectedUser) return;

    const authUser = useAuthStore.getState().authUser;
    const tempId = `temp-${Date.now()}`;

    // 1. Create Optimistic Message Object 🎨
    const optimisticMessage = {
      _id: tempId,
      senderId: authUser?._id || 'me',
      receiverId: selectedUser._id,
      text: (messageData instanceof FormData) ? messageData.get('text') : messageData.text,
      image: (messageData instanceof FormData && messageData.get('image')) ? URL.createObjectURL(messageData.get('image')) : null,
      createdAt: new Date().toISOString(),
      status: 'sending' 
    };

    // 2. Instant Local Update (Messages + Cache) 🏗️
    const newMessages = [...messages, optimisticMessage];
    set({ 
      messages: newMessages,
      chatCache: { ...chatCache, [selectedUser._id]: newMessages } 
    });

    // 3. Network Call
    try {
      const response = await messageService.sendMessage(selectedUser._id, messageData, (percent) => {
        get().setUploadProgress(tempId, percent);
      });
      
      // Replace optimistic with real server data 🔄
      const updatedMessages = get().messages.map(m => m._id === tempId ? { ...response, status: 'sent' } : m);
      
      // Clear progress once done
      const { [tempId]: _, ...remainingProgress } = get().uploadProgress;
      
      set({
        messages: updatedMessages,
        chatCache: { ...get().chatCache, [selectedUser._id]: updatedMessages }, // 🛡️ SYNC CACHE
        uploadProgress: remainingProgress,
        // Update Sidebar Preview Reactively 🛡️
        users: get().users.map(u => u._id === selectedUser._id 
          ? { ...u, lastMessage: response.text, lastMessageTime: response.createdAt } 
          : u
        )
      });
      return response;
    } catch (error) {
      console.error('Send error (offline/slow):', error);
      
      // 4. Handle Offline/Failure 🛡️
      const failedMessage = { ...optimisticMessage, status: 'failed' };
      
      // Update local view
      set({
        messages: get().messages.map(m => m._id === tempId ? failedMessage : m)
      });

      // Guard for actual network loss (Queue it!)
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
          // Re-bundle data (Note: Images are tricky with local persistence, assuming text for now)
          const data = { text: msg.text };
          await messageService.sendMessage(msg.receiverId, data);
          successfulIds.push(msg._id);
       } catch (e) {
          console.error('Sync retry failed for msg:', msg._id);
       }
    }

    const remainingQueue = pendingQueue.filter(m => !successfulIds.includes(m._id));
    set({ pendingQueue: remainingQueue });
    localStorage.setItem('pending-messages', JSON.stringify(remainingQueue));
  },

  subscribeToMessages: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.on('newMessage', (newMessage) => {
      const { selectedUser, messages, chatCache } = get();
      const isMessageSentFromSelectedUser = newMessage.senderId === selectedUser?._id;
      
      if (isMessageSentFromSelectedUser) {
        set({ messages: [...messages, newMessage] });
      }

      // 🛡️ SYNC CACHE for incoming messages (even if user not selected!)
      const targetId = newMessage.senderId === authUser?._id ? newMessage.receiverId : newMessage.senderId;
      const currentCache = chatCache[targetId] || [];
      set({
        chatCache: {
          ...chatCache,
          [targetId]: [...currentCache, newMessage]
        }
      });

      // Update users list with last message for Sidebar reactive preview 🛡️
      set({
        users: get().users.map(u => {
          if (u._id === newMessage.senderId || u._id === newMessage.receiverId) {
             return { 
               ...u, 
               lastMessage: newMessage.text, 
               lastMessageTime: newMessage.createdAt 
             };
          }
          return u;
        })
      });
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;
    socket.off('newMessage');
  },
}));

export default useChatStore;
