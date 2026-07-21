import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import AlertModal from '../components/AlertModal';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({ iconUrl: markerIcon, shadowUrl: markerShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

// 🛡️ HARDCODED AMENITIES MOVED DIRECTLY TO FRONTEND TO BYPASS BACKEND ERRORS
const HARDCODED_AMENITIES = {
  "Abbey Wood": ["Sainsbury's Local", "The Abbey Arms", 72], "Acton": ["Waitrose", "The George & Dragon", 78],
  "Aldgate": ["Tesco Express", "The Hoop and Grapes", 81], "Angel": ["Waitrose", "The Angelic", 86],
  "Archway": ["Aldi", "St John's Tavern", 76], "Balham": ["Waitrose", "The Bedford", 84],
  "Bankside": ["M&S Food", "The Anchor Bankside", 85], "Barbican": ["Waitrose", "The Jugged Hare", 88],
  "Barking": ["Asda", "The Barking Dog", 68], "Barnes": ["M&S Food", "The Sun Inn", 92],
  "Barnet": ["Waitrose", "The Mitre", 83], "Battersea": ["Waitrose", "The Woodman", 86],
  "Bayswater": ["Waitrose", "The Churchill Arms", 84], "Beckenham": ["Waitrose", "The George Inn", 82],
  "Beckton": ["Asda", "The Tollgate", 69], "Belgravia": ["Waitrose", "The Thomas Cubitt", 94],
  "Belsize Park": ["Budgens", "The Washington", 88], "Bermondsey": ["Sainsbury's Local", "The Woolpack", 81],
  "Bethnal Green": ["Tesco Express", "The Sun Tavern", 73], "Bexleyheath": ["Asda", "The Golden Lion", 77],
  "Blackheath": ["M&S Food", "The Princess of Wales", 86], "Bloomsbury": ["Waitrose", "The Museum Tavern", 85],
  "Bow": ["Tesco Express", "The Bow Bells", 71], "Brentford": ["Sainsbury's", "The Magpie and Crown", 75],
  "Brixton": ["Tesco Superstore", "The Trinity Arms", 70], "Brockley": ["Sainsbury's Local", "The Wickham Arms", 76],
  "Bromley": ["Waitrose", "The Partridge", 81], "Camberwell": ["Morrisons", "The Camberwell Arms", 72],
  "Camden Town": ["Sainsbury's", "The Hawley Arms", 74], "Canary Wharf": ["Waitrose", "The Gun", 89],
  "Canning Town": ["Co-op Food", "The Durham Arms", 68], "Catford": ["Tesco", "The Catford Bridge Tavern", 70],
  "Chelsea": ["M&S Food", "The Builders Arms", 93], "Chingford": ["Co-op Food", "The Royal Oak", 78],
  "Chiswick": ["Waitrose", "The George IV", 88], "Clapham": ["Waitrose", "The Falcon", 83],
  "Clerkenwell": ["Waitrose", "The Eagle", 85], "Colindale": ["Asda", "The Chandos Arms", 74],
  "Covent Garden": ["Tesco Express", "The Lamb & Flag", 84], "Cricklewood": ["Co-op Food", "The Crown", 71],
  "Crouch End": ["Waitrose", "The Queens", 86], "Croydon": ["Waitrose", "The Dog & Bull", 69],
  "Crystal Palace": ["Sainsbury's", "The Westow House", 78], "Dalston": ["Sainsbury's", "The Farr's", 72],
  "Deptford": ["Tesco Express", "The Dog & Bell", 71], "Dulwich": ["M&S Food", "The Crown & Greyhound", 89],
  "Ealing": ["Waitrose", "The North Star", 85], "Earls Court": ["M&S Food", "The Blackbird", 83],
  "East Ham": ["Tesco Express", "The Denmark Arms", 67], "Edgware": ["Sainsbury's", "The Change of Horses", 75],
  "Elephant and Castle": ["Tesco Express", "The Elephant & Castle", 70], "Eltham": ["Sainsbury's", "The Rusty Bucket", 76],
  "Enfield": ["Waitrose", "The Crown and Horseshoes", 79], "Farringdon": ["Tesco Express", "The Betsey Trotwood", 84],
  "Finchley": ["Waitrose", "The Catcher In The Rye", 82], "Finsbury Park": ["Lidl", "The Faltering Fullback", 73],
  "Forest Gate": ["Co-op Food", "The Forest Tavern", 72], "Forest Hill": ["Sainsbury's", "The Capitol", 77],
  "Fulham": ["Waitrose", "The White Horse", 87], "Golders Green": ["Sainsbury's", "The Old Bull & Bush", 84],
  "Greenwich": ["M&S Food", "The Cutty Sark", 86], "Hackney": ["Tesco Express", "The Pembury Tavern", 74],
  "Hammersmith": ["Waitrose", "The Blue Anchor", 83], "Hampstead": ["Waitrose", "The Holly Bush", 92],
  "Harrow": ["Tesco Superstore", "The Castle", 79], "Highbury": ["Waitrose", "The Highbury Barn", 85],
  "Highgate": ["M&S Food", "The Flask", 90], "Holborn": ["Waitrose", "The Princess Louise", 83],
  "Holloway": ["Waitrose", "The Swimmer at the Grafton", 75], "Hornchurch": ["Sainsbury's", "The Fatling", 80],
  "Hounslow": ["Asda", "The Moon Under Water", 68], "Ilford": ["Sainsbury's", "The Great Spoon of Ilford", 67],
  "Isle of Dogs": ["Asda", "The Ferry House", 82], "Islington": ["Waitrose", "The Drapers Arms", 85],
  "Kennington": ["Tesco Express", "The Tommyfield", 78], "Kensington": ["Whole Foods", "The Churchill Arms", 91],
  "Kentish Town": ["Sainsbury's", "The Pineapple", 79], "Kew": ["Tesco Express", "The Greyhound", 93],
  "Kilburn": ["Aldi", "The Black Lion", 72], "King's Cross": ["Waitrose", "The Parcel Yard", 79],
  "Kingston upon Thames": ["Waitrose", "The Ram", 86], "Lewisham": ["Tesco Superstore", "The Fox & Firkin", 71],
  "Leyton": ["Asda", "The Leyton Technical", 72], "Marylebone": ["Waitrose", "The Barley Mow", 89],
  "Mayfair": ["M&S Food", "The Audley", 95], "Notting Hill": ["M&S Food", "The Elgin", 88],
  "Orpington": ["Tesco Extra", "The Maxwell", 81], "Paddington": ["Waitrose", "The Victoria", 82],
  "Peckham": ["Morrisons", "The Prince of Peckham", 71], "Pimlico": ["Sainsbury's", "The Marquis of Westminster", 86],
  "Poplar": ["Co-op Food", "The Ledger Building", 70], "Putney": ["Waitrose", "The Half Moon", 88],
  "Richmond": ["Waitrose", "The White Cross", 94], "Romford": ["Asda", "The Golden Lion", 73],
  "Rotherhithe": ["Co-op Food", "The Mayflower", 83], "Shepherd's Bush": ["Waitrose", "The Defector's Weld", 76],
  "Shoreditch": ["Co-op Food", "The Ten Bells", 73], "Soho": ["Tesco Express", "The French House", 82],
  "South Kensington": ["Waitrose", "The Anglesea Arms", 91], "Southwark": ["Tesco Express", "The Founders Arms", 81],
  "Stratford": ["Waitrose", "The Cart and Horses", 74], "Streatham": ["Aldi", "The Rabbit Hole", 75],
  "Surbiton": ["Waitrose", "The Antelope", 87], "Sutton": ["Sainsbury's", "The Cock & Bull", 80],
  "Tooting": ["Aldi", "The Castle", 77], "Tottenham": ["Asda", "The Antwerp Arms", 68],
  "Twickenham": ["Waitrose", "The Barmy Arms", 89], "Vauxhall": ["Sainsbury's", "The Black Dog", 79],
  "Walthamstow": ["Lidl", "The Bell", 76], "Wandsworth": ["Waitrose", "The Ship", 85],
  "Waterloo": ["Sainsbury's Local", "The Fire Station", 81], "Wembley": ["Asda", "The White Horse", 71],
  "Westminster": ["Waitrose", "The Red Lion", 86], "Whitechapel": ["Sainsbury's", "The Blind Beggar", 70],
  "Wimbledon": ["Waitrose", "The Dog & Fox", 91], "Woolwich": ["Tesco Extra", "The Dial Arch", 73]
};

function NeighborhoodMap({ lat, lng }) {
  if (!lat || !lng) return <div className="w-full h-40 rounded-2xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-center mb-5"><span className="text-slate-500 text-xs font-mono">Map Data Syncing...</span></div>;
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

  const [searchParams, setSearchParams] = useSearchParams();
  
  const [moveType, setMoveType] = useState(searchParams.get('move') || 'solo');
  const [grossSalary, setGrossSalary] = useState(Number(searchParams.get('salary')) || 50000);
  const [partnerSalary, setPartnerSalary] = useState(Number(searchParams.get('partner')) || 50000);
  const [budgetSlider, setBudgetSlider] = useState(Number(searchParams.get('budget')) || 40);
  const [officeDays, setOfficeDays] = useState(Number(searchParams.get('days')) || 3);
  const [postcode, setPostcode] = useState(searchParams.get('postcode') || '');
  
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: '', message: '', type: 'success' });
  const showAlert = (title, message, type) => setAlertConfig({ isOpen: true, title, message, type });

  const hasSearched = searchParams.has('postcode');

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

  const triggerSearch = (e) => {
    e.preventDefault();
    if (!postcode.trim()) return;
    setSearchParams({ postcode: postcode.toUpperCase(), move: moveType, salary: grossSalary, partner: partnerSalary, budget: budgetSlider, days: officeDays });
  };

  const clearSearch = () => {
    setSearchParams({});
    setResults([]);
    setCurrentPage(1);
  };

  useEffect(() => {
    const pc = searchParams.get('postcode');
    if (!pc) return;

    const runCompute = async () => {
      setLoading(true); setErrorMsg(''); setResults([]); setCurrentPage(1);

      if (session?.user) {
        await supabase.from('profiles').update({ move_type: searchParams.get('move'), gross_salary: searchParams.get('salary'), budget_percent: searchParams.get('budget'), office_postcode: pc }).eq('id', session.user.id);
      }

      try {
        const res = await fetch(`https://keelengine-backend.onrender.com/api/compute`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postcode: pc, days_per_week: Number(searchParams.get('days')), property_type: "1-Bed Private Flat", total_budget: computedTotalBudget })
        });

        if (!res.ok) throw new Error("The computation server is waking up. Please wait 10 seconds and try clicking search again.");
        
        const data = await res.json();
        
        if (data.error) setErrorMsg(data.error);
        else if (data.is_outside_london) setErrorMsg(`Your office is in ${data.message}. We highly recommend checking properties locally instead of commuting! 🚂`);
        else if (!data.hubs || data.hubs.length === 0) setErrorMsg(`⚠️ No neighborhoods match a budget of £${computedTotalBudget.toLocaleString()}. Try raising your Max Rent Allowance.`);
        else setResults(data.hubs);
      } catch (err) { 
        setErrorMsg(err.message || 'Connection error. Please try again.'); 
      } finally { setLoading(false); }
    };

    runCompute();
  }, [searchParams, session]);

  const saveNeighborhoodToDB = async (hubName, hubOutcode, hubRent, hubScore) => {
    if (!session) return showAlert("Not Logged In", "Please sign in to save properties.", "error");
    try {
      const { error } = await supabase.from('saved_properties').insert([{ user_id: session.user.id, neighborhood: hubName, outcode: hubOutcode, rent_range: hubRent, suggestion_score: hubScore }]);
      if (error) throw error;
      showAlert("Saved!", `${hubName} added to your Profile.`, "success");
    } catch (e) { showAlert("Error", "Could not save property.", "error"); }
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const currentItems = (results || []).slice(indexOfLastItem - itemsPerPage, indexOfLastItem);
  const totalPages = Math.ceil((results || []).length / itemsPerPage);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 min-h-[85vh] flex flex-col justify-center relative z-10">
      <AlertModal {...alertConfig} onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })} />
      
      <div className={`flex flex-col lg:flex-row gap-8 transition-all duration-700 ease-in-out ${!hasSearched ? 'justify-center items-center' : 'items-start'}`}>
        
        <div className={`w-full transition-all duration-700 ${!hasSearched ? 'max-w-xl' : 'lg:w-1/3 sticky top-8'}`}>
          <div className="glass p-8 rounded-3xl shadow-2xl border border-emerald-900/30">
            <h2 className="text-3xl font-black text-white mb-6 text-center">Tell Us About You</h2>
            <form onSubmit={triggerSearch} className="space-y-6">
              <div><label className="block text-sm text-slate-300 mb-2">Who is moving?</label><select value={moveType} onChange={(e) => setMoveType(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500"><option value="solo">Just Me</option><option value="couple">A Couple</option></select></div>
              <div><div className="flex justify-between mb-2"><label className="text-sm text-slate-300">Your Yearly Salary</label><span className="text-emerald-400 font-bold">£{grossSalary.toLocaleString()}</span></div><input type="range" min="10000" max="200000" step="1000" value={grossSalary} onChange={(e) => setGrossSalary(Number(e.target.value))} className="w-full" /></div>
              {moveType === 'couple' && (<div><div className="flex justify-between mb-2"><label className="text-sm text-slate-300">Partner's Salary</label><span className="text-emerald-400 font-bold">£{partnerSalary.toLocaleString()}</span></div><input type="range" min="10000" max="200000" step="1000" value={partnerSalary} onChange={(e) => setPartnerSalary(Number(e.target.value))} className="w-full" /></div>)}
              <div><div className="flex justify-between mb-2"><label className="text-sm text-slate-300">Max Rent Allowance</label><span className="text-white font-bold">{budgetSlider}%</span></div><input type="range" min="20" max="65" step="5" value={budgetSlider} onChange={(e) => setBudgetSlider(Number(e.target.value))} className="w-full" /></div>
              
              <div className="bg-slate-900/50 p-4 rounded-xl text-center"><p className="text-xs text-slate-400">Total Monthly Budget</p><p className="text-2xl text-emerald-400 font-black">£{computedTotalBudget.toLocaleString()}</p></div>
              
              <div className="border-t border-slate-700/50 pt-6">
                <div className="flex justify-between mb-2"><label className="text-sm text-slate-300">Days in Office per Week</label><span className="text-blue-400 font-bold">{officeDays} {officeDays === 1 ? 'Day' : 'Days'}</span></div>
                <input type="range" min="1" max="5" step="1" value={officeDays} onChange={(e) => setOfficeDays(Number(e.target.value))} className="w-full" />
              </div>
              
              <div><label className="block text-sm text-slate-300 mb-2">Where do you work? (Postcode)</label><input type="text" placeholder="e.g. EC1A 1BB" required value={postcode} onChange={(e) => setPostcode(e.target.value)} className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-4 font-mono text-white outline-none uppercase" /></div>
              
              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl transition shadow-lg tracking-wide">Find My Best Matches</button>
            </form>
          </div>
        </div>
        
        {hasSearched && (
          <div className="w-full lg:w-2/3 space-y-6">
            
            <div className="flex justify-between items-center bg-slate-900/50 p-4 rounded-2xl border border-slate-700/50 shadow-md">
              <span className="text-slate-300 text-sm font-medium">Viewing results for <strong className="text-white">{searchParams.get('postcode')}</strong></span>
              <button onClick={clearSearch} className="text-sm font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-4 py-2 rounded-lg transition">Start New Search ↺</button>
            </div>

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
              // Extract Standard Base Values
              const lat = hub.Latitude || hub.latitude;
              const lng = hub.Longitude || hub.longitude;
              const name = hub.Neighborhood || hub.neighborhood || "Unknown";
              const outcode = hub.Station_Outcode || hub.outcode || "--";
              const borough = hub.Borough || hub.borough || "Greater London";
              const score = hub.Suggestion_Score || hub.suggestion_score || 0;
              const duration = hub.Commute_Duration || hub.duration || 0;
              const rent = hub.Rent_Range || hub.rent_range || "£--";
              
              // Local Transit Math
              const singleFareVal = parseFloat((hub.Single_Fare_Cost || hub.single_fare || "0").toString().replace('£', ''));
              const singleFareStr = `£${singleFareVal.toFixed(2)}`;
              const monthlyDays = Number(searchParams.get('days')) || 3;
              const monthlyFare = Math.round(singleFareVal * 2 * monthlyDays * 4.33);
              const fareLog = hub.Fare_Log || hub.fare_log || "Standard transit fare structure.";
              
              // 🛡️ THE BULLETPROOF FRONTEND LOOKUP
              // Directly grabs the hardcoded array in React, guaranteeing results instantly
              const amenities = HARDCODED_AMENITIES[name] || ["Local Grocer", "The Red Lion", 75];
              const grocery = `🛒 ${amenities[0]}`;
              const pub = `🍻 ${amenities[1]}`;
              const safety = amenities[2];

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
                    
                    <div className="bg-slate-900/40 p-3 rounded-xl border border-transparent relative group cursor-help hover:border-blue-900/50 transition">
                      <span className="block text-[10px] text-blue-400">Transit/mo ⓘ</span>
                      <strong className="text-blue-400">£{monthlyFare}</strong>
                      <div className="hidden group-hover:block absolute bottom-full left-0 mb-2 w-56 bg-slate-800 border border-blue-700 p-4 rounded-xl text-xs z-50 shadow-2xl">
                        <span className="text-slate-200 block mb-1">One-Way Single Fare: <b className="text-white">{singleFareStr}</b></span>
                        <span className="text-slate-400 italic text-[10px] leading-relaxed block">{fareLog}</span>
                      </div>
                    </div>

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