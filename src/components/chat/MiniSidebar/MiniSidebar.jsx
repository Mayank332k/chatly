import { useState } from 'react';
import { 
  MessageCircle, 
  Compass, 
  Settings, 
  User, 
  Calendar, 
  LogOut, 
  Mail,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useAuthStore from '../../../store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import styles from './MiniSidebar.module.css';

const MiniSidebar = ({ onExploreClick, className }) => {
  const { authUser: currentUser, logout } = useAuthStore();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <aside className={`${styles.miniSidebar} ${className}`}>
      <div className={styles.topSection}>
        <div className={`${styles.navIcon} ${styles.active}`} data-tooltip="Chats">
           <MessageCircle size={24} strokeWidth={2.5} />
        </div>

        <div className={styles.navIcon} data-tooltip="Explore People" onClick={onExploreClick}>
           <Compass size={24} strokeWidth={2} />
        </div>

        {/* Settings moved to topSection for horizontal flow on mobile */}
        <div className={styles.navIcon} data-tooltip="Settings">
           <Settings size={24} strokeWidth={2} />
        </div>
      </div>

      <div className={styles.bottomSection}>
        {/* Profile Card Container (Now at bottom/right) */}
        <div className={styles.profileWrapper}>
            <div 
              className={styles.pfpContainer} 
              onClick={() => setIsProfileOpen(!isProfileOpen)}
            >
              {currentUser?.profilePic ? (
                 <img src={currentUser.profilePic} alt="Me" className={styles.pfpImg} />
              ) : (
                 <User size={20} />
              )}
            </div>

            {/* THE MINI CARD 🏰 */}
            <AnimatePresence>
              {isProfileOpen && currentUser && (
                <motion.div 
                   initial={{ opacity: 0, x: -20, scale: 0.95 }}
                   animate={{ 
                      opacity: 1, 
                      x: window.innerWidth < 850 ? -100 : 70, // Shift left on mobile to center
                      y: window.innerWidth < 850 ? -80 : 0, 
                      scale: 1 
                   }}
                   exit={{ opacity: 0, x: -20, scale: 0.95 }}
                   className={styles.miniCard}
                >
                   <div className={styles.cardHeader}>
                      <div className={styles.cardUser}>
                         {currentUser.profilePic ? (
                            <img src={currentUser.profilePic} alt={currentUser.fullName} className={styles.cardAvatar} />
                         ) : (
                            <div className={styles.cardAvatarFallback}>
                              <User size={30} strokeWidth={1.5} color="var(--accent-primary)" />
                            </div>
                         )}
                         <div className={styles.cardInfo}>
                           <h4>{currentUser.fullName}</h4>
                           <span className={styles.cardUsername}>@{currentUser.username}</span>
                         </div>
                      </div>
                   </div>

                   <div className={styles.cardBody}>
                      <div className={styles.cardItem}>
                         <Mail size={14} className={styles.cardIcon} />
                         <span>{currentUser.email}</span>
                      </div>
                      <div className={styles.cardItem}>
                         <Calendar size={14} className={styles.cardIcon} />
                         <span>Joined {currentUser.createdAt ? new Date(currentUser.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Recently'}</span>
                      </div>
                   </div>

                   <button className={styles.logoutBtn} onClick={handleLogout}>
                      <LogOut size={16} />
                      <span>Sign Out</span>
                      <ChevronRight size={14} className={styles.chevron} />
                   </button>
                </motion.div>
              )}
            </AnimatePresence>
        </div>
      </div>
    </aside>
  );
};

export default MiniSidebar;
