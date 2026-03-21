import { useState, useEffect, useRef } from 'react';
import { User, Send, Plus, Loader2, X, CheckCheck, Smile, Mic, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useAuthStore from '../../../store/useAuthStore';
import useChatStore from '../../../store/useChatStore';
import styles from './ChatWindow.module.css';

const ChatWindow = () => {
  const messages = useChatStore(state => state.messages);
  const loading = useChatStore(state => state.isMessagesLoading);
  const selectedUser = useChatStore(state => state.selectedUser);
  const getMessages = useChatStore(state => state.getMessages);
  const subscribeToMessages = useChatStore(state => state.subscribeToMessages);
  const unsubscribeFromMessages = useChatStore(state => state.unsubscribeFromMessages);
  const sendMessage = useChatStore(state => state.sendMessage);

  const authUser = useAuthStore(state => state.authUser);
  const onlineUsers = useAuthStore(state => state.onlineUsers);
  const isOnline = onlineUsers.includes(selectedUser?._id);

  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);

  const [selectedImageModal, setSelectedImageModal] = useState(null);

  useEffect(() => {
    if (selectedUser?._id) {
       getMessages(selectedUser._id);
       subscribeToMessages();
    }
    return () => unsubscribeFromMessages();
  }, [selectedUser?._id, getMessages, subscribeToMessages, unsubscribeFromMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, imagePreview]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() && !imageFile || sending) return;

    try {
      setSending(true);
      
      let payload;
      if (imageFile) {
        payload = new FormData();
        payload.append('text', newMessage);
        payload.append('image', imageFile);
      } else {
        payload = { text: newMessage };
      }

      setNewMessage('');
      clearImage();
      await sendMessage(payload);
    } catch (err) {
      console.error('API Sync Error:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={styles.chatWrapper}>
      {/* Lightbox Modal 📸 */}
      <AnimatePresence>
        {selectedImageModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={styles.lightboxOverlay}
            onClick={() => setSelectedImageModal(null)}
          >
            <motion.div 
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.9, opacity: 0 }}
               className={styles.lightboxContent}
               onClick={(e) => e.stopPropagation()}
            >
              <img src={selectedImageModal} alt="Preview" className={styles.fullImage} />
              <button className={styles.closeLightbox} onClick={() => setSelectedImageModal(null)}>
                <X size={24} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className={styles.chatHeader}>
        <div className={styles.headerLeft}>
          <button 
            className={styles.backBtn} 
            onClick={() => useChatStore.getState().setSelectedUser(null)}
          >
            <ArrowLeft size={24} />
          </button>
          
          <div className={styles.profileThumb}>
            {selectedUser.profilePic ? (
              <img src={selectedUser.profilePic} alt={selectedUser.username} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
            ) : (
              <User size={24} color="var(--accent-primary)" />
            )}
            <div className={styles.statusIndicator} style={{ background: isOnline ? '#22C55E' : '#94A3B8' }} />
          </div>
          <div className={styles.userInfo}>
            <h3 className={styles.username}>{selectedUser.fullName}</h3>
            <span className={styles.statusText} style={{ color: isOnline ? '#22C55E' : 'var(--text-secondary)', opacity: 0.8 }}>
               {isOnline ? 'Active Now' : 'Offline'}
            </span>
          </div>
        </div>
      </header>

      <div className={styles.messageList} ref={scrollRef}>
        {/* Top-level Progress Bar 🎡 */}
        {loading && (
          <div className={styles.topProgressBar}>
             <motion.div 
               initial={{ width: "0%" }}
               animate={{ width: "95%" }}
               transition={{ duration: 1, ease: "easeInOut" }}
               className={styles.topProgressInner} 
             />
          </div>
        )}

        <AnimatePresence initial={false}>
          {loading ? (
             <div className={styles.skeletonContainer}>
               {[1, 2, 3].map((i) => (
                 <div key={i} className={`${styles.skeletonBubble} ${i % 2 === 0 ? styles.skeletonLeft : styles.skeletonRight}`}>
                    <div className={styles.skeletonPulse} />
                 </div>
               ))}
             </div>
          ) : messages.length === 0 ? (
             <motion.div 
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               className={styles.noHistoryWrapper}
             >
                <div className={styles.noHistoryIcon}>
                  <User size={42} strokeWidth={1.5} />
                </div>
                <h2 className={styles.noHistoryTitle}>Your inbox is quiet!</h2>
                <p className={styles.noHistoryDesc}>Tap the explore icon below to find friends.</p>
             </motion.div>
          ) : (
            messages.map((msg, index) => {
               const isSentByMe = msg.receiverId === selectedUser._id || msg.senderId === 'me' || msg.senderId === authUser?._id;
               return (
                 <motion.div 
                   key={msg._id || index}
                   initial={{ opacity: 0, scale: 0.95, y: 20 }}
                   animate={{ opacity: 1, scale: 1, y: 0 }}
                   transition={{ type: 'tween', ease: [0.16, 1, 0.3, 1], duration: 0.85 }}
                   className={`${styles.msgItem} ${isSentByMe ? styles.msgSent : styles.msgReceived}`}
                 >
                    <div className={`${styles.bubble} ${isSentByMe ? styles.bubbleSent : styles.bubbleReceived} ${msg.image ? styles.bubbleWithImage : ""}`}>
                      {msg.image && (
                        <img 
                          src={msg.image} 
                          alt="Media" 
                          className={styles.chatImage} 
                          onClick={() => setSelectedImageModal(msg.image)}
                          style={{ cursor: 'pointer' }}
                        />
                      )}
                      {msg.text && <p style={{ padding: msg.image ? "0 12px 14px 12px" : "0" }}>{msg.text}</p>}
                    </div>

                    <div className={styles.timestampContainer}>
                        <span className={styles.msgTime}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {isSentByMe && <CheckCheck size={14} className={styles.checkIcon} />}
                    </div>
                 </motion.div>
               );
            })
          )}
        </AnimatePresence>
      </div>

      <footer className={styles.chatFooter}>
        <input type="file" hidden ref={fileInputRef} onChange={handleFileChange} accept="image/*" />
        
        <AnimatePresence>
          {imagePreview && (
            <motion.div initial={{ opacity: 0, scale: 0.8, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8, y: 20 }} className={styles.imagePreviewContainer}>
              <img src={imagePreview} className={styles.previewImage} alt="Preview" />
              <button type="button" onClick={clearImage} className={styles.clearImageBtn}><X size={16} /></button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className={styles.footerInner}>
          <motion.button 
            type="button"
            onClick={() => fileInputRef.current?.click()} 
            whileHover={{ scale: 1.1 }}
            className={styles.plusBtn}
          >
            <Plus size={24} strokeWidth={3} />
          </motion.button>
          
          <div className={styles.inputWrapper}>
            <input 
              type="text" 
              placeholder="Type your message..." 
              className={styles.redesignInput} 
              value={newMessage} 
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
          </div>

          <button 
            type="button"
            onClick={handleSend}
            className={styles.iconBtn}
            disabled={!newMessage.trim() && !imageFile || sending}
          >
            <Send size={22} color={newMessage.trim() || imageFile ? "var(--accent-primary)" : "var(--text-secondary)"} />
          </button>
        </div>
      </footer>
    </div>
  );
};

export default ChatWindow;
