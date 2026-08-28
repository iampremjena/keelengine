import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import AlertModal from '../components/AlertModal';

// Fast local mapping for common London locations/landmarks
const QUICK_LOCATION_MAP = {
  "bank": "EC3V 3LA",
  "canary wharf": "E14 5AB",
  "london bridge": "SE1 9SG",
  "kings cross": "N1C 4AP",
  "liverpool street": "EC2M 7PY",
  "victoria": "SW1E 5ND",
  "waterloo": "SE1 8SW",
  "stratford": "E15 1AZ",
  "paddington": "W2 1HB",
  "ealing": "W5 2NU"
};

export default function Dashboard({ session }) {
  useEffect(() => { document.title = "KeelEngine | Commute & Rental Finder"; }, []);

  const [searchParams, setSearchParams] = useSearchParams();
  
  // Default search mode is now MANUAL form
  const [searchMode, setSearchMode] = useState('manual'); // 'manual' | 'ai'
  
  // Manual Form States
  const [moveType, setMoveType] = useState(searchParams.get('move') || 'solo');
  const [grossSalary, setGrossSalary] = useState(Number(searchParams.get('salary')) || 50000);
  const [partnerSalary, setPartnerSalary] = useState(Number(searchParams.get('partner')) || 50000);
  const [budgetSlider, setBudgetSlider] = useState(Number(searchParams.get('budget')) || 40);
  const [officeDays, setOfficeDays] = useState(Number(searchParams.get('days')) || 3);
  const [postcode, setPostcode] = useState(searchParams.get('postcode') || '');
  
  // AI Prompt & Follow-Up States
  const [aiPromptText, setAiPromptText] = useState('');
  const [aiFollowUpNeeded, setAiFollowUpNeeded] = useState(null); // null | { missingSalary: boolean, missingPostcode: boolean }

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');

  const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: '', message: '', type: 'success' });
  const showAlert = (title, message, type) => setAlertConfig({ isOpen: true, title, message, type });

  const hasSearched = searchParams.has('postcode');

  // Backend Wake-up Ping on Page Mount (Fixes Render cold start delay)
  useEffect(() => {
    fetch("https://keelengine-backend.onrender.com/docs", { method: 'HEAD' }).catch(() => {});
  }, []);

  const calculateNetMonthly = (gross) => {
    let tax = 0;
    if (gross > 12570) {
      if (gross <= 50270) tax = (gross - 12570) * 0.28;
      else if (gross <= 125140) tax = ((50270 - 12570) * 0.28) + ((gross - 50270) * 0.42);
      else tax = ((50270 - 12570) * 0.42) + ((125140 - 50270) * 0.42) + ((gross - 125140) * 0.47);
    }
    return (gross - tax) / 12;
  };

  const net1 = calculateNetMonthly(grossSalary);
  const net2 = moveType === 'couple' ? calculateNetMonthly(partnerSalary) : 0;
  const computedTotalBudget = Math.round((net1 + net2) * (budgetSlider / 100));

  // AI Prompt Parser with Intelligent Follow-Up Routing
  const handleAiSubmit = async (e) => {
    e.preventDefault();
    setAiFollowUpNeeded(null);

    const text = aiPromptText.toLowerCase().trim();
    if (!text) return showAlert("Input Required", "Please enter a description or prompt.", "error");

    let extractedPostcode = "";
    let extractedSalary = grossSalary;
    let extractedDays = officeDays;

    // 1. Check for explicit Postcode pattern
    const pcMatch = aiPromptText.match(/\b([A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][ABD-HJLNP-UW-Z]{2})\b/i) || aiPromptText.match(/\b([A-Z]{1,2}[0-9]{1,2})\b/i);
    if (pcMatch) {
      extractedPostcode = pcMatch[0].toUpperCase();
    } else {
      // 2. Check local landmark map (e.g. "Bank", "Canary Wharf")
      for (const key of Object.keys(QUICK_LOCATION_MAP)) {
        if (text.includes(key)) {
          extractedPostcode = QUICK_LOCATION_MAP[key];
          break;
        }
      }
    }

    // 3. Extract Salary if mentioned
    const salMatch = text.match(/([0-9]{2,3})\s*k/);
    if (salMatch) extractedSalary = parseInt(salMatch[1]) * 1000;

    // 4. Extract Office Days
    const daysMatch = text.match(/([1-5])\s*days/);
    if (daysMatch) extractedDays = parseInt(daysMatch[1]);

    // 🚨 IF CRITICAL INFORMATION IS MISSING -> ASK FOLLOW-UPS FIRST
    const missingPostcode = !extractedPostcode;
    const missingSalary = !salMatch && grossSalary === 50000; // Unchanged default

    if (missingPostcode || missingSalary) {
      setAiFollowUpNeeded({ missingPostcode, missingSalary });
      return;
    }

    // Update state & Trigger Search
    setPostcode(extractedPostcode);
    setGrossSalary(extractedSalary);
    setOfficeDays(extractedDays);

    setSearchParams({
      postcode: extractedPostcode,
      move: moveType,
      salary: extractedSalary,
      partner: partnerSalary,
      budget: budgetSlider,
      days: extractedDays
    });
  };

  const triggerManualSearch = (e) => {
    e.preventDefault();
    if (!postcode.trim()) return showAlert("Postcode Required", "Please enter your target office postcode.", "error");
    setSearchParams({ postcode: postcode.toUpperCase(), move: moveType, salary: grossSalary, partner: partnerSalary, budget: budgetSlider, days: officeDays });
  };

  // API Call with Browser Caching for Instant Load Times
  useEffect(() => {
    const pc = searchParams.get('postcode');
    if (!pc) return;

    const runCompute = async () => {
      setLoading(true); setErrorMsg(''); setResults([]);

      const cacheKey = `keel_cache_${pc}_${searchParams.get('days')}_${computedTotalBudget}`;
      const cachedData = localStorage.getItem(cacheKey);

      // Return cached results instantly if available!
      if (cachedData) {
        setResults(JSON.parse(cachedData));
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`https://keelengine-backend.onrender.com/api/compute`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postcode: pc, days_per_week: Number(searchParams.get('days')), property_type: "1-Bed Private Flat", total_budget: computedTotalBudget })
        });

        const data = await res.json();
        
        if (data.error) setErrorMsg(data.error);
        else if (data.is_outside_london) setErrorMsg(`Your office is in ${data.message}. We recommend local property checks! 🚂`);
        else if (!data.hubs || data.hubs.length === 0) setErrorMsg(`⚠️ No neighborhoods match a budget of £${computedTotalBudget.toLocaleString()}.`);
        else {
          setResults(data.hubs);
          localStorage.setItem(cacheKey, JSON.stringify(data.hubs)); // Cache response
        }
      } catch (err) { 
        setErrorMsg('Connection error. Please try again.'); 
      } finally { setLoading(false); }
    };

    runCompute();
  }, [searchParams, computedTotalBudget]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <AlertModal {...alertConfig} onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })} />

      <div className={`flex flex-col lg:flex-row gap-8 ${!hasSearched ? 'justify-center items-center' : 'items-start'}`}>
        
        {/* CONTROL BOX */}
        <div className={`w-full ${!hasSearched ? 'max-w-xl' : 'lg:w-1/3 sticky top-8'}`}>
          <div className="glass p-8 rounded-3xl shadow-2xl border border-emerald-900/30">
            
            {/* TAB SELECTOR: DEFAULT MANUAL FORM FIRST */}
            <div className="flex bg-slate-900 p-1.5 rounded-xl border border-slate-800 mb-6">
              <button 
                onClick={() => setSearchMode('manual')} 
                className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition ${searchMode === 'manual' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
              >
                ⚙️ Manual Form
              </button>
              <button 
                onClick={() => setSearchMode('ai')} 
                className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition ${searchMode === 'ai' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
              >
                ✨ AI Prompt (Beta)
              </button>
            </div>

            {/* DEFAULT MANUAL FORM */}
            {searchMode === 'manual' && (
              <form onSubmit={triggerManualSearch} className="space-y-6">
                <div>
                  <label className="block text-sm text-slate-300 mb-2">Who is moving?</label>
                  <select value={moveType} onChange={(e) => setMoveType(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none">
                    <option value="solo">Just Me</option>
                    <option value="couple">A Couple</option>
                  </select>
                </div>

                <div>
                  <div className="flex justify-between mb-2"><label className="text-sm text-slate-300">Annual Salary</label><span className="text-emerald-400 font-bold">£{grossSalary.toLocaleString()}</span></div>
                  <input type="range" min="10000" max="200000" step="1000" value={grossSalary} onChange={(e) => setGrossSalary(Number(e.target.value))} className="w-full" />
                </div>

                <div>
                  <div className="flex justify-between mb-2"><label className="text-sm text-slate-300">Max Rent Allowance</label><span className="text-white font-bold">{budgetSlider}%</span></div>
                  <input type="range" min="20" max="65" step="5" value={budgetSlider} onChange={(e) => setBudgetSlider(Number(e.target.value))} className="w-full" />
                </div>

                <div className="bg-slate-900/50 p-4 rounded-xl text-center">
                  <p className="text-xs text-slate-400">Total Monthly Budget</p>
                  <p className="text-2xl text-emerald-400 font-black">£{computedTotalBudget.toLocaleString()}</p>
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-2">Office Postcode</label>
                  <input type="text" placeholder="e.g. EC1A 1BB or E16 1US" required value={postcode} onChange={(e) => setPostcode(e.target.value)} className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-4 font-mono text-white outline-none uppercase" />
                </div>

                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl transition shadow-lg text-sm">Compute Matches ➔</button>
              </form>
            )}

            {/* OPTIONAL AI PROMPT FORM WITH FOLLOW-UP DIALOGUE */}
            {searchMode === 'ai' && (
              <form onSubmit={handleAiSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">AI Search Assistant</label>
                  <textarea 
                    value={aiPromptText}
                    onChange={(e) => setAiPromptText(e.target.value)}
                    placeholder="e.g. I work near Bank station 3 days a week, earn £60k, and want a flat under 40 mins commute..."
                    className="w-full h-32 bg-slate-900 border border-slate-700 rounded-xl p-4 text-white text-sm outline-none resize-none focus:border-emerald-500 transition"
                  />
                </div>

                {/* AI FOLLOW-UP INTERACTION BOX */}
                {aiFollowUpNeeded && (
                  <div className="bg-slate-950 p-4 rounded-xl border border-amber-500/50 animate-fadeIn text-xs space-y-3">
                    <span className="text-amber-400 font-bold block">🤔 AI Follow-up Needed:</span>
                    {aiFollowUpNeeded.missingPostcode && (
                      <div>
                        <label className="text-slate-300 block mb-1">Which station or area is your office located near?</label>
                        <input type="text" placeholder="e.g. Bank, Canary Wharf, or E16 1US" onChange={(e) => setPostcode(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono uppercase" />
                      </div>
                    )}
                    {aiFollowUpNeeded.missingSalary && (
                      <div>
                        <label className="text-slate-300 block mb-1">What is your annual salary? (£)</label>
                        <input type="number" placeholder="50000" onChange={(e) => setGrossSalary(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono" />
                      </div>
                    )}
                  </div>
                )}

                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl transition shadow-lg text-sm">
                  ✨ Parse Intent & Search
                </button>
              </form>
            )}

          </div>
        </div>

        {/* RESULTS RENDERER */}
        {hasSearched && (
          <div className="w-full lg:w-2/3 space-y-6">
            {loading && <div className="glass rounded-3xl py-24 text-center text-slate-400">Loading live transit matrices...</div>}
            {errorMsg && <div className="p-6 glass rounded-3xl border border-red-900/30 text-amber-400 text-center">{errorMsg}</div>}
            
            {!loading && results.map((hub, idx) => (
              <div key={idx} className="glass rounded-3xl p-6 shadow-xl border border-slate-700/40">
                <h3 className="text-xl font-bold text-white">{hub.Neighborhood} ({hub.Station_Outcode})</h3>
                <p className="text-xs text-emerald-400 font-bold my-2">Rent: {hub.Rent_Range} | Commute: {hub.Commute_Duration} mins via {hub.Line_Route}</p>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}