# 💬 CHATLY — Premium Real-time Experience

**Pulse Chat** is a high-performance, real-time messaging application designed with a "Quiet Luxury" aesthetic. Built on modern web technologies, it offers a seamless, low-latency communication experience with advanced features like read receipts, typing indicators, and background AI integration.

🚀 **Live Demo:** [https://chat-app-frontend-dqrk.vercel.app/](https://chat-app-frontend-dqrk.vercel.app/)

---

## ✨ Key Features

- **⚡ Real-time Messaging:** Powered by Socket.io for sub-millisecond delivery latency.
- **🛡️ Intelligent Caching:** Custom Zustand-powered persistence layer that loads chats instantly (Offline-first approach).
- **✅ Message Status:** Real-time feedback with "Sent" and "Read" receipts (double-tick system).
- **✍️ Live Presence:** Real-time typing indicators to keep the conversation alive.
- **✨ Quiet Luxury UI:** A premium, minimalist design featuring glassmorphism, smooth Framer Motion transitions, and a mobile-first pill navigation system.
- **🤖 AI Integration:** Native integration with Sarvam AI and OpenRouter for intelligent chat capabilities.
- **📁 Media Support:** Integrated image uploads with real-time progress tracking.
- **🔄 Background Sync:** Automatic retry and synchronization for messages sent while offline.

---

## 🛠️ Technology Stack

### **Frontend Core**
- **Framework:** [React 19](https://react.dev/) (Vite-powered)
- **Language:** JavaScript (ES6+) / TypeScript
- **State Management:** [Zustand](https://github.com/pmndrs/zustand) (with custom localStorage hydration)
- **Routing:** [React Router Dom v7](https://reactrouter.com/)

### **Real-time & API**
- **Communication:** [Socket.io-client](https://socket.io/)
- **HTTP Client:** [Axios](https://axios-http.com/) (with centralized interceptors)

### **Design & Experience**
- **Styling:** Vanilla CSS (CSS Modules)
- **Animations:** [Framer Motion](https://www.framer.com/motion/)
- **Icons:** [Lucide React](https://lucide.dev/)

---

## 📂 Project Structure

```bash
src/
├── components/     # Reusable UI components (Sidebar, ChatWindow, etc.)
├── pages/          # Full-page views (Landing, Chat, Settings)
├── services/       # API and Socket communication logic
├── store/          # Zustand global state (Auth, Chat)
├── utils/          # Helper functions and constants
└── App.jsx         # Main application entry and routing
```

---

## 🚀 Getting Started

### 1. Clone & Install
```bash
git clone https://github.com/Mayank332k/chat-app-frontend.git
cd chat-app-frontend
npm install
```

### 2. Configure Environment
Create a `.env` file in the root directory:
```env
VITE_BASE_URL=your_backend_api_url
VITE_SOCKET_URL=your_socket_server_url
```

### 3. Run Locally
```bash
npm run dev
```

---

## 💎 Best Practices Implemented

- **Optimistic Updates:** Messages are reflected in the UI immediately while syncing with the server in the background.
- **Memory Management:** Efficient cache trimming to prevent `localStorage` overflow.
- **Silent Refresh:** Background fetching ensures users see content instantly while the latest data is synced silently.
- **Responsive Layout:** Adaptive design that feels native on both desktop and mobile devices.

---

Made with ❤️ by [Mayank](https://github.com/Mayank332k)
