import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from './supabaseClient';
import 'leaflet/dist/leaflet.css';

import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import SurveyPage from './pages/SurveyPage';
import ProfileHub from './pages/ProfileHub';
import UpdatesPage from './pages/UpdatesPage';
import AdminHub from './pages/AdminHub';

function AppContent() {
  const [session, setSession] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // CLOCK & WEATHER STATE
  const [londonTime, setLondonTime] = useState('');
  const [londonTemp, setLondonTemp] = useState('18°C ⛅');

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

  // CLOCK & WEATHER EFFECT
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setLondonTime(now.toLocaleDateString('en-GB', { timeZone: 'Europe/London', weekday: 'short', day: 'numeric', month: 'short' }) + ' • ' + now.toLocaleTimeString('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' BST');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);

    fetch('https://api.open-meteo.com/v1/forecast?latitude=51.5074&longitude=-0.1278&current_weather=true')
      .then(res => res.json())
      .then(data => {
        if (data?.current_weather?.temperature) {
          setLondonTemp(`${Math.round(data.current_weather.temperature)}°C ⛅`);
        }
      })
      .catch(() => {});

    return () => clearInterval(interval);
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
        <nav className="max-w-7xl mx-auto px-4 pt-6 pb-2">
          <div className="glass rounded-3xl px-5 sm:px-8 py-4 sm:py-5 flex flex-col xl:flex-row justify-between items-center gap-4 shadow-2xl relative z-50 border border-slate-700/50">
            
            {/* BRANDING, CLOCK & WEATHER */}
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6 w-full xl:w-auto justify-between xl:justify-start">
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/home')}>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white hover:text-emerald-400 transition-colors">KeelEngine</h1>
                <span className="text-[9px] sm:text-[10px] font-black font-mono uppercase tracking-widest text-emerald-400 border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 rounded-md mt-1">LONDON</span>
              </div>
              <div className="hidden sm:flex items-center gap-3 text-xs font-medium text-slate-300 font-sans bg-slate-900/50 px-3 py-1.5 rounded-lg border border-slate-800">
                <span className="text-emerald-300">{londonTime}</span>
                <span className="w-px h-3.5 bg-slate-700"></span>
                <span>{londonTemp}</span>
              </div>
            </div>

            {/* NAVIGATION TABS */}
            <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-6 text-xs sm:text-sm font-semibold text-slate-400 w-full xl:w-auto">
              <button onClick={() => navigate('/home')} className={`hover:text-white transition ${location.pathname === '/home' ? 'text-emerald-400' : ''}`}>Dashboard</button>
              <button onClick={() => navigate('/updates')} className={`hover:text-white transition ${location.pathname === '/updates' ? 'text-emerald-400' : ''}`}>Updates</button>
              <button onClick={() => navigate('/about')} className={`hover:text-white transition ${location.pathname === '/about' ? 'text-emerald-400' : ''}`}>About</button>
              
              {isAdmin && (
                <button onClick={() => navigate('/admin')} className={`hover:text-emerald-300 text-emerald-500 transition ${location.pathname === '/admin' ? 'border-b-2 border-emerald-500 pb-1' : ''}`}>🛡️ Admin Hub</button>
              )}

              <button onClick={() => navigate(session ? '/profile/basic' : '/')} className="relative group cursor-pointer ml-0 sm:ml-4">
                <span className={`bg-slate-800 text-slate-300 px-3 sm:px-4 py-2 rounded-lg text-xs font-mono hover:bg-slate-700 transition border ${session ? 'border-emerald-500/50 text-emerald-400' : 'border-slate-600'}`}>
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