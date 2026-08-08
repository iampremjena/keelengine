import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import AlertModal from '../components/AlertModal';

export default function SurveyPage({ session, isAdmin }) {
  useEffect(() => { document.title = "KeelEngine | Platform Survey"; }, []);

  // Form Option States
  const [movingTimeline, setMovingTimeline] = useState('Within 3 months');
  const [primaryPriority, setPrimaryPriority] = useState('Commute Time & Transport Links');
  const [housingBudget, setHousingBudget] = useState('£1,500 - £2,000 / month');
  const [commutePainPoint, setCommutePainPoint] = useState('High Transit Costs / Peak Fares');
  const [desiredFeatures, setDesiredFeatures] = useState([]);

  const [submitting, setSubmitting] = useState(false);
  const [claimedReward, setClaimedReward] = useState('');
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);

  const defaultAbout = `🚀 Prem Jena | Lead Architect & Founder\n\nAs a Data Engineer and Full-Stack Architect, I built KeelEngine to solve a fundamental problem: the London housing market is opaque and mathematically exhausting to navigate.\n\nhttps://linkedin.com/in/iampremjena`;
  const [aboutText, setAboutText] = useState(defaultAbout);

  const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: '', message: '', type: 'success' });
  const showAlert = (title, message, type) => setAlertConfig({ isOpen: true, title, message, type });

  // Preset Options Matrix
  const TIMELINE_OPTIONS = [
    "Moving within 1 month",
    "Within 3 months",
    "3 to 6 months",
    "6+ months out",
    "Just exploring out of curiosity"
  ];

  const PRIORITY_OPTIONS = [
    "Commute Time & Transport Links",
    "Safety & Low Neighborhood Crime",
    "Affordable Rent & Value for Money",
    "Vibrant Nightlife, Restaurants & Pubs",
    "Parks, Green Space & Family Quiet"
  ];

  const BUDGET_OPTIONS = [
    "Under £1,200 / month",
    "£1,200 - £1,500 / month",
    "£1,500 - £2,000 / month",
    "£2,000 - £2,500 / month",
    "£2,500+ / month"
  ];

  const PAIN_POINT_OPTIONS = [
    "High Transit Costs / Peak Fares",
    "Too Many Line Changes / Complex Commutes",
    "Misleading Neighborhood Safety Ratings",
    "Rental Prices Exceeding Budget",
    "Lack of Clear Local Amenity Info"
  ];

  const FEATURE_CHIPS = [
    "School Zoning & Ratings",
    "Borough Council Tax Comparison",
    "Distance to Gyms & Parks",
    "Night Tube Line Access",
    "Broadband & Fiber Speed Filters",
    "CSV Export for Saved Properties"
  ];

  useEffect(() => {
    checkCompletionAndReward();
  }, [session]);

  const checkCompletionAndReward = async () => {
    if (!session) return;
    const { data } = await supabase.from('profiles').select('survey_completed, linkedin_reward_link').eq('id', session.user.id).single();
    if (data && data.survey_completed) {
      setAlreadyCompleted(true);
      if (data.linkedin_reward_link) setClaimedReward(data.linkedin_reward_link);
    }
  };

  const toggleFeatureChip = (feature) => {
    if (desiredFeatures.includes(feature)) {
      setDesiredFeatures(desiredFeatures.filter(f => f !== feature));
    } else {
      setDesiredFeatures([...desiredFeatures, feature]);
    }
  };

  const handleStructuredSurveySubmit = async (e) => {
    e.preventDefault();
    if (!session) return showAlert("Sign In Required", "Please log in to submit your survey choices and claim your reward.", "error");

    if (desiredFeatures.length === 0) {
      return showAlert("Selection Required", "Please select at least one feature you would like to see added to KeelEngine in Question 5.", "error");
    }

    setSubmitting(true);
    try {
      // 1. Format choices into clean structured telemetry text
      const fullFeedback = `[TIMELINE]: ${movingTimeline}
[PRIMARY PRIORITY]: ${primaryPriority}
[MONTHLY BUDGET]: ${housingBudget}
[COMMUTE PAIN POINT]: ${commutePainPoint}
[REQUESTED FEATURES]: ${desiredFeatures.join(', ')}`;

      await supabase.from('user_feedback').insert([{ 
        email: session.user.email, 
        feedback_text: fullFeedback 
      }]);

      // 2. Dispense Promo Link
      const { data: availableLinks } = await supabase
        .from('linkedin_rewards')
        .select('*')
        .eq('is_used', false)
        .limit(1);

      if (!availableLinks || availableLinks.length === 0) {
        await supabase.from('profiles').update({ survey_completed: true }).eq('id', session.user.id);
        setAlreadyCompleted(true);
        showAlert("Survey Saved!", "Thank you for completing the survey! Our promo code pool is currently being refilled. An admin will email your code shortly.", "success");
        return;
      }

      const selectedReward = availableLinks[0];

      await supabase.from('linkedin_rewards').update({
        is_used: true,
        assigned_to_user_id: session.user.id,
        claimed_at: new Date().toISOString()
      }).eq('id', selectedReward.id);

      await supabase.from('profiles').update({
        survey_completed: true,
        linkedin_reward_link: selectedReward.promo_link
      }).eq('id', session.user.id);

      setClaimedReward(selectedReward.promo_link);
      setAlreadyCompleted(true);
      showAlert("🎉 Reward Unlocked!", "Your 2-Month LinkedIn Premium trial link is ready!", "success");

    } catch (err) {
      showAlert("Error", err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const renderAboutText = (text) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.split(urlRegex).map((part, i) => {
      if (part.match(urlRegex) && part.includes('linkedin.com')) {
        return (
          <a key={i} href={part} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 mt-4 bg-[#0A66C2] hover:bg-[#004182] text-white font-bold py-3 px-6 rounded-xl text-sm transition shadow-lg border border-[#0A66C2]">
            🔗 Connect on LinkedIn
          </a>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 flex flex-col md:flex-row gap-8">
      <AlertModal {...alertConfig} onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })} />

      {/* MAIN SURVEY CONTAINER */}
      <div className="w-full md:w-2/3 glass p-8 md:p-10 rounded-3xl shadow-2xl border border-slate-700/40">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-800">
          <div>
            <h2 className="text-3xl font-black text-white tracking-tight">Relocation Preferences Survey</h2>
            <p className="text-slate-400 text-sm mt-1">Select your preferences below to help optimize future KeelEngine datasets.</p>
          </div>
          <div className="self-start sm:self-auto bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-2">
            <span>🎁 Reward:</span> 2 Months LinkedIn Premium
          </div>
        </div>

        {alreadyCompleted ? (
          <div className="bg-slate-900/80 border border-emerald-500/40 p-8 rounded-2xl text-center animate-fadeIn my-6">
            <span className="text-4xl block mb-3">🎉</span>
            <h3 className="text-xl font-bold text-white mb-2">Thank You for Participating!</h3>
            <p className="text-slate-400 text-sm mb-6">Your selected criteria have been saved to our research matrix.</p>
            
            {claimedReward ? (
              <div className="bg-slate-950 p-6 rounded-xl border border-slate-800">
                <span className="block text-xs text-slate-500 uppercase font-bold mb-2">Your Exclusive Trial Link</span>
                <a href={claimedReward} target="_blank" rel="noreferrer" className="inline-block bg-[#0A66C2] hover:bg-[#004182] text-white font-black py-4 px-8 rounded-xl text-sm transition shadow-xl border border-[#0A66C2]">
                  🚀 Claim 2 Months Free LinkedIn Premium
                </a>
                <p className="text-[11px] text-slate-500 mt-3 font-mono break-all">{claimedReward}</p>
              </div>
            ) : (
              <p className="text-amber-400 text-xs font-mono">Your submission was logged. Our team will verify and dispatch your promo link shortly.</p>
            )}
          </div>
        ) : (
          <form onSubmit={handleStructuredSurveySubmit} className="space-y-8 text-left">
            
            {/* QUESTION 1 */}
            <div>
              <label className="block text-sm font-bold text-emerald-400 uppercase tracking-wider mb-3">
                1. What is your estimated relocation timeline?
              </label>
              <div className="grid grid-cols-1 gap-2">
                {TIMELINE_OPTIONS.map((opt, idx) => (
                  <label key={idx} className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition ${movingTimeline === opt ? 'bg-emerald-950/40 border-emerald-500 text-white' : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:border-slate-700'}`}>
                    <input type="radio" name="timeline" value={opt} checked={movingTimeline === opt} onChange={(e) => setMovingTimeline(e.target.value)} className="accent-emerald-500 w-4 h-4" />
                    <span className="text-sm font-medium">{opt}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* QUESTION 2 */}
            <div>
              <label className="block text-sm font-bold text-emerald-400 uppercase tracking-wider mb-3">
                2. What is your #1 non-negotiable search priority?
              </label>
              <div className="grid grid-cols-1 gap-2">
                {PRIORITY_OPTIONS.map((opt, idx) => (
                  <label key={idx} className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition ${primaryPriority === opt ? 'bg-emerald-950/40 border-emerald-500 text-white' : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:border-slate-700'}`}>
                    <input type="radio" name="priority" value={opt} checked={primaryPriority === opt} onChange={(e) => setPrimaryPriority(e.target.value)} className="accent-emerald-500 w-4 h-4" />
                    <span className="text-sm font-medium">{opt}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* QUESTION 3 */}
            <div>
              <label className="block text-sm font-bold text-emerald-400 uppercase tracking-wider mb-3">
                3. What is your target monthly rent allowance?
              </label>
              <select value={housingBudget} onChange={(e) => setHousingBudget(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-5 py-4 text-white text-sm outline-none focus:border-emerald-500 font-medium">
                {BUDGET_OPTIONS.map((opt, idx) => (
                  <option key={idx} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            {/* QUESTION 4 */}
            <div>
              <label className="block text-sm font-bold text-emerald-400 uppercase tracking-wider mb-3">
                4. What is your biggest challenge when searching in London?
              </label>
              <div className="grid grid-cols-1 gap-2">
                {PAIN_POINT_OPTIONS.map((opt, idx) => (
                  <label key={idx} className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition ${commutePainPoint === opt ? 'bg-emerald-950/40 border-emerald-500 text-white' : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:border-slate-700'}`}>
                    <input type="radio" name="painpoint" value={opt} checked={commutePainPoint === opt} onChange={(e) => setCommutePainPoint(e.target.value)} className="accent-emerald-500 w-4 h-4" />
                    <span className="text-sm font-medium">{opt}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* QUESTION 5: MULTI-SELECT CHIPS */}
            <div>
              <label className="block text-sm font-bold text-emerald-400 uppercase tracking-wider mb-2">
                5. Which features should we build next? (Select all that apply)
              </label>
              <p className="text-xs text-slate-400 mb-4">Click to select one or multiple items:</p>
              <div className="flex flex-wrap gap-3">
                {FEATURE_CHIPS.map((chip, idx) => {
                  const isSelected = desiredFeatures.includes(chip);
                  return (
                    <button type="button" key={idx} onClick={() => toggleFeatureChip(chip)} className={`px-4 py-3 rounded-xl text-xs font-bold transition border ${isSelected ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg' : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:border-slate-500'}`}>
                      {isSelected ? '✓ ' : '+ '} {chip}
                    </button>
                  );
                })}
              </div>
            </div>

            <button type="submit" disabled={submitting} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl shadow-xl transition tracking-wide text-sm">
              {submitting ? 'Recording Responses & Claiming Reward...' : 'Submit Survey & Claim 2 Months Free LinkedIn Premium'}
            </button>
          </form>
        )}
      </div>

      {/* ABOUT DEVELOPER SIDEBAR */}
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