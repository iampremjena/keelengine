import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import AlertModal from '../components/AlertModal';

const QUICK_LOCATION_MAP = {
  "bank": "EC3V 3LA", "canary wharf": "E14 5AB", "london bridge": "SE1 9SG",
  "kings cross": "N1C 4AP", "liverpool street": "EC2M 7PY", "victoria": "SW1E 5ND",
  "waterloo": "SE1 8SW", "stratford": "E15 1AZ", "paddington": "W2 1HB", "ealing": "W5 2NU"
};

export default function Dashboard({ session }) {
  useEffect(() => { document.title = "KeelEngine AI | Property & Commute Search"; }, []);

  const [searchParams, setSearchParams] = useSearchParams();
  
  // Default to Manual Form as requested
  const [searchMode, setSearchMode] = useState('manual'); // 'manual' | 'ai'
  
  // Manual Form States
  const [moveType, setMoveType] = useState(searchParams.get('move') || 'solo');
  const [grossSalary, setGrossSalary] = useState(Number(searchParams.get('salary')) || 50000);
  const [partnerSalary, setPartnerSalary] = useState(Number(searchParams.get('partner')) || 0);
  const [budgetSlider, setBudgetSlider] = useState(Number(searchParams.get('budget')) || 40); // % Rent Allowance Slider
  const [officeDays, setOfficeDays] = useState(Number(searchParams.get('days')) || 3);
  const [postcode, setPostcode] = useState(searchParams.get('postcode') || '');
  const [propertyType, setPropertyType] = useState(searchParams.get('type') || '1-Bed Private Flat');
  
  // AI Prompt State
  const [aiPromptText, setAiPromptText] = useState('');

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');

  const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: '', message: '', type: 'success' });
  const showAlert = (title, message, type) => setAlertConfig({ isOpen: true, title, message, type });

  const hasSearched = searchParams.has('postcode');

  // Net Monthly & Rent Budget Calculation
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

  // MANUAL FORM SEARCH TRIGGER
  const triggerManualSearch = (e) => {
    e.preventDefault();
    if (!postcode.trim()) return showAlert("Postcode Required", "Please enter your office postcode (e.g. E16 1US)", "error");
    
    setSearchParams({ 
      postcode: postcode.toUpperCase().trim(), 
      move: moveType, 
      salary: grossSalary, 
      partner: partnerSalary, 
      budget: budgetSlider, 
      days: officeDays,
      type: propertyType
    });
  };

  // AI PARSER SEARCH TRIGGER
  const handleAiSubmit = (e) => {
    e.preventDefault();
    const text = aiPromptText.toLowerCase().trim();
    if (!text) return showAlert("Input Required", "Please describe your ideal property.", "error");

    let extractedPostcode = postcode || "E16 1US";
    const pcMatch = text.match(/\b([A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][ABD-HJLNP-UW-Z]{2})\b/i);
    if (pcMatch) {
      extractedPostcode = pcMatch[0].toUpperCase();
    } else {
      Object.keys(QUICK_LOCATION_MAP).forEach(key => { 
        if (text.includes(key)) extractedPostcode = QUICK_LOCATION_MAP[key]; 
      });
    }

    const salMatch = text.match(/([0-9]{2,3})\s*k/);
    const extractedSalary = salMatch ? parseInt(salMatch[1]) * 1000 : grossSalary;

    const daysMatch = text.match(/([1-5])\s*days/);
    const extractedDays = daysMatch ? parseInt(daysMatch[1]) : officeDays;

    let extractedType = propertyType;
    if (text.includes("studio")) extractedType = "Studio Flat";
    else if (text.includes("2 bed") || text.includes("2-bed")) extractedType = "2-Bed Flat";
    else if (text.includes("room") || text.includes("share")) extractedType = "Shared Flatshare / Room";

    setPostcode(extractedPostcode);
    setGrossSalary(extractedSalary);
    setOfficeDays(extractedDays);
    setPropertyType(extractedType);

    setSearchParams({ 
      postcode: extractedPostcode, 
      move: moveType, 
      salary: extractedSalary, 
      partner: partnerSalary, 
      budget: budgetSlider, 
      days: extractedDays,
      type: extractedType
    });
  };

  // MAIN API FETCH (Runs whenever searchParams URL changes)
  useEffect(() => {
    const pc = searchParams.get('postcode');
    if (!pc) return;

    const urlSalary = Number(searchParams.get('salary')) || 50000;
    const urlPartner = Number(searchParams.get('partner')) || 0;
    const urlBudget = Number(searchParams.get('budget')) || 40;
    const urlDays = Number(searchParams.get('days')) || 3;
    const urlType = searchParams.get('type') || "1-Bed Private Flat";

    const netVal1 = calculateNetMonthly(urlSalary);
    const netVal2 = searchParams.get('move') === 'couple' ? calculateNetMonthly(urlPartner) : 0;
    const activeTotalBudget = Math.round((netVal1 + netVal2) * (urlBudget / 100));

    const runCompute = async () => {
      setLoading(true); setErrorMsg(''); setResults([]);

      if (session?.user) {
        supabase.from('search_analytics').insert([{ gross_salary: urlSalary, office_postcode: pc }]).then();
      }

      try {
        // Calls the Vercel Serverless Function at /api/compute
        const res = await fetch(`/api/compute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            postcode: pc, 
            days_per_week: urlDays, 
            property_type: urlType, 
            total_budget: activeTotalBudget 
          })
        });

        if (!res.ok) throw new Error("Server error. Please ensure API environment variables are configured in Vercel.");
        
        const data = await res.json();
        
        if (data.error) setErrorMsg(data.error);
        else if (!data.hubs || data.hubs.length === 0) setErrorMsg(`⚠️ No neighborhoods match a budget of £${activeTotalBudget.toLocaleString()}. Try adjusting your Max Rent Allowance.`);
        else setResults(data.hubs);

      } catch (err) { 
        console.error("Compute error:", err);
        setErrorMsg(err.message || 'Connection error. Please try again.'); 
      } finally { 
        setLoading(false); 
      }
    };

    runCompute();
  }, [searchParams, session]);

  const saveProperty = async (hub) => {
    if (!session) return showAlert("Sign In Required", "Please log in to save properties to your profile.", "error");
    try {
      const { error } = await supabase.from('saved_properties').insert([{
        user_id: session.user.id,
        neighborhood: hub.Neighborhood,
        outcode: hub.Station_Outcode,
        rent_range: hub.Rent_Range,
        suggestion_score: hub.Suggestion_Score
      }]);
      if (error) throw error;
      showAlert("Saved!", `${hub.Neighborhood} saved to your profile.`, "success");
    } catch (e) {
      showAlert("Error", "Could not save property.", "error");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 min-h-[85vh]">
      <AlertModal {...alertConfig} onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })} />

      <div className={`flex flex-col lg:flex-row gap-8 ${!hasSearched ? 'justify-center items-center' : 'items-start'}`}>
        
        {/* LEFT SEARCH CONTROL FORM */}
        <div className={`w-full ${!hasSearched ? 'max-w-xl' : 'lg:w-1/3 sticky top-8'}`}>
          <div className="glass p-8 rounded-3xl shadow-2xl border border-emerald-900/30">
            
            {/* SEARCH MODE TOGGLE */}
            <div className="flex bg-slate-900 p-1.5 rounded-xl border border-slate-800 mb-6">
              <button 
                type="button"
                onClick={() => setSearchMode('manual')} 
                className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition ${searchMode === 'manual' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
              >
                ⚙️ Manual Form
              </button>
              <button 
                type="button"
                onClick={() => setSearchMode('ai')} 
                className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition ${searchMode === 'ai' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
              >
                ✨ AI Assistant
              </button>
            </div>

            {/* DEFAULT MANUAL FORM */}
            {searchMode === 'manual' && (
              <form onSubmit={triggerManualSearch} className="space-y-6 text-left">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Who is moving?</label>
                  <select value={moveType} onChange={(e) => setMoveType(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none text-sm">
                    <option value="solo">Just Me</option>
                    <option value="couple">A Couple</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Target Property Type</label>
                  <select value={propertyType} onChange={(e) => setPropertyType(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none text-sm">
                    <option value="Shared Flatshare / Room">Shared Flatshare / Room</option>
                    <option value="Studio Flat">Studio Flat</option>
                    <option value="1-Bed Private Flat">1-Bed Private Flat</option>
                    <option value="2-Bed Flat">2-Bed Flat</option>
                  </select>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-xs font-bold text-slate-300 uppercase">Your Annual Salary</label>
                    <span className="text-emerald-400 font-bold text-sm">£{grossSalary.toLocaleString()}</span>
                  </div>
                  <input type="range" min="15000" max="200000" step="1000" value={grossSalary} onChange={(e) => setGrossSalary(Number(e.target.value))} className="w-full accent-emerald-500" />
                </div>

                {moveType === 'couple' && (
                  <div>
                    <div className="flex justify-between mb-2">
                      <label className="text-xs font-bold text-slate-300 uppercase">Partner's Annual Salary</label>
                      <span className="text-emerald-400 font-bold text-sm">£{partnerSalary.toLocaleString()}</span>
                    </div>
                    <input type="range" min="0" max="200000" step="1000" value={partnerSalary} onChange={(e) => setPartnerSalary(Number(e.target.value))} className="w-full accent-emerald-500" />
                  </div>
                )}

                {/* 🎯 RESTORED MAX RENT ALLOWANCE SLIDER */}
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-xs font-bold text-slate-300 uppercase">Max Rent Allowance %</label>
                    <span className="text-white font-bold text-sm">{budgetSlider}% of Net Pay</span>
                  </div>
                  <input type="range" min="20" max="60" step="5" value={budgetSlider} onChange={(e) => setBudgetSlider(Number(e.target.value))} className="w-full accent-emerald-500" />
                </div>

                <div className="bg-slate-950 p-4 rounded-xl text-center border border-slate-800">
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Computed Rent + Transit Ceiling</p>
                  <p className="text-2xl text-emerald-400 font-black mt-1">£{computedTotalBudget.toLocaleString()}<span className="text-xs text-slate-400 font-normal">/mo</span></p>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-xs font-bold text-slate-300 uppercase">Days in Office / Week</label>
                    <span className="text-blue-400 font-bold text-sm">{officeDays} Days</span>
                  </div>
                  <input type="range" min="1" max="5" step="1" value={officeDays} onChange={(e) => setOfficeDays(Number(e.target.value))} className="w-full accent-blue-500" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Office Postcode Target</label>
                  <input type="text" placeholder="e.g. EC1A 1BB or E16 1US" required value={postcode} onChange={(e) => setPostcode(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-4 font-mono text-white outline-none uppercase text-sm" />
                </div>

                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl transition shadow-xl text-sm">
                  Compute AI Matches ➔
                </button>
              </form>
            )}

            {/* AI PROMPT FORM */}
            {searchMode === 'ai' && (
              <form onSubmit={handleAiSubmit} className="space-y-4 text-left">
                <div>
                  <label className="block text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">AI Natural Language Assistant</label>
                  <textarea 
                    value={aiPromptText}
                    onChange={(e) => setAiPromptText(e.target.value)}
                    placeholder="e.g., I work in Canary Wharf 3 days a week, earn £65k, and need a 1-bed flat under £2,000 total..."
                    className="w-full h-40 bg-slate-900 border border-slate-700 rounded-xl p-4 text-white text-sm outline-none resize-none focus:border-emerald-500 transition"
                  />
                </div>
                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl transition shadow-xl text-sm flex items-center justify-center gap-2">
                  <span>✨</span> Parse Intent & Run AI Search
                </button>
              </form>
            )}

          </div>
        </div>

        {/* RIGHT RESULTS DISPLAY */}
        {hasSearched && (
          <div className="w-full lg:w-2/3 space-y-6">
            
            <div className="flex justify-between items-center bg-slate-900/60 p-4 rounded-2xl border border-slate-700/50 shadow-md">
              <span className="text-slate-300 text-sm">Showing AI results for <strong className="text-white font-mono">{searchParams.get('postcode')}</strong></span>
              <span className="text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold px-3 py-1.5 rounded-lg">Budget: £{computedTotalBudget}/mo</span>
            </div>

            {loading && (
              <div className="glass rounded-3xl py-28 text-center border border-emerald-500/30">
                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-emerald-400 font-bold text-sm">Orchestrating OpenAI Reasoning Models...</p>
                <p className="text-xs text-slate-400 mt-1">Calculating TfL peak fares and scanning live listing portals...</p>
              </div>
            )}

            {errorMsg && !loading && (
              <div className="p-8 glass rounded-3xl border border-red-900/50 text-amber-400 text-center font-medium">
                {errorMsg}
              </div>
            )}

            {!loading && results.map((hub, idx) => (
              <div key={idx} className="glass rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-700/40 hover:border-emerald-500/40 transition">
                
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-2xl font-black text-white">{hub.Neighborhood} <span className="text-sm font-normal text-slate-400">({hub.Station_Outcode})</span></h3>
                    <p className="text-xs text-slate-400 font-medium">{hub.Borough} Borough</p>
                  </div>
                  <div className="bg-slate-950 border border-emerald-500/30 rounded-2xl px-4 py-2 text-center">
                    <span className="block text-[9px] text-slate-400 uppercase font-bold">Match Score</span>
                    <span className="text-2xl font-black text-emerald-400">{hub.Suggestion_Score}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                    <span className="block text-[10px] text-slate-400 uppercase font-bold">Estimated Rent</span>
                    <span className="text-emerald-400 font-bold text-sm">{hub.Rent_Range}</span>
                  </div>
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                    <span className="block text-[10px] text-slate-400 uppercase font-bold">Commute Time</span>
                    <span className="text-white font-bold text-sm">{hub.Commute_Duration} Mins</span>
                  </div>
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                    <span className="block text-[10px] text-slate-400 uppercase font-bold">TfL Single Fare</span>
                    <span className="text-blue-400 font-bold text-sm">£{parseFloat(hub.Single_Fare_Cost).toFixed(2)}</span>
                  </div>
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                    <span className="block text-[10px] text-slate-400 uppercase font-bold">Safety Index</span>
                    <span className="text-amber-400 font-bold text-sm">{hub.Safety_Score}/100</span>
                  </div>
                </div>

                {/* AI VERDICT */}
                <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 mb-6 text-xs leading-relaxed text-slate-300">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block mb-2">✨ KeelEngine AI Verdict</span>
                  <p>{hub.AI_Verdict}</p>
                </div>

                {/* LIVE LISTINGS FROM RIGHTMOVE / ZOOPLA */}
                {hub.live_listings && hub.live_listings.length > 0 && (
                  <div className="mb-6 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block mb-3">🔗 Live Internet Listings Found:</span>
                    <div className="flex flex-col gap-2">
                      {hub.live_listings.map((item, lIdx) => (
                        <a key={lIdx} href={item.url} target="_blank" rel="noreferrer" className="flex items-center justify-between bg-slate-950 hover:bg-slate-800 p-3 rounded-xl border border-slate-800 hover:border-blue-500/50 transition text-xs">
                          <span className="text-slate-200 font-medium truncate max-w-md">{item.title}</span>
                          <span className="text-blue-400 font-bold text-[11px] whitespace-nowrap">View Listing ➔</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* ACTION BUTTONS */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <a href={`https://www.google.com/maps/dir/?api=1&origin=${hub.Neighborhood}&destination=${searchParams.get('postcode')}&travelmode=transit`} target="_blank" rel="noreferrer" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 px-4 rounded-xl text-center text-xs transition shadow-lg">
                    🗺️ Maps Route
                  </a>
                  <button onClick={() => saveProperty(hub)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3.5 px-4 rounded-xl text-xs transition border border-slate-600 shadow-lg">
                    ❤️ Save Property
                  </button>
                </div>

              </div>
            ))}

          </div>
        )}

      </div>
    </div>
  );
}