import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';

// Fix for default Leaflet marker icon breaking in standard React imports
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Self-contained dark-mode mini map component for performance
function NeighborhoodMap({ lat, lng }) {
  return (
    <div className="w-full h-40 rounded-2xl overflow-hidden border border-slate-700/50 mb-5 z-0">
      <MapContainer center={[lat, lng]} zoom={13} zoomControl={false} attributionControl={false} style={{ height: '100%', width: '100%' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={[lat, lng]} />
      </MapContainer>
    </div>
  );
}

export default function Dashboard({ session }) {
  // Input States
  const [moveType, setMoveType] = useState('solo');
  const [grossSalary, setGrossSalary] = useState(50000);
  const [partnerSalary, setPartnerSalary] = useState(50000);
  const [splitSlider, setSplitSlider] = useState(50);
  const [budgetSlider, setBudgetSlider] = useState(40);
  const [postcode, setPostcode] = useState('');
  
  // App Mechanics States
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');

  
  // Add this inside the component:
  useEffect(() => {
    document.title = "KeelEngine | Dashboard";
  }, []);

  // UK Net Take-Home Salary Calculator Matrix
  const calculateNetMonthly = (gross) => {
    let tax = 0;
    if (gross > 12570) {
      if (gross <= 50270) tax = (gross - 12570) * 0.28;
      else if (gross <= 125140) tax = ((50270 - 12570) * 0.28) + ((gross - 50270) * 0.42);
      else tax = ((50270 - 12570) * 0.28) + ((125140 - 50270) * 0.42) + ((gross - 125140) * 0.47);
    }
    return (gross - tax) / 12;
  };

  // Derived Financial Computations
  const net1 = calculateNetMonthly(grossSalary);
  const net2 = moveType === 'couple' ? calculateNetMonthly(partnerSalary) : 0;
  const budgetPercent = budgetSlider / 100;
  const computedTotalBudget = Math.round((net1 + net2) * budgetPercent);
  
  const splitYou = moveType === 'couple' ? splitSlider : 100;
  const splitPartner = 100 - splitYou;
  const cashYou = Math.round(computedTotalBudget * (splitYou / 100));
  const cashPartner = Math.round(computedTotalBudget * (splitPartner / 100));

  const showEasterEgg = grossSalary === 200000 || (moveType === 'couple' && partnerSalary === 200000);

  // Run Suggestion Search
  const fetchResults = async (e) => {
    e.preventDefault();
    if (!postcode.trim()) return;

    setLoading(true);
    setErrorMsg('');
    setResults([]);

    // Auto-Save User's Input Profile Settings to Supabase directly if logged in
    if (session?.user) {
      await supabase.from('profiles').update({
        move_type: moveType,
        gross_salary: grossSalary,
        partner_salary: moveType === 'couple' ? partnerSalary : null,
        rent_split_user: moveType === 'couple' ? splitSlider : null,
        budget_percent: budgetSlider,
        office_postcode: postcode.toUpperCase()
      }).eq('id', session.user.id);
    }

    try {
      const res = await fetch(`https://keelengine-backend.onrender.com/api/compute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postcode: postcode.toUpperCase(),
          days_per_week: 3,
          property_type: "1-Bed Private Flat",
          total_budget: computedTotalBudget
        })
      });
      
      const data = await res.json();
      
      if (data.error) {
        setErrorMsg(data.error);
      } else if (data.is_outside_london) {
        // The Polite Pun for non-London postcodes
        setErrorMsg(`Looks like your office is in ${data.message}. We highly recommend looking at houses in that exact city... unless you genuinely enjoy 4-hour daily commutes and crying on train platforms. 🚂😭`);
      } else if (!data.hubs || data.hubs.length === 0) {
        setErrorMsg(`⚠️ No neighborhoods found matching a combined max monthly budget of £${computedTotalBudget.toLocaleString()}. Try raising your Max Rent Allocation slider.`);
      } else {
        setResults(data.hubs);
      }
    } catch (err) {
      setErrorMsg('❌ Connection error. Please make sure your Render computation backend service is active.');
    } finally {
      setLoading(false);
    }
  };

  // Securely save explicit card choice to user database dashboard
  const saveNeighborhoodToDB = async (hub) => {
    if (!session) return;
    try {
      const { error } = await supabase.from('saved_properties').insert([{
        user_id: session.user.id,
        neighborhood: hub.neighborhood,
        outcode: hub.outcode,
        rent_range: hub.rent_range,
        suggestion_score: hub.suggestion_score
      }]);
      if (error) throw error;
      alert(`📌 ${hub.neighborhood} pinned to your dashboard database successfully!`);
    } catch (e) {
      alert('Error updating database properties profile.');
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 relative items-start">
      
      {/* LEFT FORM CONTROL LAYOUT */}
      <div className="lg:col-span-4 sticky top-8 h-[calc(100vh-8rem)] overflow-y-auto no-whitespace no-scrollbar pb-10">
        <div className="glass p-8 rounded-3xl shadow-2xl border border-emerald-900/30">
          <form onSubmit={fetchResults} className="space-y-8">
            
            {/* Moving Status */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Who is moving in?</label>
              <select 
                value={moveType}
                onChange={(e) => setMoveType(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-white outline-none focus:border-emerald-500 transition"
              >
                <option value="solo">Just Myself (Solo)</option>
                <option value="couple">As a Couple</option>
              </select>
            </div>

            {/* Salary Metric Matrices */}
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-end mb-2">
                  <label className="block text-sm font-medium text-slate-300">Your Gross Salary</label>
                  <span className="text-xl font-bold text-emerald-400">£{grossSalary.toLocaleString()}</span>
                </div>
                <input type="range" min="10000" max="200000" step="1000" value={grossSalary} onChange={(e) => setGrossSalary(Number(e.target.value))} />
              </div>

              {moveType === 'couple' && (
                <div className="border-t border-slate-700/50 pt-6 space-y-6">
                  <div>
                    <div className="flex justify-between items-end mb-2">
                      <label className="block text-sm font-medium text-slate-300">Partner's Salary</label>
                      <span className="text-xl font-bold text-emerald-400">£{partnerSalary.toLocaleString()}</span>
                    </div>
                    <input type="range" min="10000" max="200000" step="1000" value={partnerSalary} onChange={(e) => setPartnerSalary(Number(e.target.value))} />
                  </div>
                  
                  <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                    <label className="block text-xs font-medium text-slate-400 mb-3 text-center">How are you splitting the rent? (%)</label>
                    <input type="range" min="0" max="100" step="5" value={splitSlider} onChange={(e) => setSplitSlider(Number(e.target.value))} />
                    <div className="flex justify-between mt-3 text-xs font-mono">
                      <span className="text-emerald-400 font-bold">You pay: {splitYou}%</span>
                      <span className="text-blue-400 font-bold">Partner pays: {splitPartner}%</span>
                    </div>
                  </div>
                </div>
              )}

              {showEasterEgg && (
                <div className="animate-pulse text-xs text-amber-400 font-bold bg-amber-950/30 p-3 rounded-lg border border-amber-900/50 text-center shadow-lg">
                  🥂 You can buy whatever you like, this tool isn't for you ;)
                </div>
              )}
            </div>

            {/* Budget Limit Calculations */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-slate-300">Max Rent Allocation</label>
                <span className="text-lg font-bold text-white">{budgetSlider}%</span>
              </div>
              <input type="range" min="20" max="65" step="5" value={budgetSlider} onChange={(e) => setBudgetSlider(Number(e.target.value))} />
              
              <div className="bg-slate-900/50 border border-slate-700 p-4 rounded-xl mt-6 text-center shadow-inner">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Combined Max Monthly Spend</p>
                <p className="text-2xl text-emerald-400 font-black">£{computedTotalBudget.toLocaleString()}</p>
                
                {moveType === 'couple' && (
                  <div className="mt-2 text-[10px] text-slate-500 font-mono">
                    You: £{cashYou.toLocaleString()} | Partner: £{cashPartner.toLocaleString()}
                  </div>
                )}
              </div>
            </div>

            <hr className="border-slate-700/50" />

            {/* Destination Target Location */}
            <div className="relative">
              <label className="block text-sm font-medium text-slate-300 mb-2">Office Postcode</label>
              <input 
                type="text" 
                placeholder="e.g. EC1A 1BB" 
                required 
                value={postcode}
                onChange={(e) => setPostcode(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-700/50 rounded-2xl px-4 py-4 font-mono text-white placeholder-slate-600 focus:border-emerald-500 outline-none uppercase transition"
              />
            </div>

            <button type="submit" className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 text-white font-bold py-4 rounded-2xl transition shadow-lg text-sm tracking-wide">
              FIND NEIGHBORHOODS
            </button>
          </form>
        </div>
      </div>
      
      {/* RIGHT DISPLAY RESULTS GRID PANELS */}
      <div className="lg:col-span-8">
        <div className="space-y-6">
          
          {loading && (
            <div className="glass rounded-3xl py-32 text-center">
              <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="mt-4 text-slate-400 font-medium">Crunching millions of transit data paths...</p>
            </div>
          )}

          {errorMsg && (
            <div className="text-sm text-center py-12 px-6 glass rounded-3xl border border-red-900/30 text-amber-400 max-w-xl mx-auto">
              {errorMsg}
            </div>
          )}

          {!loading && !errorMsg && results.length === 0 && (
            <div className="text-center text-slate-500 py-32 glass rounded-3xl">
              <p className="text-base font-medium">Awaiting parameters to calculate door-to-door matrix solutions.</p>
            </div>
          )}

          {!loading && results.map((hub, idx) => {
            const bandD = hub.tax_base;
            const taxList = `Band A: £${Math.round(bandD * 6 / 9)} | Band B: £${Math.round(bandD * 7 / 9)} | Band C: £${Math.round(bandD * 8 / 9)} | Band D: £${bandD}`;
            const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${hub.latitude},${hub.longitude}&destination=${encodeURIComponent(postcode.toUpperCase())}&travelmode=transit`;

            return (
              <div key={idx} className="glass rounded-3xl p-6 shadow-xl relative border border-slate-700/40 hover:border-emerald-500/30 transition">
                
                {/* Hub Header Block */}
                <div className="flex justify-between items-start mb-5">
                  <div>
                    <h3 className="text-2xl font-bold text-white">{hub.neighborhood} <span className="text-sm font-normal text-slate-400">({hub.outcode})</span></h3>
                    <p className="text-sm text-slate-400 mt-1">{hub.borough}</p>
                  </div>
                  <div className="bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-2 text-center group relative cursor-help">
                    <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">Score ⓘ</span>
                    <span className="text-xl font-black text-emerald-400">{hub.suggestion_score}</span>
                    <div className="tooltip-content absolute top-full right-0 mt-2 w-48 bg-slate-800 border border-slate-600 p-2 rounded-lg text-xs z-50 text-left text-slate-300">
                      Math Weight metric: 100 - (Commute Duration Time) - (Transit Fare Costs). Highest scoring matrices win.
                    </div>
                  </div>
                </div>

                {/* React-Leaflet Optimized Integration Map render */}
                <NeighborhoodMap lat={hub.latitude} lng={hub.longitude} />

                {/* Primary Metric Stat Triple Columns */}
                <div className="grid grid-cols-3 gap-3 text-left mb-5">
                  <div className="bg-slate-900/40 p-4 rounded-xl relative group cursor-pointer border border-transparent hover:border-slate-700">
                    <span className="block text-xs text-slate-400 mb-1">Door-to-Door ⓘ</span>
                    <strong className="text-white text-lg">{hub.duration}m</strong>
                    <div className="tooltip-content absolute bottom-full left-0 mb-3 w-48 bg-slate-800 border border-slate-600 p-3 rounded-xl text-xs z-50">
                      <b className="text-white">Transit Path Lines:</b><br/>
                      <span className="text-emerald-400">{hub.route}</span><br/><br/>
                      Includes safety walk buffer limits.
                    </div>
                  </div>

                  <div className="bg-slate-900/40 p-4 rounded-xl border border-transparent">
                    <span className="block text-xs text-emerald-400 mb-1">Rent Range</span>
                    <strong className="text-emerald-400 text-lg">{hub.rent_range}</strong>
                  </div>

                  <div className="bg-slate-900/40 p-4 rounded-xl relative group cursor-pointer border border-transparent hover:border-blue-900/50">
                    <span className="block text-xs text-blue-400 mb-1">Transit / mo ⓘ</span>
                    <strong className="text-blue-400 text-lg">£{hub.commute_share}</strong>
                    <div className="tooltip-content absolute bottom-full right-0 mb-3 w-48 bg-slate-800 border border-blue-700 p-3 rounded-xl text-xs z-50">
                      <span className="text-slate-200">Single Cost: {hub.single_fare}</span><br/>
                      <span className="text-slate-400 italic text-[10px]">{hub.fare_log}</span>
                    </div>
                  </div>
                </div>

                {/* Lower Action Row Matrix */}
                <div className="flex gap-4 items-center mb-5">
                  <div className="w-1/3 bg-slate-900/40 p-3 rounded-xl relative group cursor-help text-center border border-slate-700/50 hover:border-slate-500 transition">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Tax Bands ⓘ</span>
                    <strong className="text-white text-xs font-mono">£{bandD} (D)</strong>
                    <div className="tooltip-content absolute bottom-full left-0 mb-3 w-56 bg-slate-800 border border-slate-600 p-3 rounded-xl text-xs z-50 text-left">
                      <span className="text-slate-300 font-mono text-[11px] leading-relaxed">{taxList}</span>
                    </div>
                  </div>
                  
                  <a href={mapsUrl} target="_blank" rel="noreferrer" className="w-2/3 bg-blue-600 hover:bg-blue-500 shadow-lg border border-blue-500 rounded-xl py-3 text-center text-xs font-bold text-white transition">
                    🗺️ Live Google Maps Route
                  </a>
                </div>

                {/* Save Interaction Controller logic conditional check */}
                {session ? (
                  <button onClick={() => saveNeighborhoodToDB(hub)} className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl text-xs transition border border-slate-600 shadow-lg">
                    ❤️ Save to Profile
                  </button>
                ) : (
                  <button disabled className="w-full bg-slate-900/50 text-slate-500 font-bold py-3 rounded-xl text-xs border border-slate-800 cursor-not-allowed">
                    Sign In to Save Properties
                  </button>
                )}

              </div>
            );
          })}

        </div>
      </div>

    </main>
  );
}