import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage/LandingPage';
import ChatPage from './pages/ChatPage/ChatPage';
import SettingsPage from './pages/SettingsPage/SettingsPage';
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


  if (isCheckingAuth && !authUser) return (
    <div className="flex items-center justify-center h-screen bg-[#121210]">
      <Loader2 className="w-8 h-8 animate-spin text-[#E67E22]" />
    </div>
  );

  return (
    <Router>
      <div className="app-main" style={{ width: '100vw', height: '100vh' }}>
        <Routes>
          <Route path="/" element={!authUser ? <LandingPage /> : <Navigate to="/chat" />} />
          <Route path="/chat" element={authUser ? <ChatPage /> : <Navigate to="/" />} />
          <Route path="/settings" element={authUser ? <SettingsPage /> : <Navigate to="/" />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
