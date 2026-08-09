import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import AlertModal from '../components/AlertModal';

export default function SurveyPage({ session, isAdmin }) {
  useEffect(() => { document.title = "KeelEngine | Research Survey"; }, []);

  // Form States
  const [currentBorough, setCurrentBorough] = useState('Outside London');
  const [movingTimeline, setMovingTimeline] = useState('Within 3 months');
  const [propertyType, setPropertyType] = useState('1-Bed Private Flat');
  const [housingBudget, setHousingBudget] = useState('£1,500 - £2,000 / month');
  const [commuteTolerance, setCommuteTolerance] = useState('45 mins max');
  const [primaryPriority, setPrimaryPriority] = useState('Commute Time & Transport Links');
  const [commutePainPoint, setCommutePainPoint] = useState('High Transit Costs / Peak Fares');
  const [desiredFeatures, setDesiredFeatures] = useState([]);

  // Claim States
  const [surveyStatus, setSurveyStatus] = useState('idle'); // idle | submitting | completed | claiming | claimed
  const [claimedReward, setClaimedReward] = useState('');
  const [acceptedTandC, setAcceptedTandC] = useState(false);

  const defaultAbout = `🚀 Prem Jena | Lead Architect & Founder\n\nAs a Data Engineer and Full-Stack Architect, I built KeelEngine to solve a fundamental problem: the London housing market is opaque and mathematically exhausting to navigate.\n\nhttps://linkedin.com/in/iampremjena`;
  const [aboutText, setAboutText] = useState(defaultAbout);

  const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: '', message: '', type: 'success' });
  const showAlert = (title, message, type) => setAlertConfig({ isOpen: true, title, message, type });

  const FEATURE_CHIPS = [
    "School Zoning & Ratings", "Borough Council Tax Comparison", "Distance to Gyms & Parks", 
    "Night Tube Line Access", "Broadband & Fiber Speed Filters", "CSV Export for Saved Properties",
    "Pet-Friendly Rental Filters", "Crime Heatmaps"
  ];

  useEffect(() => {
    checkCompletionAndReward();
  }, [session]);

  const checkCompletionAndReward = async () => {
    if (!session?.user) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('survey_completed, linkedin_reward_link')
        .eq('id', session.user.id)
        .maybeSingle();
      
      if (error) console.error("Error fetching profile:", error);

      if (data) {
        if (data.linkedin_reward_link) {
          setClaimedReward(data.linkedin_reward_link);
          setSurveyStatus('claimed');
        } else if (data.survey_completed) {
          setSurveyStatus('completed');
        }
      }
    } catch (e) {
      console.error("Profile check exception:", e);
    }
  };

  const toggleFeatureChip = (feature) => {
    if (desiredFeatures.includes(feature)) setDesiredFeatures(desiredFeatures.filter(f => f !== feature));
    else setDesiredFeatures([...desiredFeatures, feature]);
  };

  // STEP 1: Submit Survey
  const handleSurveySubmit = async (e) => {
    e.preventDefault();
    if (!session?.user) return showAlert("Sign In Required", "Please log in to submit your survey.", "error");
    if (desiredFeatures.length === 0) return showAlert("Selection Required", "Please select at least one feature in Question 8.", "error");

    setSurveyStatus('submitting');
    try {
      const fullFeedback = `[BOROUGH]: ${currentBorough}\n[TIMELINE]: ${movingTimeline}\n[PROPERTY]: ${propertyType}\n[BUDGET]: ${housingBudget}\n[COMMUTE TOLERANCE]: ${commuteTolerance}\n[PRIORITY]: ${primaryPriority}\n[PAIN POINT]: ${commutePainPoint}\n[FEATURES]: ${desiredFeatures.join(', ')}`;

      // Save user feedback
      const { error: fbErr } = await supabase.from('user_feedback').insert([{ email: session.user.email, feedback_text: fullFeedback }]);
      if (fbErr) console.error("Feedback insert error:", fbErr);

      // Mark profile as survey_completed
      const { error: profErr } = await supabase.from('profiles').update({ survey_completed: true }).eq('id', session.user.id);
      if (profErr) console.error("Profile update error:", profErr);

      setSurveyStatus('completed');
    } catch (err) {
      console.error("Survey submission error:", err);
      showAlert("Error", err.message, "error");
      setSurveyStatus('idle');
    }
  };

  // STEP 2: Claim Reward
  const handleClaimReward = async () => {
    if (!acceptedTandC) return showAlert("Action Required", "You must accept the Terms & Conditions to claim the LinkedIn Premium trial.", "error");
    
    setSurveyStatus('claiming');
    try {
      // 1. Fetch available link
      const { data: availableLinks, error: fetchErr } = await supabase
        .from('linkedin_rewards')
        .select('*')
        .eq('is_used', false)
        .limit(1);

      if (fetchErr) {
        console.error("Fetch available rewards error:", fetchErr);
        throw fetchErr;
      }

      console.log("Fetched available links from DB:", availableLinks);

      if (!availableLinks || availableLinks.length === 0) {
        showAlert("All Codes Claimed", "Our promo code pool is currently empty. An admin will email you a code shortly!", "error");
        setSurveyStatus('completed');
        return;
      }

      const selectedReward = availableLinks[0];

      // 2. Mark code as used by current user
      const { error: updateRewardErr } = await supabase
        .from('linkedin_rewards')
        .update({
          is_used: true,
          assigned_to_user_id: session.user.id,
          claimed_at: new Date().toISOString()
        })
        .eq('id', selectedReward.id);

      if (updateRewardErr) {
        console.error("Reward assignment error:", updateRewardErr);
        throw updateRewardErr;
      }

      // 3. Attach link to user profile
      const { error: updateProfileErr } = await supabase
        .from('profiles')
        .update({ linkedin_reward_link: selectedReward.promo_link })
        .eq('id', session.user.id);

      if (updateProfileErr) {
        console.error("Profile reward save error:", updateProfileErr);
      }

      setClaimedReward(selectedReward.promo_link);
      setSurveyStatus('claimed');
      showAlert("🎉 Reward Unlocked!", "Your 2-Month LinkedIn Premium trial link is ready!", "success");

    } catch (err) {
      console.error("Claim reward exception:", err);
      showAlert("Error", err.message || "Failed to claim reward. Please check browser console.", "error");
      setSurveyStatus('completed');
    }
  };

  const renderAboutText = (text) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.split(urlRegex).map((part, i) => {
      if (part.match(urlRegex) && part.includes('linkedin.com')) {
        return <a key={i} href={part} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 mt-4 bg-[#0A66C2] hover:bg-[#004182] text-white font-bold py-3 px-6 rounded-xl text-sm transition shadow-lg border border-[#0A66C2]">🔗 Connect on LinkedIn</a>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 flex flex-col md:flex-row gap-8">
      <AlertModal {...alertConfig} onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })} />

      <div className="w-full md:w-2/3 glass p-8 md:p-10 rounded-3xl shadow-2xl border border-slate-700/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-800">
          <div>
            <h2 className="text-3xl font-black text-white tracking-tight">KeelEngine Research Survey</h2>
            <p className="text-slate-400 text-sm mt-1">This 2-minute survey helps us map the London housing market.</p>
          </div>
          <div className="self-start sm:self-auto bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-2">
            <span>🎁 Reward:</span> 2 Months LinkedIn Premium
          </div>
        </div>

        {/* STATE: IDLE */}
        {surveyStatus === 'idle' || surveyStatus === 'submitting' ? (
          <form onSubmit={handleSurveySubmit} className="space-y-8 text-left">
            <div><label className="block text-sm font-bold text-emerald-400 uppercase tracking-wider mb-3">1. Where do you currently live?</label><select value={currentBorough} onChange={(e) => setCurrentBorough(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-5 py-4 text-white text-sm outline-none"><option>Outside London (Relocating)</option><option>Zone 1-2 (Central)</option><option>Zone 3-4 (Inner Suburbs)</option><option>Zone 5-6 (Outer Suburbs)</option></select></div>
            <div><label className="block text-sm font-bold text-emerald-400 uppercase tracking-wider mb-3">2. Estimated relocation timeline?</label><select value={movingTimeline} onChange={(e) => setMovingTimeline(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-5 py-4 text-white text-sm outline-none"><option>Within 1 month</option><option>Within 3 months</option><option>3 to 6 months</option><option>Just exploring options</option></select></div>
            <div><label className="block text-sm font-bold text-emerald-400 uppercase tracking-wider mb-3">3. Property type requirement?</label><select value={propertyType} onChange={(e) => setPropertyType(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-5 py-4 text-white text-sm outline-none"><option>Flatshare / Room</option><option>1-Bed Private Flat</option><option>2-Bed Flat</option><option>House</option></select></div>
            <div><label className="block text-sm font-bold text-emerald-400 uppercase tracking-wider mb-3">4. Target monthly rent budget?</label><select value={housingBudget} onChange={(e) => setHousingBudget(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-5 py-4 text-white text-sm outline-none"><option>Under £1,200</option><option>£1,200 - £1,500</option><option>£1,500 - £2,000</option><option>£2,000 - £2,500</option><option>£2,500+</option></select></div>
            <div><label className="block text-sm font-bold text-emerald-400 uppercase tracking-wider mb-3">5. Maximum acceptable commute?</label><select value={commuteTolerance} onChange={(e) => setCommuteTolerance(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-5 py-4 text-white text-sm outline-none"><option>30 mins max</option><option>45 mins max</option><option>60 mins max</option><option>90+ mins (Hybrid/Rare commute)</option></select></div>
            <div><label className="block text-sm font-bold text-emerald-400 uppercase tracking-wider mb-3">6. #1 non-negotiable priority?</label><select value={primaryPriority} onChange={(e) => setPrimaryPriority(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-5 py-4 text-white text-sm outline-none"><option>Commute Time & Transport Links</option><option>Safety & Low Crime</option><option>Affordable Rent</option><option>Vibrant Nightlife</option><option>Parks & Green Space</option></select></div>
            <div><label className="block text-sm font-bold text-emerald-400 uppercase tracking-wider mb-3">7. Biggest London housing frustration?</label><select value={commutePainPoint} onChange={(e) => setCommutePainPoint(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-5 py-4 text-white text-sm outline-none"><option>High Transit Costs / Peak Fares</option><option>Misleading Neighborhood Safety</option><option>Rental Prices Exceeding Budget</option><option>Bidding wars / Low supply</option></select></div>
            
            <div>
              <label className="block text-sm font-bold text-emerald-400 uppercase tracking-wider mb-2">8. Which features should we build next?</label>
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
            <button type="submit" disabled={surveyStatus === 'submitting'} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl shadow-xl transition text-sm">{surveyStatus === 'submitting' ? 'Uploading Responses...' : 'Submit 2-Minute Survey'}</button>
          </form>
        ) : null}

        {/* STATE: COMPLETED */}
        {surveyStatus === 'completed' || surveyStatus === 'claiming' ? (
          <div className="bg-slate-900/80 border border-emerald-500/40 p-8 rounded-2xl text-center animate-fadeIn">
            <span className="text-5xl block mb-4">✅</span>
            <h3 className="text-2xl font-black text-white mb-2">Survey Complete!</h3>
            <p className="text-slate-300 text-sm mb-8">Thank you for your valuable feedback.</p>
            
            <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 text-left">
              <h4 className="text-white font-bold mb-4">Unlock Your Reward</h4>
              <label className="flex items-start gap-3 cursor-pointer p-4 bg-slate-900 rounded-lg border border-slate-700 hover:border-slate-500 transition mb-6">
                <input type="checkbox" checked={acceptedTandC} onChange={(e) => setAcceptedTandC(e.target.checked)} className="mt-1 accent-emerald-500 w-5 h-5" />
                <span className="text-sm text-slate-300 leading-relaxed">
                  <strong className="text-white">Terms & Conditions:</strong> I confirm that I currently do not have an active LinkedIn Premium subscription, and I have not used a free trial on my account in the recent past.
                </span>
              </label>
              <button onClick={handleClaimReward} disabled={!acceptedTandC || surveyStatus === 'claiming'} className={`w-full font-black py-4 px-8 rounded-xl text-sm transition shadow-xl ${acceptedTandC ? 'bg-[#0A66C2] hover:bg-[#004182] text-white' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}>
                {surveyStatus === 'claiming' ? 'Generating Link...' : 'Claim 2 Months LinkedIn Premium'}
              </button>
            </div>
          </div>
        ) : null}

        {/* STATE: CLAIMED */}
        {surveyStatus === 'claimed' && (
          <div className="bg-slate-900/80 border border-emerald-500/40 p-8 rounded-2xl text-center animate-fadeIn">
            <span className="text-5xl block mb-4">🎉</span>
            <h3 className="text-xl font-bold text-white mb-2">Your Trial is Ready!</h3>
            <p className="text-slate-400 text-sm mb-8">Click the link below to activate your premium features.</p>
            
            <div className="bg-slate-950 p-6 rounded-xl border border-slate-800">
              <span className="block text-xs text-slate-500 uppercase font-bold mb-3">Your Exclusive Activation Link</span>
              <a href={claimedReward} target="_blank" rel="noreferrer" className="inline-block bg-[#0A66C2] hover:bg-[#004182] text-white font-black py-4 px-8 rounded-xl text-sm transition shadow-xl border border-[#0A66C2]">
                🚀 Activate 2 Months Free on LinkedIn
              </a>
              <p className="text-[11px] text-slate-500 mt-4 font-mono break-all bg-slate-900 p-2 rounded">{claimedReward}</p>
            </div>
          </div>
        )}
      </div>

      <div className="w-full md:w-1/3">
        <div className="glass p-8 rounded-3xl shadow-2xl border border-emerald-900/30 sticky top-8">
          <h3 className="text-xl font-black text-emerald-400 mb-6 border-b border-emerald-900/50 pb-4">About the Developer</h3>
          <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-medium flex flex-col items-start">
            {renderAboutText(aboutText)}
          </div>
        </div>
      </div>
    </div>
  );
}