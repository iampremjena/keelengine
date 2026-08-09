import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import AlertModal from '../components/AlertModal';

// 🔗 YOUR 5 HARDCODED LINKEDIN REFERRAL LINKS
const PROMO_LINK_POOL = [
  "http://www.linkedin.com/premium/redeem/?upsellOrderOrigin=premium_referrals_homepage_identity_1_sided_entry&coupon=xKAEbVjyf&customKey=ref_c&redeemTypeV2=REFERRAL_COUPON",
  "http://www.linkedin.com/premium/redeem/?upsellOrderOrigin=premium_referrals_homepage_identity_1_sided_entry&coupon=xFS-2ZQHT&customKey=ref_c&redeemTypeV2=REFERRAL_COUPON",
  "http://www.linkedin.com/premium/redeem/?upsellOrderOrigin=premium_referrals_homepage_identity_1_sided_entry&coupon=xaMWed5hk&customKey=ref_c&redeemTypeV2=REFERRAL_COUPON",
  "http://www.linkedin.com/premium/redeem/?upsellOrderOrigin=premium_referrals_homepage_identity_1_sided_entry&coupon=xZkBxVRRi&customKey=ref_c&redeemTypeV2=REFERRAL_COUPON",
  "http://www.linkedin.com/premium/redeem/?upsellOrderOrigin=premium_referrals_homepage_identity_1_sided_entry&coupon=xwiuvFpVJ&customKey=ref_c&redeemTypeV2=REFERRAL_COUPON"
];

export default function SurveyPage({ session }) {
  useEffect(() => { document.title = "KeelEngine | Research Survey"; }, []);

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

  // Claim & Display States
  const [surveyStatus, setSurveyStatus] = useState('idle'); // idle | completed | claimed
  const [claimedReward, setClaimedReward] = useState('');
  const [acceptedTandC, setAcceptedTandC] = useState(false);
  const [copied, setCopied] = useState(false);

  // Developer Bio Text State
  const defaultAbout = `🚀 Prem Jena | Lead Architect & Founder\n\nAs a Data Engineer and Full-Stack Architect, I built KeelEngine to solve a fundamental problem: the London housing market is opaque and mathematically exhausting to navigate.\n\nhttps://linkedin.com/in/iampremjena`;
  const [aboutText] = useState(defaultAbout);

  const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: '', message: '', type: 'success' });
  const showAlert = (title, message, type) => setAlertConfig({ isOpen: true, title, message, type });

  const FEATURE_CHIPS = [
    "School Zoning & Ratings", "Borough Council Tax Comparison", "Distance to Gyms & Parks", 
    "Night Tube Line Access", "Broadband & Fiber Speed Filters", "CSV Export for Saved Properties",
    "Pet-Friendly Rental Filters", "Crime Heatmaps"
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

    try {
      const fullFeedback = `[BOROUGH]: ${currentBorough}\n[TIMELINE]: ${movingTimeline}\n[PROPERTY]: ${propertyType}\n[BUDGET]: ${housingBudget}\n[COMMUTE TOLERANCE]: ${commuteTolerance}\n[PRIORITY]: ${primaryPriority}\n[PAIN POINT]: ${commutePainPoint}\n[WORK MODEL]: ${workModel}\n[FEATURES]: ${desiredFeatures.join(', ')}`;
      const userEmail = session?.user?.email || 'Anonymous Guest';
      await supabase.from('user_feedback').insert([{ email: userEmail, feedback_text: fullFeedback }]);
    } catch (err) {
      console.log("Feedback save note:", err);
    }

    setSurveyStatus('completed');
  };

  const handleClaimReward = () => {
    if (!acceptedTandC) return showAlert("Action Required", "You must accept the Terms & Conditions to unlock the link.", "error");

    // Track distributed link index in localStorage to ensure unique link distribution
    const claimedIndices = JSON.parse(localStorage.getItem('keel_claimed_links') || '[]');
    let availableIndex = PROMO_LINK_POOL.findIndex((_, idx) => !claimedIndices.includes(idx));

    if (availableIndex === -1) {
      availableIndex = Math.floor(Math.random() * PROMO_LINK_POOL.length);
    } else {
      claimedIndices.push(availableIndex);
      localStorage.setItem('keel_claimed_links', JSON.stringify(claimedIndices));
    }

    const selectedLink = PROMO_LINK_POOL[availableIndex];
    setClaimedReward(selectedLink);
    setSurveyStatus('claimed');
    showAlert("🎉 Reward Unlocked!", "Your 2-Month LinkedIn Premium referral link is ready below!", "success");
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(claimedReward);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const renderAboutText = (text) => {
    if (!text) return null;
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

        {/* STATE 1: SURVEY FORM */}
        {surveyStatus === 'idle' && (
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
              <label className="block text-sm font-bold text-emerald-400 uppercase tracking-wider mb-2">9. Which features should we build next?</label>
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

            <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-xl transition text-sm">Submit 2-Minute Survey</button>
          </form>
        )}

        {/* STATE 2: T&C ACCEPTANCE */}
        {surveyStatus === 'completed' && (
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
              <button onClick={handleClaimReward} disabled={!acceptedTandC} className={`w-full font-black py-4 px-8 rounded-xl text-sm transition shadow-xl ${acceptedTandC ? 'bg-[#0A66C2] hover:bg-[#004182] text-white' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}>
                Unlock 2 Months LinkedIn Premium
              </button>
            </div>
          </div>
        )}

        {/* STATE 3: REFERRAL LINK DISPLAY */}
        {surveyStatus === 'claimed' && (
          <div className="bg-slate-900/80 border border-emerald-500/40 p-8 rounded-2xl text-center animate-fadeIn">
            <span className="text-5xl block mb-4">🎉</span>
            <h3 className="text-2xl font-black text-white mb-2">Your Referral Link is Ready!</h3>
            <p className="text-slate-400 text-sm mb-8">Copy the link below or click the button to open LinkedIn directly.</p>
            
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 text-left">
              <span className="block text-xs text-emerald-400 uppercase font-bold mb-2">Exclusive Referral URL</span>
              
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <input type="text" readOnly value={claimedReward} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-300 font-mono text-xs outline-none" />
                <button onClick={copyToClipboard} className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-6 rounded-xl text-xs transition border border-slate-600 shadow-md whitespace-nowrap">
                  {copied ? '✓ Copied!' : '📋 Copy Link'}
                </button>
              </div>

              <a href={claimedReward} target="_blank" rel="noreferrer" className="block text-center bg-[#0A66C2] hover:bg-[#004182] text-white font-black py-4 px-8 rounded-xl text-sm transition shadow-xl border border-[#0A66C2]">
                🚀 Open Link & Activate Trial on LinkedIn
              </a>
            </div>
          </div>
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