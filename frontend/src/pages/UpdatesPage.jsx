import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import AlertModal from '../components/AlertModal';

export default function UpdatesPage({ session, isAdmin }) {
  const navigate = useNavigate();

  const [updatesList, setUpdatesList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Admin Form States
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [title, setTitle] = useState('');
  const [tag, setTag] = useState('Platform Update');
  const [description, setDescription] = useState('');
  const [posting, setPosting] = useState(false);

  // Alert State
  const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: '', message: '', type: 'success' });
  const showAlert = (title, message, type = 'success') => setAlertConfig({ isOpen: true, title, message, type });

  // Fetch updates on load
  useEffect(() => {
    fetchUpdates();
  }, []);

  const fetchUpdates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('platform_updates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUpdatesList(data || []);
    } catch (e) {
      console.error('Error loading updates:', e);
    } finally {
      setLoading(false);
    }
  };

  const handlePostUpdate = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      return showAlert('Missing Information', 'Please fill out both the title and description.', 'error');
    }

    setPosting(true);
    try {
      const { data, error } = await supabase.from('platform_updates').insert([
        {
          title: title.trim(),
          tag,
          description: description.trim(),
        }
      ]).select();

      if (error) throw error;

      showAlert('Update Published!', 'Your post is now live for all users.', 'success');
      setTitle('');
      setDescription('');
      setShowAdminForm(false);

      // Refresh list immediately
      if (data) setUpdatesList([data[0], ...updatesList]);
    } catch (e) {
      showAlert('Publishing Failed', e.message, 'error');
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-fadeIn">
      <AlertModal {...alertConfig} onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })} />

      <div className="glass rounded-3xl border border-slate-700/50 p-6 sm:p-10 shadow-2xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-800 mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-white">Platform Updates & Market Logs</h2>
            <p className="text-slate-400 text-xs mt-1">Latest feature rollouts, London transit fare updates, and relocation intelligence logs.</p>
          </div>

          <div className="flex gap-3">
            {/* ADMIN ONLY BUTTON TO TOGGLE CREATION FORM */}
            {isAdmin && (
              <button
                onClick={() => setShowAdminForm(!showAdminForm)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition shadow-md flex items-center gap-1.5"
              >
                <span>{showAdminForm ? '✕ Close Form' : '➕ Post New Update'}</span>
              </button>
            )}

            <button
              onClick={() => navigate('/home')}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs py-2.5 px-4 rounded-xl transition border border-slate-700"
            >
              ← Dashboard
            </button>
          </div>
        </div>

        {/* ADMIN FORM (VISIBLE ONLY TO ADMIN) */}
        {isAdmin && showAdminForm && (
          <form onSubmit={handlePostUpdate} className="bg-slate-950 p-6 rounded-2xl border border-emerald-500/40 mb-8 space-y-4 animate-fadeIn">
            <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-2">Publish New Announcement (Admin)</h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TfL Zone 1-3 Fare Adjustments Integrated"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-xs outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Category Tag</label>
                <select
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-xs outline-none"
                >
                  <option value="Platform Update">Platform Update</option>
                  <option value="TfL Fare Matrix">TfL Fare Matrix</option>
                  <option value="AI Engine Log">AI Engine Log</option>
                  <option value="Housing Portals">Housing Portals</option>
                  <option value="Market Insight">Market Insight</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Update Details</label>
              <textarea
                required
                rows={3}
                placeholder="Write the release details or announcement here..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-xs outline-none focus:border-emerald-500 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={posting}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-xl text-xs transition shadow-lg"
            >
              {posting ? 'Publishing...' : 'Broadcast Update 🚀'}
            </button>
          </form>
        )}

        {/* FEED READ-ONLY FOR EVERYONE */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-xs text-slate-400">Loading platform logs...</p>
          </div>
        ) : updatesList.length === 0 ? (
          <div className="text-center py-12 bg-slate-950 rounded-2xl border border-slate-800">
            <p className="text-xs text-slate-400">No updates posted yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {updatesList.map((item) => {
              const formattedDate = new Date(item.created_at).toLocaleDateString('en-GB', {
                month: 'long',
                year: 'numeric',
                day: 'numeric'
              });

              return (
                <div key={item.id} className="bg-slate-950 p-6 rounded-2xl border border-slate-800/80 hover:border-emerald-500/40 transition shadow-lg">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-md border border-emerald-500/30">
                      {item.tag}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">{formattedDate}</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">{item.description}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}