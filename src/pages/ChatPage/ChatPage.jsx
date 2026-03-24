import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Sidebar from '../../components/chat/Sidebar/Sidebar';
import ChatWindow from '../../components/chat/ChatWindow/ChatWindow';
import MiniSidebar from '../../components/chat/MiniSidebar/MiniSidebar';
import SearchModal from '../../components/chat/SearchModal/SearchModal';
import searchStyles from './ChatPageStyles.module.css';
import styles from './ChatPage.module.css';
import useChatStore from '../../store/useChatStore';
import useAuthStore from '../../store/useAuthStore';
import logo from '../../assets/logo.png';

const ChatPage = () => {
  const selectedUser = useChatStore(state => state.selectedUser);
  const setSelectedUser = useChatStore(state => state.setSelectedUser);
  const authUser = useAuthStore(state => state.authUser);
  const connectSocket = useAuthStore(state => state.connectSocket);
  const [isExploreOpen, setIsExploreOpen] = useState(false);

  // 📡 Connect socket once on mount — socket.io handles reconnection internally
  useEffect(() => {
    if (authUser) {
      connectSocket();
    }
  }, [authUser, connectSocket]);

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    console.log('Main: Chatting with:', user.username);
  };

  const ChatlyLogo = () => (
    <div className={searchStyles.logoContainer}>
      <img src={logo} alt="Chatly" className={styles.mainLogoImg} />
    </div>
  );

  const EmptyChatState = () => (
    <div className={searchStyles.emptyWrapper}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, type: 'spring' }}
        className={searchStyles.welcomeLottie}
      >
        <ChatlyLogo />
      </motion.div>

      <div style={{ zIndex: 10 }}>
        {/* Headings removed as they are part of the new logo image 🛡️ */}
        
        <p className={searchStyles.welcomeDesc} style={{ marginTop: '20px' }}>
          Connect with friends and colleagues in a private, real-time environment. 
          Select a conversation from the sidebar to start messaging.
        </p>

        <div style={{ display: 'flex', gap: '30px', justifyContent: 'center', marginTop: '50px' }}>
           <div className={searchStyles.featureBadge}>
              <Globe size={18} /> <span>Global Delivery</span>
           </div>
           <div className={searchStyles.featureBadge}>
              <Zap size={18} /> <span>Real-time Sync</span>
           </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className={styles.container}>
      {/* 1. FAR LEFT: THE MINI SIDEBAR 🏰 */}
      <MiniSidebar 
        onExploreClick={() => setIsExploreOpen(true)} 
        className={selectedUser ? styles.miniSidebarHidden : ''} 
      />

      {/* 2. SIDEBAR SECTION */}
      <aside className={styles.sidebar}>
        <Sidebar 
          onSelectUser={handleSelectUser} 
          selectedUserId={selectedUser?._id} 
        />
      </aside>

      {/* 3. MAIN CHAT AREA (THE PLAYGROUND SLIDE-OVER) 🎡 */}
      <main className={`${styles.chatArea} ${selectedUser ? styles.chatAreaActive : ''}`}>
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {selectedUser ? (
             <ChatWindow />
          ) : (
             <div className={styles.mobileHidden}>
               <EmptyChatState />
             </div>
          )}
        </div>
      </main>

      {/* 4. EXPLORE MODAL (SEARCH) 🌍 */}
      {isExploreOpen && (
        <SearchModal 
          isOpen={isExploreOpen}
          onClose={() => setIsExploreOpen(false)} 
          onSelectUser={(u) => {
            handleSelectUser(u);
            setIsExploreOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default ChatPage;
