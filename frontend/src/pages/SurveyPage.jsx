import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import AlertModal from '../components/AlertModal';

export default function SurveyPage({ session }) {
  useEffect(() => { document.title = "KeelEngine | AI Feature Access"; }, []);

  // Form Selection States
  const [currentBorough, setCurrentBorough] = useState('');
  const [movingTimeline, setMovingTimeline] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [housingBudget, setHousingBudget] = useState('');
  const [commuteTolerance, setCommuteTolerance] = useState('');
  const [primaryPriority, setPrimaryPriority] = useState('');
  const [commutePainPoint, setCommutePainPoint] = useState('');
  const [workModel, setWorkModel] = useState('');
  const [desiredFeatures, setDesiredFeatures] = useState([]);

  // Survey States
  const [surveyStatus, setSurveyStatus] = useState('idle'); // idle | submitting | completed
  const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: '', message: '', type: 'success' });
  const showAlert = (title, message, type) => setAlertConfig({ isOpen: true, title, message, type });

  const FEATURE_CHIPS = [
    "AI Conversational Search Bar", "Automated Landlord Email Writer", "Generative Neighborhood Vibe Check", 
    "School Zoning & Ratings", "Borough Council Tax Calculator", "Night Tube Line Access", 
    "Broadband Speed Filters", "Crime Heatmaps"
  ];

  const toggleFeatureChip = (feature) => {
    if (desiredFeatures.includes(feature)) setDesiredFeatures(desiredFeatures.filter(f => f !== feature));
    else setDesiredFeatures([...desiredFeatures, feature]);
  };

  const validateFormSelections = () => {
    if (!currentBorough) { showAlert("Incomplete Survey", "Please answer Question 1.", "error"); return false; }
    if (!movingTimeline) { showAlert("Incomplete Survey", "Please answer Question 2.", "error"); return false; }
    if (!propertyType) { showAlert("Incomplete Survey", "Please answer Question 3.", "error"); return false; }
    if (!housingBudget) { showAlert("Incomplete Survey", "Please answer Question 4.", "error"); return false; }
    if (!commuteTolerance) { showAlert("Incomplete Survey", "Please answer Question 5.", "error"); return false; }
    if (!primaryPriority) { showAlert("Incomplete Survey", "Please answer Question 6.", "error"); return false; }
    if (!commutePainPoint) { showAlert("Incomplete Survey", "Please answer Question 7.", "error"); return false; }
    if (!workModel) { showAlert("Incomplete Survey", "Please answer Question 8.", "error"); return false; }
    if (desiredFeatures.length === 0) { showAlert("Selection Required", "Please select at least one feature in Question 9.", "error"); return false; }
    return true;
  };

  const handleSurveySubmit = async (e) => {
    e.preventDefault();
    if (!validateFormSelections()) return;

    setSurveyStatus('submitting');

    const fullFeedback = `[BOROUGH]: ${currentBorough}\n[TIMELINE]: ${movingTimeline}\n[PROPERTY]: ${propertyType}\n[BUDGET]: ${housingBudget}\n[COMMUTE TOLERANCE]: ${commuteTolerance}\n[PRIORITY]: ${primaryPriority}\n[PAIN POINT]: ${commutePainPoint}\n[WORK MODEL]: ${workModel}\n[FEATURES]: ${desiredFeatures.join(', ')}`;
    const userEmail = session?.user?.email || 'Anonymous Guest';

    try {
      await supabase.from('user_feedback').insert([{ email: userEmail, feedback_text: fullFeedback }]);
    } catch (err) {
      console.error("Feedback Save Note:", err);
    }

    setSurveyStatus('completed');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 flex flex-col md:flex-row gap-8">
      <AlertModal {...alertConfig} onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })} />

      <div className="w-full md:w-2/3 glass p-8 md:p-10 rounded-3xl shadow-2xl border border-slate-700/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-800">
          <div>
            <h2 className="text-3xl font-black text-white tracking-tight">KeelEngine AI Product Roadmap</h2>
            <p className="text-slate-400 text-sm mt-1">Help shape our upcoming Agentic AI search features.</p>
          </div>
          <div className="self-start sm:self-auto bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-2">
            <span>✨ Access:</span> AI Beta Waitlist
          </div>
        </div>

        {/* SURVEY FORM */}
        {(surveyStatus === 'idle' || surveyStatus === 'submitting') && (
          <form onSubmit={handleSurveySubmit} className="space-y-8 text-left">
            <div>
              <label className="block text-sm font-bold text-emerald-400 uppercase tracking-wider mb-3">1. Where do you currently live?</label>
              <select value={currentBorough} onChange={(e) => setCurrentBorough(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-5 py-4 text-white text-sm outline-none">
                <option value="">-- Please Select an Option --</option>
                <option value="Outside London (Relocating)">Outside London (Relocating)</option>
                <option value="Zone 1-2 (Central)">Zone 1-2 (Central)</option>
                <option value="Zone 3-4 (Inner Suburbs)">Zone 3-4 (Inner Suburbs)</option>
                <option value="Zone 5-6 (Outer Suburbs)">Zone 5-6 (Outer Suburbs)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-emerald-400 uppercase tracking-wider mb-3">2. Estimated relocation timeline?</label>
              <select value={movingTimeline} onChange={(e) => setMovingTimeline(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-5 py-4 text-white text-sm outline-none">
                <option value="">-- Please Select an Option --</option>
                <option value="Within 1 month">Within 1 month</option>
                <option value="Within 3 months">Within 3 months</option>
                <option value="3 to 6 months">3 to 6 months</option>
                <option value="Just exploring options">Just exploring options</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-emerald-400 uppercase tracking-wider mb-3">3. Property type requirement?</label>
              <select value={propertyType} onChange={(e) => setPropertyType(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-5 py-4 text-white text-sm outline-none">
                <option value="">-- Please Select an Option --</option>
                <option value="Flatshare / Room">Flatshare / Room</option>
                <option value="1-Bed Private Flat">1-Bed Private Flat</option>
                <option value="2-Bed Flat">2-Bed Flat</option>
                <option value="House">House</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-emerald-400 uppercase tracking-wider mb-3">4. Target monthly rent budget?</label>
              <select value={housingBudget} onChange={(e) => setHousingBudget(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-5 py-4 text-white text-sm outline-none">
                <option value="">-- Please Select an Option --</option>
                <option value="Under £1,200">Under £1,200</option>
                <option value="£1,200 - £1,500">£1,200 - £1,500</option>
                <option value="£1,500 - £2,000">£1,500 - £2,000</option>
                <option value="£2,000 - £2,500">£2,000 - £2,500</option>
                <option value="£2,500+">£2,500+</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-emerald-400 uppercase tracking-wider mb-3">5. Maximum acceptable commute?</label>
              <select value={commuteTolerance} onChange={(e) => setCommuteTolerance(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-5 py-4 text-white text-sm outline-none">
                <option value="">-- Please Select an Option --</option>
                <option value="30 mins max">30 mins max</option>
                <option value="45 mins max">45 mins max</option>
                <option value="60 mins max">60 mins max</option>
                <option value="90+ mins (Hybrid/Rare commute)">90+ mins (Hybrid/Rare commute)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-emerald-400 uppercase tracking-wider mb-3">6. #1 non-negotiable priority?</label>
              <select value={primaryPriority} onChange={(e) => setPrimaryPriority(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-5 py-4 text-white text-sm outline-none">
                <option value="">-- Please Select an Option --</option>
                <option value="Commute Time & Transport Links">Commute Time & Transport Links</option>
                <option value="Safety & Low Crime">Safety & Low Crime</option>
                <option value="Affordable Rent">Affordable Rent</option>
                <option value="Vibrant Nightlife">Vibrant Nightlife</option>
                <option value="Parks & Green Space">Parks & Green Space</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-emerald-400 uppercase tracking-wider mb-3">7. Biggest London housing frustration?</label>
              <select value={commutePainPoint} onChange={(e) => setCommutePainPoint(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-5 py-4 text-white text-sm outline-none">
                <option value="">-- Please Select an Option --</option>
                <option value="High Transit Costs / Peak Fares">High Transit Costs / Peak Fares</option>
                <option value="Misleading Neighborhood Safety">Misleading Neighborhood Safety</option>
                <option value="Rental Prices Exceeding Budget">Rental Prices Exceeding Budget</option>
                <option value="Bidding wars / Low supply">Bidding wars / Low supply</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-emerald-400 uppercase tracking-wider mb-3">8. What is your current work setup?</label>
              <select value={workModel} onChange={(e) => setWorkModel(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-5 py-4 text-white text-sm outline-none">
                <option value="">-- Please Select an Option --</option>
                <option value="Fully Remote">Fully Remote</option>
                <option value="Hybrid (1-2 days in office)">Hybrid (1-2 days in office)</option>
                <option value="Hybrid (3-4 days in office)">Hybrid (3-4 days in office)</option>
                <option value="Full-Time In-Office (5 days)">Full-Time In-Office (5 days)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-emerald-400 uppercase tracking-wider mb-2">9. Which AI features should we prioritize?</label>
              <p className="text-xs text-slate-400 mb-4">Select all that apply:</p>
              <div className="flex flex-wrap gap-3">
                {FEATURE_CHIPS.map((chip, idx) => {
                  const isSelected = desiredFeatures.includes(chip);
                  return (
                    <button type="button" key={idx} onClick={() => toggleFeatureChip(chip)} className={`px-4 py-3 rounded-xl text-xs font-bold transition border ${isSelected ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg' : 'bg-slate-900/80 text-slate-300 border-slate-700'}`}>{isSelected ? '✓ ' : '+ '} {chip}</button>
                  );
                })}
              </div>
            </div>

            <button type="submit" disabled={surveyStatus === 'submitting'} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-xl transition text-sm">
              {surveyStatus === 'submitting' ? 'Saving Responses...' : 'Submit Feedback & Join AI Beta'}
            </button>
          </form>
        )}

        {/* SUCCESS & AI BETA CONFIRMATION */}
        {surveyStatus === 'completed' && (
          <div className="bg-slate-900/80 border border-emerald-500/40 p-8 rounded-2xl text-center animate-fadeIn">
            <span className="text-5xl block mb-4">🤖</span>
            <h3 className="text-2xl font-black text-white mb-2">You're on the AI Beta Waitlist!</h3>
            <p className="text-slate-300 text-sm mb-6">Thank you for shaping KeelEngine's AI roadmap. We'll notify you as soon as conversational search and automated landlord outreach launch.</p>
            
            <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 text-left">
              <h4 className="text-xs font-bold text-emerald-400 uppercase mb-3">Next Up On Our Roadmap:</h4>
              <ul className="text-slate-300 text-sm space-y-2">
                <li className="flex items-center gap-2"><span>💬</span> <strong>Conversational Search:</strong> Query properties with natural prompts.</li>
                <li className="flex items-center gap-2"><span>📊</span> <strong>AI Verdicts:</strong> Instant trade-off breakdowns on rent vs. TfL fares.</li>
                <li className="flex items-center gap-2"><span>✉️</span> <strong>Auto-Outreach:</strong> 1-click tailored landlord viewing requests.</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* ABOUT DEVELOPER SIDEBAR */}
      <div className="w-full md:w-1/3">
        <div className="glass p-8 rounded-3xl shadow-2xl border border-emerald-900/30 sticky top-8">
          <h3 className="text-xl font-black text-emerald-400 mb-4 border-b border-emerald-900/50 pb-3">Prem Jena</h3>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-4">FOUNDER</span>
          <p className="text-slate-300 text-sm leading-relaxed mb-6">
            Building KeelEngine as an agentic AI platform to replace traditional, friction-heavy property search with autonomous multi-variable matching and real-cost optimization.
          </p>
          <a href="https://linkedin.com/in/iampremjena" target="_blank" rel="noreferrer" className="inline-flex items-center justify-center w-full gap-2 bg-[#0A66C2] hover:bg-[#004182] text-white font-bold py-3 px-6 rounded-xl text-sm transition shadow-lg border border-[#0A66C2]">
            🔗 Connect on LinkedIn
          </a>
        </div>
      </div>
    </div>
  );
}