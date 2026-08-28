import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import AlertModal from '../components/AlertModal';

const QUICK_LOCATION_MAP = {
  "bank": "EC3V 3LA", "canary wharf": "E14 5AB", "london bridge": "SE1 9SG",
  "kings cross": "N1C 4AP", "liverpool street": "EC2M 7PY", "victoria": "SW1E 5ND",
  "waterloo": "SE1 8SW", "stratford": "E15 1AZ", "paddington": "W2 1HB", "ealing": "W5 2NU"
};

export default function Dashboard({ session }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchMode, setSearchMode] = useState('manual'); 
  
  const [moveType, setMoveType] = useState(searchParams.get('move') || 'solo');
  const [grossSalary, setGrossSalary] = useState(Number(searchParams.get('salary')) || 50000);
  const [budgetSlider, setBudgetSlider] = useState(Number(searchParams.get('budget')) || 40);
  const [officeDays, setOfficeDays] = useState(Number(searchParams.get('days')) || 3);
  const [postcode, setPostcode] = useState(searchParams.get('postcode') || '');
  const [propertyType, setPropertyType] = useState('1-Bed Private Flat');
  
  const [aiPromptText, setAiPromptText] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');

  const [liveListings, setLiveListings] = useState({ isOpen: false, data: [], loading: false, neighborhood: '' });
  const [simulation, setSimulation] = useState({ isOpen: false, data: '', loading: false, neighborhood: '' });

  const hasSearched = searchParams.has('postcode');

  const handleAiSubmit = async (e) => {
    e.preventDefault();
    const text = aiPromptText.toLowerCase().trim();
    if (!text) return;

    let extractedPostcode = postcode || "E16 1US";
    const pcMatch = text.match(/\b([A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][ABD-HJLNP-UW-Z]{2})\b/i);
    if (pcMatch) extractedPostcode = pcMatch[0].toUpperCase();
    else Object.keys(QUICK_LOCATION_MAP).forEach(key => { if (text.includes(key)) extractedPostcode = QUICK_LOCATION_MAP[key]; });

    const salMatch = text.match(/([0-9]{2,3})\s*k/);
    const extractedSalary = salMatch ? parseInt(salMatch[1]) * 1000 : grossSalary;

    const daysMatch = text.match(/([1-5])\s*days/);
    const extractedDays = daysMatch ? parseInt(daysMatch[1]) : officeDays;

    let extractedProp = propertyType;
    if (text.includes("studio")) extractedProp = "Studio Flat";
    if (text.includes("2 bed") || text.includes("2-bed")) extractedProp = "2-Bed Flat";
    if (text.includes("room") || text.includes("share")) extractedProp = "House Share / Room";

    // Update State & URL instantly
    setPostcode(extractedPostcode); setGrossSalary(extractedSalary); setOfficeDays(extractedDays); setPropertyType(extractedProp);
    
    setSearchParams({ postcode: extractedPostcode, move: moveType, salary: extractedSalary, budget: budgetSlider, days: extractedDays, type: extractedProp });
  };

  const triggerManualSearch = (e) => {
    e.preventDefault();
    if (!postcode.trim()) return;
    setSearchParams({ postcode: postcode.toUpperCase(), move: moveType, salary: grossSalary, budget: budgetSlider, days: officeDays, type: propertyType });
  };

  // 🐛 BUG FIX: Calculate budget INSIDE useEffect based purely on URL params to avoid state lag
  useEffect(() => {
    const pc = searchParams.get('postcode');
    if (!pc) return;

    const urlSalary = Number(searchParams.get('salary')) || 50000;
    const urlBudget = Number(searchParams.get('budget')) || 40;
    const urlDays = Number(searchParams.get('days')) || 3;
    const urlType = searchParams.get('type') || "1-Bed Private Flat";

    const tax = urlSalary > 12570 ? (urlSalary - 12570) * 0.28 : 0; // Simplified for brevity
    const activeNetMonthly = (urlSalary - tax) / 12;
    const activeTotalBudget = Math.round(activeNetMonthly * (urlBudget / 100));

    const runCompute = async () => {
      setLoading(true); setErrorMsg(''); setResults([]);
      try {
        const res = await fetch(`http://localhost:8000/api/compute`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postcode: pc, days_per_week: urlDays, property_type: urlType, total_budget: activeTotalBudget })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setResults(data.hubs);
      } catch (err) { setErrorMsg('Failed to orchestrate AI Agents.'); } 
      finally { setLoading(false); }
    };
    runCompute();
  }, [searchParams]);

  // LIVE WEB SCRAPING TRIGGER
  const fetchLiveWebListings = async (hub) => {
    setLiveListings({ isOpen: true, loading: true, data: [], neighborhood: hub.Neighborhood });
    try {
      const res = await fetch(`http://localhost:8000/api/fetch_live_listings`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ neighborhood: hub.Neighborhood, property_type: searchParams.get('type') || propertyType, max_rent: hub.Rent_Range })
      });
      const data = await res.json();
      setLiveListings({ isOpen: true, loading: false, data: data.results, neighborhood: hub.Neighborhood });
    } catch(e) { setLiveListings({ isOpen: true, loading: false, data: [], neighborhood: hub.Neighborhood }); }
  };

  // FINANCIAL SIMULATION TRIGGER
  const runSimulation = async (hub) => {
    setSimulation({ isOpen: true, loading: true, data: '', neighborhood: hub.Neighborhood });
    const monthlyTransit = Math.round(hub.Single_Fare_Cost * 2 * (Number(searchParams.get('days')) || 3) * 4.33);
    const rentNum = hub.Rent_Range.replace(/[^0-9]/g, '').substring(0, 4); // Extract base rent
    
    try {
      const res = await fetch(`http://localhost:8000/api/simulate_risk`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rent: rentNum, transit: monthlyTransit })
      });
      const data = await res.json();
      setSimulation({ isOpen: true, loading: false, data: data.simulation_report, neighborhood: hub.Neighborhood });
    } catch(e) { setSimulation({ ...simulation, loading: false }); }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      
      {/* 🕸️ MODAL: LIVE INTERNET LISTINGS */}
      {liveListings.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md px-4">
          <div className="bg-slate-900 border border-blue-500/50 p-8 rounded-3xl w-full max-w-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Live Web Listings: {liveListings.neighborhood}</h3>
              <button onClick={() => setLiveListings({...liveListings, isOpen: false})} className="text-white">✕</button>
            </div>
            {liveListings.loading ? <p className="text-blue-400 animate-pulse">Scanning Rightmove & Zoopla...</p> : (
              <div className="space-y-4">
                {liveListings.data.map((listing, i) => (
                  <a key={i} href={listing.url} target="_blank" rel="noreferrer" className="block p-4 bg-slate-800 rounded-xl hover:border-blue-500 border border-transparent transition">
                    <strong className="text-blue-400 text-sm block">{listing.title}</strong>
                    <span className="text-xs text-slate-400">{listing.url.substring(0, 50)}...</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 📊 MODAL: FINANCIAL SIMULATOR */}
      {simulation.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md px-4">
          <div className="bg-slate-900 border border-amber-500/50 p-8 rounded-3xl w-full max-w-xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">3-Year Financial Risk: {simulation.neighborhood}</h3>
              <button onClick={() => setSimulation({...simulation, isOpen: false})} className="text-white">✕</button>
            </div>
            {simulation.loading ? <p className="text-amber-400 animate-pulse">Running Monte Carlo parameters...</p> : (
              <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{simulation.data}</div>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8">
        {/* CONTROL PANEL */}
        <div className="w-full lg:w-1/3">
          <div className="glass p-8 rounded-3xl border border-emerald-900/30">
            <div className="flex bg-slate-900 p-1 rounded-xl mb-6">
              <button onClick={() => setSearchMode('manual')} className={`flex-1 py-2 rounded-lg text-xs font-bold ${searchMode === 'manual' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'}`}>⚙️ Manual</button>
              <button onClick={() => setSearchMode('ai')} className={`flex-1 py-2 rounded-lg text-xs font-bold ${searchMode === 'ai' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'}`}>✨ AI Search</button>
            </div>

            {searchMode === 'ai' ? (
              <form onSubmit={handleAiSubmit} className="space-y-4">
                <textarea value={aiPromptText} onChange={(e) => setAiPromptText(e.target.value)} placeholder="e.g. I earn £60k, work in Bank 3 days a week, and want a Studio flat..." className="w-full h-32 bg-slate-900 border border-slate-700 rounded-xl p-4 text-white text-sm" />
                <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl text-sm">✨ Parse & Search</button>
              </form>
            ) : (
              <form onSubmit={triggerManualSearch} className="space-y-5">
                <div>
                  <label className="text-sm text-slate-300">Property Type</label>
                  <select value={propertyType} onChange={e => setPropertyType(e.target.value)} className="w-full bg-slate-900 p-3 rounded-xl text-white mt-1">
                    <option>Studio Flat</option><option>1-Bed Private Flat</option><option>2-Bed Flat</option><option>House Share / Room</option>
                  </select>
                </div>
                <div><label className="text-sm text-slate-300">Salary</label><input type="range" min="20000" max="150000" step="1000" value={grossSalary} onChange={e => setGrossSalary(Number(e.target.value))} className="w-full" /><span className="text-emerald-400 font-bold block mt-1">£{grossSalary.toLocaleString()}</span></div>
                <div><label className="text-sm text-slate-300">Office Postcode</label><input type="text" value={postcode} onChange={e => setPostcode(e.target.value)} className="w-full bg-slate-900 p-3 rounded-xl text-white mt-1" /></div>
                <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl text-sm">Compute Matches</button>
              </form>
            )}
          </div>
        </div>

        {/* AI GENERATED RESULTS */}
        <div className="w-full lg:w-2/3 space-y-6">
          {loading && <div className="glass rounded-3xl py-24 text-center text-emerald-400 animate-pulse">Orchestrating OpenAI Agents...</div>}
          
          {!loading && results.map((hub, idx) => (
            <div key={idx} className="glass rounded-3xl p-6 border border-slate-700/40">
              <div className="flex justify-between items-start mb-4">
                <div><h3 className="text-2xl font-bold text-white">{hub.Neighborhood} <span className="text-sm text-slate-400">({hub.Station_Outcode})</span></h3></div>
                <div className="bg-slate-900 rounded-xl px-4 py-2 text-center"><span className="text-xl font-black text-emerald-400">{hub.Suggestion_Score}</span></div>
              </div>
              
              <div className="grid grid-cols-3 gap-3 mb-4 text-sm">
                <div className="bg-slate-900 p-3 rounded-xl"><span className="text-emerald-400 block text-[10px] uppercase">Rent</span><strong className="text-white">{hub.Rent_Range}</strong></div>
                <div className="bg-slate-900 p-3 rounded-xl"><span className="text-blue-400 block text-[10px] uppercase">Transit Fare</span><strong className="text-white">£{hub.Single_Fare_Cost}</strong></div>
                <div className="bg-slate-900 p-3 rounded-xl"><span className="text-amber-400 block text-[10px] uppercase">Safety Score</span><strong className="text-white">{hub.Safety_Score}/100</strong></div>
              </div>

              <p className="text-sm text-slate-300 mb-6 bg-slate-950 p-4 rounded-xl border border-slate-800">✨ {hub.AI_Verdict}</p>

              <div className="flex gap-3">
                <button onClick={() => fetchLiveWebListings(hub)} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl text-xs transition">🕸️ View Live Listings</button>
                <button onClick={() => runSimulation(hub)} className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-xl text-xs transition">📊 Run Financial Risk</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}