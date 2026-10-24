import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from './supabaseClient';
import 'leaflet/dist/leaflet.css';

import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import ProfileHub from './pages/ProfileHub';
import UpdatesPage from './pages/UpdatesPage';

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
      if (session) await checkAccountStatus(session.user.id);
      else setLoading(false);
    };
    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        await checkAccountStatus(newSession.user.id);
      } else { 
        setIsAdmin(false); 
        setLoading(false); 
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const checkAccountStatus = async (userId) => {
    try {
      const { data } = await supabase.from('profiles').select('is_admin').eq('id', userId).single();
      if (data) {
        setIsAdmin(!!data.is_admin);
      }
    } catch (err) {
      console.error("Error fetching user profile:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const showNavbar = location.pathname !== '/';

  return (
    <div className="min-h-screen text-slate-100 antialiased selection:bg-emerald-500 selection:text-white bg-slate-950">
      {showNavbar && (
        <nav className="max-w-7xl mx-auto px-4 pt-6 pb-2">
          <div className="glass rounded-3xl px-5 sm:px-8 py-4 flex flex-col xl:flex-row justify-between items-center gap-4 shadow-2xl relative z-50 border border-slate-700/50 bg-slate-900/80 backdrop-blur-md">
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6 w-full xl:w-auto justify-between xl:justify-start">
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/home')}>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white hover:text-emerald-400 transition-colors">KeelEngine</h1>
                <span className="text-[9px] sm:text-[10px] font-black font-mono uppercase tracking-widest border px-2 py-0.5 rounded-md mt-1 text-emerald-400 border-emerald-500/40 bg-emerald-500/10">
                  LONDON
                </span>
              </div>
            </div>

            <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-6 text-xs sm:text-sm font-semibold text-slate-400 w-full xl:w-auto">
              <button onClick={() => navigate('/home')} className={`hover:text-white transition ${location.pathname === '/home' ? 'text-emerald-400 font-bold' : ''}`}>
                Dashboard
              </button>
              
              <button onClick={() => navigate('/updates')} className={`hover:text-white transition ${location.pathname === '/updates' ? 'text-emerald-400 font-bold' : ''}`}>
                Updates
              </button>

              <button onClick={() => navigate(session ? '/profile/basic' : '/')} className="relative group cursor-pointer ml-0 sm:ml-4">
                <span className={`bg-slate-800 text-slate-300 px-3.5 py-2 rounded-xl text-xs font-mono transition border ${session ? 'border-emerald-500/50 text-emerald-400' : 'border-slate-600'}`}>
                  {session ? `👤 Profile` : 'Sign in'}
                </span>
              </button>
            </div>
          </div>
        </nav>
      )}

      <Routes>
        <Route path="/" element={session ? <Navigate to="/home" replace /> : <AuthPage />} />
        <Route path="/home" element={<Dashboard session={session} />} />
        <Route path="/updates" element={<UpdatesPage session={session} isAdmin={isAdmin} />} />
        <Route path="/profile/*" element={session ? <ProfileHub session={session} /> : <Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to={session ? "/home" : "/"} replace />} />
      </Routes>
    </div>
  );
}

export default function App() { 
  return <Router><AppContent /></Router>; 
}
