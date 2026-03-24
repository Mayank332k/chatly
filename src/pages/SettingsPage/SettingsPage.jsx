import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Camera, User, Lock, Loader2, CheckCircle2, ArrowLeft, LogOut, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useAuthStore from '../../store/useAuthStore';
import styles from './SettingsPage.module.css';

const SettingsPage = () => {
  const { authUser, updateProfile, updatePassword, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState('profile');
  const navigate = useNavigate();

  // Profile Form State
  const [fullName, setFullName] = useState(authUser?.fullName || '');
  const [profilePic, setProfilePic] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(authUser?.profilePic || null);

  // Password Form State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePic(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      if (fullName) formData.append('fullName', fullName);
      if (profilePic) formData.append('profilePic', profilePic);

      await updateProfile(formData);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err?.message || err || 'Error');
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return setError('Passwords do not match');
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await updatePassword({ oldPassword, newPassword });
      setSuccess(true);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err?.message || err || 'Error');
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.pageWrapper}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/chat')}>
          <ArrowLeft size={24} />
        </button>
        <div className={styles.headerTitle}>
          <h1>Settings</h1>
          <p>Account & Security</p>
        </div>
      </header>

      <main className={styles.mainContent}>
        <div className={styles.tabs}>
          <button 
            className={`${styles.tab} ${activeTab === 'profile' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <User size={18} />
            <span>Profile</span>
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'password' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('password')}
          >
            <Lock size={18} />
            <span>Password</span>
          </button>
        </div>

        <div className={styles.formContainer}>
          <AnimatePresence mode="wait">
            {activeTab === 'profile' ? (
              <motion.form 
                key="profile-form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleUpdateProfile} 
                className={styles.form}
              >
                <div className={styles.avatarSection}>
                  <div 
                    className={styles.avatarContainer}
                    onClick={() => fileInputRef.current.click()}
                  >
                    {previewUrl ? (
                      <img src={previewUrl} alt="Preview" className={styles.avatarImage} />
                    ) : (
                      <div className={styles.avatarPlaceholder}><User size={48} strokeWidth={1.5} /></div>
                    )}
                    <div className={styles.editPencil}>
                      <Pencil size={18} />
                    </div>
                  </div>
                  <input 
                    type="file" 
                    hidden 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept="image/*" 
                  />
                  <div className={styles.avatarDetails}>
                    <h3>{authUser?.fullName}</h3>
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label>Full Name</label>
                  <input 
                    type="text" 
                    value={fullName} 
                    onChange={(e) => setFullName(e.target.value)} 
                    placeholder="Enter your full name"
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label>Username</label>
                  <input 
                    type="text" 
                    value={authUser?.username || ''} 
                    disabled 
                    className={styles.disabledInput}
                  />
                  <span className={styles.inputHint}>Username cannot be changed</span>
                </div>

                <button 
                  type="submit" 
                  className={`${styles.submitBtn} ${success ? styles.successBtn : ''} ${error ? styles.errorBtn : ''}`} 
                  disabled={loading || success}
                >
                  {loading ? (
                    <Loader2 size={20} className={styles.spinner} />
                  ) : success ? (
                    <motion.div
                      initial={{ scale: 0, rotate: -20 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                      <CheckCircle2 size={20} />
                    </motion.div>
                  ) : error ? (
                    error
                  ) : (
                    'Save'
                  )}
                </button>
              </motion.form>
            ) : (
              <motion.form 
                key="password-form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleUpdatePassword} 
                className={styles.form}
              >
                <div className={styles.inputGroup}>
                  <label>Current Password</label>
                  <input 
                    type="password" 
                    value={oldPassword} 
                    onChange={(e) => setOldPassword(e.target.value)} 
                    placeholder="••••••••"
                    required
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label>New Password</label>
                  <input 
                    type="password" 
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)} 
                    placeholder="••••••••"
                    required
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label>Confirm New Password</label>
                  <input 
                    type="password" 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                    placeholder="••••••••"
                    required
                  />
                </div>

                <button 
                  type="submit" 
                  className={`${styles.submitBtn} ${success ? styles.successBtn : ''} ${error ? styles.errorBtn : ''}`} 
                  disabled={loading || success}
                >
                  {loading ? (
                    <Loader2 size={20} className={styles.spinner} />
                  ) : success ? (
                    <motion.div
                      initial={{ scale: 0, rotate: -20 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                      <CheckCircle2 size={20} />
                    </motion.div>
                  ) : error ? (
                    error
                  ) : (
                    'Save'
                  )}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
        <div className={styles.footerSection}>
          <button className={styles.logoutBtn} onClick={() => {
            logout();
            navigate('/');
          }}>
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </main>
    </div>
  );
};

export default SettingsPage;
