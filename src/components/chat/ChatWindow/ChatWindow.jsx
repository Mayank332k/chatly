import { useState, useEffect, useRef } from 'react';
import { User, Send, Plus, Loader2, X, CheckCheck, Smile, Mic, ArrowLeft, ArrowUp } from 'lucide-react';
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
  const uploadProgress = useChatStore(state => state.uploadProgress);

  const authUser = useAuthStore(state => state.authUser);
  const onlineUsers = useAuthStore(state => state.onlineUsers);
  
  // 🛡️ Type-safe comparison: Convert both sides to String for guaranteed match
  const isOnline = onlineUsers.some(id => String(id) === String(selectedUser?._id));
  
  // 🕵️ Debug: Log to verify matching (remove after confirming)
  console.log('Online Check:', { 
    selectedId: String(selectedUser?._id), 
    onlineIds: onlineUsers.map(String), 
    result: isOnline 
  });

  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);

  const [selectedImageModal, setSelectedImageModal] = useState(null);
  const [optimisticMessages, setOptimisticMessages] = useState([]);
  const [loadedImages, setLoadedImages] = useState({}); // 🛡️ Track which images have fully downloaded

  useEffect(() => {
    if (selectedUser?._id) {
       getMessages(selectedUser._id);
       setOptimisticMessages([]); // Reset on user change
       setLoadedImages({}); // Reset loaded states
       subscribeToMessages();
    }
    return () => unsubscribeFromMessages();
  }, [selectedUser?._id, getMessages, subscribeToMessages, unsubscribeFromMessages]);

  useEffect(() => {
    // Clear optimistic message once the real one arrives via socket/sync
    if (messages.length > 0) {
      setOptimisticMessages([]);
    }
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, imagePreview, optimisticMessages, loadedImages]);

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
      
      const currentText = newMessage;
      const currentPreview = imagePreview;

      // 🎢 Optimistic UI: Show image in chat instantly
      // Automatically mark our own optimistic preview as loaded so it doesn't spin
      const tempId = 'optimistic-' + Date.now();
      if (imageFile) {
        setLoadedImages(prev => ({ ...prev, [tempId]: true }));
        setOptimisticMessages([{
          _id: tempId,
          text: currentText,
          image: currentPreview,
          senderId: authUser._id,
          receiverId: selectedUser._id,
          createdAt: new Date().toISOString(),
          isOptimistic: true,
          status: 'sending'
        }]);
      }

      let payload;
      if (imageFile) {
        payload = new FormData();
        payload.append('text', currentText);
        payload.append('image', imageFile);
      } else {
        payload = { text: currentText };
      }

      setNewMessage('');
      clearImage();
      const res = await sendMessage(payload);
      
      // Fix Sender Lag: Automatically mark the real Cloudinary URL as loaded for the sender 
      // so it doesn't vanish/show a spinner while redownloading locally what we just sent!
      if (res && res._id && res.image) {
        setLoadedImages(prev => ({ ...prev, [res._id]: true }));
      }
    } catch (err) {
      console.error('API Sync Error:', err);
      // Fallback: Clear optimistic if failed
      setOptimisticMessages([]);
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
            [...messages, ...optimisticMessages].map((msg, index) => {
               const isSentByMe = msg.receiverId === selectedUser._id || msg.senderId === 'me' || msg.senderId === authUser?._id;
               const isImageLoaded = loadedImages[msg._id]; // 🛡️ Check if this specific image is loaded

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
                        <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 'inherit' }}>
                          {/* 🛡️ Receiver Side Download Spinner */}
                          {!isImageLoaded && msg.status !== 'sending' && (
                            <div className={styles.receiverDownloadOverlay}>
                              <Loader2 className="animate-spin" size={32} color="var(--accent-primary)" />
                            </div>
                          )}
                          <img 
                            src={msg.image} 
                            alt="Media" 
                            className={`${styles.chatImage} ${!isImageLoaded && msg.status !== 'sending' ? styles.blurredImage : ''}`} 
                            onClick={() => msg.status !== 'sending' && isImageLoaded && setSelectedImageModal(msg.image)}
                            onLoad={() => setLoadedImages(prev => ({ ...prev, [msg._id]: true }))}
                            style={{ 
                              cursor: msg.status === 'sending' || !isImageLoaded ? 'default' : 'pointer'
                            }}
                          />

                          {msg.status === 'sending' && (
                            <div className={styles.uploadOverlay}>
                               <div className={styles.stretchingSpinner} />
                               <span className={styles.progressText}>{uploadProgress[msg._id] || 0}%</span>
                            </div>
                          )}
                        </div>
                      )}
                      {msg.text && <p style={{ padding: msg.image ? "0 12px 14px 12px" : "0" }}>{msg.text}</p>}
                    </div>

                    <div className={styles.timestampContainer}>
                        <span className={styles.msgTime}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
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
            <ArrowUp size={22} strokeWidth={3} />
          </button>
        </div>
      </footer>
    </div>
  );
};

export default ChatWindow;
