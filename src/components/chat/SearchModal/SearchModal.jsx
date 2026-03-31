import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, User, Compass, ArrowLeft } from 'lucide-react';
import messageService from '../../../services/messageService';
import styles from './SearchModal.module.css';

import useChatStore from '../../../store/useChatStore';

const SearchModal = ({ isOpen, onClose, onSelectUser }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const allUsers = useChatStore(state => state.users);
  const loading = useChatStore(state => state.isUsersLoading);

  const filteredUsers = allUsers.filter(user => {
    const matchesSearch = user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          user.username.toLowerCase().includes(searchQuery.toLowerCase());
    const hasHistory = user.lastMessage || user.lastMessageTime;
    return matchesSearch && !hasHistory;
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0, x: window.innerWidth < 850 ? 50 : -50, scale: window.innerWidth < 850 ? 1 : 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: window.innerWidth < 850 ? 50 : -50, scale: window.innerWidth < 850 ? 1 : 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className={styles.miniExploreWindow}
        >
          {/* Header */}
          <div className={styles.exploreHeader}>
             <div className={styles.headerTop}>
               <div className={styles.titleGroup}>
                 <button className={styles.backBtn} onClick={onClose}>
                    <ArrowLeft size={24} />
                 </button>
                 <Compass size={18} className={styles.accentIcon} />
                 <h3>Explore People</h3>
               </div>
               <button className={styles.closeBtn} onClick={onClose}><X size={18} /></button>
             </div>

             <div className={styles.searchBox}>
               <Search size={16} className={styles.searchIcon} />
               <input 
                 type="text" 
                 placeholder="Find someone new..." 
                 className={styles.searchInput}
                 autoFocus
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
               />
             </div>
          </div>

          {/* Body 🏖️ */}
          <div className={styles.exploreBody}>
             {loading ? (
                <div className={styles.centerMsg}>Scanning users...</div>
             ) : (
                <div className={styles.userGrid}>
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => (
                      <motion.div 
                        key={user._id} 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={styles.userCard} 
                        onClick={() => { onSelectUser(user); onClose(); }}
                      >
                         <div className={styles.userAvatar}>
                           {user.profilePic ? (
                             <img src={user.profilePic} alt={user.username} className={styles.pfp} />
                           ) : (
                             <User size={20} opacity={0.5} />
                           )}
                         </div>
                         <div className={styles.userInfo}>
                           <span className={styles.fullName}>{user.fullName}</span>
                           <span className={styles.username}>@{user.username}</span>
                         </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className={styles.centerMsg}>No explorers found.</div>
                  )}
                </div>
             )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SearchModal;
