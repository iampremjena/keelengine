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

// Vast array of London areas for instant Autocomplete
const LONDON_AREAS = [
  "Abbey Wood", "Acton", "Aldgate", "Angel", "Archway", "Balham", "Bank", "Bankside", "Barbican", "Barking", "Barnes", "Barnet", "Battersea", "Bayswater", "Beckenham", "Beckton", "Belgravia", "Belsize Park", "Bermondsey", "Bethnal Green", "Bexleyheath", "Blackheath", "Bloomsbury", "Bow", "Brentford", "Brixton", "Brockley", "Bromley", "Camberwell", "Camden Town", "Canary Wharf", "Canning Town", "Catford", "Chelsea", "Chingford", "Chiswick", "Clapham", "Clerkenwell", "Colindale", "Covent Garden", "Cricklewood", "Crouch End", "Croydon", "Crystal Palace", "Dalston", "Deptford", "Dulwich", "Ealing", "Earls Court", "East Ham", "Edgware", "Elephant and Castle", "Eltham", "Enfield", "Farringdon", "Finchley", "Finsbury Park", "Forest Gate", "Forest Hill", "Fulham", "Golders Green", "Greenwich", "Hackney", "Hammersmith", "Hampstead", "Harrow", "Highbury", "Highgate", "Holborn", "Holloway", "Hornchurch", "Hounslow", "Ilford", "Isle of Dogs", "Islington", "Kennington", "Kensington", "Kentish Town", "Kew", "Kilburn", "King's Cross", "Kingston", "Lewisham", "Leyton", "Liverpool Street", "London Bridge", "Marylebone", "Mayfair", "Notting Hill", "Orpington", "Paddington", "Peckham", "Pimlico", "Poplar", "Putney", "Richmond", "Romford", "Rotherhithe", "Shepherd's Bush", "Shoreditch", "Soho", "South Kensington", "Southwark", "Stratford", "Streatham", "Surbiton", "Sutton", "Tooting", "Tottenham", "Twickenham", "Vauxhall", "Victoria", "Walthamstow", "Wandsworth", "Waterloo", "Wembley", "Westminster", "Whitechapel", "Wimbledon", "Woolwich"
];

const BONNIE_QUICK_PROMPTS = [
  "How do I use this tool step-by-step?",
  "How exactly are the TfL transit fares calculated?",
  "What is a safe rent allowance percentage?"
];

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
              <a href={googleMapsUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 font-bold underline block mt-1">Route to {targetDestination} ➔</a>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}

export default function Dashboard({ session }) {
  useEffect(() => { document.title = "KeelEngine | Commute & Housing Finder"; }, []);

  const [searchParams, setSearchParams] = useSearchParams();
  const [searchMode, setSearchMode] = useState('manual');
  
  const [moveType, setMoveType] = useState(searchParams.get('move') || 'solo');
  const [grossSalary, setGrossSalary] = useState(Number(searchParams.get('salary')) || 50000);
  const [partnerSalary, setPartnerSalary] = useState(Number(searchParams.get('partner')) || 0);
  const [budgetSlider, setBudgetSlider] = useState(Number(searchParams.get('budget')) || 40);
  const [officeDays, setOfficeDays] = useState(Number(searchParams.get('days')) || 3);
  const [propertyType, setPropertyType] = useState(searchParams.get('type') || '1-Bed Private Flat');
  const [aiPromptText, setAiPromptText] = useState('');

  // Autocomplete Location States
  const [officeLocation, setOfficeLocation] = useState(searchParams.get('postcode') || searchParams.get('destination') || '');
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [listingsModal, setListingsModal] = useState({ isOpen: false, neighborhood: '', listings: [] });
  const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: '', message: '', type: 'success' });

  // Bonnie Chat States
  const [isBonnieOpen, setIsBonnieOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: "Hi! I'm Bonnie 👋 How can I help you find your ideal London commute or answer questions about KeelEngine?" }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatScrollRef = useRef(null);

  const showAlert = (title, message, type) => setAlertConfig({ isOpen: true, title, message, type });
  const hasSearched = searchParams.has('postcode') || searchParams.has('destination');

  // Text-to-Speech Engine
  const playBonnieAudio = (text) => {
    if (!('speechSynthesis' in window)) return showAlert("Audio Error", "Your browser does not support text-to-speech.", "error");
    
    window.speechSynthesis.cancel(); // Stop current audio
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    
    // Find British Female Voice
    let ukFemale = voices.find(v => v.lang === 'en-GB' && (v.name.includes('Female') || v.name.includes('Google UK English Female')));
    if (!ukFemale) ukFemale = voices.find(v => v.lang === 'en-GB'); // Fallback to any UK voice
    
    if (ukFemale) utterance.voice = ukFemale;
    utterance.rate = 1.0;
    utterance.pitch = 1.1;
    window.speechSynthesis.speak(utterance);
  };

  const handleLocationType = (e) => {
    const val = e.target.value;
    setOfficeLocation(val);
    if (val.length > 0) {
      const filtered = LONDON_AREAS.filter(area => area.toLowerCase().includes(val.toLowerCase())).slice(0, 5);
      setLocationSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (area) => {
    setOfficeLocation(area);
    setShowSuggestions(false);
  };

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
    if (!officeLocation.trim()) return showAlert("Location Required", "Please enter an office destination.", "error");
    setShowSuggestions(false);
    setSearchParams({ postcode: officeLocation.trim().toUpperCase(), destination: officeLocation.trim(), move: moveType, salary: grossSalary, partner: partnerSalary, budget: budgetSlider, days: officeDays, type: propertyType });
  };

  const handleAiSubmit = (e) => {
    e.preventDefault();
    const text = aiPromptText.trim();
    if (!text) return showAlert("Input Required", "Please describe your ideal property setup.", "error");

    let extractedDestination = officeLocation || "Bank";
    const pcMatch = text.match(/\b([A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][ABD-HJLNP-UW-Z]{2})\b/i);
    if (pcMatch) extractedDestination = pcMatch[0].toUpperCase();
    else {
      const locationMatch = text.match(/(?:in|near|at|around|to)\s+([A-Za-z0-9\s]+?)(?:,|\.|for|\d|\$|£|days|days\/week|$)/i);
      if (locationMatch && locationMatch[1].trim().length > 2) extractedDestination = locationMatch[1].trim();
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

    setSearchParams({ postcode: extractedDestination, destination: extractedDestination, move: moveType, salary: extractedSalary, partner: partnerSalary, budget: budgetSlider, days: extractedDays, type: extractedType });
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
      setLoading(true); setErrorMsg(''); setResults([]); setCurrentPage(1);
      try {
        const res = await fetch(`/api/compute`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ destination: targetDest, postcode: targetDest, days_per_week: urlDays, property_type: urlType, total_budget: activeTotalBudget })
        });
        if (!res.ok) throw new Error("Server communication issue. Please try again.");
        const data = await res.json();
        if (data.error) setErrorMsg(data.error);
        else if (!data.hubs || data.hubs.length === 0) setErrorMsg(`⚠️ No neighborhoods match a budget of £${activeTotalBudget.toLocaleString()}. Try adjusting your Max Rent Allowance.`);
        else setResults(data.hubs);
      } catch (err) { setErrorMsg(err.message || 'Connection error. Please try again.'); } finally { setLoading(false); }
    };
    runCompute();
  }, [searchParams]);

  const sendChatMessage = async (msgText) => {
    if (!msgText.trim() || chatLoading) return;

    const userMsg = { role: 'user', content: msgText.trim() };
    const updatedMessages = [...chatMessages, userMsg];
    setChatMessages(updatedMessages);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages })
      });
      const data = await res.json();
      if (data.reply) {
        setChatMessages([...updatedMessages, { role: 'assistant', content: data.reply }]);
      } else {
        throw new Error();
      }
    } catch (err) {
      setChatMessages([...updatedMessages, { role: 'assistant', content: "I'm having trouble connecting right now. Please email our developer at iampremjena@gmail.com." }]);
    } finally {
      setChatLoading(false);
    }
  };

  useEffect(() => {
    if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [chatMessages, isBonnieOpen]);

  // Analytics Tracker & Modal Opener
  const handleListingsClick = async (hub) => {
    setListingsModal({ isOpen: true, neighborhood: hub.Neighborhood, listings: hub.live_listings || [] });
    try {
      // Logs the click in Supabase neighborhood_clicks table
      await supabase.from('neighborhood_clicks').insert([{ neighborhood: hub.Neighborhood }]);
    } catch (e) {
      console.log("Analytics ping failed silently.");
    }
  };

  const activeDestination = searchParams.get('destination') || searchParams.get('postcode') || officeLocation;
  const indexOfLastItem = currentPage * itemsPerPage;
  const currentItems = results.slice(indexOfLastItem - itemsPerPage, indexOfLastItem);
  const totalPages = Math.ceil(results.length / itemsPerPage) || 1;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 min-h-[85vh] relative">
      <AlertModal {...alertConfig} onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })} />

      {/* 💬 FLOATING BONNIE CHATBOT WIDGET */}
      <div className="fixed bottom-6 right-6 z-[200]">
        {!isBonnieOpen ? (
          <button onClick={() => setIsBonnieOpen(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-4 rounded-full shadow-2xl transition flex items-center gap-2 border border-emerald-400/40">
            <span>💬 Ask Bonnie</span>
          </button>
        ) : (
          <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl shadow-2xl w-80 sm:w-96 flex flex-col h-[520px] overflow-hidden animate-fadeIn">
            <div className="bg-slate-950 p-4 border-b border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></div><h4 className="text-white font-bold text-sm">Bonnie — Support Assistant</h4></div>
              <button onClick={() => setIsBonnieOpen(false)} className="text-slate-400 hover:text-white font-bold text-sm">✕</button>
            </div>

            <div ref={chatScrollRef} className="flex-1 p-4 overflow-y-auto space-y-4 text-xs">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3 rounded-2xl relative ${msg.role === 'user' ? 'bg-emerald-600 text-white' : 'bg-slate-950 text-slate-200 border border-slate-800'}`}>
                    {msg.content}
                    {/* TTS PLAY BUTTON FOR BONNIE */}
                    {msg.role === 'assistant' && (
                      <button onClick={() => playBonnieAudio(msg.content)} className="absolute -right-8 bottom-1 text-slate-400 hover:text-emerald-400 p-1" title="Read Aloud">
                        🔊
                      </button>
                    )}
                  </div>
                </div>
              ))}
              
              {/* BONNIE QUICK PROMPTS (Only show at the beginning) */}
              {chatMessages.length === 1 && !chatLoading && (
                <div className="flex flex-col gap-2 mt-2">
                  {BONNIE_QUICK_PROMPTS.map((prompt, i) => (
                    <button key={i} onClick={() => sendChatMessage(prompt)} className="bg-slate-800 hover:bg-emerald-900/50 border border-slate-700 text-slate-300 text-left p-2.5 rounded-xl transition text-[11px]">
                      {prompt}
                    </button>
                  ))}
                </div>
              )}

              {chatLoading && <div className="flex justify-start"><div className="bg-slate-950 text-slate-400 p-3 rounded-2xl border border-slate-800 animate-pulse">Bonnie is thinking...</div></div>}
            </div>

            <form onSubmit={(e) => { e.preventDefault(); sendChatMessage(chatInput); }} className="p-3 bg-slate-950 border-t border-slate-800 flex gap-2">
              <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Type a message..." className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-emerald-500" />
              <button type="submit" disabled={chatLoading} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 rounded-xl text-xs transition">Send</button>
            </form>
          </div>
        )}
      </div>

      {/* SUGGESTED LISTINGS MODAL (Better Fallback URLs) */}
      {listingsModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md px-4 animate-fadeIn">
          <div className="bg-slate-900 border border-emerald-500/50 p-6 md:p-8 rounded-3xl shadow-2xl max-w-2xl w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2"><span>🏘️</span> Suggested Listings: {listingsModal.neighborhood}</h3>
              <button onClick={() => setListingsModal({ ...listingsModal, isOpen: false })} className="text-slate-400 hover:text-white font-bold text-lg">✕</button>
            </div>
            
            <div className="space-y-3 max-h-80 overflow-y-auto pr-2 mb-6">
              {listingsModal.listings && listingsModal.listings.length > 0 ? (
                listingsModal.listings.map((item, lIdx) => (
                  <a key={lIdx} href={item.url} target="_blank" rel="noreferrer" className="flex items-center justify-between bg-slate-950 hover:bg-slate-800 p-4 rounded-xl border border-slate-800 hover:border-emerald-500/50 transition text-xs">
                    <span className="text-slate-200 font-medium truncate max-w-md">{item.title}</span>
                    <span className="text-emerald-400 font-bold text-[11px] whitespace-nowrap">View Property ➔</span>
                  </a>
                ))
              ) : (
                <div className="text-center py-6 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                  <p className="text-slate-400 text-xs">No direct live matches found via scraper. Search directly on UK portals:</p>
                  <div className="flex flex-wrap justify-center gap-3">
                    {/* ENCODED FALLBACK URLS FOR BETTER SUCCESS RATE */}
                    <a href={`https://www.rightmove.co.uk/property-to-rent/search.html?searchLocation=${encodeURIComponent(listingsModal.neighborhood + ', London')}`} target="_blank" rel="noreferrer" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl">Search Rightmove ➔</a>
                    <a href={`https://www.zoopla.co.uk/to-rent/property/${encodeURIComponent(listingsModal.neighborhood.replace(/\s+/g, '-').toLowerCase())}/`} target="_blank" rel="noreferrer" className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2 rounded-xl">Search Zoopla ➔</a>
                  </div>
                </div>
              )}
            </div>
            
            <button onClick={() => setListingsModal({ ...listingsModal, isOpen: false })} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl text-xs">Close Window</button>
          </div>
        </div>
      )}

      <div className={`flex flex-col lg:flex-row gap-8 ${!hasSearched ? 'justify-center items-center' : 'items-start'}`}>
        
        {/* LEFT SEARCH CONTROL FORM */}
        <div className={`w-full ${!hasSearched ? 'max-w-xl' : 'lg:w-1/3 sticky top-8'}`}>
          <div className="glass p-8 rounded-3xl shadow-2xl border border-emerald-900/30">
            <div className="flex bg-slate-900 p-1.5 rounded-xl border border-slate-800 mb-6">
              <button type="button" onClick={() => setSearchMode('manual')} className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition ${searchMode === 'manual' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}>⚙️ Manual Form</button>
              <button type="button" onClick={() => setSearchMode('ai')} className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition ${searchMode === 'ai' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}>✨ Smart Assistant</button>
            </div>

            {searchMode === 'manual' && (
              <form onSubmit={triggerManualSearch} className="space-y-6 text-left">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Who is moving?</label>
                  <select value={moveType} onChange={(e) => setMoveType(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none text-sm">
                    <option value="solo">Just Me</option><option value="couple">A Couple</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Target Property Allocation</label>
                  <select value={propertyType} onChange={(e) => setPropertyType(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none text-sm">
                    <option value="Shared Flatshare / Room">Shared Flatshare / Room</option><option value="Studio Flat">Studio Flat</option><option value="1-Bed Private Flat">1-Bed Private Flat</option><option value="2-Bed Flat">2-Bed Flat</option>
                  </select>
                </div>
                <div>
                  <div className="flex justify-between mb-2"><label className="text-xs font-bold text-slate-300 uppercase">Your Annual Salary</label><span className="text-emerald-400 font-bold text-sm">£{grossSalary.toLocaleString()}</span></div>
                  <input type="range" min="15000" max="200000" step="1000" value={grossSalary} onChange={(e) => setGrossSalary(Number(e.target.value))} className="w-full accent-emerald-500" />
                </div>
                {moveType === 'couple' && (
                  <div>
                    <div className="flex justify-between mb-2"><label className="text-xs font-bold text-slate-300 uppercase">Partner's Annual Salary</label><span className="text-emerald-400 font-bold text-sm">£{partnerSalary.toLocaleString()}</span></div>
                    <input type="range" min="0" max="200000" step="1000" value={partnerSalary} onChange={(e) => setPartnerSalary(Number(e.target.value))} className="w-full accent-emerald-500" />
                  </div>
                )}
                <div>
                  <div className="flex justify-between mb-2"><label className="text-xs font-bold text-slate-300 uppercase">Max Rent Allowance %</label><span className="text-white font-bold text-sm">{budgetSlider}% of Net Pay</span></div>
                  <input type="range" min="20" max="60" step="5" value={budgetSlider} onChange={(e) => setBudgetSlider(Number(e.target.value))} className="w-full accent-emerald-500" />
                </div>
                <div className="bg-slate-950 p-4 rounded-xl text-center border border-slate-800">
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Computed Rent + Transit Ceiling</p>
                  <p className="text-2xl text-emerald-400 font-black mt-1">£{computedTotalBudget.toLocaleString()}<span className="text-xs text-slate-400 font-normal">/mo</span></p>
                </div>
                <div>
                  <div className="flex justify-between mb-2"><label className="text-xs font-bold text-slate-300 uppercase">Days in Office / Week</label><span className="text-blue-400 font-bold text-sm">{officeDays} Days</span></div>
                  <input type="range" min="1" max="5" step="1" value={officeDays} onChange={(e) => setOfficeDays(Number(e.target.value))} className="w-full accent-blue-500" />
                </div>
                
                {/* AUTOCOMPLETE LOCATION INPUT */}
                <div className="relative">
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Office Location / Destination</label>
                  <input 
                    type="text" 
                    required 
                    value={officeLocation} 
                    onChange={handleLocationType} 
                    onFocus={() => {if (officeLocation.length > 0) setShowSuggestions(true)}}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-4 text-white outline-none text-sm" 
                  />
                  {showSuggestions && locationSuggestions.length > 0 && (
                    <ul className="absolute z-50 w-full bg-slate-800 border border-slate-700 rounded-xl mt-1 overflow-hidden shadow-2xl">
                      {locationSuggestions.map((area, idx) => (
                        <li key={idx} onClick={() => selectSuggestion(area)} className="px-4 py-3 text-sm text-white hover:bg-emerald-600 cursor-pointer transition border-b border-slate-700/50 last:border-0">
                          {area}, London
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl transition shadow-xl text-sm">Compute Matches ➔</button>
              </form>
            )}

            {searchMode === 'ai' && (
              <form onSubmit={handleAiSubmit} className="space-y-4 text-left">
                <div>
                  <label className="block text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">Smart Search Prompt</label>
                  <textarea value={aiPromptText} onChange={(e) => setAiPromptText(e.target.value)} className="w-full h-40 bg-slate-900 border border-slate-700 rounded-xl p-4 text-white text-sm outline-none resize-none focus:border-emerald-500 transition" />
                </div>
                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl transition shadow-xl text-sm flex items-center justify-center gap-2">
                  <span>✨</span> Process & Search
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
                <p className="text-emerald-400 font-bold text-sm">Calculating travel options to {activeDestination}...</p>
                <p className="text-xs text-slate-400 mt-1">Gathering 10 neighborhood suggestions and live property listings...</p>
              </div>
            )}

            {errorMsg && !loading && (
              <div className="p-8 glass rounded-3xl border border-red-900/50 text-amber-400 text-center font-medium">{errorMsg}</div>
            )}

            {!loading && currentItems.map((hub, idx) => {
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

                  <NeighborhoodMap lat={hub.Latitude} lng={hub.Longitude} neighborhood={hub.Neighborhood} targetDestination={activeDestination} />

                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 mb-5">
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block mb-1">⏱️ Route to {activeDestination} ({hub.Commute_Duration} Mins)</span>
                    <p className="text-xs text-slate-200 font-medium leading-relaxed">{hub.Journey_Breakdown}</p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                    <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800"><span className="block text-[10px] text-slate-400 uppercase font-bold">Rent Allocation</span><span className="text-emerald-400 font-bold text-sm">{hub.Rent_Range}</span></div>
                    <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800"><span className="block text-[10px] text-slate-400 uppercase font-bold">Single TfL Fare</span><span className="text-blue-400 font-bold text-sm">£{singleFare.toFixed(2)}</span></div>
                    <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800"><span className="block text-[10px] text-slate-400 uppercase font-bold">Commute Cost / Mo</span><span className="text-blue-400 font-bold text-sm">£{monthlyFareTotal}</span></div>
                    <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800"><span className="block text-[10px] text-slate-400 uppercase font-bold">Safety Index</span><span className="text-amber-400 font-bold text-sm">{hub.Safety_Score}/100</span></div>
                  </div>

                  <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 mb-5 text-[11px] text-slate-400">
                    <span className="font-bold text-slate-300 block mb-1">💡 How TfL Fare is calculated:</span>{hub.TfL_Fare_Explanation}
                  </div>

                  <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 mb-6 text-xs leading-relaxed text-slate-300">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block mb-1">KeelEngine Verdict</span><p>{hub.AI_Verdict}</p>
                  </div>

                  {/* ACTION BUTTONS */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button onClick={() => handleListingsClick(hub)} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-4 rounded-xl text-xs transition shadow-lg flex items-center justify-center gap-1.5">
                      <span>🏘️</span> Suggested Listings
                    </button>
                    <a href={`https://www.google.com/maps/dir/?api=1&origin=${hub.Latitude},${hub.Longitude}&destination=${encodeURIComponent(activeDestination)}&travelmode=transit`} target="_blank" rel="noreferrer" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 px-4 rounded-xl text-center text-xs transition shadow-lg">
                      🗺️ Maps Route
                    </a>
                  </div>
                </div>
              );
            })}

            {/* 5-PER-PAGE PAGINATION */}
            {!loading && results.length > 0 && (
              <div className="flex justify-between items-center bg-slate-900/80 p-4 rounded-2xl border border-slate-800 shadow-xl">
                <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white font-bold text-xs rounded-xl transition border border-slate-700">
                  ← Previous
                </button>
                <span className="text-xs text-slate-300 font-bold">Page {currentPage} of {totalPages}</span>
                <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white font-bold text-xs rounded-xl transition border border-slate-700">
                  Next →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}