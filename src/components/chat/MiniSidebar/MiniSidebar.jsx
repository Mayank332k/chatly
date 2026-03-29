import { useState } from 'react';
import { 
  MessageCircle, 
  Compass, 
  User, 
  LogOut,
  Sparkles
} from 'lucide-react';
import useAuthStore from '../../../store/useAuthStore';
import useChatStore from '../../../store/useChatStore';
import { useNavigate } from 'react-router-dom';
import ProfileModal from '../ProfileModal/ProfileModal';
import styles from './MiniSidebar.module.css';

const MiniSidebar = ({ onExploreClick, className }) => {
  const { authUser: currentUser, logout } = useAuthStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (err) {
      console.error(err);
    }
  };

  const handleSettingsClick = () => {
    if (window.innerWidth < 850) {
      navigate('/settings');
    } else {
      setIsModalOpen(true);
    }
  };

  const handleAiClick = () => {
    const users = useChatStore.getState().users;
    // Find the AI assistant by username
    const aiUser = users.find(u => u.username === 'ai_assistant');
    
    if (aiUser) {
      useChatStore.getState().setSelectedUser(aiUser);
    } else {
      // Create a fallback object if it's not yet loaded
      useChatStore.getState().setSelectedUser({
         _id: 'ai_assistant',
         username: 'ai_assistant',
         fullName: 'Pulse AI Assistance',
         profilePic: null
      });
    }
    navigate('/chat');
  };

  const selectedUser = useChatStore(state => state.selectedUser);
  const setSelectedUser = useChatStore(state => state.setSelectedUser);
  const isAiSelected = selectedUser?.username === 'ai_assistant';

  return (
    <aside className={`${styles.miniSidebar} ${className}`}>
      <div 
        className={`${styles.navIcon} ${!isAiSelected ? styles.active : ''}`} 
        data-tooltip="Chats"
        onClick={() => { setSelectedUser(null); navigate('/chat'); }}
      >
         <MessageCircle size={24} strokeWidth={2.5} />
      </div>

      <div className={styles.navIcon} data-tooltip="Explore People" onClick={onExploreClick}>
         <Compass size={24} strokeWidth={2} />
      </div>

      <div 
        className={`${styles.navIcon} ${isAiSelected ? styles.active : ''}`} 
        data-tooltip="Pulse AI Assistance" 
        onClick={handleAiClick}
      >
         <Sparkles size={24} strokeWidth={2} />
      </div>

      <div className={styles.navSpacer} />

      <div 
        className={styles.pfpContainer} 
        onClick={handleSettingsClick}
        data-tooltip="Profile Settings"
      >
        {currentUser?.profilePic ? (
           <img src={currentUser.profilePic} alt="Me" className={styles.pfpImg} />
        ) : (
           <User size={20} />
        )}
      </div>

      <ProfileModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </aside>
  );
};

export default MiniSidebar;
