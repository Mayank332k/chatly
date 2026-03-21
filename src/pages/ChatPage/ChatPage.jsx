import { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, ShieldCheck, Zap, Globe } from 'lucide-react';
import Sidebar from '../../components/chat/Sidebar/Sidebar';
import ChatWindow from '../../components/chat/ChatWindow/ChatWindow';
import MiniSidebar from '../../components/chat/MiniSidebar/MiniSidebar';
import SearchModal from '../../components/chat/SearchModal/SearchModal';
import searchStyles from './ChatPageStyles.module.css';
import styles from './ChatPage.module.css';
import useChatStore from '../../store/useChatStore';

const ChatPage = () => {
  const selectedUser = useChatStore(state => state.selectedUser);
  const setSelectedUser = useChatStore(state => state.setSelectedUser);
  const [isExploreOpen, setIsExploreOpen] = useState(false);

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    console.log('Main: Chatting with:', user.username);
  };

  const EmptyChatState = () => (
    <div className={searchStyles.emptyWrapper}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1 }}
        className={searchStyles.welcomeLottie}
      >
        <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-subtle)', opacity: 0.15, position: 'relative' }}>
           <MessageSquare size={120} strokeWidth={1} color="var(--accent-primary)" style={{ opacity: 0.8 }} />
        </div>
      </motion.div>

      <div style={{ zIndex: 10 }}>
        <h1 className={searchStyles.welcomeTitle}>Welcome to SecureChat</h1>
        <p className={searchStyles.welcomeDesc}>
          Connect with friends and colleagues in a private, real-time environment. 
          Select a conversation from the sidebar or find someone new using search to start messaging.
        </p>

        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginTop: '40px' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-primary)', fontSize: '0.85rem' }}>
              <ShieldCheck size={18} /> <span>End-to-End Encrypted</span>
           </div>
           <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-primary)', fontSize: '0.85rem' }}>
              <Globe size={18} /> <span>Global Delivery</span>
           </div>
           <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-primary)', fontSize: '0.85rem' }}>
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
