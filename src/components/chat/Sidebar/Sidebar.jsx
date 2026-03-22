import { useState, useEffect } from 'react';
import { Search, User, LogOut, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import useAuthStore from '../../../store/useAuthStore';
import useChatStore from '../../../store/useChatStore';
import styles from './Sidebar.module.css';

const Sidebar = ({ onSelectUser }) => {
  const users = useChatStore(state => state.users);
  const loading = useChatStore(state => state.isUsersLoading);
  const getUsers = useChatStore(state => state.getUsers);
  const selectedUserId = useChatStore(state => state.selectedUser?._id);
  
  const authUser = useAuthStore(state => state.authUser);
  const onlineUsers = useAuthStore(state => state.onlineUsers);
  const logout = useAuthStore(state => state.logout);
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredUsers = sortUsers(
    users.filter(user => 
      user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  return (
    <div className={styles.sidebarWrapper}>
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
            >
              <div className={styles.avatarWrapper}>
                {user.profilePic ? (
                  <img src={user.profilePic} alt={user.username} className={styles.pfp} />
                ) : (
                  <div className={styles.defaultPfp}><User size={20} /></div>
                )}
                {onlineUsers.some(id => String(id) === String(user._id)) && <div className={styles.onlineStatus} />}
              </div>

              <div className={styles.contactMeta}>
                <div className={styles.metaTop}>
                  <span className={styles.fullName}>{user.fullName}</span>
                  <span className={styles.timestamp}>
                    {user.lastMessageTime 
                      ? new Date(user.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                      : '12:45 PM'}
                  </span>
                </div>
                <div className={styles.metaBottom}>
                  <span className={styles.lastMessage}>
                    {user.lastMessage || `Say hi to ${user.fullName.split(' ')[0]}! 👋`}
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
