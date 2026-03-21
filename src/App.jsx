import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage/LandingPage';
import ChatPage from './pages/ChatPage/ChatPage';
import './index.css';

import { useEffect } from 'react';
import useAuthStore from './store/useAuthStore';
import { Loader2 } from 'lucide-react';

function App() {
  const authUser = useAuthStore(state => state.authUser);
  const checkAuth = useAuthStore(state => state.checkAuth);
  const isCheckingAuth = useAuthStore(state => state.isCheckingAuth);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Instant Persistent Entry (No Black Screen) 🏎️
  // Store handles re-hydration from LocalStorage


  return (
    <Router>
      <div className="app-main" style={{ width: '100vw', height: '100vh' }}>
        <Routes>
          <Route path="/" element={!authUser ? <LandingPage /> : <Navigate to="/chat" />} />
          <Route path="/chat" element={authUser ? <ChatPage /> : <Navigate to="/" />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
