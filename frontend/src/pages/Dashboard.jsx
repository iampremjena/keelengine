import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({ iconUrl: markerIcon, shadowUrl: markerShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

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
  useEffect(() => { document.title = "KeelEngine | Dashboard"; }, []);

  const [moveType, setMoveType] = useState('solo');
  const [grossSalary, setGrossSalary] = useState(50000);
  const [partnerSalary, setPartnerSalary] = useState(50000);
  const [splitSlider, setSplitSlider] = useState(50);
  const [budgetSlider, setBudgetSlider] = useState(40);
  const [postcode, setPostcode] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [hasSearched, setHasSearched] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const calculateNetMonthly = (gross) => {
    let tax = 0;
    if (gross > 12570) {
      if (gross <= 50270) tax = (gross - 12570) * 0.28;
      else if (gross <= 125140) tax = ((50270 - 12570) * 0.28) + ((gross - 50270) * 0.42);
      else tax = ((50270 - 12570) * 0.28) + ((125140 - 50270) * 0.42) + ((gross - 125140) * 0.47);
    }
    return (gross - tax) / 12;
  };

  const net1 = calculateNetMonthly(grossSalary);
  const net2 = moveType === 'couple' ? calculateNetMonthly(partnerSalary) : 0;
  const computedTotalBudget = Math.round((net1 + net2) * (budgetSlider / 100));

  const fetchResults = async (e) => {
    e.preventDefault();
    if (!postcode.trim()) return;
    setLoading(true); setErrorMsg(''); setResults([]); setHasSearched(true); setCurrentPage(1);

    if (session?.user) {
      await supabase.from('profiles').update({ move_type: moveType, gross_salary: grossSalary, budget_percent: budgetSlider, office_postcode: postcode.toUpperCase() }).eq('id', session.user.id);
    }

    try {
      const res = await fetch(`https://keelengine-backend.onrender.com/api/compute`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postcode: postcode.toUpperCase(), days_per_week: 3, property_type: "1-Bed Private Flat", total_budget: computedTotalBudget })
      });
      const data = await res.json();
      if (data.error) setErrorMsg(data.error);
      else if (data.is_outside_london) setErrorMsg(`Looks like your office is in ${data.message}. Check properties locally instead of commuting! 🚂`);
      else if (!data.hubs || data.hubs.length === 0) setErrorMsg(`⚠️ No neighborhoods match a budget of £${computedTotalBudget.toLocaleString()}.`);
      else setResults(data.hubs);
    } catch (err) { setErrorMsg('❌ Connection error.'); } finally { setLoading(false); }
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const currentItems = results.slice(indexOfLastItem - itemsPerPage, indexOfLastItem);
  const totalPages = Math.ceil(results.length / itemsPerPage);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 min-h-[85vh] flex flex-col justify-center">
      <div className={`flex flex-col lg:flex-row gap-8 transition-all duration-700 ease-in-out ${!hasSearched ? 'justify-center items-center' : 'items-start'}`}>
        
        {/* FORM (Centers initially, slides left on search) */}
        <div className={`w-full transition-all duration-700 ${!hasSearched ? 'max-w-xl' : 'lg:w-1/3 sticky top-8'}`}>
          <div className="glass p-8 rounded-3xl shadow-2xl border border-emerald-900/30">
            <h2 className="text-3xl font-black text-white mb-6 text-center">Set Parameters</h2>
            <form onSubmit={fetchResults} className="space-y-6">
              <div><label className="block text-sm text-slate-300 mb-2">Who is moving?</label><select value={moveType} onChange={(e) => setMoveType(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500"><option value="solo">Solo</option><option value="couple">Couple</option></select></div>
              <div><div className="flex justify-between mb-2"><label className="text-sm text-slate-300">Your Salary</label><span className="text-emerald-400 font-bold">£{grossSalary.toLocaleString()}</span></div><input type="range" min="10000" max="200000" step="1000" value={grossSalary} onChange={(e) => setGrossSalary(Number(e.target.value))} className="w-full" /></div>
              {moveType === 'couple' && (<div><div className="flex justify-between mb-2"><label className="text-sm text-slate-300">Partner Salary</label><span className="text-emerald-400 font-bold">£{partnerSalary.toLocaleString()}</span></div><input type="range" min="10000" max="200000" step="1000" value={partnerSalary} onChange={(e) => setPartnerSalary(Number(e.target.value))} className="w-full" /></div>)}
              <div><div className="flex justify-between mb-2"><label className="text-sm text-slate-300">Max Rent</label><span className="text-white font-bold">{budgetSlider}%</span></div><input type="range" min="20" max="65" step="5" value={budgetSlider} onChange={(e) => setBudgetSlider(Number(e.target.value))} className="w-full" /></div>
              <div className="bg-slate-900/50 p-4 rounded-xl text-center"><p className="text-xs text-slate-400">Combined Max Spend</p><p className="text-2xl text-emerald-400 font-black">£{computedTotalBudget.toLocaleString()}</p></div>
              <div><label className="block text-sm text-slate-300 mb-2">Office Postcode</label><input type="text" placeholder="EC1A 1BB" required value={postcode} onChange={(e) => setPostcode(e.target.value)} className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-4 font-mono text-white outline-none uppercase" /></div>
              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl transition shadow-lg tracking-wide">COMPUTE MATRICES</button>
            </form>
          </div>
        </div>
        
        {/* RESULTS GRID (Fades in on the right) */}
        {hasSearched && (
          <div className="w-full lg:w-2/3 animate-fadeIn space-y-6">
            {loading && <div className="glass rounded-3xl py-32 text-center"><div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div><p className="text-slate-400">Processing Geohashes...</p></div>}
            {errorMsg && <div className="p-6 glass rounded-3xl border border-red-900/30 text-amber-400 text-center">{errorMsg}</div>}
            
            {!loading && currentItems.map((hub, idx) => (
              <div key={idx} className="glass rounded-3xl p-6 shadow-xl border border-slate-700/40">
                <div className="flex justify-between items-start mb-4">
                  <div><h3 className="text-2xl font-bold text-white">{hub.Neighborhood} <span className="text-sm text-slate-400">({hub.Station_Outcode})</span></h3><p className="text-sm text-slate-400">{hub.Borough}</p></div>
                  <div className="bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-2 text-center"><span className="block text-[10px] text-slate-400 uppercase font-bold">Score</span><span className="text-xl font-black text-emerald-400">{hub.Suggestion_Score}</span></div>
                </div>
                
                <NeighborhoodMap lat={hub.Latitude} lng={hub.Longitude} />

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                  <div className="bg-slate-900/40 p-3 rounded-xl"><span className="block text-[10px] text-slate-400">Door-to-Door</span><strong className="text-white">{hub.Commute_Duration}m</strong></div>
                  <div className="bg-slate-900/40 p-3 rounded-xl"><span className="block text-[10px] text-emerald-400">Rent</span><strong className="text-emerald-400">{hub.Rent_Range}</strong></div>
                  <div className="bg-slate-900/40 p-3 rounded-xl"><span className="block text-[10px] text-blue-400">Transit</span><strong className="text-blue-400">{hub.Single_Fare_Cost}</strong></div>
                  <div className="bg-slate-900/40 p-3 rounded-xl"><span className="block text-[10px] text-amber-400">Crime Index</span><strong className="text-amber-400">{hub.Safety_Score}/100</strong></div>
                </div>

                <div className="flex gap-4 text-xs font-mono text-slate-400 bg-slate-900/30 p-3 rounded-xl mb-5">
                  <span>{hub.Nearest_Grocery}</span>
                  <span>|</span>
                  <span>{hub.Nearest_Pub}</span>
                </div>

                <a href={`https://www.google.com/maps/dir/?api=1&origin=${hub.Latitude},${hub.Longitude}&destination=${postcode.toUpperCase()}&travelmode=transit`} target="_blank" className="block w-full bg-blue-600 hover:bg-blue-500 rounded-xl py-3 text-center text-xs font-bold text-white">🗺️ Open Google Maps Route</a>
              </div>
            ))}

            {/* Pagination Controls */}
            {!loading && results.length > 0 && (
              <div className="flex justify-center items-center gap-6 mt-8 pb-10">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-5 py-2 bg-slate-800 disabled:opacity-30 rounded-xl text-white font-bold border border-slate-700 hover:border-emerald-500 transition">← Prev</button>
                <span className="text-slate-400 font-mono text-sm">Page {currentPage} of {totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-5 py-2 bg-slate-800 disabled:opacity-30 rounded-xl text-white font-bold border border-slate-700 hover:border-emerald-500 transition">Next →</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}