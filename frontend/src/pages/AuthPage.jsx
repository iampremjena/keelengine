import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import AlertModal from '../components/AlertModal';

export default function AuthPage() {
  const [authType, setAuthType] = useState('person'); // 'person' or 'business'
  const [isLogin, setIsLogin] = useState(true);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: '', message: '', type: 'success' });
  const showAlert = (title, message, type) => setAlertConfig({ isOpen: true, title, message, type });

  // 1. STANDARD AUTH
  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;

        if (data.user) {
          const updates = {
            id: data.user.id,
            account_type: authType === 'business' ? 'business' : 'personal',
            business_status: authType === 'business' ? 'pending' : 'approved',
            company_name: authType === 'business' ? companyName : null,
          };
          await supabase.from('profiles').upsert(updates);

          if (authType === 'business') {
            showAlert("Application Submitted", "Your business account request has been sent to the admin. You will be notified once approved.", "success");
            return;
          }
        }
      }
    } catch (err) {
      showAlert("Authentication Error", err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // 2. RESTORED: GUEST INSTANT SIGN-IN
  const handleGuestSignIn = async () => {
    setLoading(true);
    try {
      // Try Supabase Anonymous Sign-In
      const { error } = await supabase.auth.signInAnonymously();
      if (error) {
        // Fallback: If anonymous sign-in is disabled in Supabase, create a temporary guest session
        const guestEmail = `guest_${Date.now()}@keelengine.temp`;
        const guestPass = `Guest_${Math.random().toString(36).substring(2, 10)}!`;
        const { error: signUpErr } = await supabase.auth.signUp({ email: guestEmail, password: guestPass });
        if (signUpErr) throw signUpErr;
      }
    } catch (err) {
      showAlert("Guest Access Error", err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <AlertModal {...alertConfig} onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })} />
      
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-black text-white mb-2">KeelEngine</h1>
          <p className="text-slate-400 text-sm">London Relocation & Commute Copilot</p>
        </div>

        {/* RESTORED: GUEST ACCESS BUTTON */}
        <button
          onClick={handleGuestSignIn}
          disabled={loading}
          className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold py-3.5 px-4 rounded-2xl border border-emerald-500/30 transition text-xs mb-6 flex items-center justify-center gap-2 shadow-lg"
        >
          <span>⚡</span> Continue as Guest (Instant Access)
        </button>

        <div className="relative flex py-2 items-center mb-6">
          <div className="flex-grow border-t border-slate-800"></div>
          <span className="flex-shrink mx-4 text-[10px] text-slate-500 font-bold uppercase tracking-widest">Or Account Login</span>
          <div className="flex-grow border-t border-slate-800"></div>
        </div>

        {/* TOGGLE PERSONAL VS BUSINESS */}
        {!isLogin && (
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 mb-6">
            <button type="button" onClick={() => setAuthType('person')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${authType === 'person' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}>👤 Personal</button>
            <button type="button" onClick={() => setAuthType('business')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${authType === 'business' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>🏢 Business</button>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {(!isLogin && authType === 'business') && (
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Company Name</label>
              <input type="text" required value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500" />
            </div>
          )}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Email Address</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-emerald-500" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Password</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-emerald-500" />
          </div>
          <button type="submit" disabled={loading} className={`w-full font-bold py-3.5 rounded-xl text-sm transition ${authType === 'business' && !isLogin ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}>
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : (authType === 'business' ? 'Apply for Business Account' : 'Create Personal Account'))}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400 mt-6">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button onClick={() => setIsLogin(!isLogin)} className="text-emerald-400 font-bold hover:underline">
            {isLogin ? "Sign Up" : "Sign In"}
          </button>
        </p>
      </div>
    </div>
  );
}