import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import AlertModal from '../components/AlertModal';

export default function AuthPage() {
  const navigate = useNavigate();
  const [authType, setAuthType] = useState('person'); // 'person' or 'business'
  const [isLogin, setIsLogin] = useState(true);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: '', message: '', type: 'success' });
  const showAlert = (title, message, type) => setAlertConfig({ isOpen: true, title, message, type });

  // 1. STANDARD EMAIL/PASSWORD AUTHENTICATION
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

  // 2. GITHUB OAUTH SIGN-IN
  const handleGitHubLogin = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/home`
        }
      });
      if (error) throw error;
    } catch (err) {
      showAlert("GitHub Login Failed", err.message, "error");
      setLoading(false);
    }
  };

  // 3. GUEST DIRECT REDIRECT TO HOME PAGE
  const handleGuestContinue = () => {
    navigate('/home');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950">
      <AlertModal {...alertConfig} onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })} />
      
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-black text-white mb-2">KeelEngine</h1>
          <p className="text-slate-400 text-sm">London Relocation & Commute Copilot</p>
        </div>

        {/* SOCIAL LOGIN & GUEST BUTTONS */}
        <div className="space-y-3 mb-6">
          {/* GITHUB LOGIN */}
          <button
            type="button"
            onClick={handleGitHubLogin}
            disabled={loading}
            className="w-full bg-slate-950 hover:bg-slate-800 text-white font-bold py-3.5 px-4 rounded-2xl border border-slate-800 transition text-xs flex items-center justify-center gap-3 shadow-lg"
          >
            <svg className="w-4 h-4 fill-current text-white" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            Sign in with GitHub
          </button>

          {/* CONTINUE AS A GUEST */}
          <button
            type="button"
            onClick={handleGuestContinue}
            disabled={loading}
            className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold py-3.5 px-4 rounded-2xl border border-emerald-500/30 transition text-xs flex items-center justify-center gap-2 shadow-lg"
          >
            <span>⚡</span> Continue as a Guest
          </button>
        </div>

        <div className="relative flex py-2 items-center mb-6">
          <div className="flex-grow border-t border-slate-800"></div>
          <span className="flex-shrink mx-4 text-[10px] text-slate-500 font-bold uppercase tracking-widest">Or Email Login</span>
          <div className="flex-grow border-t border-slate-800"></div>
        </div>

        {/* ACCOUNT TYPE TOGGLE (PERSONAL VS BUSINESS) */}
        {!isLogin && (
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 mb-6">
            <button 
              type="button" 
              onClick={() => setAuthType('person')} 
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${authType === 'person' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
            >
              👤 Personal
            </button>
            <button 
              type="button" 
              onClick={() => setAuthType('business')} 
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${authType === 'business' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
            >
              🏢 Business
            </button>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {(!isLogin && authType === 'business') && (
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Company Name</label>
              <input 
                type="text" 
                required 
                value={companyName} 
                onChange={(e) => setCompanyName(e.target.value)} 
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500" 
              />
            </div>
          )}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Email Address</label>
            <input 
              type="email" 
              required 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-emerald-500" 
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Password</label>
            <input 
              type="password" 
              required 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-emerald-500" 
            />
          </div>
          <button 
            type="submit" 
            disabled={loading} 
            className={`w-full font-bold py-3.5 rounded-xl text-sm transition ${authType === 'business' && !isLogin ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}
          >
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : (authType === 'business' ? 'Apply for Business Account' : 'Create Personal Account'))}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400 mt-6">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button 
            type="button"
            onClick={() => setIsLogin(!isLogin)} 
            className="text-emerald-400 font-bold hover:underline"
          >
            {isLogin ? "Sign Up" : "Sign In"}
          </button>
        </p>
      </div>
    </div>
  );
}