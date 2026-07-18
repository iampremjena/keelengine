import React, { useState } from 'react';

export default function SurveyPage({ session }) {
  const [email, setEmail] = useState(session?.user?.email || '');
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!feedback.trim()) return;

    setSubmitting(true);
    // Simulating secure analytics processing package loop
    setTimeout(() => {
      alert('🚀 Feature request and workspace notes logged into the pipeline safely!');
      setFeedback('');
      setSubmitting(false);
    }, 800);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="glass p-10 rounded-3xl text-center shadow-2xl border border-slate-700/40">
        <h2 className="text-3xl font-black text-white mb-2 tracking-tight">Community Hub</h2>
        <p className="text-slate-400 text-sm mb-8">
          Shape the feature pipeline. Let us know what datasets or transit integrations you want next.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5 text-left">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Your Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-5 py-4 text-white outline-none focus:border-emerald-500 transition font-medium" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Feedback & Feature Architecture Requests</label>
            <textarea 
              rows="4"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="e.g. Crossrail 2 expansion routes, school zoning filters..."
              required
              className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-5 py-4 text-white outline-none focus:border-emerald-500 transition text-sm leading-relaxed"
            ></textarea>
          </div>
          <button 
            type="submit"
            disabled={submitting}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl shadow-lg transition tracking-wide text-sm"
          >
            {submitting ? 'Sending Request...' : 'Share Feedback Layout'}
          </button>
        </form>
      </div>
    </div>
  );
}