import React, { useEffect } from 'react';

export default function FaqPage() {
  useEffect(() => { document.title = "KeelEngine | FAQ Support"; }, []);
  const faqs = [
    { q: "1. How is the Suggestion Score calculated?", a: "The engine uses a weighted optimization algorithm: 100 - (Commute Duration x 1.5) - (Monthly Fare Cost x 4.5)." },
    { q: "2. What does 'Door-to-Door' accuracy mean?", a: "We run calculations from physical postcode to physical postcode, automatically injecting a mandatory 12–15 minute buffer to account for ticket barriers, platform stairs, and walking speeds." },
    { q: "3. How accurate are these rental price brackets?", a: "Extremely. Instead of scraping outdated flat data, we use a regional real estate decay model anchored to current monthly market averages." },
    { q: "4. Why does the engine require my Gross Salary?", a: "To simulate real spending power. The system automatically processes UK income tax brackets, National Insurance, and personal allowances to establish your exact monthly net take-home salary." },
    { q: "5. What is the UK Police API Safety Index?", a: "We geohash historical crime density matrices along the specific walking paths from the station to standard residential hubs to ensure secure routing options." }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="glass p-10 rounded-3xl shadow-2xl border border-slate-700/40">
        <h2 className="text-3xl font-black text-white mb-2 tracking-tight">Frequently Asked Questions</h2>
        <p className="text-slate-400 text-sm mb-10 border-b border-slate-700/50 pb-5">Everything you need to know about the relocation scoring mathematical models.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {faqs.map((item, idx) => (
            <div key={idx} className="bg-slate-950/20 p-5 rounded-2xl border border-slate-800/40 hover:border-emerald-500/20 transition">
              <h4 className="font-bold text-emerald-400 mb-2 text-base">{item.q}</h4>
              <p className="text-sm text-slate-300 leading-relaxed font-medium">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}