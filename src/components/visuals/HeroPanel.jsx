import { motion } from 'framer-motion';
import { ShieldCheck, Zap, Globe, Lock } from 'lucide-react';
import styles from './HeroPanel.module.css';

// Component to render one of 6 messaging icon types based on user's skeleton
const MessageIcon = ({ top, left, delay, opacity, scale, type }) => {
  const iconPaths = [
    "M32 30C32 26.6863 34.6863 24 38 24H78C81.3137 24 84 26.6863 84 30V50C84 53.3137 81.3137 56 78 56H48L32 68V56V56C28.6863 56 26 53.3137 26 50V35", // Style 1
    "M30 35C30 31.6863 32.6863 29 36 29H64C67.3137 29 70 31.6863 70 35V53C70 56.3137 67.3137 59H44L36 67V59H36C32.6863 59 30 56.3137 30 53V35Z", // Double rounded
    "M45 42C45 38.6863 47.6863 36 51 36H79C82.3137 36 85 38.6863 85 42V60C85 63.3137 82.3137 66 79 66H71L63 74V66H61C57.6863 66 55 63.3137 55 60V54", // Style 3
    "M35 30H75V50H45L35 60V30Z", // Style 4 - Square bubble
    "M30 30H60V50H40L30 60V30ZM70 45H95V60H80L70 70V45Z", // Overlapping square
    "M30 30A15 15 0 0 1 45 45A15 15 0 0 1 30 60A15 15 0 0 1 15 45A15 15 0 0 1 30 30" // Simple dots circle
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: [opacity * 0.4, opacity * 1.2, opacity * 0.4], scale: [scale * 0.9, scale * 1.1, scale * 0.9] }}
      transition={{ duration: 6 + Math.random() * 6, repeat: Infinity, ease: "easeInOut", delay: delay }}
      className={styles.star}
      style={{ top: `${top}%`, left: `${left}%`, position: 'absolute' }}
    >
      <svg width="32" height="32" viewBox="0 0 120 120" fill="none">
        <path 
          d={iconPaths[type]} 
          stroke="var(--accent-primary)" 
          strokeWidth="3.5" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          style={{ opacity: opacity }}
        />
      </svg>
    </motion.div>
  );
};

const HeroPanel = () => {
  // Generate 65 randomized icons with mixed types
  const starsArray = Array.from({ length: 65 }).map((_, i) => ({
    top: Math.random() * 100,
    left: Math.random() * 100,
    delay: Math.random() * 8,
    opacity: 0.03 + Math.random() * 0.08, // Very subtle scattered grid
    scale: 0.5 + Math.random() * 0.5,
    type: Math.floor(Math.random() * 6)
  }));

  const features = [
    { text: "Secure Messaging Protocol", icon: <ShieldCheck size={18} /> },
    { text: "Real-time communication", icon: <Zap size={18} /> },
    { text: "Worldwide Delivery", icon: <Globe size={18} /> }
  ];

  return (
    <div className={styles.heroWrapper}>
      {/* Scattered Galaxy of Multi-type Messaging Artifacts */}
      {starsArray.map((star, i) => (
        <MessageIcon key={i} {...star} />
      ))}

      {/* Modern Typographic Content Overlay */}
      <div className={styles.contentArea}>
        <div className={styles.titleArea}>
          <h2 className={styles.featureTitle}>Talk Securely</h2>
          <p className={styles.featureSub}>The Future of Communication</p>
        </div>

        <div className={styles.featureList}>
          {features.map((feature, i) => (
            <motion.div 
              key={i} 
              className={styles.featureItem}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 + i * 0.15 }}
            >
              {feature.icon}
              <span>{feature.text}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HeroPanel;
