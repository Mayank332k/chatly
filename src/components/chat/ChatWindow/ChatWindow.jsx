import { useState, useEffect, useRef } from 'react';
import { User, Send, Plus, Loader2, X, Check, CheckCheck, Smile, Mic, ArrowLeft, ArrowUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useAuthStore from '../../../store/useAuthStore';
import useChatStore from '../../../store/useChatStore';
import styles from './ChatWindow.module.css';

const SummarizeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    {/* AI Sparkle Accent 🪄 */}
    <path d="M16 3l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2z" fill="currentColor" stroke="none" />
    <path d="M19 10l0.5 1 1 0.5-1 0.5-0.5 1-0.5-1-1-0.5 1-0.5 0.5-1z" fill="currentColor" opacity="0.6" stroke="none" />
    
    {/* Summarization Lines 📝 */}
    <path d="M4 7h8" />
    <path d="M4 12h12" />
    <path d="M4 17h10" />
  </svg>
);

const SummaryLoader = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" className={styles.premiumLoaderSVG}>
    <defs>
      <linearGradient id="spinnerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#ff6b6b" />
        <stop offset="50%" stopColor="#1dd1a1" />
        <stop offset="100%" stopColor="#48dbfb" />
      </linearGradient>
    </defs>
    <path 
      d="M12 2A10 10 0 1 0 22 12" 
      stroke="url(#spinnerGradient)" 
      strokeWidth="3" 
      strokeLinecap="round" 
      fill="none" 
    />
  </svg>
);

const ChatWindow = () => {
  const messages = useChatStore(state => state.messages);
  const loading = useChatStore(state => state.isMessagesLoading);
  const selectedUser = useChatStore(state => state.selectedUser);
  const getMessages = useChatStore(state => state.getMessages);
  const summarizeChat = useChatStore(state => state.summarizeChat);
  const subscribeToMessages = useChatStore(state => state.subscribeToMessages);
  const unsubscribeFromMessages = useChatStore(state => state.unsubscribeFromMessages);
  const sendMessage = useChatStore(state => state.sendMessage);
  const uploadProgress = useChatStore(state => state.uploadProgress);
  const markMessagesAsRead = useChatStore(state => state.markMessagesAsRead);

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
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const [selectedImageModal, setSelectedImageModal] = useState(null);
  const [optimisticMessages, setOptimisticMessages] = useState([]);
  const [loadedImages, setLoadedImages] = useState({}); // 🛡️ Track which images have fully downloaded

  // 🤖 Pulse AI Summary State
  const [isAnimatingSummary, setIsAnimatingSummary] = useState(false);
  const [summaryResult, setSummaryResult] = useState(null);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);

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
    // 🛡️ Trigger Read Receipt when messages update or user changes
    if (selectedUser?._id && messages.length > 0) {
      const sId = String(selectedUser._id);
      const hasUnread = messages.some(msg => String(msg.senderId) === sId && !msg.isRead);
      if (hasUnread) {
        markMessagesAsRead(sId);
      }
    }
  }, [messages, selectedUser?._id, markMessagesAsRead]);

  // ✍️ Typing Indicator Logic
  const typingTimeoutRef = useRef(null);
  const socket = useAuthStore(state => state.socket);
  const typingUsers = useChatStore(state => state.typingUsers);
  const isTyping = typingUsers.includes(String(selectedUser?._id));

  const handleTyping = () => {
    if (!socket || !selectedUser) return;

    // Emit typing event to server
    socket.emit("typing", selectedUser._id);

    // Clear existing stop-typing timeout
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    // Set new timeout to stop typing after 1 second of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stopTyping", selectedUser._id);
    }, 1000);
  };

  // 🛑 Cleanup typing status on unmount or user change
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (socket && selectedUser) {
        socket.emit("stopTyping", selectedUser._id);
      }
    };
  }, [selectedUser?._id, socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, imagePreview, optimisticMessages, loadedImages, isTyping]);

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

      // 🛑 Stop typing immediately on send
      if (socket && selectedUser) {
        socket.emit("stopTyping", selectedUser._id);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      }
    } catch (err) {
      console.error('API Sync Error:', err);
      // Fallback: Clear optimistic if failed
      setOptimisticMessages([]);
    } finally {
      setSending(false);
    }
  };

  const handleSummarize = async () => {
    if (!selectedUser || isAnimatingSummary) return;
    setIsAnimatingSummary(true);
    setIsSummaryOpen(false);
    try {
      const result = await summarizeChat(selectedUser._id);
      // Wait a moment so the premium wave animation can be admired
      setTimeout(() => {
        setSummaryResult(result);
        setIsAnimatingSummary(false);
        setIsSummaryOpen(true);
      }, 2500);
    } catch (err) {
      console.error('Error summarizing chat:', err);
      setIsAnimatingSummary(false);
    }
  };

  const formatSummary = (text) => {
    if (!text) return null;
    // Updated regex to include markdown bold (**) patterns
    const regex = /(\*\*.*?\*\*)|([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)|(\b\d+(?:st|nd|rd|th)?\b|\b\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\b|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2}(?:st|nd|rd|th)?(?:, \d{4})?\b)|("[^"]+"|\b[A-Z]{2,}\b)/g;
    
    const skipWords = new Set(['The', 'A', 'An', 'This', 'That', 'It', 'He', 'She', 'They', 'We', 'You', 'I', 'However', 'Therefore', 'In', 'On', 'At', 'To', 'And', 'But', 'Or', 'As', 'If', 'When', 'Then', 'So', 'For']);
    const tokens = text.split(regex);
    
    return tokens.map((token, i) => {
      if (!token) return null;

      // Handle Markdown Bold **Text**
      if (token.startsWith('**') && token.endsWith('**')) {
        const cleanToken = token.replace(/\*\*/g, '');
        return <span key={i} className={styles.highlightTerm}>{cleanToken}</span>;
      }

      if (/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*$/.test(token) && !skipWords.has(token)) {
        return <span key={i} className={styles.highlightName}>{token}</span>;
      }
      if (/^\b\d/.test(token) || /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/.test(token)) {
        return <span key={i} className={styles.highlightNumber}>{token}</span>;
      }
      if (/^"/.test(token) || /^[A-Z]{2,}$/.test(token)) {
        return <span key={i} className={styles.highlightTerm}>{token}</span>;
      }
      return <span key={i}>{token}</span>;
    });
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

      {/* 🔮 Pulse AI Summary Mini Window */}
      <AnimatePresence>
        {isSummaryOpen && summaryResult && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
            transition={{ type: 'spring', damping: 20, stiffness: 200 }}
            className={styles.summaryMiniWindow}
          >
            <div className={styles.summaryMiniHeader}>
              <div className={styles.summaryMiniTitle}>
                <SummarizeIcon />
                Chat Summary
              </div>
              <button onClick={() => setIsSummaryOpen(false)} className={styles.summaryMiniClose}>
                <X size={16} />
              </button>
            </div>
            <div className={styles.summaryMiniBody}>
              {formatSummary(summaryResult)}
            </div>
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

          <motion.button 
            whileHover={{ scale: 1.1, backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
            whileTap={{ scale: 0.9 }}
            className={styles.aiToggleBtn}
            onClick={handleSummarize}
            title="Summarize Chat"
            disabled={isAnimatingSummary}
            style={{ 
              padding: '10px', 
              borderRadius: '50%', 
              width: '42px', 
              height: '42px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}
          >
            {isAnimatingSummary ? <SummaryLoader /> : <SummarizeIcon />}
          </motion.button>
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

        <AnimatePresence>
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
               const myId = String(authUser?._id || authUser?.id || '');
               const senderId = String(msg.senderId);
               
               const isSentByMe = senderId === myId || senderId === 'me' || msg.receiverId === String(selectedUser?._id);
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
                      {msg.text && (
                        <p 
                          className={isAnimatingSummary ? styles.textWaveAnimation : ""} 
                          style={{ padding: msg.image ? "0 12px 14px 12px" : "0" }}
                        >
                          {msg.text}
                        </p>
                      )}
                    </div>

                    <div className={styles.timestampContainer}>
                        <span className={styles.msgTime}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {isSentByMe && (
                          <div className={styles.readStatusIconWrapper}>
                            <AnimatePresence mode="wait">
                              {msg.isRead ? (
                                <motion.div
                                  key="read"
                                  initial={{ scale: 0.5, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  transition={{ type: "spring", stiffness: 500, damping: 15 }}
                                >
                                  <CheckCheck 
                                    size={16} 
                                    style={{ color: '#FFB84D' }}
                                  />
                                </motion.div>
                              ) : (
                                <motion.div
                                  key="sent"
                                  initial={{ scale: 0.8, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  exit={{ scale: 0.8, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <Check 
                                    size={16} 
                                    style={{ color: '#94A3B8' }}
                                  />
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}
                    </div>
                 </motion.div>
               );
            })
          )}
          
          {/* ✍️ Typing Indicator Bubble */}
          {isTyping && (
             <motion.div 
               key="typing-indicator"
               initial={{ opacity: 0, scale: 0.8, y: 10 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.8, y: 10 }}
               transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
               className={`${styles.msgItem} ${styles.msgReceived}`}
               style={{ marginBottom: '8px' }}
             >
                <div className={`${styles.bubble} ${styles.bubbleReceived}`}>
                   <div className={styles.typingIndicator}>
                      <span className={styles.dot}></span>
                      <span className={styles.dot}></span>
                      <span className={styles.dot}></span>
                   </div>
                </div>
             </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
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

        <div className={styles.plusWrapper}>
          <motion.button 
            type="button"
            onClick={() => fileInputRef.current?.click()} 
            whileHover={{ scale: 1.1 }}
            className={styles.plusBtn}
          >
            <Plus size={24} strokeWidth={2.5} />
          </motion.button>
        </div>
        
        <div className={styles.footerInner}>
          <div className={styles.inputWrapper}>
            <textarea 
              rows={1}
              placeholder="Type your message..." 
              className={styles.redesignInput} 
              value={newMessage} 
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTyping(); // ✍️ Trigger typing event
                // Reset height to calculate correctly
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                  // Reset height after send
                  e.target.style.height = 'auto';
                }
              }}
            />
          </div>
        </div>

        <button 
          type="button"
          onClick={handleSend}
          className={styles.iconBtn}
          disabled={!newMessage.trim() && !imageFile || sending}
        >
          <ArrowUp size={20} strokeWidth={3} />
        </button>
      </footer>
    </div>
  );
};

export default ChatWindow;
