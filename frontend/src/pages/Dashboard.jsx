import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import AlertModal from '../components/AlertModal';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';

// Leaflet marker fix
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({ iconUrl: markerIcon, shadowUrl: markerShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

// Crash-proof Map Component
function NeighborhoodMap({ lat, lng }) {
  if (!lat || !lng) {
    return (
      <div className="w-full h-40 rounded-2xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-center mb-5">
        <span className="text-slate-500 text-xs font-mono">Map Data Syncing...</span>
      </div>
    );
  }
  return (
    <div className="w-full h-40 rounded-2xl overflow-hidden border border-slate-700/50 mb-5 z-0 relative">
      <MapContainer center={[lat, lng]} zoom={13} zoomControl={false} attributionControl={false} style={{ height: '100%', width: '100%' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={[lat, lng]} />
      </MapContainer>
    </div>
  );
}

export default function Dashboard({ session }) {
  useEffect(() => { document.title = "KeelEngine | Search"; }, []);

  const [moveType, setMoveType] = useState('solo');
  const [grossSalary, setGrossSalary] = useState(50000);
  const [partnerSalary, setPartnerSalary] = useState(50000);
  const [budgetSlider, setBudgetSlider] = useState(40);
  const [postcode, setPostcode] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [hasSearched, setHasSearched] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: '', message: '', type: 'success' });
  const showAlert = (title, message, type) => setAlertConfig({ isOpen: true, title, message, type });

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
    
    setLoading(true); 
    setErrorMsg(''); 
    setResults([]); 
    setHasSearched(true); 
    setCurrentPage(1);

    if (session?.user) {
      await supabase.from('profiles').update({ move_type: moveType, gross_salary: grossSalary, budget_percent: budgetSlider, office_postcode: postcode.toUpperCase() }).eq('id', session.user.id);
    }

    try {
      const res = await fetch(`https://keelengine-backend.onrender.com/api/compute`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postcode: postcode.toUpperCase(), days_per_week: 3, property_type: "1-Bed Private Flat", total_budget: computedTotalBudget })
      });

      if (!res.ok) throw new Error("The computation server is waking up. Please wait 10 seconds and try clicking search again.");
      
      const data = await res.json();
      
      if (data.error) {
        setErrorMsg(data.error);
      } else if (data.is_outside_london) {
        setErrorMsg(`Your office is in ${data.message}. We highly recommend checking properties locally instead of commuting! 🚂`);
      } else if (!data.hubs || data.hubs.length === 0) {
        setErrorMsg(`⚠️ No neighborhoods match a budget of £${computedTotalBudget.toLocaleString()}. Try raising your Max Rent Allowance.`);
      } else {
        setResults(data.hubs);
      }
    } catch (err) { 
      setErrorMsg(err.message || 'Connection error. Please try again.'); 
    } finally { 
      setLoading(false); 
    }
  };

  const saveNeighborhoodToDB = async (hubName, hubOutcode, hubRent, hubScore) => {
    if (!session) return showAlert("Not Logged In", "Please sign in to save properties.", "error");
    try {
      const { error } = await supabase.from('saved_properties').insert([{ 
        user_id: session.user.id, 
        neighborhood: hubName, 
        outcode: hubOutcode, 
        rent_range: hubRent, 
        suggestion_score: hubScore 
      }]);
      if (error) throw error;
      showAlert("Saved!", `${hubName} added to your Profile.`, "success");
    } catch (e) {
      showAlert("Error", "Could not save property.", "error");
    }
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const currentItems = (results || []).slice(indexOfLastItem - itemsPerPage, indexOfLastItem);
  const totalPages = Math.ceil((results || []).length / itemsPerPage);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 min-h-[85vh] flex flex-col justify-center relative z-10">
      <AlertModal {...alertConfig} onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })} />
      
      <div className={`flex flex-col lg:flex-row gap-8 transition-all duration-700 ease-in-out ${!hasSearched ? 'justify-center items-center' : 'items-start'}`}>
        
        {/* Input Form Panel */}
        <div className={`w-full transition-all duration-700 ${!hasSearched ? 'max-w-xl' : 'lg:w-1/3 sticky top-8'}`}>
          <div className="glass p-8 rounded-3xl shadow-2xl border border-emerald-900/30">
            <h2 className="text-3xl font-black text-white mb-6 text-center">Tell Us About You</h2>
            <form onSubmit={fetchResults} className="space-y-6">
              <div><label className="block text-sm text-slate-300 mb-2">Who is moving?</label><select value={moveType} onChange={(e) => setMoveType(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500"><option value="solo">Just Me</option><option value="couple">A Couple</option></select></div>
              <div><div className="flex justify-between mb-2"><label className="text-sm text-slate-300">Your Yearly Salary</label><span className="text-emerald-400 font-bold">£{grossSalary.toLocaleString()}</span></div><input type="range" min="10000" max="200000" step="1000" value={grossSalary} onChange={(e) => setGrossSalary(Number(e.target.value))} className="w-full" /></div>
              {moveType === 'couple' && (<div><div className="flex justify-between mb-2"><label className="text-sm text-slate-300">Partner's Salary</label><span className="text-emerald-400 font-bold">£{partnerSalary.toLocaleString()}</span></div><input type="range" min="10000" max="200000" step="1000" value={partnerSalary} onChange={(e) => setPartnerSalary(Number(e.target.value))} className="w-full" /></div>)}
              <div><div className="flex justify-between mb-2"><label className="text-sm text-slate-300">Max Rent Allowance</label><span className="text-white font-bold">{budgetSlider}%</span></div><input type="range" min="20" max="65" step="5" value={budgetSlider} onChange={(e) => setBudgetSlider(Number(e.target.value))} className="w-full" /></div>
              <div className="bg-slate-900/50 p-4 rounded-xl text-center"><p className="text-xs text-slate-400">Total Monthly Budget</p><p className="text-2xl text-emerald-400 font-black">£{computedTotalBudget.toLocaleString()}</p></div>
              <div><label className="block text-sm text-slate-300 mb-2">Where do you work? (Postcode)</label><input type="text" placeholder="e.g. EC1A 1BB" required value={postcode} onChange={(e) => setPostcode(e.target.value)} className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-4 font-mono text-white outline-none uppercase" /></div>
              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl transition shadow-lg tracking-wide">Find My Best Matches</button>
            </form>
          </div>
        </div>
        
        {/* Results Panel */}
        {hasSearched && (
          <div className="w-full lg:w-2/3 space-y-6">
            {loading && (
              <div className="glass rounded-3xl py-32 text-center">
                <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-400">Searching London for your perfect neighborhoods...</p>
              </div>
            )}
            
            {errorMsg && !loading && (
              <div className="p-6 glass rounded-3xl border border-red-900/30 text-amber-400 text-center font-medium">{errorMsg}</div>
            )}
            
            {!loading && currentItems.map((hub, idx) => {
              // 🛡️ BULLETPROOF DATA EXTRACTION (Handles both old and new backend formats safely)
              const lat = hub.Latitude || hub.latitude;
              const lng = hub.Longitude || hub.longitude;
              const name = hub.Neighborhood || hub.neighborhood;
              const outcode = hub.Station_Outcode || hub.outcode;
              const borough = hub.Borough || hub.borough;
              const score = hub.Suggestion_Score || hub.suggestion_score;
              const duration = hub.Commute_Duration || hub.duration;
              const rent = hub.Rent_Range || hub.rent_range;
              const fare = hub.Single_Fare_Cost || hub.single_fare || "£0.00";
              const safety = hub.Safety_Score || 85;
              const grocery = hub.Nearest_Grocery || "🛒 Local Grocer";
              const pub = hub.Nearest_Pub || "🍻 The Red Lion";

              return (
                <div key={idx} className="glass rounded-3xl p-6 shadow-xl border border-slate-700/40 hover:border-slate-500/50 transition">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-2xl font-bold text-white">{name} <span className="text-sm text-slate-400">({outcode})</span></h3>
                      <p className="text-sm text-slate-400">{borough}</p>
                    </div>
                    <div className="bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-2 text-center">
                      <span className="block text-[10px] text-slate-400 uppercase font-bold">Match Score</span>
                      <span className="text-xl font-black text-emerald-400">{score}</span>
                    </div>
                  </div>
                  
                  <NeighborhoodMap lat={lat} lng={lng} />

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                    <div className="bg-slate-900/40 p-3 rounded-xl border border-transparent"><span className="block text-[10px] text-slate-400">Commute Time</span><strong className="text-white">{duration} mins</strong></div>
                    <div className="bg-slate-900/40 p-3 rounded-xl border border-transparent"><span className="block text-[10px] text-emerald-400">Rent Cost</span><strong className="text-emerald-400 text-sm">{rent}</strong></div>
                    <div className="bg-slate-900/40 p-3 rounded-xl border border-transparent"><span className="block text-[10px] text-blue-400">Transit Pass</span><strong className="text-blue-400">{fare}</strong></div>
                    <div className="bg-slate-900/40 p-3 rounded-xl border border-transparent"><span className="block text-[10px] text-amber-400">Safety Rating</span><strong className="text-amber-400">{safety}/100</strong></div>
                  </div>

                  <div className="flex gap-4 text-xs font-mono text-slate-400 bg-slate-900/30 p-3 rounded-xl mb-5">
                    <span>{grocery}</span>
                    <span>|</span>
                    <span>{pub}</span>
                  </div>

                  <div className="flex gap-4 items-center">
                    <a href={`https://www.google.com/maps/dir/?api=1&origin=${lat},${lng}&destination=${postcode.toUpperCase()}&travelmode=transit`} target="_blank" rel="noreferrer" className="w-2/3 bg-blue-600 hover:bg-blue-500 rounded-xl py-3 text-center text-xs font-bold text-white transition shadow-lg">🗺️ See Commute on Google Maps</a>
                    <button onClick={() => saveNeighborhoodToDB(name, outcode, rent, score)} className="w-1/3 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl text-xs transition border border-slate-600 shadow-lg">❤️ Save</button>
                  </div>
                </div>
              );
            })}

            {!loading && results.length > 0 && (
              <div className="flex justify-center items-center gap-6 mt-8 pb-10">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-5 py-3 bg-slate-800 disabled:opacity-30 rounded-xl text-white font-bold border border-slate-700 hover:border-emerald-500 transition shadow-lg">← Back</button>
                <span className="text-slate-400 font-mono text-sm bg-slate-900/50 px-4 py-2 rounded-lg border border-slate-800">Page {currentPage} of {totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-5 py-3 bg-slate-800 disabled:opacity-30 rounded-xl text-white font-bold border border-slate-700 hover:border-emerald-500 transition shadow-lg">Next →</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}