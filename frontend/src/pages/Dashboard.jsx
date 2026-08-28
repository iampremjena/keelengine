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
  "How do I use KeelEngine step-by-step?",
  "How does Clyde calculate TfL transit fares?",
  "What is a safe rent allowance percentage?"
];

function NeighborhoodMap({ lat, lng, neighborhood, targetDestination }) {
  if (!lat || !lng) return <div className="w-full h-40 sm:h-48 rounded-2xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-center mb-4 sm:mb-5"><span className="text-slate-500 text-xs font-mono">Map Syncing...</span></div>;
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
  useEffect(() => { document.title = "KeelEngine London | Commute & Housing Finder"; }, []);

  const [searchParams, setSearchParams] = useSearchParams();
  const [searchMode, setSearchMode] = useState('manual');
  
  // LIVE LONDON TIME & WEATHER WIDGET STATES
  const [londonTime, setLondonTime] = useState('');
  const [londonTemp, setLondonTemp] = useState('18°C ⛅');

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

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [listingsModal, setListingsModal] = useState({ isOpen: false, neighborhood: '', listings: [] });
  const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: '', message: '', type: 'success' });

  // BONNIE CHATBOT & AUDIO CONTROLLER STATES
  const [isBonnieOpen, setIsBonnieOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: "Hi! I'm Bonnie 👋 I guess Clyde didn't explain everything? Don't worry, I'm here as your support assistant. How can I help you today?" }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  
  const [activeAudioMsgIndex, setActiveAudioMsgIndex] = useState(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const audioRef = useRef(null);
  const chatScrollRef = useRef(null);

  const showAlert = (title, message, type) => setAlertConfig({ isOpen: true, title, message, type });
  const hasSearched = searchParams.has('postcode') || searchParams.has('destination');

  // SLEEK LIVE LONDON TIME (DATE + HH:MM:SS) & WEATHER
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Date formatting: "Fri, 28 Aug 2026"
      const dateString = now.toLocaleDateString('en-GB', { timeZone: 'Europe/London', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
      // Time formatting with seconds: "11:44:34"
      const timeString = now.toLocaleTimeString('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLondonTime(`${dateString} • ${timeString} BST`);
    };
    
    updateTime();
    const interval = setInterval(updateTime, 1000);

    fetch('https://api.open-meteo.com/v1/forecast?latitude=51.5074&longitude=-0.1278&current_weather=true')
      .then(res => res.json())
      .then(data => {
        if (data?.current_weather?.temperature) {
          setLondonTemp(`${Math.round(data.current_weather.temperature)}°C ⛅`);
        }
      })
      .catch(() => {});

    return () => clearInterval(interval);
  }, []);

  // BONNIE AUDIO CONTROLLER
  const handleAudioToggle = async (text, msgIdx) => {
    if (activeAudioMsgIndex === msgIdx && audioRef.current) {
      if (isAudioPlaying) {
        audioRef.current.pause();
        setIsAudioPlaying(false);
      } else {
        audioRef.current.play();
        setIsAudioPlaying(true);
      }
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setActiveAudioMsgIndex(msgIdx);
    setIsAudioPlaying(false);

    try {
      const response = await fetch('/api/tts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text })
      });
      if (!response.ok) throw new Error("Audio generation failed");
      const blob = await response.blob();
      const audio = new Audio(URL.createObjectURL(blob));
      audioRef.current = audio;
      audio.onended = () => { setIsAudioPlaying(false); setActiveAudioMsgIndex(null); };
      audio.play();
      setIsAudioPlaying(true);
    } catch (e) {
      showAlert("Voice Error", "Could not play Bonnie's voice.", "error");
      setActiveAudioMsgIndex(null);
      setIsAudioPlaying(false);
    }
  };

  const stopAudioCompletely = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setIsAudioPlaying(false);
    setActiveAudioMsgIndex(null);
  };

  const handleLocationType = (e) => {
    const val = e.target.value;
    setOfficeLocation(val);
    if (val.length > 0) {
      const filtered = LONDON_AREAS.filter(area => area.toLowerCase().includes(val.toLowerCase())).slice(0, 5);
      setLocationSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else setShowSuggestions(false);
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
    const activeTotalBudget = Math.round((calculateNetMonthly(urlSalary) + (searchParams.get('move') === 'couple' ? calculateNetMonthly(urlPartner) : 0)) * (urlBudget / 100));

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
        else if (!data.hubs || data.hubs.length === 0) setErrorMsg(`⚠️ No neighborhoods match a budget of £${activeTotalBudget.toLocaleString()}.`);
        else setResults(data.hubs);
      } catch (err) { setErrorMsg(err.message || 'Connection error.'); } finally { setLoading(false); }
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
      if (data.reply) setChatMessages([...updatedMessages, { role: 'assistant', content: data.reply }]);
      else throw new Error();
    } catch (err) {
      setChatMessages([...updatedMessages, { role: 'assistant', content: "I'm having trouble connecting right now. Please email our developer at iampremjena@gmail.com." }]);
    } finally { setChatLoading(false); }
  };

  useEffect(() => {
    if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [chatMessages, isBonnieOpen]);

  const handleListingsClick = async (hub) => {
    setListingsModal({ isOpen: true, neighborhood: hub.Neighborhood, listings: hub.live_listings || [] });
    try { await supabase.from('neighborhood_clicks').insert([{ neighborhood: hub.Neighborhood }]); } catch (e) { console.error(e); }
  };

  const activeDestination = searchParams.get('destination') || searchParams.get('postcode') || officeLocation;
  const indexOfLastItem = currentPage * itemsPerPage;
  const currentItems = results.slice(indexOfLastItem - itemsPerPage, indexOfLastItem);
  const totalPages = Math.ceil(results.length / itemsPerPage) || 1;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 min-h-[85vh] relative">
      <AlertModal {...alertConfig} onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })} />

      {/* 🏙️ SLEEK TOP BAR: RESPONSIVE FLEX WITH SLEEK FONTS */}
      <div className="w-full bg-slate-900/80 border border-slate-800 rounded-2xl px-4 sm:px-6 py-3 sm:py-4 mb-6 sm:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-2 sm:gap-3">
          
          <span className="text-[9px] sm:text-[10px] font-black font-mono uppercase tracking-widest text-emerald-400 border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 rounded-md mt-0.5 sm:mt-1">
            LONDON
          </span>
        </div>

        {/* SLEEK WEATHER & TIME (NO MORE CLUNKY BACKGROUNDS) */}
        <div className="flex items-center gap-3 sm:gap-4 text-[10px] sm:text-xs font-medium text-slate-300 tracking-wide font-sans">
          <span className="flex items-center gap-1.5 opacity-90 text-emerald-300">
            {londonTime || 'Syncing clock...'}
          </span>
          <span className="hidden sm:block w-px h-3.5 bg-slate-700"></span>
          <span className="opacity-90">{londonTemp}</span>
        </div>
      </div>

      {/* 💬 BONNIE CHATBOT WIDGET (MOBILE OPTIMIZED HEIGHT/WIDTH) */}
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[200]">
        {!isBonnieOpen ? (
          <button onClick={() => setIsBonnieOpen(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-3 sm:px-5 sm:py-4 rounded-full shadow-2xl transition flex items-center gap-2 border border-emerald-400/40 text-sm">
            <span>💬 Ask Bonnie</span>
          </button>
        ) : (
          <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl shadow-2xl w-[calc(100vw-2rem)] sm:w-96 flex flex-col h-[75vh] max-h-[560px] sm:h-[520px] overflow-hidden animate-fadeIn">
            <div className="bg-slate-950 p-4 border-b border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse"></div><h4 className="text-white font-bold text-xs sm:text-sm">Bonnie — Support Assistant</h4></div>
              <button onClick={() => setIsBonnieOpen(false)} className="text-slate-400 hover:text-white font-bold text-sm sm:text-base px-2">✕</button>
            </div>

            <div ref={chatScrollRef} className="flex-1 p-3 sm:p-4 overflow-y-auto space-y-3 sm:space-y-4 text-xs">
              {chatMessages.map((msg, idx) => {
                const isThisPlaying = activeAudioMsgIndex === idx && isAudioPlaying;
                return (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-3.5 sm:p-4 rounded-2xl relative ${msg.role === 'user' ? 'bg-emerald-600 text-white' : 'bg-slate-950 text-slate-200 border border-slate-800'}`}>
                      <div dangerouslySetInnerHTML={{ __html: msg.content }} className="space-y-2 [&_ul]:list-disc [&_ul]:ml-4 [&_li]:mt-1" />
                      {msg.role === 'assistant' && (
                        <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center gap-2">
                          <button onClick={() => handleAudioToggle(msg.content, idx)} className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-2.5 sm:px-3 py-1 rounded-lg text-[9px] sm:text-[10px] font-bold transition border border-emerald-500/30 flex items-center gap-1">
                            {isThisPlaying ? '⏸ Pause Voice' : '▶ Play Voice'}
                          </button>
                          {activeAudioMsgIndex === idx && (
                            <button onClick={stopAudioCompletely} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-2 sm:px-2.5 py-1 rounded-lg text-[9px] sm:text-[10px] font-bold transition border border-red-500/30">
                              ⏹ Stop
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {chatMessages.length === 1 && !chatLoading && (
                <div className="flex flex-col gap-2 mt-2">
                  {BONNIE_QUICK_PROMPTS.map((prompt, i) => (
                    <button key={i} onClick={() => sendChatMessage(prompt)} className="bg-slate-800 hover:bg-emerald-900/50 border border-slate-700 text-slate-300 text-left p-2.5 rounded-xl transition text-[10px] sm:text-[11px]">
                      {prompt}
                    </button>
                  ))}
                </div>
              )}
              {chatLoading && <div className="flex justify-start"><div className="bg-slate-950 text-slate-400 p-3 rounded-2xl border border-slate-800 animate-pulse">Bonnie is thinking...</div></div>}
            </div>

            <form onSubmit={(e) => { e.preventDefault(); sendChatMessage(chatInput); }} className="p-3 bg-slate-950 border-t border-slate-800 flex gap-2">
              <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Ask Bonnie a question..." className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 sm:py-2.5 text-white text-xs outline-none focus:border-emerald-500" />
              <button type="submit" disabled={chatLoading} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 sm:px-4 rounded-xl text-xs transition">Send</button>
            </form>
          </div>
        )}
      </div>

      {/* SUGGESTED LISTINGS MODAL (MOBILE RESPONSIVE WIDTH) */}
      {listingsModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md px-4 animate-fadeIn">
          <div className="bg-slate-900 border border-emerald-500/50 p-5 sm:p-6 md:p-8 rounded-3xl shadow-2xl max-w-2xl w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2"><span>🏘️</span> Suggested Listings: {listingsModal.neighborhood}</h3>
              <button onClick={() => setListingsModal({ ...listingsModal, isOpen: false })} className="text-slate-400 hover:text-white font-bold text-base sm:text-lg px-2">✕</button>
            </div>
            
            <div className="space-y-3 max-h-[60vh] sm:max-h-80 overflow-y-auto pr-2 mb-6">
              {listingsModal.listings && listingsModal.listings.length > 0 ? (
                listingsModal.listings.map((item, lIdx) => (
                  <a key={lIdx} href={item.url} target="_blank" rel="noreferrer" className="flex items-center justify-between bg-slate-950 hover:bg-slate-800 p-3 sm:p-4 rounded-xl border border-slate-800 hover:border-emerald-500/50 transition text-xs">
                    <span className="text-slate-200 font-medium truncate max-w-[200px] sm:max-w-md">{item.title}</span>
                    <span className="text-emerald-400 font-bold text-[10px] sm:text-[11px] whitespace-nowrap ml-2">View Property ➔</span>
                  </a>
                ))
              ) : (
                <div className="text-center py-5 sm:py-6 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                  <p className="text-slate-400 text-xs px-2">No direct live matches found via scraper. Search directly on UK portals:</p>
                  <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-3 px-4">
                    <a href={`https://www.rightmove.co.uk/property-to-rent/search.html?searchLocation=${encodeURIComponent(listingsModal.neighborhood + ', London')}`} target="_blank" rel="noreferrer" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl block">Search Rightmove ➔</a>
                    <a href={`https://www.zoopla.co.uk/to-rent/property/${encodeURIComponent(listingsModal.neighborhood.replace(/\s+/g, '-').toLowerCase())}/`} target="_blank" rel="noreferrer" className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl block">Search Zoopla ➔</a>
                  </div>
                </div>
              )}
            </div>
            
            <button onClick={() => setListingsModal({ ...listingsModal, isOpen: false })} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 sm:py-3.5 rounded-xl text-xs">Close Window</button>
          </div>
        </div>
      )}

      {/* MAIN CONTENT LAYOUT: FLEX-COL FOR MOBILE, FLEX-ROW FOR DESKTOP */}
      <div className={`flex flex-col lg:flex-row gap-6 sm:gap-8 ${!hasSearched ? 'justify-center items-center' : 'items-start'}`}>
        
        {/* LEFT SEARCH CONTROL FORM */}
        <div className={`w-full ${!hasSearched ? 'max-w-xl' : 'lg:w-1/3 sticky top-6 sm:top-8'}`}>
          <div className="glass p-5 sm:p-8 rounded-3xl shadow-2xl border border-emerald-900/30">
            <div className="flex bg-slate-900 p-1.5 rounded-xl border border-slate-800 mb-5 sm:mb-6">
              <button type="button" onClick={() => setSearchMode('manual')} className={`flex-1 py-2 sm:py-2.5 rounded-lg text-[11px] sm:text-xs font-bold transition ${searchMode === 'manual' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}>⚙️ Manual Search</button>
              <button type="button" onClick={() => setSearchMode('ai')} className={`flex-1 py-2 sm:py-2.5 rounded-lg text-[11px] sm:text-xs font-bold transition ${searchMode === 'ai' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}>✨ Ask Clyde</button>
            </div>

            {searchMode === 'manual' && (
              <form onSubmit={triggerManualSearch} className="space-y-5 sm:space-y-6 text-left">
                <div>
                  <label className="block text-[10px] sm:text-xs font-bold text-slate-300 uppercase mb-2">Who is moving?</label>
                  <select value={moveType} onChange={(e) => setMoveType(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-white outline-none text-xs sm:text-sm">
                    <option value="solo">Just Me</option><option value="couple">A Couple</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] sm:text-xs font-bold text-slate-300 uppercase mb-2">Target Property Allocation</label>
                  <select value={propertyType} onChange={(e) => setPropertyType(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-white outline-none text-xs sm:text-sm">
                    <option value="Shared Flatshare / Room">Shared Flatshare / Room</option><option value="Studio Flat">Studio Flat</option><option value="1-Bed Private Flat">1-Bed Private Flat</option><option value="2-Bed Flat">2-Bed Flat</option>
                  </select>
                </div>
                <div>
                  <div className="flex justify-between mb-2"><label className="text-[10px] sm:text-xs font-bold text-slate-300 uppercase">Your Annual Salary</label><span className="text-emerald-400 font-bold text-xs sm:text-sm">£{grossSalary.toLocaleString()}</span></div>
                  <input type="range" min="15000" max="200000" step="1000" value={grossSalary} onChange={(e) => setGrossSalary(Number(e.target.value))} className="w-full accent-emerald-500" />
                </div>
                {moveType === 'couple' && (
                  <div>
                    <div className="flex justify-between mb-2"><label className="text-[10px] sm:text-xs font-bold text-slate-300 uppercase">Partner's Annual Salary</label><span className="text-emerald-400 font-bold text-xs sm:text-sm">£{partnerSalary.toLocaleString()}</span></div>
                    <input type="range" min="0" max="200000" step="1000" value={partnerSalary} onChange={(e) => setPartnerSalary(Number(e.target.value))} className="w-full accent-emerald-500" />
                  </div>
                )}
                <div>
                  <div className="flex justify-between mb-2"><label className="text-[10px] sm:text-xs font-bold text-slate-300 uppercase">Max Rent Allowance %</label><span className="text-white font-bold text-xs sm:text-sm">{budgetSlider}% of Net Pay</span></div>
                  <input type="range" min="20" max="60" step="5" value={budgetSlider} onChange={(e) => setBudgetSlider(Number(e.target.value))} className="w-full accent-emerald-500" />
                </div>
                <div className="bg-slate-950 p-3 sm:p-4 rounded-xl text-center border border-slate-800">
                  <p className="text-[9px] sm:text-[10px] text-slate-400 uppercase font-bold">Computed Rent + Transit Ceiling</p>
                  <p className="text-xl sm:text-2xl text-emerald-400 font-black mt-1">£{computedTotalBudget.toLocaleString()}<span className="text-[10px] sm:text-xs text-slate-400 font-normal">/mo</span></p>
                </div>
                <div>
                  <div className="flex justify-between mb-2"><label className="text-[10px] sm:text-xs font-bold text-slate-300 uppercase">Days in Office / Week</label><span className="text-blue-400 font-bold text-xs sm:text-sm">{officeDays} Days</span></div>
                  <input type="range" min="1" max="5" step="1" value={officeDays} onChange={(e) => setOfficeDays(Number(e.target.value))} className="w-full accent-blue-500" />
                </div>
                
                <div className="relative">
                  <label className="block text-[10px] sm:text-xs font-bold text-slate-300 uppercase mb-2">Office Location / Destination</label>
                  <input 
                    type="text" 
                    required 
                    value={officeLocation} 
                    onChange={handleLocationType} 
                    onFocus={() => {if (officeLocation.length > 0) setShowSuggestions(true)}}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 sm:px-4 py-3 sm:py-4 text-white outline-none text-xs sm:text-sm" 
                  />
                  {showSuggestions && locationSuggestions.length > 0 && (
                    <ul className="absolute z-50 w-full bg-slate-800 border border-slate-700 rounded-xl mt-1 overflow-hidden shadow-2xl">
                      {locationSuggestions.map((area, idx) => (
                        <li key={idx} onClick={() => selectSuggestion(area)} className="px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-white hover:bg-emerald-600 cursor-pointer transition border-b border-slate-700/50 last:border-0">
                          {area}, London
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 sm:py-4 rounded-xl transition shadow-xl text-xs sm:text-sm">Let Clyde Find Matches ➔</button>
              </form>
            )}

            {searchMode === 'ai' && (
              <form onSubmit={handleAiSubmit} className="space-y-4 text-left">
                <div>
                  <label className="block text-[10px] sm:text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">Tell Clyde What You Need</label>
                  <textarea value={aiPromptText} onChange={(e) => setAiPromptText(e.target.value)} placeholder="e.g., I work in Canary Wharf 3 days a week, earn £65k, and need a 1-bed flat..." className="w-full h-32 sm:h-40 bg-slate-900 border border-slate-700 rounded-xl p-3 sm:p-4 text-white text-xs sm:text-sm outline-none resize-none focus:border-emerald-500 transition" />
                </div>
                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 sm:py-4 rounded-xl transition shadow-xl text-xs sm:text-sm flex items-center justify-center gap-2">
                  <span>✨</span> Let Clyde Search
                </button>
              </form>
            )}
          </div>
        </div>

        {/* RIGHT RESULTS DISPLAY (MOBILE WRAP OPTIMIZED) */}
        {hasSearched && (
          <div className="w-full lg:w-2/3 space-y-5 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-slate-900/60 p-3 sm:p-4 rounded-2xl border border-slate-700/50 shadow-md gap-3 sm:gap-0">
              <span className="text-slate-300 text-xs sm:text-sm text-center sm:text-left">Destination Target: <strong className="text-white font-mono break-all">{activeDestination}</strong></span>
              <span className="text-[10px] sm:text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold px-3 py-1.5 rounded-lg text-center">Ceiling: £{computedTotalBudget}/mo</span>
            </div>

            {loading && (
              <div className="glass rounded-3xl py-20 sm:py-28 text-center border border-emerald-500/30 px-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-emerald-400 font-bold text-xs sm:text-sm">Clyde is researching London transit topologies to {activeDestination}...</p>
                <p className="text-[10px] sm:text-xs text-slate-400 mt-1">Gathering 10 neighborhood suggestions and live property listings...</p>
              </div>
            )}

            {errorMsg && !loading && (
              <div className="p-5 sm:p-8 glass rounded-3xl border border-red-900/50 text-amber-400 text-center font-medium text-xs sm:text-base">{errorMsg}</div>
            )}

            {!loading && currentItems.map((hub, idx) => {
              const singleFare = parseFloat(hub.Single_Fare_Cost || 0);
              const daysNum = Number(searchParams.get('days')) || 3;
              const monthlyFareTotal = Math.round(singleFare * 2 * daysNum * 4.33);

              return (
                <div key={idx} className="glass rounded-3xl p-5 sm:p-6 md:p-8 shadow-2xl border border-slate-700/40 hover:border-emerald-500/40 transition">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">{hub.Neighborhood} <span className="text-xs sm:text-sm font-normal text-slate-400">({hub.Station_Outcode})</span></h3>
                      <p className="text-[10px] sm:text-xs text-slate-400 font-medium mt-0.5">{hub.Borough} Borough</p>
                    </div>
                    <div className="bg-slate-950 border border-emerald-500/30 rounded-xl sm:rounded-2xl px-3 sm:px-4 py-1.5 sm:py-2 text-center shrink-0 ml-2">
                      <span className="block text-[8px] sm:text-[9px] text-slate-400 uppercase font-bold">Match Score</span>
                      <span className="text-xl sm:text-2xl font-black text-emerald-400">{hub.Suggestion_Score}</span>
                    </div>
                  </div>

                  <NeighborhoodMap lat={hub.Latitude} lng={hub.Longitude} neighborhood={hub.Neighborhood} targetDestination={activeDestination} />

                  {/* GRID: 2 COLUMNS ON MOBILE, 4 COLUMNS ON DESKTOP */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-5">
                    <div className="bg-slate-950 p-3 sm:p-3.5 rounded-xl border border-slate-800">
                      <span className="block text-[9px] sm:text-[10px] text-slate-400 uppercase font-bold">Rent Allocation</span>
                      <span className="text-emerald-400 font-bold text-xs sm:text-sm truncate block mt-0.5">{hub.Rent_Range}</span>
                    </div>

                    <div className="bg-slate-950 p-3 sm:p-3.5 rounded-xl border border-slate-800 relative group cursor-help hover:border-emerald-500 transition">
                      <span className="block text-[9px] sm:text-[10px] text-slate-400 uppercase font-bold">Commute ⓘ</span>
                      <span className="text-white font-bold text-xs sm:text-sm mt-0.5 block">{hub.Commute_Duration} Mins</span>
                      <div className="hidden md:group-hover:block absolute bottom-full left-0 mb-2 w-56 bg-slate-800 border border-emerald-700 p-3 sm:p-4 rounded-xl text-xs z-50 shadow-2xl">
                        <strong className="text-white block mb-1">Door-to-door Journey:</strong>
                        <span className="text-slate-300">{hub.Journey_Breakdown}</span>
                      </div>
                    </div>

                    <div className="bg-slate-950 p-3 sm:p-3.5 rounded-xl border border-slate-800 relative group cursor-help hover:border-blue-500 transition">
                      <span className="block text-[9px] sm:text-[10px] text-slate-400 uppercase font-bold">Cost / Mo ⓘ</span>
                      <span className="text-blue-400 font-bold text-xs sm:text-sm mt-0.5 block">£{monthlyFareTotal}</span>
                      <div className="hidden md:group-hover:block absolute bottom-full right-0 lg:left-0 mb-2 w-56 sm:w-64 bg-slate-800 border border-blue-700 p-3 sm:p-4 rounded-xl text-xs z-50 shadow-2xl">
                        <strong className="text-white block mb-1">Calculation Breakdown:</strong>
                        <span className="text-slate-300">£{singleFare.toFixed(2)} (Peak Single) <br/>× 2 (Return)<br/>× {searchParams.get('days')} (Days/wk)<br/>× 4.33 (Wks/mo)<br/><br/>= £{monthlyFareTotal}/mo</span>
                      </div>
                    </div>

                    <div className="bg-slate-950 p-3 sm:p-3.5 rounded-xl border border-slate-800 relative group cursor-help hover:border-amber-500 transition">
                      <span className="block text-[9px] sm:text-[10px] text-slate-400 uppercase font-bold">Safety ⓘ</span>
                      <span className="text-amber-400 font-bold text-xs sm:text-sm mt-0.5 block">{hub.Safety_Score}/100</span>
                      <div className="hidden md:group-hover:block absolute right-0 bottom-full mb-2 w-56 bg-slate-800 border border-amber-700 p-3 sm:p-4 rounded-xl text-xs z-50 shadow-2xl">
                        <strong className="text-white block mb-1">Data Source:</strong>
                        <span className="text-slate-300">Based on the latest London Met Police neighborhood crime reports.</span>
                      </div>
                    </div>
                  </div>

                  {/* MOBILE-ONLY TOOLTIPS FALLBACK (Since hover is hard on touch devices) */}
                  <div className="md:hidden bg-slate-950/60 p-3 rounded-xl border border-slate-800 mb-4 sm:mb-5 text-[10px] text-slate-400 space-y-2">
                    <p><strong className="text-slate-300 block mb-0.5">Route:</strong> {hub.Journey_Breakdown}</p>
                    <p><strong className="text-slate-300 block mb-0.5">TfL Fare Math:</strong> £{singleFare.toFixed(2)} × 2 × {searchParams.get('days')} days × 4.33 wks = £{monthlyFareTotal}/mo.</p>
                  </div>

                  <div className="bg-slate-950/80 p-3 sm:p-4 rounded-xl border border-slate-800 mb-5 sm:mb-6 text-[11px] sm:text-xs leading-relaxed text-slate-300">
                    <span className="text-[9px] sm:text-[10px] font-bold text-emerald-400 uppercase tracking-widest block mb-1">Clyde's Verdict</span>
                    <p>{hub.AI_Verdict}</p>
                  </div>

                  {/* ACTION BUTTONS (STACK ON MOBILE, SIDE-BY-SIDE DESKTOP) */}
                  <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
                    <button onClick={() => handleListingsClick(hub)} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 sm:py-3.5 px-4 rounded-xl text-xs transition shadow-lg flex items-center justify-center gap-1.5">
                      <span>🏘️</span> Suggested Listings
                    </button>
                    <a href={`https://www.google.com/maps/dir/?api=1&origin=${hub.Latitude},${hub.Longitude}&destination=${encodeURIComponent(activeDestination)}&travelmode=transit`} target="_blank" rel="noreferrer" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 sm:py-3.5 px-4 rounded-xl text-center text-xs transition shadow-lg flex items-center justify-center gap-1.5">
                      🗺️ Maps Route
                    </a>
                  </div>
                </div>
              );
            })}

            {/* PAGINATION */}
            {!loading && results.length > 0 && (
              <div className="flex justify-between items-center bg-slate-900/80 p-3 sm:p-4 rounded-2xl border border-slate-800 shadow-xl">
                <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="px-4 sm:px-5 py-2 sm:py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white font-bold text-[10px] sm:text-xs rounded-xl transition border border-slate-700">
                  ← Previous
                </button>
                <span className="text-[10px] sm:text-xs text-slate-300 font-bold">Page {currentPage} of {totalPages}</span>
                <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="px-4 sm:px-5 py-2 sm:py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white font-bold text-[10px] sm:text-xs rounded-xl transition border border-slate-700">
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