import { useState, useEffect, useRef } from 'react';
import { User, Send, Plus, Loader2, X, Check, Copy, CheckCheck, Smile, Mic, ArrowLeft, ArrowUp, Trash2, MoreVertical, Download, MoreHorizontal } from 'lucide-react';
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
        <stop offset="100%" stopColor="rgb(124, 143, 177)" />
        <stop offset="0%" stopColor="rgb(220, 198, 133)" />
        <stop offset="50%" stopColor="rgb(255, 140, 80)" />
        <stop offset="100%" stopColor="rgb(219, 115, 150)" />
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
  const clearChat = useChatStore(state => state.clearChat);
  const deleteForMe = useChatStore(state => state.deleteForMe);
  const deleteForEveryone = useChatStore(state => state.deleteForEveryone);
  const isAiThinking = useChatStore(state => state.isAiThinking);

  const authUser = useAuthStore(state => state.authUser);
  const onlineUsers = useAuthStore(state => state.onlineUsers);
  
  // 🛡️ Type-safe comparison: Convert both sides to String for guaranteed match
  const isAiAssistant = selectedUser?.username === 'ai_assistant';
  const isOnline = isAiAssistant || onlineUsers.some(id => String(id) === String(selectedUser?._id));
  
  // 🕵️ Debug: Log to verify matching (remove after confirming)
  console.log('Online Check:', { 
    selectedId: String(selectedUser?._id), 
    onlineIds: onlineUsers.map(String), 
    result: isOnline,
    isAiAssistant
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

  // 🤖 chatly AI Summary State
  const [isAnimatingSummary, setIsAnimatingSummary] = useState(false);
  const [summaryResult, setSummaryResult] = useState(null);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);

  // 🗑️ Message Deletion State
  const [messageToDelete, setMessageToDelete] = useState(null);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [isClearChatModalOpen, setIsClearChatModalOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyMessage = async (text) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const handleCopySummary = async () => {
    if (!summaryResult) return;
    try {
      await navigator.clipboard.writeText(summaryResult);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const handleDownloadImage = async () => {
    if (!selectedImageModal) return;
    try {
      const response = await fetch(selectedImageModal);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `chatly_image_${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
       console.error("Download failed:", error);
    }
  };

  const handleCopyImage = async () => {
    if (!selectedImageModal) return;
    try {
       const response = await fetch(selectedImageModal);
       const blob = await response.blob();
       await navigator.clipboard.write([
          new window.ClipboardItem({ [blob.type]: blob })
       ]);
       setIsCopied(true);
       setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
       console.error("Copy image failed:", error);
       try {
           const canvas = document.createElement("canvas");
           const ctx = canvas.getContext("2d");
           const img = new Image();
           img.crossOrigin = "anonymous";
           img.onload = () => {
               canvas.width = img.width;
               canvas.height = img.height;
               ctx.drawImage(img, 0, 0);
               canvas.toBlob(async (b) => {
                   await navigator.clipboard.write([new window.ClipboardItem({ [b.type]: b })]);
                   setIsCopied(true);
                   setTimeout(() => setIsCopied(false), 2000);
               });
           };
           img.src = selectedImageModal;
       } catch (err) {
           console.error("Fallback copy failed", err);
       }
    }
  };

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
  
  // 🤖 AI typing: If we're waiting for AI response, show typing
  // 👤 User typing: If socket says user is typing, show typing
  const isTyping = (isAiAssistant && isAiThinking) || typingUsers.includes(String(selectedUser?._id));

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

  const formatRichText = (text, isAi = false) => {
    if (!text) return null;
    
    // 🎨 Regex for Bold, Italic, Names, Numbers, and Quoted terms
    const regex = /(\*\*.*?\*\*)|(\*.*?\*)|([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)|(\b\d+(?:st|nd|rd|th)?\b|\b\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\b|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2}(?:st|nd|rd|th)?(?:, \d{4})?\b)|("[^"]+"|\b[A-Z]{2,}\b)/g;
    
    const skipWords = new Set(['The', 'A', 'An', 'This', 'That', 'It', 'He', 'She', 'They', 'We', 'You', 'I', 'However', 'Therefore', 'In', 'On', 'At', 'To', 'And', 'But', 'Or', 'As', 'If', 'When', 'Then', 'So', 'For', 'Hello', 'Hi', 'Hey']);
    const tokens = text.split(regex);
    
    return tokens.map((token, i) => {
      if (!token) return null;

      // 🛡️ Bold: **text** -> Premium Blue Glow for AI
      if (token.startsWith('**') && token.endsWith('**')) {
        const clean = token.replace(/\*\*/g, '');
        return (
          <strong key={i} className={isAi ? styles.highlightTerm : ""} style={{ color: isAi ? '#60A5FA' : 'inherit', fontWeight: '700' }}>
            {clean}
          </strong>
        );
      }

      // 🛡️ Italic: *text* -> Subtle Opacity for secondary info
      if (token.startsWith('*') && token.endsWith('*')) {
        const clean = token.replace(/\*/g, '');
        return <em key={i} style={{ fontStyle: 'italic', opacity: 0.85 }}>{clean}</em>;
      }

      // 🏷️ Semantic Highlighting (mostly for AI assistant's rich data)
      if (isAi) {
        // Names (Proper nouns)
        if (/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*$/.test(token) && !skipWords.has(token)) {
          return <span key={i} className={styles.highlightName}>{token}</span>;
        }
        // Numbers & Dates
        if (/^\b\d/.test(token) || /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/.test(token)) {
          return <span key={i} className={styles.highlightNumber}>{token}</span>;
        }
        // Quoted Terms or All-Caps
        if (/^"/.test(token) || /^[A-Z]{2,}$/.test(token)) {
          return <span key={i} className={styles.highlightTerm}>{token}</span>;
        }
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

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
              className={styles.lightboxActions}
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                className={styles.lightboxActionBtn} 
                onClick={handleDownloadImage}
                title="Save Image"
              >
                <Download size={20} strokeWidth={2} />
              </button>
              
              <div style={{ width: '1.5px', background: 'rgba(255,255,255,0.15)', margin: '4px 8px' }} />
              
              <button 
                className={styles.lightboxActionBtn} 
                onClick={handleCopyImage}
                title="Copy Image"
              >
                {isCopied ? <Check size={20} strokeWidth={2.5} color="#0A84FF" /> : <Copy size={20} strokeWidth={2} />}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🔮 chatly AI Summary Mini Window */}
      <AnimatePresence>
        {isSummaryOpen && summaryResult && (
          <motion.div 
            initial={{ opacity: 0, y: -10, filter: 'blur(12px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -10, filter: 'blur(12px)' }}
            transition={{ type: 'spring', damping: 22, stiffness: 180 }}
            className={styles.summaryMiniWindow}
          >
            <div className={styles.summaryMiniHeader}>
              <div className={styles.summaryMiniTitle}>
                <SummarizeIcon />
                Chat Summary
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button 
                  onClick={handleCopySummary} 
                  className={styles.summaryMiniAction}
                  title="Copy Summary"
                >
                  {isCopied ? <Check size={14} color="#00d26a" /> : <Copy size={14} />}
                </button>
                <button 
                  onClick={() => setIsSummaryOpen(false)} 
                  className={styles.summaryMiniClose}
                  title="Close"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className={styles.summaryMiniBody}>
              {(() => {
                // 🧠 Parse summary into structured blocks
                const lines = summaryResult.split('\n').filter(l => l.trim());
                const blocks = [];
                let currentParagraph = [];

                const flushParagraph = () => {
                  if (currentParagraph.length > 0) {
                    blocks.push({ type: 'paragraph', text: currentParagraph.join(' ') });
                    currentParagraph = [];
                  }
                };

                lines.forEach(line => {
                  const trimmed = line.trim();
                  // Detect bullet points
                  if (/^[-•*]\s/.test(trimmed) || /^\d+[\.\)]\s/.test(trimmed)) {
                    flushParagraph();
                    blocks.push({ type: 'bullet', text: trimmed.replace(/^[-•*\d\.\)]+\s*/, '') });
                  }
                  // Detect bold headings like **Topic:**
                  else if (/^\*\*[^*]+\*\*:?\s*$/.test(trimmed)) {
                    flushParagraph();
                    blocks.push({ type: 'heading', text: trimmed.replace(/\*\*/g, '').replace(/:$/, '') });
                  }
                  // Regular text
                  else {
                    currentParagraph.push(trimmed);
                  }
                });
                flushParagraph();

                return blocks.map((block, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    transition={{ 
                      delay: 0.08 + idx * 0.07, 
                      duration: 0.45, 
                      ease: [0.22, 1, 0.36, 1]
                    }}
                    className={
                      block.type === 'heading' ? styles.summaryHeading :
                      block.type === 'bullet' ? styles.summaryBullet :
                      styles.summaryParagraph
                    }
                  >
                    {block.type === 'bullet' && (
                      <span className={styles.summaryBulletDot} />
                    )}
                    <span>{formatRichText(
                      block.type === 'heading' ? `**${block.text}**` : block.text, 
                      true
                    )}</span>
                  </motion.div>
                ));
              })()}
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

        <div style={{ position: 'relative' }}>
          <motion.button 
            whileHover={{ scale: 1.1, backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
            whileTap={{ scale: 0.9 }}
            className={styles.aiToggleBtn}
            onClick={() => setIsHeaderMenuOpen(!isHeaderMenuOpen)}
            style={{ 
              padding: '10px', 
              borderRadius: '50%', 
              width: '42px', 
              height: '42px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              border: 'none',
              background: 'transparent'
            }}
          >
            <MoreVertical size={20} color="var(--text-secondary)" />
          </motion.button>

          <AnimatePresence>
            {isHeaderMenuOpen && (
              <>
                {/* Invisible backdrop to close menu on click away */}
                <div 
                  style={{ position: 'fixed', inset: 0, zIndex: 1000 }} 
                  onClick={() => setIsHeaderMenuOpen(false)} 
                />
                
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                  style={{ 
                    position: 'absolute', 
                    top: '52px', 
                    right: '0', 
                    width: '200px', 
                    background: 'rgba(25, 25, 25, 0.45)', 
                    backdropFilter: 'blur(30px) saturate(150%)',
                    WebkitBackdropFilter: 'blur(30px) saturate(150%)',
                    borderRadius: '24px',
                    padding: '12px',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.08)',
                    zIndex: 1001,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}
                >
                  <button 
                    onClick={() => {
                      setIsHeaderMenuOpen(false);
                      handleSummarize();
                    }}
                    disabled={isAnimatingSummary}
                    style={{ 
                      width: '100%', padding: '12px 14px', background: 'transparent', border: 'none', 
                      borderRadius: '16px', color: '#fff', textAlign: 'left', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px',
                      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                      e.currentTarget.style.transform = 'scale(1.02)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    <SummarizeIcon />
                    <span style={{ fontWeight: '500' }}>Summarize Chat</span>
                  </button>

                  <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '4px 8px' }} />

                  <button 
                    onClick={() => {
                      setIsHeaderMenuOpen(false);
                      setIsClearChatModalOpen(true);
                    }}
                    style={{ 
                      width: '100%', padding: '12px 14px', background: 'transparent', border: 'none', 
                      borderRadius: '16px', color: '#ff5c5c', textAlign: 'left', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px',
                      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 92, 92, 0.1)';
                      e.currentTarget.style.transform = 'scale(1.02)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    <Trash2 size={18} />
                    <span style={{ fontWeight: '500' }}>Clear Chat</span>
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </header>

      <div className={styles.messageList} ref={scrollRef}>
        {/* Top-level Progress Bar 🎡 */}
        {loading && (
          <div className={styles.topProgressBar}>
             <motion.div 
               initial={{ width: "0%" }}
               animate={{ width: "95%" }}
               transition={{ duration: 1, duration: 2.5, ease: "easeInOut" }}
               className={styles.topProgressInner} 
             />
          </div>
        )}

        <AnimatePresence>
          {loading ? (
             <div className={styles.skeletonContainer}>
               {[1, 2, 3].map((i) => (
                 <div key={i} className={`${styles.skeletonBubble} ${i % 2 === 0 ? styles.skeletonLeft : styles.skeletonRight}`}>
                    <div className={styles.skeletonchatly} />
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
                    <div className={styles.bubbleWrapper}>
                      {isSentByMe && (
                        <button 
                          className={styles.msgOptionsBtn} 
                          onClick={() => {
                            if (msg.status !== 'sending' && !msg.isDeletedForEveryone) {
                              setMessageToDelete({ ...msg, isSentByMe });
                            }
                          }}
                        >
                          <MoreHorizontal size={18} />
                        </button>
                      )}
                      
                      <div 
                        className={`${styles.bubble} ${isSentByMe ? styles.bubbleSent : styles.bubbleReceived} ${msg.image ? styles.bubbleWithImage : ""} ${msg.isDeletedForEveryone ? styles.bubbleDeleted : ""}`}
                        onContextMenu={(e) => {
                          if (msg.status !== 'sending' && !msg.isDeletedForEveryone) {
                            e.preventDefault();
                            setMessageToDelete({ ...msg, isSentByMe });
                          }
                        }}
                        style={{ 
                          cursor: msg.status === 'sending' || msg.isDeletedForEveryone ? 'default' : 'pointer', 
                          opacity: msg.isDeletedForEveryone ? 0.7 : 1,
                          userSelect: 'none',
                          WebkitTouchCallout: 'none'
                        }}
                      >
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
                            onClick={(e) => {
                              if (msg.status !== 'sending' && isImageLoaded) {
                                e.stopPropagation();
                                setSelectedImageModal(msg.image);
                              }
                            }}
                            onContextMenu={(e) => {
                              if (msg.status !== 'sending' && !msg.isDeletedForEveryone) {
                                e.preventDefault();
                                e.stopPropagation();
                                setMessageToDelete({ ...msg, isSentByMe });
                              }
                            }}
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
                          style={{ 
                            padding: msg.image ? "0 12px 14px 12px" : "0", 
                            fontStyle: msg.isDeletedForEveryone ? "italic" : "normal",
                            whiteSpace: 'pre-wrap' // 🛡️ Preserve line breaks for lists/spacing
                          }}
                        >
                          {formatRichText(msg.text, !isSentByMe && isAiAssistant)}
                        </p>
                      )}
                    </div>

                    {!isSentByMe && (
                      <button 
                        className={styles.msgOptionsBtn} 
                        onClick={() => {
                          if (msg.status !== 'sending' && !msg.isDeletedForEveryone) {
                            setMessageToDelete({ ...msg, isSentByMe });
                          }
                        }}
                      >
                        <MoreHorizontal size={18} />
                      </button>
                    )}

                    {/* 🖥️ Desktop Options Dropdown */}
                    {messageToDelete && messageToDelete._id === msg._id && window.innerWidth >= 768 && (
                      <>
                        <div 
                          style={{ position: 'fixed', inset: 0, zIndex: 999 }} 
                          onClick={(e) => { e.stopPropagation(); setMessageToDelete(null); }} 
                        />
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95, y: -5 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -5 }}
                          className={`${styles.messageDropdownDesktop} ${isSentByMe ? styles.dropdownRight : styles.dropdownLeft}`}
                        >
                          {msg.text && (
                            <button className={styles.desktopMenuAction} onClick={() => { handleCopyMessage(msg.text); setMessageToDelete(null); }}>
                              {isCopied ? <Check size={16} color="#00d26a" /> : <Copy size={16} />}
                              <span>{isCopied ? 'Copied' : 'Copy Text'}</span>
                            </button>
                          )}
                          <button className={`${styles.desktopMenuAction} ${styles.danger}`} onClick={() => { deleteForMe(msg._id); setMessageToDelete(null); }}>
                            <Trash2 size={16} />
                            <span>Delete for Me</span>
                          </button>
                          {isSentByMe && (
                            <button className={`${styles.desktopMenuAction} ${styles.danger}`} onClick={() => { deleteForEveryone(msg._id); setMessageToDelete(null); }}>
                              <Trash2 size={16} />
                              <span>Delete for Everyone</span>
                            </button>
                          )}
                        </motion.div>
                      </>
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

      {/* Message Deletion Modal (Mobile Only) */}
      <AnimatePresence>
        {messageToDelete && window.innerWidth < 768 && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className={styles.lightboxOverlay} 
            onClick={() => setMessageToDelete(null)}
            style={{ zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          >
             <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.95, opacity: 0 }} 
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'rgba(25, 25, 25, 0.45)',
                backdropFilter: 'blur(30px) saturate(150%)',
                WebkitBackdropFilter: 'blur(30px) saturate(150%)',
                width: '100%',
                maxWidth: '285px',
                padding: '22px 18px', 
                borderRadius: '50px',
                display: 'flex', flexDirection: 'column', gap: '14px',
                boxShadow: '0 20px 50px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.08)'
              }}
            >
               <h3 style={{ margin: 0, color: '#ffffff', textAlign: 'center', fontSize: '18px', fontWeight: '600' }}>
                 Message Options
               </h3>
               
               <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                 {/* 🏷️ Copy Action (Minimal Icon Style) */}
                 {messageToDelete.text && (
                   <button 
                     onClick={() => { handleCopyMessage(messageToDelete.text); setMessageToDelete(null); }}
                     style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.12)', borderRadius: '40px', border: 'none', color: '#60A5FA', fontSize: '14px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                   >
                     <Copy size={16} /> Copy Text
                   </button>
                 )}

                 <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                   {messageToDelete.isSentByMe ? (
                     <>
                        <button 
                           onClick={() => { deleteForEveryone(messageToDelete._id); setMessageToDelete(null); }}
                           style={{ flex: 1, padding: '12px 6px', background: '#00d26a', borderRadius: '40px', border: 'none', color: '#ffffff', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
                        >
                          Everyone
                        </button>
                        <button 
                           onClick={() => { deleteForMe(messageToDelete._id); setMessageToDelete(null); }}
                           style={{ flex: 1, padding: '12px 6px', background: 'rgba(255,255,255,0.08)', borderRadius: '40px', border: 'none', color: '#ffffff', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                        >
                          For Me
                        </button>
                     </>
                   ) : (
                      <button 
                         onClick={() => { deleteForMe(messageToDelete._id); setMessageToDelete(null); }}
                         style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.08)', borderRadius: '40px', border: 'none', color: '#ffffff', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
                      >
                        Delete for Me
                      </button>
                   )}
                   <button 
                      onClick={() => setMessageToDelete(null)}
                      style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '40px', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
                   >
                     Cancel
                   </button>
                 </div>
               </div>
             </motion.div>
          </motion.div>
        )}
        
        {/* 🧹 Clear Chat Confirmation Modal */}
        {isClearChatModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className={styles.lightboxOverlay} 
            onClick={() => setIsClearChatModalOpen(false)}
            style={{ zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          >
             <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.95, opacity: 0 }} 
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'rgba(25, 25, 25, 0.45)',
                backdropFilter: 'blur(30px) saturate(150%)',
                WebkitBackdropFilter: 'blur(30px) saturate(150%)',
                width: '100%',
                maxWidth: window.innerWidth < 768 ? '285px' : '300px',
                padding: window.innerWidth < 768 ? '22px 18px' : '24px 20px', 
                borderRadius: '50px',
                display: 'flex', flexDirection: 'column', gap: window.innerWidth < 768 ? '14px' : '14px',
                boxShadow: '0 20px 50px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.08)'
              }}
            >
               <div style={{ textAlign: 'center' }}>
                 <h3 style={{ margin: '0 0 4px 0', color: '#ffffff', fontSize: window.innerWidth < 768 ? '18px' : '16px', fontWeight: '600' }}>
                   Clear chat?
                 </h3>
                 <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: window.innerWidth < 768 ? '13px' : '11px', lineHeight: '1.4' }}>
                   This action cannot be undone.
                 </p>
               </div>
               
               <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                 <button 
                    onClick={() => setIsClearChatModalOpen(false)}
                    style={{ flex: 1, padding: window.innerWidth < 768 ? '12px' : '13px', background: 'rgba(255,255,255,0.08)', borderRadius: '40px', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: window.innerWidth < 768 ? '15px' : '14px', fontWeight: '600', cursor: 'pointer', transition: 'transform 0.1s' }}
                    onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
                    onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                 >
                   Cancel
                 </button>
                 <button 
                    onClick={() => { clearChat(selectedUser._id); setIsClearChatModalOpen(false); }}
                    style={{ flex: 1, padding: window.innerWidth < 768 ? '12px' : '13px', background: '#ff5c5c', borderRadius: '40px', border: 'none', color: '#ffffff', fontSize: window.innerWidth < 768 ? '15px' : '14px', fontWeight: '700', cursor: 'pointer', transition: 'transform 0.1s' }}
                    onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
                    onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                 >
                   Clear
                 </button>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatWindow;
