import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import AlertModal from '../components/AlertModal';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({ iconUrl: markerIcon, shadowUrl: markerShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

const LONDON_AREAS = [
  "Abbey Wood", "Acton", "Aldgate", "Angel", "Archway", "Balham", "Bank", "Bankside", "Barbican", "Barking", "Barnes", "Barnet", "Battersea", "Bayswater", "Beckenham", "Beckton", "Belgravia", "Belsize Park", "Bermondsey", "Bethnal Green", "Bexleyheath", "Blackheath", "Bloomsbury", "Bow", "Brentford", "Brixton", "Brockley", "Bromley", "Camberwell", "Camden Town", "Canary Wharf", "Canning Town", "Catford", "Chelsea", "Chingford", "Chiswick", "Clapham", "Clerkenwell", "Colindale", "Covent Garden", "Cricklewood", "Crouch End", "Croydon", "Crystal Palace", "Dalston", "Deptford", "Dulwich", "Ealing", "Earls Court", "East Ham", "Edgware", "Elephant and Castle", "Eltham", "Enfield", "Farringdon", "Finchley", "Finsbury Park", "Forest Gate", "Forest Hill", "Fulham", "Golders Green", "Greenwich", "Hackney", "Hammersmith", "Hampstead", "Harrow", "Highbury", "Highgate", "Holborn", "Holloway", "Hornchurch", "Hounslow", "Ilford", "Isle of Dogs", "Islington", "Kennington", "Kensington", "Kentish Town", "Kew", "Kilburn", "King's Cross", "Kingston", "Lewisham", "Leyton", "Liverpool Street", "London Bridge", "Marylebone", "Mayfair", "Notting Hill", "Orpington", "Paddington", "Peckham", "Pimlico", "Poplar", "Putney", "Richmond", "Romford", "Rotherhithe", "Shepherd's Bush", "Shoreditch", "Soho", "South Kensington", "Southwark", "Stratford", "Streatham", "Surbiton", "Sutton", "Tooting", "Tottenham", "Twickenham", "Vauxhall", "Victoria", "Walthamstow", "Wandsworth", "Waterloo", "Wembley", "Westminster", "Whitechapel", "Wimbledon", "Woolwich"
];

const BONNIE_QUICK_PROMPTS = [
  "How do I open a UK Bank account before moving?",
  "What is a Right-to-Rent check?",
  "How much upfront cash do I legally need to move in?"
];

function NeighborhoodMap({ lat, lng, neighborhood, targetDestination }) {
  if (!lat || !lng) return null;
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${lat},${lng}&destination=${encodeURIComponent(targetDestination)}&travelmode=transit`;

  return (
    <div className="w-full h-40 sm:h-48 rounded-2xl overflow-hidden border border-slate-700/50 mb-4 sm:mb-5 relative z-0">
      <MapContainer center={[lat, lng]} zoom={13} zoomControl={false} attributionControl={false} style={{ height: '100%', width: '100%' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={[lat, lng]}>
          <Popup>
            <div className="text-center p-1">
              <strong className="block text-slate-900 font-bold">{neighborhood}</strong>
              <a href={googleMapsUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 font-bold underline block mt-1">Route to {targetDestination} ➔</a>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}

export default function Dashboard({ session }) {
  useEffect(() => { document.title = "KeelEngine London | Relocation & Lifestyle Finder"; }, []);

  const [searchParams, setSearchParams] = useSearchParams();
  const hasSearched = searchParams.has('postcode') || searchParams.has('destination');
  const [showSearchForm, setShowSearchForm] = useState(!hasSearched);
  const [searchMode, setSearchMode] = useState('manual');
  
  // FORM STATES
  const [moveType, setMoveType] = useState(searchParams.get('move') || 'solo');
  const [grossSalary, setGrossSalary] = useState(Number(searchParams.get('salary')) || 50000);
  const [partnerSalary, setPartnerSalary] = useState(Number(searchParams.get('partner')) || 0);
  const [budgetSlider, setBudgetSlider] = useState(Number(searchParams.get('budget')) || 40);
  const [officeDays, setOfficeDays] = useState(Number(searchParams.get('days')) || 3);
  const [propertyType, setPropertyType] = useState(searchParams.get('type') || '1-Bed Private Flat');
  const [aiPromptText, setAiPromptText] = useState('');
  const [officeLocation, setOfficeLocation] = useState(searchParams.get('postcode') || searchParams.get('destination') || '');
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // RESULTS & LOADING STATES
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0); // 0 to 100%
  const [results, setResults] = useState([]);
  const [marketBriefing, setMarketBriefing] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // TOOLTIPS & MODALS
  const [activeTooltip, setActiveTooltip] = useState(null); // Tracks which info button is open
  const [listingsModal, setListingsModal] = useState({ isOpen: false, neighborhood: '', listings: [] });
  const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: '', message: '', type: 'success' });
  const [budgetFallback, setBudgetFallback] = useState({ isOpen: false, message: '', suggestedType: '', userBudget: 0 });

  // BONNIE CHATBOT
  const [isBonnieOpen, setIsBonnieOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([{ role: 'assistant', content: "Hi! I'm Bonnie 👋 Need help with visas, Monzo accounts, or TfL costs? I'm your relocation expert. How can I help?" }]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatScrollRef = useRef(null);

  const showAlert = (title, message, type) => setAlertConfig({ isOpen: true, title, message, type });
  const toggleTooltip = (id) => setActiveTooltip(activeTooltip === id ? null : id);

  const handleLocationType = (e) => {
    const val = e.target.value;
    setOfficeLocation(val);
    if (val.length > 0) {
      const filtered = LONDON_AREAS.filter(area => area.toLowerCase().includes(val.toLowerCase())).slice(0, 5);
      setLocationSuggestions(filtered); setShowSuggestions(filtered.length > 0);
    } else setShowSuggestions(false);
  };
  const selectSuggestion = (area) => { setOfficeLocation(area); setShowSuggestions(false); };

  const calculateNetMonthly = (gross) => {
    let tax = 0;
    if (gross > 12570) {
      if (gross <= 50270) tax = (gross - 12570) * 0.28;
      else if (gross <= 125140) tax = ((50270 - 12570) * 0.28) + ((gross - 50270) * 0.42);
      else tax = ((50270 - 12570) * 0.42) + ((125140 - 50270) * 0.42) + ((gross - 125140) * 0.47);
    }
    return (gross - tax) / 12;
  };

  const computedTotalBudget = Math.round((calculateNetMonthly(grossSalary) + (moveType === 'couple' ? calculateNetMonthly(partnerSalary) : 0)) * (budgetSlider / 100));

  const executeSearch = (payload) => {
    setShowSearchForm(false);
    setSearchParams(payload);
  };

  const triggerManualSearch = (e) => {
    e.preventDefault();
    if (!officeLocation.trim()) return showAlert("Location Required", "Please enter an office destination.", "error");
    setShowSuggestions(false);
    executeSearch({ postcode: officeLocation.trim().toUpperCase(), destination: officeLocation.trim(), move: moveType, salary: grossSalary, partner: partnerSalary, budget: budgetSlider, days: officeDays, type: propertyType });
  };

  const handleAiSubmit = (e) => {
    e.preventDefault();
    if (!aiPromptText.trim()) return showAlert("Input Required", "Please describe your ideal property setup.", "error");
    const extractedDestination = officeLocation || "Bank"; 
    executeSearch({ postcode: extractedDestination, destination: extractedDestination, move: moveType, salary: grossSalary, partner: partnerSalary, budget: budgetSlider, days: officeDays, type: propertyType });
  };

  useEffect(() => {
    const targetDest = searchParams.get('destination');
    if (!targetDest) return;

    const runCompute = async () => {
      setLoading(true); setResults([]); setMarketBriefing(''); setCurrentPage(1); setErrorMsg('');
      setLoadingProgress(0);

      // Loading Simulator
      const progressInterval = setInterval(() => {
        setLoadingProgress((oldProgress) => {
          if (oldProgress >= 95) return 95;
          return oldProgress + Math.floor(Math.random() * 15) + 5;
        });
      }, 800);
      
      const activeTotalBudget = Math.round((calculateNetMonthly(Number(searchParams.get('salary'))) + (searchParams.get('move') === 'couple' ? calculateNetMonthly(Number(searchParams.get('partner'))) : 0)) * (Number(searchParams.get('budget')) / 100));

      try {
        const res = await fetch(`/api/compute`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ destination: targetDest, days_per_week: Number(searchParams.get('days')) || 3, property_type: searchParams.get('type'), total_budget: activeTotalBudget })
        });
        const data = await res.json();
        
        clearInterval(progressInterval);
        setLoadingProgress(100);

        if (data.budget_insufficient) {
          setTimeout(() => { setBudgetFallback({ isOpen: true, message: data.message, suggestedType: data.suggested_type, userBudget: data.user_budget }); setLoading(false); }, 500);
          return;
        }

        setTimeout(() => {
          if (data.error) setErrorMsg(data.error);
          else if (!data.hubs || data.hubs.length === 0) setErrorMsg(`⚠️ No neighborhoods match a budget of £${activeTotalBudget.toLocaleString()}.`);
          else { setResults(data.hubs); setMarketBriefing(data.market_briefing || ''); }
          setLoading(false);
        }, 500);
      } catch (err) { clearInterval(progressInterval); setErrorMsg('Connection error.'); setLoading(false); }
    };
    runCompute();
  }, [searchParams]);

  const sendChatMessage = async (msgText) => {
    if (!msgText.trim() || chatLoading) return;
    const updatedMessages = [...chatMessages, { role: 'user', content: msgText.trim() }];
    setChatMessages(updatedMessages); setChatInput(''); setChatLoading(true);
    try {
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: updatedMessages }) });
      const data = await res.json();
      if (data.reply) setChatMessages([...updatedMessages, { role: 'assistant', content: data.reply }]);
    } catch (err) { setChatMessages([...updatedMessages, { role: 'assistant', content: "Connection issue. Please try again." }]); } finally { setChatLoading(false); }
  };

  useEffect(() => { if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight; }, [chatMessages, isBonnieOpen]);

  const activeDestination = searchParams.get('destination') || officeLocation;
  const currentItems = results.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(results.length / itemsPerPage) || 1;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 min-h-[85vh] flex flex-col">
      <AlertModal {...alertConfig} onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })} />

      {/* BONNIE CHATBOT */}
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[200]">
        {!isBonnieOpen ? (
          <button onClick={() => setIsBonnieOpen(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-3 sm:px-5 sm:py-4 rounded-full shadow-2xl transition flex items-center gap-2 border border-emerald-400/40 text-sm"><span>💬 Ask Bonnie</span></button>
        ) : (
          <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl shadow-2xl w-[calc(100vw-2rem)] sm:w-96 flex flex-col h-[75vh] max-h-[560px] overflow-hidden animate-fadeIn">
            <div className="bg-slate-950 p-4 border-b border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse"></div><h4 className="text-white font-bold text-xs sm:text-sm">Bonnie — Relocation Expert</h4></div>
              <button onClick={() => setIsBonnieOpen(false)} className="text-slate-400 hover:text-white font-bold px-2">✕</button>
            </div>
            <div ref={chatScrollRef} className="flex-1 p-3 sm:p-4 overflow-y-auto space-y-4 text-xs">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3.5 rounded-2xl ${msg.role === 'user' ? 'bg-emerald-600 text-white' : 'bg-slate-950 text-slate-200 border border-slate-800'}`}>
                    <div dangerouslySetInnerHTML={{ __html: msg.content }} className="space-y-1.5 [&_ul]:list-disc [&_ul]:ml-4 [&_li]:mb-1 [&_strong]:text-emerald-400" />
                  </div>
                </div>
              ))}
              {chatMessages.length === 1 && !chatLoading && (
                <div className="flex flex-col gap-2 mt-2">
                  {BONNIE_QUICK_PROMPTS.map((prompt, i) => <button key={i} onClick={() => sendChatMessage(prompt)} className="bg-slate-800 hover:bg-emerald-900/50 border border-slate-700 text-slate-300 text-left p-2.5 rounded-xl transition text-[10px]">{prompt}</button>)}
                </div>
              )}
              {chatLoading && <div className="text-slate-400 text-xs p-3">Bonnie is typing...</div>}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); sendChatMessage(chatInput); }} className="p-3 bg-slate-950 border-t border-slate-800 flex gap-2">
              <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Ask Bonnie..." className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-emerald-500" />
              <button type="submit" disabled={chatLoading} className="bg-emerald-600 text-white font-bold px-3 rounded-xl text-xs">Send</button>
            </form>
          </div>
        )}
      </div>

      {/* SEARCH FORM */}
      {showSearchForm && (
        <div className="flex-1 flex justify-center items-center animate-fadeIn pb-12">
          <div className="w-full max-w-2xl glass p-6 sm:p-10 rounded-3xl shadow-2xl border border-emerald-900/30">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">Find Your London Commute Sweet Spot</h2>
              <p className="text-slate-400 text-sm">Tell Clyde your budget and office location, and he'll compute the exact neighborhoods where you can actually afford to live.</p>
            </div>

            <div className="flex bg-slate-900 p-1.5 rounded-xl border border-slate-800 mb-6">
              <button onClick={() => setSearchMode('manual')} className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition ${searchMode === 'manual' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400'}`}>⚙️ Manual Setup</button>
              <button onClick={() => setSearchMode('ai')} className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition ${searchMode === 'ai' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400'}`}>✨ Ask Clyde Directly</button>
            </div>

            {searchMode === 'manual' ? (
              <form onSubmit={triggerManualSearch} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[10px] sm:text-xs font-bold text-slate-300 uppercase mb-2">Who is moving?</label>
                    <select value={moveType} onChange={(e) => setMoveType(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none"><option value="solo">Just Me</option><option value="couple">A Couple</option></select>
                  </div>
                  <div>
                    <label className="block text-[10px] sm:text-xs font-bold text-slate-300 uppercase mb-2">Target Property</label>
                    <select value={propertyType} onChange={(e) => setPropertyType(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none"><option value="Shared Flatshare / Room">Shared Flatshare / Room</option><option value="Studio Flat">Studio Flat</option><option value="1-Bed Private Flat">1-Bed Private Flat</option><option value="2-Bed Flat">2-Bed Flat</option></select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <div className="flex justify-between mb-2"><label className="text-[10px] font-bold text-slate-300 uppercase">Your Salary</label><span className="text-emerald-400 font-bold text-sm">£{grossSalary.toLocaleString()}</span></div>
                    <input type="range" min="15000" max="200000" step="1000" value={grossSalary} onChange={(e) => setGrossSalary(Number(e.target.value))} className="w-full accent-emerald-500" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-2"><label className="text-[10px] font-bold text-slate-300 uppercase">Rent Allowance %</label><span className="text-white font-bold text-sm">{budgetSlider}%</span></div>
                    <input type="range" min="20" max="60" step="5" value={budgetSlider} onChange={(e) => setBudgetSlider(Number(e.target.value))} className="w-full accent-emerald-500" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-end">
                  <div className="relative">
                    <label className="block text-[10px] font-bold text-slate-300 uppercase mb-2">Office Destination</label>
                    <input type="text" required value={officeLocation} onChange={handleLocationType} onFocus={() => setShowSuggestions(true)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none" />
                    {showSuggestions && locationSuggestions.length > 0 && (
                      <ul className="absolute z-50 w-full bg-slate-800 border border-slate-700 rounded-xl mt-1 overflow-hidden shadow-2xl">
                        {locationSuggestions.map((area, idx) => <li key={idx} onClick={() => selectSuggestion(area)} className="px-4 py-3 text-sm text-white hover:bg-emerald-600 cursor-pointer">{area}, London</li>)}
                      </ul>
                    )}
                  </div>
                  <div>
                    <div className="flex justify-between mb-2"><label className="text-[10px] font-bold text-slate-300 uppercase">Days in Office</label><span className="text-blue-400 font-bold text-sm">{officeDays} Days</span></div>
                    <input type="range" min="1" max="5" step="1" value={officeDays} onChange={(e) => setOfficeDays(Number(e.target.value))} className="w-full accent-blue-500" />
                  </div>
                </div>

                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-xl text-sm transition">Find My Neighborhoods ➔</button>
              </form>
            ) : (
              <form onSubmit={handleAiSubmit} className="space-y-4">
                <textarea value={aiPromptText} onChange={(e) => setAiPromptText(e.target.value)} placeholder="e.g., I work in Canary Wharf 3 days a week, earn £65k, want a 1-bed flat..." className="w-full h-40 bg-slate-900 border border-slate-700 rounded-xl p-4 text-white text-sm outline-none resize-none focus:border-emerald-500" />
                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-xl text-sm transition">✨ Ask Clyde</button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* PERCENTAGE LOADING SCREEN */}
      {loading && !showSearchForm && (
        <div className="flex-1 flex items-center justify-center animate-fadeIn">
          <div className="glass rounded-3xl py-20 px-10 text-center border border-emerald-500/30 max-w-lg w-full">
            <div className="text-5xl font-black text-emerald-400 mb-6 font-mono">{loadingProgress}%</div>
            <div className="w-full bg-slate-800 rounded-full h-2.5 mb-6 overflow-hidden border border-slate-700">
              <div className="bg-emerald-500 h-2.5 rounded-full transition-all duration-700" style={{ width: `${loadingProgress}%` }}></div>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Clyde is working...</h2>
            <p className="text-slate-400 text-sm">Curating the best London neighborhoods and parsing live market data.</p>
          </div>
        </div>
      )}

      {/* RESULTS VIEW */}
      {!showSearchForm && !loading && (
        <div className="flex-1 animate-fadeIn w-full max-w-5xl mx-auto space-y-6">
          <div className="flex justify-between items-center bg-slate-900 border border-slate-700 p-4 rounded-2xl shadow-md">
            <div>
              <span className="block text-[10px] text-slate-400 uppercase font-bold">Target Destination</span>
              <strong className="text-white text-sm sm:text-base">{activeDestination}</strong>
            </div>
            <button onClick={() => setShowSearchForm(true)} className="bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white text-xs font-bold py-2 px-4 rounded-lg transition">
              ⚙️ Modify Search
            </button>
          </div>

          {errorMsg && <div className="p-6 glass rounded-2xl border border-red-900/50 text-amber-400 text-center text-sm">{errorMsg}</div>}

          {marketBriefing && (
            <div className="bg-slate-900 border-l-4 border-emerald-500 p-5 sm:p-6 rounded-r-2xl shadow-xl">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-emerald-400 text-lg">🧠</span>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Market Briefing</h3>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">{marketBriefing}</p>
            </div>
          )}

          {currentItems.map((hub, idx) => {
            const queryDays = searchParams.get('days');
            const daysNum = queryDays ? Number(queryDays) : 3;
            const singleFareStr = String(hub.Single_Fare_Cost).replace(/[^0-9.]/g, '');
            const singleFare = parseFloat(singleFareStr) || 0;
            const monthlyFareTotal = Math.round(singleFare * 2 * daysNum * 4.33);
            
            const lowerRent = Number(hub.Rent_Lower_Bound) || 1500;
            const councilTax = Number(hub.Council_Tax_Estimate) || 120;
            const fiveWeekDeposit = Math.round((lowerRent * 12) / 52 * 5);

            return (
              <div key={idx} className="glass rounded-3xl p-5 sm:p-6 md:p-8 shadow-2xl border border-slate-700/40 hover:border-emerald-500/40 transition">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black text-white">{hub.Neighborhood} <span className="text-xs sm:text-sm font-normal text-slate-400">({hub.Station_Outcode})</span></h3>
                  </div>
                  <div className="bg-slate-950 border border-emerald-500/30 rounded-xl px-4 py-2 text-center ml-2">
                    <span className="block text-[9px] text-slate-400 uppercase font-bold">Match Score</span>
                    <span className="text-xl font-black text-emerald-400">{hub.Suggestion_Score}</span>
                  </div>
                </div>

                <NeighborhoodMap lat={hub.Latitude} lng={hub.Longitude} neighborhood={hub.Neighborhood} targetDestination={activeDestination} />

                {/* METRICS GRID WITH INFO BUTTONS */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 relative">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Rent Allocation</span>
                      <button onClick={() => toggleTooltip(`rent-${idx}`)} className="text-slate-500 hover:text-white">ⓘ</button>
                    </div>
                    <span className="text-emerald-400 font-bold text-sm block">{hub.Rent_Range}</span>
                    {activeTooltip === `rent-${idx}` && (
                      <div className="absolute top-full left-0 mt-2 w-48 bg-slate-800 border border-emerald-500 p-3 rounded-xl text-xs z-50 text-slate-200 shadow-2xl">
                        <strong>Assumed by:</strong> Real 2026 active rental listings for the selected property type in this postcode.
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 relative">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Commute</span>
                      <button onClick={() => toggleTooltip(`commute-${idx}`)} className="text-slate-500 hover:text-white">ⓘ</button>
                    </div>
                    <span className="text-white font-bold text-sm block">{hub.Commute_Duration} Mins</span>
                    {activeTooltip === `commute-${idx}` && (
                      <div className="absolute top-full left-0 mt-2 w-48 bg-slate-800 border border-emerald-500 p-3 rounded-xl text-xs z-50 text-slate-200 shadow-2xl">
                        <strong>Route:</strong> {hub.Journey_Breakdown}
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 relative">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">TfL Cost / Mo</span>
                      <button onClick={() => toggleTooltip(`tfl-${idx}`)} className="text-slate-500 hover:text-white">ⓘ</button>
                    </div>
                    <span className="text-blue-400 font-bold text-sm block">£{monthlyFareTotal}</span>
                    {activeTooltip === `tfl-${idx}` && (
                      <div className="absolute top-full right-0 mt-2 w-56 bg-slate-800 border border-blue-500 p-3 rounded-xl text-xs z-50 text-slate-200 shadow-2xl">
                        <strong>Fare Breakdown:</strong> £{singleFare.toFixed(2)} (Peak Single) × 2 (Return) × {searchParams.get('days')} days × 4.33 weeks = £{monthlyFareTotal}/mo.
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 relative">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Safety Score</span>
                      <button onClick={() => toggleTooltip(`safety-${idx}`)} className="text-slate-500 hover:text-white">ⓘ</button>
                    </div>
                    <span className="text-amber-400 font-bold text-sm block">{hub.Safety_Score}/100</span>
                    {activeTooltip === `safety-${idx}` && (
                      <div className="absolute top-full right-0 mt-2 w-48 bg-slate-800 border border-amber-500 p-3 rounded-xl text-xs z-50 text-slate-200 shadow-2xl">
                        <strong>Sourced from:</strong> Metropolitan Police 12-month borough crime density reports.
                      </div>
                    )}
                  </div>
                </div>

                {/* DETAILS WITH INFOS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                  <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/80">
                    <h4 className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-3">💷 Move-In Financials</h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center text-slate-400">
                        <span className="flex items-center gap-1">1st Month Rent <button onClick={() => toggleTooltip(`firstrent-${idx}`)} className="text-slate-500 hover:text-white">ⓘ</button></span> 
                        <span className="text-white">£{lowerRent.toLocaleString()}</span>
                      </div>
                      {activeTooltip === `firstrent-${idx}` && (
                        <div className="bg-slate-800 text-[10px] p-2 rounded-lg text-slate-300 mt-1 mb-2 border border-slate-700">Based on the lowest estimated rent for your property type in this area.</div>
                      )}

                      <div className="flex justify-between items-center text-slate-400">
                        <span className="flex items-center gap-1">5-Week Deposit <button onClick={() => toggleTooltip(`deposit-${idx}`)} className="text-slate-500 hover:text-white">ⓘ</button></span> 
                        <span className="text-white">£{fiveWeekDeposit.toLocaleString()}</span>
                      </div>
                      {activeTooltip === `deposit-${idx}` && (
                        <div className="bg-slate-800 text-[10px] p-2 rounded-lg text-slate-300 mt-1 mb-2 border border-slate-700">Legally capped at 5 weeks' rent under the UK Tenant Fees Act.</div>
                      )}

                      <div className="flex justify-between items-center text-slate-400">
                        <span className="flex items-center gap-1">Est. Council Tax <button onClick={() => toggleTooltip(`counciltax-${idx}`)} className="text-slate-500 hover:text-white">ⓘ</button></span> 
                        <span className="text-white">~£{councilTax}/mo</span>
                      </div>
                      {activeTooltip === `counciltax-${idx}` && (
                        <div className="bg-slate-800 text-[10px] p-2 rounded-lg text-slate-300 mt-1 mb-2 border border-slate-700">Estimated monthly tax for this specific borough (e.g. Wandsworth vs Kingston).</div>
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/80">
                    <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-3">📸 Lifestyle & Famous Spots</h4>
                    <ul className="space-y-2.5 text-[11px] text-slate-300">
                      <li><strong>🛒 Vibe:</strong> {hub.Groceries_Vibe}</li>
                      <li><strong>📍 Famous Spots:</strong> <span className="text-emerald-400 font-medium">{hub.Famous_Hotspots}</span></li>
                      <li><strong>🦉 Nightlife:</strong> {hub.Night_Transit}</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 mb-6 text-xs text-slate-300">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase block mb-1">Clyde's Verdict</span>
                  <p>{hub.AI_Verdict}</p>
                </div>
              </div>
            );
          })}

          {results.length > 0 && (
            <div className="flex justify-between items-center bg-slate-900 p-4 rounded-2xl border border-slate-800">
              <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="px-5 py-2.5 bg-slate-800 disabled:opacity-30 text-white font-bold text-xs rounded-xl">← Previous</button>
              <span className="text-xs text-slate-300 font-bold">Page {currentPage} of {totalPages}</span>
              <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="px-5 py-2.5 bg-slate-800 disabled:opacity-30 text-white font-bold text-xs rounded-xl">Next →</button>
            </div>
          )}
        </div>
      )}

      {/* DISCLAIMER FOOTER */}
      <footer className="w-full mt-auto mb-2 pt-8 text-center opacity-60">
        <p className="text-[10px] text-slate-500 max-w-3xl mx-auto px-4">
          <strong>Disclaimer:</strong> KeelEngine uses AI to calculate transit costs and aggregate property data. AI can occasionally provide outdated market figures. Always conduct your own research before signing a tenancy agreement.
        </p>
      </footer>
    </div>
  );
}