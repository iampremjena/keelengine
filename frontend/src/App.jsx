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
  const [userProfile, setUserProfile] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // WORKSPACE STATE
  const [workspace, setWorkspace] = useState('personal'); 
  const [showGateway, setShowGateway] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const [londonTime, setLondonTime] = useState('');
  const [londonTemp, setLondonTemp] = useState('18°C ⛅');

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
      if (newSession) await checkAccountStatus(newSession.user.id);
      else { setIsAdmin(false); setUserProfile(null); setLoading(false); setShowGateway(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setLondonTime(now.toLocaleDateString('en-GB', { timeZone: 'Europe/London', weekday: 'short', day: 'numeric', month: 'short' }) + ' • ' + now.toLocaleTimeString('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit' }) + ' BST');
    };
    updateTime();
    setInterval(updateTime, 1000);
  }, []);

  const checkAccountStatus = async (userId) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) {
      setUserProfile(data);
      setIsAdmin(data.is_admin);
      
      // ADMIN INTERCEPT GATEWAY
      if (data.is_admin) {
        setShowGateway(true);
      } else if (data.account_type === 'business') {
        setWorkspace('business');
      } else {
        setWorkspace('personal');
      }
    }
    setLoading(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div></div>;

  // ADMIN WORKSPACE SELECTOR
  if (showGateway) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
        <div className="max-w-xl w-full bg-slate-900 border border-slate-700 p-8 rounded-3xl shadow-2xl text-center animate-fadeIn">
          <span className="text-4xl mb-4 block">🛡️</span>
          <h2 className="text-2xl font-black text-white mb-2">Welcome Back, Admin.</h2>
          <p className="text-slate-400 text-sm mb-8">Which workspace would you like to access today?</p>
          <div className="flex flex-col sm:flex-row gap-4">
            <button onClick={() => { setWorkspace('personal'); setShowGateway(false); }} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 rounded-xl border border-slate-600 transition shadow-lg">👤 Personal Account</button>
            <button onClick={() => { setWorkspace('business'); setShowGateway(false); }} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-lg transition">🏢 Business / Enterprise</button>
          </div>
        </div>
      </div>
    );
  }

  const showNavbar = location.pathname !== '/';

  return (
    <div className="min-h-screen text-slate-100 antialiased selection:bg-emerald-500 selection:text-white">
      {showNavbar && (
        <nav className="max-w-7xl mx-auto px-4 pt-6 pb-2">
          <div className="glass rounded-3xl px-5 sm:px-8 py-4 flex flex-col xl:flex-row justify-between items-center gap-4 shadow-2xl relative z-50 border border-slate-700/50">
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6 w-full xl:w-auto justify-between xl:justify-start">
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/home')}>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white hover:text-emerald-400 transition-colors">KeelEngine</h1>
                <span className={`text-[9px] sm:text-[10px] font-black font-mono uppercase tracking-widest border px-2 py-0.5 rounded-md mt-1 ${workspace === 'business' ? 'text-blue-400 border-blue-500/40 bg-blue-500/10' : 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10'}`}>
                  {workspace === 'business' ? 'BUSINESS' : 'LONDON'}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-6 text-xs sm:text-sm font-semibold text-slate-400 w-full xl:w-auto">
              <button onClick={() => navigate('/home')} className={`hover:text-white transition ${location.pathname === '/home' ? 'text-emerald-400' : ''}`}>Dashboard</button>
              <button onClick={() => navigate('/updates')} className={`hover:text-white transition ${location.pathname === '/updates' ? 'text-emerald-400' : ''}`}>Updates</button>
              
              {isAdmin && (
                <button onClick={() => navigate('/admin')} className={`hover:text-emerald-300 text-emerald-500 transition ${location.pathname === '/admin' ? 'border-b-2 border-emerald-500 pb-1' : ''}`}>🛡️ Admin Hub</button>
              )}

              <button onClick={() => navigate(session ? '/profile/basic' : '/')} className="relative group cursor-pointer ml-0 sm:ml-4">
                <span className={`bg-slate-800 text-slate-300 px-3 py-2 rounded-lg text-xs font-mono transition border ${session ? 'border-emerald-500/50 text-emerald-400' : 'border-slate-600'}`}>
                  {session ? `👤 Profile` : 'Sign in'}
                </span>
              </button>
            </div>
          </div>
        </nav>
      )}

      <Routes>
        <Route path="/" element={!session ? <AuthPage /> : <Navigate to="/home" />} />
        <Route path="/home" element={<Dashboard session={session} profile={userProfile} workspace={workspace} />} />
        <Route path="/admin" element={<AdminHub session={session} isAdmin={isAdmin} />} />
        <Route path="/profile/*" element={session ? <ProfileHub session={session} /> : <Navigate to="/" />} />
        <Route path="*" element={<Navigate to="/home" />} />
      </Routes>
    </div>
  );
}

export default function App() { return <Router><AppContent /></Router>; }