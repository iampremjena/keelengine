import React from 'react';

export default function AlertModal({ isOpen, title, message, onClose, type = 'success' }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center transform transition-all scale-100">
        <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
          {type === 'success' ? <span className="text-3xl">✓</span> : <span className="text-3xl">!</span>}
        </div>
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <p className="text-slate-400 text-sm mb-8 leading-relaxed">{message}</p>
        <button 
          onClick={onClose} 
          className={`w-full font-bold py-3 rounded-xl transition ${type === 'success' ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-600'}`}
        >
          Got it
        </button>
      </div>
    </div>
  );
}