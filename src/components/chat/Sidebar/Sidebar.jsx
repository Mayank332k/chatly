import { useState, useEffect } from 'react';
import { Search, User, LogOut, Check, Trash2, MoreHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useAuthStore from '../../../store/useAuthStore';
import useChatStore from '../../../store/useChatStore';
import styles from './Sidebar.module.css';

const Sidebar = ({ onSelectUser }) => {
  const users = useChatStore(state => state.users);
  const loading = useChatStore(state => state.isUsersLoading);
  const getUsers = useChatStore(state => state.getUsers);
  const clearChat = useChatStore(state => state.clearChat);
  const setSelectedUser = useChatStore(state => state.setSelectedUser);
  const selectedUserId = useChatStore(state => state.selectedUser?._id);
  
  const authUser = useAuthStore(state => state.authUser);
  const onlineUsers = useAuthStore(state => state.onlineUsers);
  const logout = useAuthStore(state => state.logout);
  const typingUsers = useChatStore(state => state.typingUsers);
  const isAiThinking = useChatStore(state => state.isAiThinking);
  const [searchQuery, setSearchQuery] = useState('');
  const [userToDelete, setUserToDelete] = useState(null);
  
  useEffect(() => {
    getUsers();
  }, [getUsers]);

  const sortUsers = (list) => {
    return [...list].sort((a, b) => {
      const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
      const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
      return timeB - timeA;
    });
  };

  const handleDelete = async () => {
    if (!userToDelete) return;
    try {
      await clearChat(userToDelete._id);
      setUserToDelete(null);
      // If the currently open chat was deleted, close it
      if (selectedUserId === userToDelete._id) {
        setSelectedUser(null);
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const filteredUsers = sortUsers(
    users.filter(user => {
      const matchesSearch = user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          user.username.toLowerCase().includes(searchQuery.toLowerCase());
      const hasHistory = user.lastMessage || user.lastMessageTime;
      return matchesSearch && hasHistory;
    })
  );

  return (
    <div className={styles.sidebarWrapper}>
      {/* 🧹 Clear Chat Confirmation Modal (Unified Design) */}
      <AnimatePresence>
        {userToDelete && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className={styles.modalOverlay} 
            onClick={() => setUserToDelete(null)}
            style={{ zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          >
             <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.95, opacity: 0 }} 
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'rgba(25, 25, 25, 0.45)',
                backdropFilter: 'blur(30px) saturate(150%)',
                WebkitBackdropFilter: 'blur(30px) saturate(150%)',
                width: '100%',
                maxWidth: window.innerWidth < 768 ? '285px' : '300px',
                padding: window.innerWidth < 768 ? '22px 18px' : '24px 20px', 
                borderRadius: '50px',
                display: 'flex', flexDirection: 'column', gap: '14px',
                boxShadow: '0 20px 50px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.08)'
              }}
            >
               <div style={{ textAlign: 'center' }}>
                 <h3 style={{ margin: '0 0 4px 0', color: '#ffffff', fontSize: window.innerWidth < 768 ? '18px' : '16px', fontWeight: '600' }}>
                   Clear chat?
                 </h3>
                 <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: window.innerWidth < 768 ? '13px' : '11px', lineHeight: '1.4' }}>
                   This will delete your entire history with <strong>{userToDelete.fullName}</strong>.
                 </p>
               </div>
               
               <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                 <button 
                    onClick={() => setUserToDelete(null)}
                    style={{ flex: 1, padding: window.innerWidth < 768 ? '12px' : '13px', background: 'rgba(255,255,255,0.08)', borderRadius: '40px', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: window.innerWidth < 768 ? '15px' : '14px', fontWeight: '600', cursor: 'pointer', transition: 'transform 0.1s' }}
                    onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
                    onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                 >
                   Cancel
                 </button>
                 <button 
                    onClick={handleDelete}
                    style={{ flex: 1, padding: window.innerWidth < 768 ? '12px' : '13px', background: '#ff5c5c', borderRadius: '40px', border: 'none', color: '#ffffff', fontSize: window.innerWidth < 768 ? '15px' : '14px', fontWeight: '700', cursor: 'pointer', transition: 'transform 0.1s' }}
                    onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
                    onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                 >
                   Clear
                 </button>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={styles.sidebarHeader}>
        <div className={styles.searchBox}>
          <Search size={18} className={styles.searchIcon} />
          <input 
            type="text" 
            placeholder="Search chats..." 
            className={styles.searchField}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.conversationList}>
        <div className={styles.listLabel}>DIRECT MESSAGES</div>
        
        {loading ? (
          <div className={styles.minimalLoadingContainer}>
             <div className={styles.loadingInfo}>
               <span>Syncing Chats...</span>
             </div>
             <div className={styles.minimalProgressBar}>
                <motion.div 
                   initial={{ width: "0%" }}
                   animate={{ width: "100%" }}
                   transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
                   className={styles.minimalProgressInner} 
                />
             </div>
          </div>
        ) : (
          filteredUsers.map((user) => (
            <motion.div 
              key={user._id} 
              layout /* 🛡️ MAGIC: Smooth Slides instead of Jumps */
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                type: 'spring', 
                damping: 25, 
                stiffness: 200,
                layout: { duration: 0.4 } 
              }}
              whileTap={{ scale: 0.98 }}
              className={`${styles.userItem} ${selectedUserId === user._id ? styles.userItemActive : ''}`}
              onClick={() => onSelectUser(user)}
              onContextMenu={(e) => {
                e.preventDefault();
                setUserToDelete(user);
              }}
            >
              <div className={styles.avatarWrapper}>
                {user.profilePic ? (
                  <img src={user.profilePic} alt={user.username} className={styles.pfp} />
                ) : (
                  <div className={styles.defaultPfp}><User size={20} /></div>
                )}
                {(user.username === 'ai_assistant' || onlineUsers.some(id => String(id) === String(user._id))) && <div className={styles.onlineStatus} />}
              </div>

              <div className={styles.contactMeta}>
                <div className={styles.metaTop}>
                  <span className={styles.fullName}>{user.fullName}</span>
                  <div className={styles.metaActions}>
                    <span className={styles.timestamp}>
                      {user.lastMessageTime 
                        ? new Date(user.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                        : '12:45 PM'}
                    </span>
                    
                    {/* 🗑️ DELETE CHAT ACTION */}
                    <button
                      className={styles.sidebarTrashBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        setUserToDelete(user);
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className={styles.metaBottom}>
                  <span className={styles.lastMessage}>
                    { (typingUsers.includes(String(user._id)) || (user.username === 'ai_assistant' && isAiThinking)) ? (
                       <span style={{ color: 'var(--accent-primary)', fontWeight: '600', animation: 'Chatly 1.5s infinite' }}>
                         {user.username === 'ai_assistant' ? 'Thinking... 🪄' : 'Typing...'}
                       </span>
                    ) : (
                       user.lastMessage || `Say hi to ${user.fullName.split(' ')[0]}! 👋`
                    )}
                  </span>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Sidebar Footer Removed for Minimalist Look 🛡️ */}
    </div>
  );
};

export default Sidebar;
