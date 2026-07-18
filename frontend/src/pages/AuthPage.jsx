import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null); // Beautiful alert state
  const navigate = useNavigate();

  const handleAuth = async (action) => {
    if (!email || !password) {
      setNotification({ type: 'error', msg: 'Please enter both email and password.' });
      return;
    }
    setLoading(true);
    setNotification(null);

    try {
      if (action === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        
        if (data?.user) await supabase.from('profiles').insert([{ id: data.user.id, email: email }]);
        
        setNotification({ type: 'success', msg: '✨ Account created! Please check your email to verify your address, then log in.' });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate('/home');
      }
    } catch (error) {
      setNotification({ type: 'error', msg: error.message || 'Authentication failed.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative z-50">
      <div className="glass p-12 rounded-3xl max-w-lg w-full shadow-2xl text-center border border-emerald-500/30">
        <h2 className="text-4xl font-black text-white mb-2 tracking-tight">KeelEngine</h2>
        <p className="text-slate-400 text-sm mb-8">Sign in to save properties and personalize routes.</p>
        
        {notification && (
          <div className={`p-4 mb-6 rounded-xl text-sm font-bold border text-left ${notification.type === 'success' ? 'bg-emerald-900/30 border-emerald-500/50 text-emerald-400' : 'bg-red-900/30 border-red-500/50 text-red-400'}`}>
            {notification.msg}
          </div>
        )}

        <form onSubmit={(e) => e.preventDefault()} className="space-y-5 text-left mb-8">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:border-emerald-500 outline-none transition" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:border-emerald-500 outline-none transition" />
          </div>
          <div className="flex gap-4 pt-4">
            <button type="button" disabled={loading} onClick={() => handleAuth('login')} className="w-1/2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl shadow-lg transition">{loading ? '...' : 'Log In'}</button>
            <button type="button" disabled={loading} onClick={() => handleAuth('signup')} className="w-1/2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-bold py-3 rounded-xl transition">Sign Up</button>
          </div>
        </form>
        
        <hr className="border-slate-700/50 mb-6" />
        <button onClick={() => navigate('/home')} className="text-emerald-400 hover:text-emerald-300 text-sm font-bold transition">Continue as Guest →</button>
      </div>
    </div>
  );
}