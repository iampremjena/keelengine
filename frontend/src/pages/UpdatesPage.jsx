import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import AlertModal from '../components/AlertModal';

export default function UpdatesPage({ session, isAdmin }) {
  useEffect(() => { document.title = "KeelEngine | Platform Updates"; }, []);

  const [updates, setUpdates] = useState([]);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: '', message: '', type: 'success' });
  const showAlert = (title, message, type) => setAlertConfig({ isOpen: true, title, message, type });

  useEffect(() => { fetchUpdates(); }, []);

  const fetchUpdates = async () => {
    // 🛡️ STRICT FILTER: Never pull the developer bio into the updates feed.
    const { data } = await supabase.from('forum_updates').select('*').neq('title', 'ABOUT_DEVELOPER').order('created_at', { ascending: false });
    if (data) setUpdates(data);
  };

  const handlePublish = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;
    setPublishing(true);
    try {
      const { error } = await supabase.from('forum_updates').insert([{ title: newTitle, content: newContent, author_email: session.user.email }]);
      if (error) throw error;
      showAlert('Published!', 'Your new platform update is live.', 'success');
      setNewTitle(''); setNewContent(''); fetchUpdates();
    } catch (error) { showAlert('Error', error.message, 'error'); } finally { setPublishing(false); }
  };

  const handleDelete = async (id) => {
    try { await supabase.from('forum_updates').delete().eq('id', id); fetchUpdates(); } 
    catch (e) { showAlert('Error', 'Could not delete update.', 'error'); }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <AlertModal {...alertConfig} onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })} />
      <div className="mb-8">
        <h2 className="text-3xl font-black text-white tracking-tight">Platform Updates 📢</h2>
        <p className="text-slate-400 text-sm mt-2">The latest features, fixes, and architecture drops for KeelEngine.</p>
      </div>

      {isAdmin && (
        <div className="glass p-8 rounded-3xl shadow-2xl border border-emerald-900/50 mb-10">
          <h3 className="text-xl font-bold text-emerald-400 mb-4">Publish New Update</h3>
          <form onSubmit={handlePublish} className="space-y-4">
            <input type="text" placeholder="Update Title (e.g. Version 10.5 Deployed)" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} required className="w-full bg-slate-900/80 border border-slate-700/50 rounded-xl px-5 py-4 text-white outline-none focus:border-emerald-500 font-bold" />
            <textarea rows="4" placeholder="What's new in this update?..." value={newContent} onChange={(e) => setNewContent(e.target.value)} required className="w-full bg-slate-900/80 border border-slate-700/50 rounded-xl px-5 py-4 text-white outline-none focus:border-emerald-500 leading-relaxed text-sm"></textarea>
            <button type="submit" disabled={publishing} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-4 px-8 rounded-xl shadow-lg tracking-wide text-sm">{publishing ? 'Publishing...' : 'Publish Update to Global Feed'}</button>
          </form>
        </div>
      )}

      <div className="space-y-6">
        {updates.length === 0 ? (
          <div className="text-center py-16 glass rounded-3xl border border-slate-800"><span className="text-4xl block mb-4">🚀</span><p className="text-slate-400 font-medium">No platform updates have been published yet.</p></div>
        ) : (
          updates.map((update) => (
            <div key={update.id} className="glass p-8 rounded-3xl shadow-xl border border-slate-700/40 relative group hover:border-slate-600 transition">
              {isAdmin && <button onClick={() => handleDelete(update.id)} className="absolute top-8 right-8 text-red-500 opacity-0 group-hover:opacity-100 transition bg-red-500/10 hover:bg-red-500 hover:text-white px-3 py-1 rounded-lg text-xs font-bold border border-red-500/20">Delete</button>}
              <h3 className="text-2xl font-bold text-white mb-3">{update.title}</h3>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">{new Date(update.created_at).toLocaleDateString()}</span>
              <p className="mt-6 text-slate-300 leading-relaxed whitespace-pre-wrap font-medium">{update.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}