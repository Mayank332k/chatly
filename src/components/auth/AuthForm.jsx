import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, User, Lock, Mail, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useAuthStore from '../../store/useAuthStore';
import styles from './AuthForm.module.css';

const AuthForm = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const login = useAuthStore(state => state.login);
  const signup = useAuthStore(state => state.signup);
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [profilePic, setProfilePic] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const fileInputRef = useRef(null);

  const handleUploadClick = () => {
    if (!loading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePic(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        await login(username, password);
      } else {
        const formData = new FormData();
        formData.append('fullName', fullName);
        formData.append('username', username);
        formData.append('password', password);
        if (profilePic) formData.append('profilePic', profilePic);
        await signup(formData);
      }
      navigate('/chat');
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.formWrapper}>
      <AnimatePresence mode="wait">
        <motion.div 
          key={isLogin ? 'login' : 'signup'}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '32px' }}
        >
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', color: 'var(--accent-primary)', marginBottom: '4px' }}>
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {isLogin ? 'Enter your credentials to access your account' : 'Start your secure conversation journey'}
            </p>
          </div>

          {error && (
            <div style={{ background: '#FEE2E2', color: '#B91C1C', padding: '12px', borderRadius: 'var(--radius-md)', width: '100%', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {!isLogin && (
            <div style={{ position: 'relative', width: '110px', height: '110px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {loading && !isLogin && (
                <motion.svg viewBox="0 0 100 100" style={{ position: 'absolute', width: '100%', height: '100%' }} animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity }}>
                  <circle cx="50" cy="50" r="46" stroke="var(--accent-primary)" strokeWidth="3" fill="transparent" strokeDasharray="60 200" strokeLinecap="round" />
                </motion.svg>
              )}
              <div className={styles.profileUpload} onClick={handleUploadClick}>
                <input type="file" ref={fileInputRef} onChange={handleImageChange} style={{ display: 'none' }} accept="image/*" />
                {previewUrl ? <img src={previewUrl} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : <Camera size={22} />}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className={styles.formContainer}>
            {!isLogin && (
              <div className={styles.inputWrapper}>
                <User size={18} className={styles.inputIcon} />
                <input type="text" placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} required className={styles.inputField} />
              </div>
            )}
            <div className={styles.inputWrapper}>
              <User size={18} className={styles.inputIcon} />
              <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required className={styles.inputField} />
            </div>
            <div className={styles.inputWrapper}>
              <Lock size={18} className={styles.inputIcon} />
              <input type={showPassword ? 'text' : 'password'} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required className={styles.inputField} />
              <div className={styles.passwordToggle} onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </div>
            </div>
            <button type="submit" disabled={loading} className={styles.submitBtn}>
              {loading ? <Loader2 className="animate-spin" size={20} /> : (isLogin ? 'Sign In' : 'Create Account')}
            </button>
            <button type="button" className={styles.frostedBtn} onClick={() => { setIsLogin(!isLogin); setError(null); }}>
              {isLogin ? <>New here? <span>Create Account</span></> : <>Joined before? <span>Login instead</span></>}
            </button>
          </form>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default AuthForm;
