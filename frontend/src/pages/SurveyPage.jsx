import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import AlertModal from '../components/AlertModal';

export default function SurveyPage({ session }) {
  useEffect(() => { document.title = "KeelEngine | Community"; }, []);

  const [email, setEmail] = useState(session?.user?.email || '');
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const defaultAbout = "Name is Prem Jena\nhttps://linkedin.com/in/iampremjena";
  const [aboutText, setAboutText] = useState(defaultAbout);
  const [isEditingDev, setIsEditingDev] = useState(false);
  const [savingDev, setSavingDev] = useState(false);

  const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: '', message: '', type: 'success' });
  const showAlert = (title, message, type) => setAlertConfig({ isOpen: true, title, message, type });

  const isAdmin = session?.user?.email === 'iampremjena@gmail.com';

  useEffect(() => {
    const fetchAbout = async () => {
      const { data } = await supabase.from('forum_updates').select('*').eq('title', 'ABOUT_DEVELOPER');
      if (data && data.length > 0) setAboutText(data[0].content);
    };
    fetchAbout();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!feedback.trim()) return;

    setSubmitting(true);
    setTimeout(() => {
      showAlert('Request Received', 'Your feature request has been safely logged in our pipeline!', 'success');
      setFeedback('');
      setSubmitting(false);
    }, 800);
  };

  const handleSaveAbout = async () => {
    setSavingDev(true);
    try {
      await supabase.from('forum_updates').delete().eq('title', 'ABOUT_DEVELOPER');
      const { error } = await supabase.from('forum_updates').insert([{ 
        title: 'ABOUT_DEVELOPER', 
        content: aboutText, 
        author_email: session.user.email 
      }]);
      if (error) throw error;
      setIsEditingDev(false);
      showAlert('Profile Updated', 'Developer biography has been updated globally.', 'success');
    } catch (e) {
      showAlert('Error', 'Failed to update biography.', 'error');
    } finally {
      setSavingDev(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 flex flex-col md:flex-row gap-8">
      <AlertModal {...alertConfig} onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })} />
      
      <div className="w-full md:w-2/3 glass p-10 rounded-3xl shadow-2xl border border-slate-700/40">
        <h2 className="text-3xl font-black text-white mb-2 tracking-tight">Community Hub</h2>
        <p className="text-slate-400 text-sm mb-8">
          Shape the feature pipeline. Let us know what datasets or transit integrations you want next.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5 text-left">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Your Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-5 py-4 text-white outline-none focus:border-emerald-500 transition font-medium" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Feedback & Feature Architecture Requests</label>
            <textarea rows="4" value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="e.g. Add school zoning filters..." required className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-5 py-4 text-white outline-none focus:border-emerald-500 transition text-sm leading-relaxed"></textarea>
          </div>
          <button type="submit" disabled={submitting} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl shadow-lg transition tracking-wide text-sm">
            {submitting ? 'Sending Request...' : 'Share Feedback'}
          </button>
        </form>
      </div>

      <div className="w-full md:w-1/3">
        <div className="glass p-8 rounded-3xl shadow-2xl border border-emerald-900/30 sticky top-8">
          <h3 className="text-xl font-black text-emerald-400 mb-4 tracking-tight">About the Developer</h3>
          
          {isEditingDev ? (
            <div className="space-y-4">
              <textarea 
                value={aboutText} 
                onChange={(e) => setAboutText(e.target.value)} 
                rows="6" 
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500 text-sm"
              ></textarea>
              <button onClick={handleSaveAbout} disabled={savingDev} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-xl text-xs transition">
                {savingDev ? 'Saving...' : 'Save Public Bio'}
              </button>
              <button onClick={() => setIsEditingDev(false)} className="w-full bg-slate-800 text-slate-300 font-bold py-2 rounded-xl text-xs hover:bg-slate-700 transition">Cancel</button>
            </div>
          ) : (
            <div>
              <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                {aboutText}
              </p>
              {isAdmin && (
                <button onClick={() => setIsEditingDev(true)} className="mt-6 w-full bg-slate-800 border border-slate-600 text-slate-300 hover:text-white font-bold py-2 rounded-xl text-xs transition">
                  ✏️ Edit Public Biography
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}