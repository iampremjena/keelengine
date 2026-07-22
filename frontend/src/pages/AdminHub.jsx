import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import AlertModal from '../components/AlertModal';

export default function AdminHub({ session, isAdmin }) {
  useEffect(() => { document.title = "KeelEngine | Admin Hub"; }, []);

  const [activeTab, setActiveTab] = useState('feedbacks');
  const [feedbacks, setFeedbacks] = useState([]);
  const [analytics, setAnalytics] = useState({ avgSalary: 0, topPostcodes: [] });
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [granting, setGranting] = useState(false);

  const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: '', message: '', type: 'success' });
  const showAlert = (title, message, type) => setAlertConfig({ isOpen: true, title, message, type });

  useEffect(() => {
    if (!isAdmin) return;
    fetchFeedbacks();
    fetchAnalytics();
  }, [isAdmin]);

  const fetchFeedbacks = async () => {
    const { data } = await supabase.from('user_feedback').select('*').order('created_at', { ascending: false });
    if (data) setFeedbacks(data);
  };

  const fetchAnalytics = async () => {
    const { data } = await supabase.from('search_analytics').select('gross_salary, office_postcode');
    if (!data || data.length === 0) return;

    // Calculate Average Salary
    const totalSalary = data.reduce((sum, row) => sum + Number(row.gross_salary || 0), 0);
    const avgSalary = Math.round(totalSalary / data.length);

    // Calculate Postcode Density
    const counts = {};
    data.forEach(row => {
      const pc = (row.office_postcode || 'UNKNOWN').toUpperCase();
      counts[pc] = (counts[pc] || 0) + 1;
    });
    
    const topPostcodes = Object.entries(counts)
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10

    setAnalytics({ avgSalary, topPostcodes });
  };

  const handleGrantAdmin = async (e) => {
    e.preventDefault();
    if (!newAdminEmail.trim()) return;
    setGranting(true);
    try {
      const { data, error } = await supabase.from('profiles').update({ is_admin: true }).eq('email', newAdminEmail).select();
      if (error) throw error;
      if (data.length === 0) throw new Error("User not found. They must sign up for KeelEngine first.");
      
      showAlert('Access Granted', `${newAdminEmail} is now an Admin.`, 'success');
      setNewAdminEmail('');
    } catch (err) {
      showAlert('Error', err.message, 'error');
    } finally {
      setGranting(false);
    }
  };

  if (!isAdmin) {
    return <div className="text-center py-20 text-red-400 font-bold">403 - UNAUTHORIZED ACCESS</div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <AlertModal {...alertConfig} onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })} />
      
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-black text-emerald-400 tracking-tight">Admin Command Center</h2>
          <p className="text-slate-400 text-sm mt-2">Manage telemetry, global feedback, and platform security.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 mb-8 border-b border-slate-700/50 pb-6">
        <button onClick={() => setActiveTab('feedbacks')} className={`px-5 py-2 rounded-xl text-sm font-bold transition ${activeTab === 'feedbacks' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>User Feedbacks</button>
        <button onClick={() => setActiveTab('analytics')} className={`px-5 py-2 rounded-xl text-sm font-bold transition ${activeTab === 'analytics' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>Telemetry & Analytics</button>
        <button onClick={() => setActiveTab('access')} className={`px-5 py-2 rounded-xl text-sm font-bold transition ${activeTab === 'access' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>Access Control</button>
      </div>

      {/* FEEDBACKS TAB */}
      {activeTab === 'feedbacks' && (
        <div className="glass rounded-3xl border border-slate-700/50 overflow-hidden shadow-2xl animate-fadeIn">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/80 border-b border-slate-700/50">
                  <th className="p-5 text-emerald-400 font-bold text-sm">Date</th>
                  <th className="p-5 text-emerald-400 font-bold text-sm">User Email</th>
                  <th className="p-5 text-emerald-400 font-bold text-sm">Feedback / Request</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {feedbacks.length === 0 && (
                  <tr><td colSpan="3" className="p-8 text-center text-slate-400">No feedback submitted yet.</td></tr>
                )}
                {feedbacks.map((fb) => (
                  <tr key={fb.id} className="hover:bg-slate-800/30 transition">
                    <td className="p-5 text-xs text-slate-400 font-mono whitespace-nowrap">{new Date(fb.created_at).toLocaleDateString()}</td>
                    <td className="p-5 text-sm font-bold text-white">{fb.email}</td>
                    <td className="p-5 text-sm text-slate-300 leading-relaxed">{fb.feedback_text}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ANALYTICS TAB */}
      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fadeIn">
          <div className="glass p-8 rounded-3xl border border-slate-700/50 shadow-2xl text-center flex flex-col justify-center min-h-[300px]">
            <span className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-4">Average Search Salary</span>
            <span className="text-6xl font-black text-emerald-400">£{analytics.avgSalary.toLocaleString()}</span>
            <p className="text-xs text-slate-500 mt-4">Based on all anonymous user queries</p>
          </div>
          
          <div className="glass p-8 rounded-3xl border border-slate-700/50 shadow-2xl">
            <span className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-6 block">Top Requested Postcodes (Density)</span>
            <div className="space-y-4">
              {analytics.topPostcodes.length === 0 && <p className="text-slate-500 text-sm">No data yet.</p>}
              {analytics.topPostcodes.map((pc, idx) => {
                const maxCount = analytics.topPostcodes[0].count;
                const widthPercent = Math.max(10, (pc.count / maxCount) * 100);
                return (
                  <div key={idx} className="flex items-center gap-4">
                    <div className="w-16 text-white font-mono text-sm font-bold">{pc.code}</div>
                    <div className="flex-1 bg-slate-900 rounded-full h-4 overflow-hidden border border-slate-800">
                      <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000" style={{ width: `${widthPercent}%` }}></div>
                    </div>
                    <div className="w-8 text-right text-emerald-400 text-sm font-bold">{pc.count}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ACCESS CONTROL TAB */}
      {activeTab === 'access' && (
        <div className="glass p-10 rounded-3xl border border-slate-700/50 shadow-2xl max-w-xl animate-fadeIn">
          <h3 className="text-xl font-bold text-white mb-2">Grant Admin Privileges</h3>
          <p className="text-sm text-slate-400 mb-8">Elevate a standard user to an Administrator. They must have already created an account.</p>
          <form onSubmit={handleGrantAdmin} className="space-y-4">
            <input type="email" placeholder="User's Email Address" value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} required className="w-full bg-slate-900 border border-slate-700 rounded-xl px-5 py-4 text-white outline-none focus:border-emerald-500 font-medium" />
            <button type="submit" disabled={granting} className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition shadow-lg">
              {granting ? 'Granting Access...' : 'Promote to Admin'}
            </button>
          </form>
        </div>
      )}

    </div>
  );
}