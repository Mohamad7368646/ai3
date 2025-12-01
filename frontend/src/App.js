import { useState, useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";
import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import { Toaster } from "./components/ui/sonner";
import { ThemeProvider } from "./contexts/ThemeContext";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Axios interceptor for auth
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    handleGoogleCallback();
  }, []);

  const handleGoogleCallback = async () => {
    // Check for session_id in URL (Google OAuth callback)
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    
    if (sessionId) {
      try {
        // Call backend to process Google session
        const response = await axios.post(
          `${API}/auth/google/session`,
          {},
          { headers: { 'X-Session-ID': sessionId } }
        );
        
        const { access_token, user: userData } = response.data;
        localStorage.setItem('token', access_token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
        setUser(userData);
        setIsAuthenticated(true);
        
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (error) {
        console.error('Google OAuth error:', error);
      }
    }
  };

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const response = await axios.get(`${API}/auth/me`);
        setUser(response.data);
        setIsAuthenticated(true);
      } catch (error) {
        localStorage.removeItem('token');
        setIsAuthenticated(false);
      }
    }
    setLoading(false);
  };

  const handleLogin = (token, userData) => {
    localStorage.setItem('token', token);
    setUser(userData);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setIsAuthenticated(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F5F0E8] to-[#E8DCC8]">
        <div className="text-2xl font-semibold text-[#3E2723]">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <div className="App" dir="rtl">
        <BrowserRouter>
          <Routes>
            <Route
              path="/"
              element={
                isAuthenticated ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <LandingPage onLogin={handleLogin} />
                )
              }
            />
            <Route
              path="/dashboard"
              element={
                isAuthenticated ? (
                  user?.is_admin ? (
                    <Navigate to="/admin" replace />
                  ) : (
                    <Dashboard user={user} onLogout={handleLogout} />
                  )
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />
            <Route
              path="/admin"
              element={
                isAuthenticated && user?.is_admin ? (
                  <AdminDashboard user={user} onLogout={handleLogout} />
                ) : (
                  <Navigate to={isAuthenticated ? "/dashboard" : "/"} replace />
                )
              }
            />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-center" dir="rtl" />
      </div>
    </ThemeProvider>
  );
}

export default App;