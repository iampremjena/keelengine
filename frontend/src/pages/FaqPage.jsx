import React from 'react';

export default function FaqPage() {

    useEffect(() => {
    document.title = "KeelEngine | FAQ Support";
  }, []);
  
  const faqs = [
    {
      q: "1. How is the Suggestion Score calculated?",
      a: "The engine uses a weighted optimization algorithm: 100 - (Commute Duration x 1.5) - (Monthly Fare Cost x 4.5). Neighborhoods with lightning-fast routes and highly optimized fare balances organically float to the top."
    },
    {
      q: "2. What does 'Door-to-Door' accuracy mean?",
      a: "We don't just calculate train station-to-station intervals. The engine runs calculations from physical postcode to physical postcode, automatically injecting a mandatory 12–15 minute buffer to account for ticket barriers, platform stairs, and walking speeds."
    },
    {
      q: "3. How accurate are these rental price brackets?",
      a: "Extremely. Instead of scraping outdated flat data, we use a regional real estate decay model anchored to current monthly market averages. The index scales down smoothly at the outcode sector layer."
    },
    {
      q: "4. Why does the engine require my Gross Salary?",
      a: "To simulate real spending power. The system automatically processes UK income tax brackets, National Insurance, and personal allowances to establish your exact monthly net take-home salary before checking rent metrics."
    },
    {
      q: "5. What is a healthy rent allocation percentage?",
      a: "The algorithm defaults to the 40% net threshold standard. Spending more than 45% of your net take-home pay on housing and transit combined significantly decreases your personal wealth accumulation vector."
    },
    {
      q: "6. Are weekend trips counted in the transit cost matrix?",
      a: "No. To keep data clean, the algorithm targets optimized commuter parameters: Peak Hour Single Return Fares multiplied explicitly by your mandatory Office Days per week, scaled across a 4.33-week standard month."
    },
    {
      q: "7. How do the Council Tax bands scale down dynamically?",
      a: "We cross-reference your neighborhood with its underlying local borough database, pull the current baseline 'Band D' price, and apply the structural government ratio indexes (e.g., Band A is 6/9ths, Band H is 18/9ths) instantly."
    },
    {
      q: "8. What happens if I search an outcode outside Greater London?",
      a: "The system runs a regional gateway safety loop. If your target postcode sits in the Home Counties or beyond, it gracefully halts the automated London transport grid parser and shifts recommendations into local regional commuter matrices."
    }
  ];

  

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="glass p-10 rounded-3xl shadow-2xl border border-slate-700/40">
        <h2 className="text-3xl font-black text-white mb-2 tracking-tight">Frequently Asked Questions</h2>
        <p className="text-slate-400 text-sm mb-10 border-b border-slate-700/50 pb-5">
          Everything you need to know about the relocation scoring mathematical models.
        </p>
        
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