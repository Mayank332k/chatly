import { useState } from 'react';
import { 
  MessageCircle, 
  Compass, 
  User, 
  LogOut 
} from 'lucide-react';
import useAuthStore from '../../../store/useAuthStore';
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

  return (
    <aside className={`${styles.miniSidebar} ${className}`}>
      <div className={`${styles.navIcon} ${styles.active}`} data-tooltip="Chats">
         <MessageCircle size={24} strokeWidth={2.5} />
      </div>

      <div className={styles.navIcon} data-tooltip="Explore People" onClick={onExploreClick}>
         <Compass size={24} strokeWidth={2} />
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
