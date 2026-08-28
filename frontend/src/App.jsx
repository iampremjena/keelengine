import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from './supabaseClient';
import 'leaflet/dist/leaflet.css';

import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import SurveyPage from './pages/SurveyPage';
import ProfileHub from './pages/ProfileHub';
import UpdatesPage from './pages/UpdatesPage';
import AdminHub from './pages/AdminHub'; // NEW ADMIN PAGE

function AppContent() {
  const [session, setSession] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session) await checkAdminStatus(session.user.id);
      setLoading(false);
    };
    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession) await checkAdminStatus(newSession.user.id);
      else setIsAdmin(false);
    });
    
    return () => subscription.unsubscribe();
  }, []);

  const checkAdminStatus = async (userId) => {
    const { data } = await supabase.from('profiles').select('is_admin').eq('id', userId).single();
    if (data) setIsAdmin(data.is_admin);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div></div>;

  const showNavbar = location.pathname !== '/';

  return (
    <div className="min-h-screen text-slate-100 antialiased selection:bg-emerald-500 selection:text-white">
      {showNavbar && (
        <nav className="max-w-7xl mx-auto px-4 pt-8">
          <div className="glass rounded-3xl px-8 py-5 flex flex-col lg:flex-row justify-between items-center gap-4 shadow-2xl relative z-50">
            <button onClick={() => navigate('/home')} className="text-3xl font-black tracking-tight text-white hover:text-emerald-400 transition-colors">
              KeelEngine
            </button>
            <div className="flex flex-wrap justify-center items-center gap-6 text-sm font-semibold text-slate-400">
              <button onClick={() => navigate('/home')} className={`hover:text-white transition ${location.pathname === '/home' ? 'text-emerald-400' : ''}`}>Dashboard</button>
              <button onClick={() => navigate('/updates')} className={`hover:text-white transition ${location.pathname === '/updates' ? 'text-emerald-400' : ''}`}>Updates</button>
              <button onClick={() => navigate('/about')} className={`hover:text-white transition ${location.pathname === '/about' ? 'text-emerald-400' : ''}`}>About</button>
              
              {/* ADMIN ONLY LINK */}
              {isAdmin && (
                <button onClick={() => navigate('/admin')} className={`hover:text-emerald-300 text-emerald-500 transition ${location.pathname === '/admin' ? 'border-b-2 border-emerald-500 pb-1' : ''}`}>🛡️ Admin Hub</button>
              )}

              <button onClick={() => navigate(session ? '/profile/basic' : '/')} className="relative group cursor-pointer ml-4">
                <span className={`bg-slate-800 text-slate-300 px-4 py-2 rounded-lg text-xs font-mono hover:bg-slate-700 transition border ${session ? 'border-emerald-500/50 text-emerald-400' : 'border-slate-600'}`}>
                  {session ? `👤 Profile` : 'Guest - Click to Sign in'}
                </span>
              </button>
            </div>
          </div>
        </nav>
      )}

      <Routes>
        <Route path="/" element={!session ? <AuthPage /> : <Navigate to="/home" />} />
        <Route path="/home" element={<Dashboard session={session} />} />
        <Route path="/updates" element={<UpdatesPage session={session} isAdmin={isAdmin} />} />
        <Route path="/about" element={<SurveyPage session={session} isAdmin={isAdmin} />} />
        <Route path="/admin" element={<AdminHub session={session} isAdmin={isAdmin} />} />
        <Route path="/profile/*" element={session ? <ProfileHub session={session} /> : <Navigate to="/" />} />
        <Route path="*" element={<Navigate to="/home" />} />
      </Routes>
    </div>
  );
}

export default function App() { return <Router><AppContent /></Router>; }