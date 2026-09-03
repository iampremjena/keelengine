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

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        // SIGNUP WORKFLOW
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;

        // Force profile creation with correct account type
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <AlertModal {...alertConfig} onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })} />
      
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-white mb-2">KeelEngine</h1>
          <p className="text-slate-400 text-sm">Log in or create an account</p>
        </div>

        {/* TOGGLE ACCOUNTS */}
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
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-emerald-500" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Password</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-emerald-500" />
          </div>
          <button type="submit" disabled={loading} className={`w-full font-bold py-3.5 rounded-xl text-sm transition ${authType === 'business' && !isLogin ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}>
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : (authType === 'business' ? 'Apply for Business Account' : 'Create Account'))}
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