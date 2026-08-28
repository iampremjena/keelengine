import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import AlertModal from '../components/AlertModal';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({ iconUrl: markerIcon, shadowUrl: markerShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

// Map Component with dynamic route to user's office destination
function NeighborhoodMap({ lat, lng, neighborhood, targetDestination }) {
  if (!lat || !lng) return <div className="w-full h-44 rounded-2xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-center mb-5"><span className="text-slate-500 text-xs font-mono">Map Syncing...</span></div>;
  
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${lat},${lng}&destination=${encodeURIComponent(targetDestination)}&travelmode=transit`;

  return (
    <div className="w-full h-48 rounded-2xl overflow-hidden border border-slate-700/50 mb-5 relative z-0">
      <MapContainer center={[lat, lng]} zoom={13} zoomControl={false} attributionControl={false} style={{ height: '100%', width: '100%' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={[lat, lng]}>
          <Popup>
            <div className="text-center p-1">
              <strong className="block text-slate-900 font-bold">{neighborhood}</strong>
              <a href={googleMapsUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 font-bold underline block mt-1">
                Route to {targetDestination} ➔
              </a>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}

export default function Dashboard({ session }) {
  useEffect(() => { document.title = "KeelEngine AI | Commute & Housing Finder"; }, []);

  const [searchParams, setSearchParams] = useSearchParams();
  const [searchMode, setSearchMode] = useState('manual');
  
  const [moveType, setMoveType] = useState(searchParams.get('move') || 'solo');
  const [grossSalary, setGrossSalary] = useState(Number(searchParams.get('salary')) || 50000);
  const [partnerSalary, setPartnerSalary] = useState(Number(searchParams.get('partner')) || 0);
  const [budgetSlider, setBudgetSlider] = useState(Number(searchParams.get('budget')) || 40);
  const [officeDays, setOfficeDays] = useState(Number(searchParams.get('days')) || 3);
  const [officeLocation, setOfficeLocation] = useState(searchParams.get('postcode') || searchParams.get('destination') || '');
  const [propertyType, setPropertyType] = useState(searchParams.get('type') || '1-Bed Private Flat');
  
  const [aiPromptText, setAiPromptText] = useState('');

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');

  const [listingsModal, setListingsModal] = useState({ isOpen: false, neighborhood: '', listings: [] });
  const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: '', message: '', type: 'success' });
  
  const showAlert = (title, message, type) => setAlertConfig({ isOpen: true, title, message, type });
  const hasSearched = searchParams.has('postcode') || searchParams.has('destination');

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

  const triggerManualSearch = (e) => {
    e.preventDefault();
    if (!officeLocation.trim()) return showAlert("Location Required", "Please enter an office postcode or location name.", "error");
    
    setSearchParams({ 
      postcode: officeLocation.trim().toUpperCase(), 
      destination: officeLocation.trim(),
      move: moveType, 
      salary: grossSalary, 
      partner: partnerSalary, 
      budget: budgetSlider, 
      days: officeDays,
      type: propertyType
    });
  };

  // Improved AI Prompt Parser extracting either Postcodes OR Area Names
  const handleAiSubmit = (e) => {
    e.preventDefault();
    const text = aiPromptText.trim();
    if (!text) return showAlert("Input Required", "Please describe your ideal property setup.", "error");

    let extractedDestination = officeLocation;

    // 1. Try Postcode pattern match
    const pcMatch = text.match(/\b([A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][ABD-HJLNP-UW-Z]{2})\b/i);
    if (pcMatch) {
      extractedDestination = pcMatch[0].toUpperCase();
    } else {
      // 2. Try target phrase extraction e.g. "in Canary Wharf", "near Bank", "at Soho"
      const locationMatch = text.match(/(?:in|near|at|around|to)\s+([A-Za-z0-9\s]+?)(?:,|\.|for|\d|\$|£|days|days\/week|$)/i);
      if (locationMatch && locationMatch[1].trim().length > 2) {
        extractedDestination = locationMatch[1].trim();
      }
    }

    const lowerText = text.toLowerCase();
    const salMatch = lowerText.match(/([0-9]{2,3})\s*k/);
    const extractedSalary = salMatch ? parseInt(salMatch[1]) * 1000 : grossSalary;

    const daysMatch = lowerText.match(/([1-5])\s*days/);
    const extractedDays = daysMatch ? parseInt(daysMatch[1]) : officeDays;

    let extractedType = propertyType;
    if (lowerText.includes("studio")) extractedType = "Studio Flat";
    else if (lowerText.includes("2 bed") || lowerText.includes("2-bed")) extractedType = "2-Bed Flat";
    else if (lowerText.includes("room") || lowerText.includes("share")) extractedType = "Shared Flatshare / Room";

    setOfficeLocation(extractedDestination); setGrossSalary(extractedSalary); setOfficeDays(extractedDays); setPropertyType(extractedType);

    setSearchParams({ 
      postcode: extractedDestination,
      destination: extractedDestination,
      move: moveType, 
      salary: extractedSalary, 
      partner: partnerSalary, 
      budget: budgetSlider, 
      days: extractedDays, 
      type: extractedType
    });
  };

  useEffect(() => {
    const targetDest = searchParams.get('destination') || searchParams.get('postcode');
    if (!targetDest) return;

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
        supabase.from('search_analytics').insert([{ gross_salary: urlSalary, office_postcode: targetDest }]).then();
      }

      try {
        const res = await fetch(`/api/compute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            destination: targetDest,
            postcode: targetDest, 
            days_per_week: urlDays, 
            property_type: urlType, 
            total_budget: activeTotalBudget 
          })
        });

        if (!res.ok) throw new Error("Server communication issue. Please check Vercel functions.");
        
        const data = await res.json();
        if (data.error) setErrorMsg(data.error);
        else if (!data.hubs || data.hubs.length === 0) setErrorMsg(`⚠️ No neighborhoods match a budget of £${activeTotalBudget.toLocaleString()}. Try adjusting your Max Rent Allowance.`);
        else setResults(data.hubs);

      } catch (err) { 
        setErrorMsg(err.message || 'Connection error. Please try again.'); 
      } finally { setLoading(false); }
    };

    runCompute();
  }, [searchParams, session]);

  const saveProperty = async (hub) => {
    if (!session) return showAlert("Sign In Required", "Please log in to save properties.", "error");
    try {
      const { error } = await supabase.from('saved_properties').insert([{
        user_id: session.user.id, neighborhood: hub.Neighborhood, outcode: hub.Station_Outcode, rent_range: hub.Rent_Range, suggestion_score: hub.Suggestion_Score
      }]);
      if (error) throw error;
      showAlert("Saved!", `${hub.Neighborhood} saved to your profile.`, "success");
    } catch (e) { showAlert("Error", "Could not save property.", "error"); }
  };

  const activeDestination = searchParams.get('destination') || searchParams.get('postcode') || officeLocation;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 min-h-[85vh]">
      <AlertModal {...alertConfig} onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })} />

      {/* ✨ AI SUGGESTED LISTINGS MODAL */}
      {listingsModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md px-4 animate-fadeIn">
          <div className="bg-slate-900 border border-emerald-500/50 p-6 md:p-8 rounded-3xl shadow-2xl max-w-2xl w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <span>✨</span> AI Suggested Listings: {listingsModal.neighborhood}
              </h3>
              <button onClick={() => setListingsModal({ ...listingsModal, isOpen: false })} className="text-slate-400 hover:text-white font-bold text-lg">✕</button>
            </div>
            <p className="text-xs text-slate-400 mb-6">Showing live property search results for <strong>{searchParams.get('type') || propertyType}</strong> near {listingsModal.neighborhood}:</p>
            
            <div className="space-y-3 max-h-80 overflow-y-auto pr-2 mb-6">
              {listingsModal.listings && listingsModal.listings.length > 0 ? (
                listingsModal.listings.map((item, lIdx) => (
                  <a key={lIdx} href={item.url} target="_blank" rel="noreferrer" className="flex items-center justify-between bg-slate-950 hover:bg-slate-800 p-4 rounded-xl border border-slate-800 hover:border-emerald-500/50 transition text-xs">
                    <span className="text-slate-200 font-medium truncate max-w-md">{item.title}</span>
                    <span className="text-emerald-400 font-bold text-[11px] whitespace-nowrap">View Property ➔</span>
                  </a>
                ))
              ) : (
                <div className="text-center py-8 bg-slate-950 rounded-xl border border-slate-800">
                  <p className="text-slate-400 text-xs mb-3">Searching live portals...</p>
                  <a href={`https://www.rightmove.co.uk/property-to-rent/search.html?searchLocation=${listingsModal.neighborhood}`} target="_blank" rel="noreferrer" className="inline-block bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl">
                    Search Directly on Rightmove ➔
                  </a>
                </div>
              )}
            </div>
            
            <button onClick={() => setListingsModal({ ...listingsModal, isOpen: false })} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl text-xs">
              Close Window
            </button>
          </div>
        </div>
      )}

      <div className={`flex flex-col lg:flex-row gap-8 ${!hasSearched ? 'justify-center items-center' : 'items-start'}`}>
        
        {/* LEFT SEARCH CONTROL FORM */}
        <div className={`w-full ${!hasSearched ? 'max-w-xl' : 'lg:w-1/3 sticky top-8'}`}>
          <div className="glass p-8 rounded-3xl shadow-2xl border border-emerald-900/30">
            
            <div className="flex bg-slate-900 p-1.5 rounded-xl border border-slate-800 mb-6">
              <button type="button" onClick={() => setSearchMode('manual')} className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition ${searchMode === 'manual' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}>
                ⚙️ Manual Form
              </button>
              <button type="button" onClick={() => setSearchMode('ai')} className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition ${searchMode === 'ai' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}>
                ✨ AI Assistant
              </button>
            </div>

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
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Target Property Allocation</label>
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
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Office Location or Postcode</label>
                  <input type="text" placeholder="e.g. Canary Wharf, Bank, or E16 1US" required value={officeLocation} onChange={(e) => setOfficeLocation(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-4 font-mono text-white outline-none uppercase text-sm" />
                </div>

                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl transition shadow-xl text-sm">
                  Compute AI Matches ➔
                </button>
              </form>
            )}

            {searchMode === 'ai' && (
              <form onSubmit={handleAiSubmit} className="space-y-4 text-left">
                <div>
                  <label className="block text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">AI Natural Language Assistant</label>
                  <textarea value={aiPromptText} onChange={(e) => setAiPromptText(e.target.value)} placeholder="e.g., I work in Canary Wharf 3 days a week, earn £65k, and need a 1-bed flat..." className="w-full h-40 bg-slate-900 border border-slate-700 rounded-xl p-4 text-white text-sm outline-none resize-none focus:border-emerald-500 transition" />
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
              <span className="text-slate-300 text-sm">Destination Target: <strong className="text-white font-mono">{activeDestination}</strong></span>
              <span className="text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold px-3 py-1.5 rounded-lg">Ceiling: £{computedTotalBudget}/mo</span>
            </div>

            {loading && (
              <div className="glass rounded-3xl py-28 text-center border border-emerald-500/30">
                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-emerald-400 font-bold text-sm">Computing travel topologies to {activeDestination}...</p>
                <p className="text-xs text-slate-400 mt-1">Calculating step-by-step route timings and TfL peak fares...</p>
              </div>
            )}

            {errorMsg && !loading && (
              <div className="p-8 glass rounded-3xl border border-red-900/50 text-amber-400 text-center font-medium">
                {errorMsg}
              </div>
            )}

            {!loading && results.map((hub, idx) => {
              const singleFare = parseFloat(hub.Single_Fare_Cost || 0);
              const daysNum = Number(searchParams.get('days')) || 3;
              const monthlyFareTotal = Math.round(singleFare * 2 * daysNum * 4.33);

              return (
                <div key={idx} className="glass rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-700/40 hover:border-emerald-500/40 transition">
                  
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-2xl font-black text-white">{hub.Neighborhood} <span className="text-sm font-normal text-slate-400">({hub.Station_Outcode})</span></h3>
                      <p className="text-xs text-slate-400 font-medium">{hub.Borough} Borough</p>
                    </div>
                    <div className="bg-slate-950 border border-emerald-500/30 rounded-2xl px-4 py-2 text-center">
                      <span className="block text-[9px] text-slate-400 uppercase font-bold">Match Score</span>
                      <span className="text-2xl font-black text-emerald-400">{hub.Suggestion_Score}</span>
                    </div>
                  </div>

                  {/* INTERACTIVE LEAFLET MAP WITH DYNAMIC ROUTE TO DESTINATION */}
                  <NeighborhoodMap lat={hub.Latitude} lng={hub.Longitude} neighborhood={hub.Neighborhood} targetDestination={activeDestination} />

                  {/* COMMUTE STEP-BY-STEP BREAKDOWN TO DESTINATION */}
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 mb-5">
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block mb-1">⏱️ Route to {activeDestination} ({hub.Commute_Duration} Mins)</span>
                    <p className="text-xs text-slate-200 font-medium leading-relaxed">{hub.Journey_Breakdown}</p>
                  </div>

                  {/* METRICS GRID */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                    <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                      <span className="block text-[10px] text-slate-400 uppercase font-bold">Rent Allocation</span>
                      <span className="text-emerald-400 font-bold text-sm">{hub.Rent_Range}</span>
                    </div>
                    <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                      <span className="block text-[10px] text-slate-400 uppercase font-bold">Single TfL Fare</span>
                      <span className="text-blue-400 font-bold text-sm">£{singleFare.toFixed(2)}</span>
                    </div>
                    <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                      <span className="block text-[10px] text-slate-400 uppercase font-bold">Commute Cost / Mo</span>
                      <span className="text-blue-400 font-bold text-sm">£{monthlyFareTotal}</span>
                    </div>
                    <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                      <span className="block text-[10px] text-slate-400 uppercase font-bold">Safety Index</span>
                      <span className="text-amber-400 font-bold text-sm">{hub.Safety_Score}/100</span>
                    </div>
                  </div>

                  {/* TFL FARE EXPLANATION */}
                  <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 mb-5 text-[11px] text-slate-400">
                    <span className="font-bold text-slate-300 block mb-1">💡 How TfL Fare is calculated:</span>
                    {hub.TfL_Fare_Explanation}
                  </div>

                  {/* AI VERDICT */}
                  <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 mb-6 text-xs leading-relaxed text-slate-300">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block mb-1">✨ KeelEngine AI Verdict</span>
                    <p>{hub.AI_Verdict}</p>
                  </div>

                  {/* ACTION BUTTONS */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button 
                      onClick={() => setListingsModal({ isOpen: true, neighborhood: hub.Neighborhood, listings: hub.live_listings || [] })} 
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-4 rounded-xl text-xs transition shadow-lg flex items-center justify-center gap-1.5"
                    >
                      <span>✨</span> AI Suggested Listings
                    </button>
                    <a 
                      href={`https://www.google.com/maps/dir/?api=1&origin=${hub.Latitude},${hub.Longitude}&destination=${encodeURIComponent(activeDestination)}&travelmode=transit`} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 px-4 rounded-xl text-center text-xs transition shadow-lg"
                    >
                      🗺️ Maps Route
                    </a>
                    <button 
                      onClick={() => saveProperty(hub)} 
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3.5 px-4 rounded-xl text-xs transition border border-slate-600 shadow-lg"
                    >
                      ❤️ Save Property
                    </button>
                  </div>

                </div>
              );
            })}

          </div>
        )}

      </div>
    </div>
  );
}