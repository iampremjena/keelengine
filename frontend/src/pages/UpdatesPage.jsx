import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function UpdatesPage() {
  const navigate = useNavigate();

  const updatesList = [
    {
      date: 'September 2026',
      tag: 'Platform Update',
      title: 'Enterprise Batch Relocation Suite Live',
      description: 'Businesses can now upload employee batch spreadsheets (.xlsx) to automatically generate and dispatch tailored London relocation guides directly to new hires.'
    },
    {
      date: 'August 2026',
      tag: 'TfL Fare Matrix',
      title: '2026 TfL Peak & Off-Peak Fare Alignment',
      description: 'Clyde’s travel cost engine has been updated with 2026 TfL Zone 1-6 peak single fare schedules to ensure monthly commute math remains 100% accurate.'
    },
    {
      date: 'July 2026',
      tag: 'AI Assistant',
      title: 'Bonnie Voice Assistant & TTS Stream Integration',
      description: 'Bonnie can now speak her answers back to you via OpenAI TTS whenever voice input is captured, providing instant advice on UK Visas, NHS/GP registration, and Monzo setups.'
    },
    {
      date: 'June 2026',
      tag: 'Housing Portals',
      title: 'SpareRoom & OpenRent Direct Portal Deep-Links',
      description: 'Suggested listings now dynamically link directly to SpareRoom for shared flatshares and OpenRent/Zoopla for private studio and 1-bed flats.'
    }
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-fadeIn">
      <div className="glass rounded-3xl border border-slate-700/50 p-6 sm:p-10 shadow-2xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-800 mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-white">Platform Updates & Market Logs</h2>
            <p className="text-slate-400 text-xs mt-1">Latest feature rollouts, London transit fare updates, and relocation intelligence logs.</p>
          </div>
          <button onClick={() => navigate('/home')} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition shadow-md">
            ← Back to Dashboard
          </button>
        </div>

        <div className="space-y-6">
          {updatesList.map((item, idx) => (
            <div key={idx} className="bg-slate-950 p-6 rounded-2xl border border-slate-800/80 hover:border-emerald-500/40 transition shadow-lg">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-md border border-emerald-500/30">
                  {item.tag}
                </span>
                <span className="text-xs text-slate-500 font-medium">{item.date}</span>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
              <p className="text-xs text-slate-300 leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}