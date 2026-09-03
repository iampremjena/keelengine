import React, { useState, useEffect } from 'react';
import { useNavigate, Routes, Route, Link, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import AlertModal from '../components/AlertModal';

export default function ProfileHub({ session }) {
  const navigate = useNavigate();
  const location = useLocation();

  // ALERTS & LOADING
  const [loading, setLoading] = useState(true);
  const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: '', message: '', type: 'success' });
  const showAlert = (title, message, type = 'success') => setAlertConfig({ isOpen: true, title, message, type });

  // USER PROFILE STATES
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [age, setAge] = useState('');
  const [company, setCompany] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  // SAVED NEIGHBORHOODS STATE
  const [savedItems, setSavedItems] = useState([]);
  const [expandedItemId, setExpandedItemId] = useState(null);

  // SECURITY STATES
  const [step, setStep] = useState(1); // Step 1: Email verify request, Step 2: Code input & new pass
  const [verifyEmail, setVerifyEmail] = useState(session?.user?.email || '');
  const [verifyCode, setVerifyCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // ACTIVE TAB CALCULATOR
  const currentTab = location.pathname.split('/')[2] || 'basic';

  useEffect(() => {
    if (session?.user?.id) {
      loadUserProfile();
      loadSavedItems();
    }
  }, [session]);

  // LOAD PROFILE DATA
  const loadUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, age, company, avatar_url')
        .eq('id', session.user.id)
        .single();

      if (data) {
        setFirstName(data.first_name || '');
        setLastName(data.last_name || '');
        setAge(data.age || '');
        setCompany(data.company || '');
        setAvatarUrl(data.avatar_url || '');
      }
    } catch (e) {
      console.error("Error loading profile:", e);
    } finally {
      setLoading(false);
    }
  };

  // LOAD SAVED NEIGHBORHOODS
  const loadSavedItems = async () => {
    try {
      const { data, error } = await supabase
        .from('saved_suggestions')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (data) setSavedItems(data);
    } catch (e) {
      console.error("Error loading saved suggestions:", e);
    }
  };

  // SAVE BASIC PROFILE
  const handleProfileSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updates = {
        id: session.user.id,
        first_name: firstName,
        last_name: lastName,
        age: age ? Number(age) : null,
        company,
        avatar_url: avatarUrl,
        updated_at: new Date()
      };

      const { error } = await supabase.from('profiles').upsert(updates);
      if (error) throw error;
      showAlert("Profile Updated", "Your profile details have been saved successfully.", "success");
    } catch (e) {
      showAlert("Update Failed", e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // AVATAR UPLOAD HANDLER
  const handleAvatarUpload = async (e) => {
    try {
      setUploading(true);
      if (!e.target.files || e.target.files.length === 0) return;
      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${session.user.id}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      setAvatarUrl(publicUrl);
      showAlert("Picture Uploaded", "Don't forget to click 'Save Profile Changes' below.", "success");
    } catch (e) {
      showAlert("Upload Error", e.message, "error");
    } finally {
      setUploading(false);
    }
  };

  // DELETE SAVED NEIGHBORHOOD
  const handleRemoveSaved = async (id) => {
    try {
      const { error } = await supabase.from('saved_suggestions').delete().eq('id', id);
      if (error) throw error;
      setSavedItems(savedItems.filter(item => item.id !== id));
      showAlert("Removed", "Neighborhood removed from saved items.", "success");
    } catch (e) {
      showAlert("Error", "Could not remove item.", "error");
    }
  };

  // PASSWORD RESET STEP 1: REQUEST OTP
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (verifyEmail.toLowerCase() !== session.user.email.toLowerCase()) {
      return showAlert("Email Mismatch", "Please enter the registered login email address for this account.", "error");
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(verifyEmail);
      if (error) throw error;
      setStep(2);
      showAlert("Code Sent", "A verification code/link has been sent to your email address.", "success");
    } catch (e) {
      showAlert("Error", e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // PASSWORD RESET STEP 2: VERIFY CODE & UPDATE PASSWORD
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: verifyEmail,
        token: verifyCode,
        type: 'recovery'
      });
      
      if (verifyError) throw verifyError;

      const { error: passError } = await supabase.auth.updateUser({ password: newPassword });
      if (passError) throw passError;

      showAlert("Password Reset Complete", "Your password has been changed successfully.", "success");
      setStep(1);
      setVerifyCode('');
      setNewPassword('');
    } catch (e) {
      showAlert("Verification Failed", e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // SIGN OUT HANDLER
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-fadeIn">
      <AlertModal {...alertConfig} onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })} />

      <div className="glass rounded-3xl border border-slate-700/50 p-6 sm:p-8 shadow-2xl">
        
        {/* PROFILE NAVIGATION HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-800 mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-white">Account Profile</h2>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">Manage your account settings, saved relocation areas, and security credentials.</p>
          </div>

          {/* TAB BUTTONS */}
          <div className="flex flex-wrap gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 w-full md:w-auto">
            <Link to="/profile/basic" className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${currentTab === 'basic' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}>👤 Basic Details</Link>
            <Link to="/profile/saved" className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${currentTab === 'saved' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}>🔖 Saved ({savedItems.length})</Link>
            <Link to="/profile/security" className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${currentTab === 'security' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}>🔒 Security</Link>
            <Link to="/profile/signout" className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${currentTab === 'signout' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-red-400'}`}>🚪 Sign Out</Link>
          </div>
        </div>

        {/* TAB 1: BASIC DETAILS */}
        {currentTab === 'basic' && (
          <form onSubmit={handleProfileSave} className="space-y-6 max-w-2xl">
            {/* AVATAR SECTION */}
            <div className="flex items-center gap-6 bg-slate-950 p-5 rounded-2xl border border-slate-800">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-slate-800 border-2 border-emerald-500 overflow-hidden flex items-center justify-center relative shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl">👤</span>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-white mb-1">Profile Picture</label>
                <p className="text-[11px] text-slate-400 mb-3">Upload a PNG or JPG file (max 2MB).</p>
                <input type="file" accept="image/*" onChange={handleAvatarUpload} disabled={uploading} className="text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 cursor-pointer" />
              </div>
            </div>

            {/* FORM INPUTS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-2">First Name</label>
                <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="John" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Last Name</label>
                <input type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Doe" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-emerald-500" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Age</label>
                <input type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="28" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Company / Employer</label>
                <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Google UK" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-emerald-500" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Email Address (Read-Only)</label>
              <input type="email" disabled value={session?.user?.email || ''} className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 text-slate-400 text-sm outline-none cursor-not-allowed" />
            </div>

            <button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-6 rounded-xl text-xs transition shadow-lg">Save Profile Changes</button>
          </form>
        )}

        {/* TAB 2: SAVED NEIGHBORHOODS */}
        {currentTab === 'saved' && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white mb-4">Saved Locations ({savedItems.length})</h3>
            
            {savedItems.length === 0 ? (
              <div className="text-center py-12 bg-slate-950/50 rounded-2xl border border-slate-800">
                <p className="text-slate-400 text-sm mb-3">You haven't saved any neighborhood suggestions yet.</p>
                <button onClick={() => navigate('/home')} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-5 rounded-xl text-xs transition">Search Dashboard ➔</button>
              </div>
            ) : (
              savedItems.map((item) => {
                const isExpanded = expandedItemId === item.id;
                const details = item.details || {};

                return (
                  <div key={item.id} className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden transition">
                    <div className="p-5 flex justify-between items-center cursor-pointer hover:bg-slate-900/50 transition" onClick={() => setExpandedItemId(isExpanded ? null : item.id)}>
                      <div>
                        <h4 className="text-lg font-bold text-white">{item.neighborhood}</h4>
                        <p className="text-xs text-slate-400 mt-0.5">Commute to: <strong className="text-slate-200">{item.destination}</strong> • {item.rent_range} • {item.commute_duration} Mins</p>
                      </div>

                      <div className="flex items-center gap-3">
                        <button onClick={(e) => { e.stopPropagation(); handleRemoveSaved(item.id); }} className="text-xs text-red-400 hover:bg-red-500/10 border border-red-500/30 px-3 py-1.5 rounded-lg transition">Delete</button>
                        <span className="text-emerald-400 font-bold text-xs">{isExpanded ? '▲ Hide' : '▼ View Details'}</span>
                      </div>
                    </div>

                    {/* EXPANDED DETAILS CARD */}
                    {isExpanded && (
                      <div className="p-5 border-t border-slate-800 bg-slate-900/40 text-xs space-y-4 animate-fadeIn">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800">
                            <strong className="text-blue-400 block mb-1">🎭 Vibe & Community:</strong>
                            <span className="text-slate-300">{details.Vibe || 'Vibrant residential area.'}</span>
                          </div>
                          <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800">
                            <strong className="text-emerald-400 block mb-1">📍 Famous Spots:</strong>
                            <span className="text-slate-300">{details.Famous_Spots || 'Local cafes and markets.'}</span>
                          </div>
                        </div>

                        <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800">
                          <strong className="text-emerald-400 block mb-1">Clyde's Verdict:</strong>
                          <p className="text-slate-300">{details.AI_Verdict}</p>
                        </div>

                        <a href={`https://www.google.com/maps/dir/?api=1&origin=${details.Latitude},${details.Longitude}&destination=${encodeURIComponent(item.destination)}&travelmode=transit`} target="_blank" rel="noreferrer" className="inline-block bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition">View Maps Route ➔</a>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 3: SECURITY */}
        {currentTab === 'security' && (
          <div className="max-w-xl space-y-6">
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800">
              <h3 className="text-base font-bold text-white mb-1">Change Account Password</h3>
              <p className="text-xs text-slate-400 mb-6">Enter your account email below to request a password reset verification code.</p>

              {step === 1 ? (
                <form onSubmit={handleRequestOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Registered Login Email</label>
                    <input type="email" required value={verifyEmail} onChange={(e) => setVerifyEmail(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-emerald-500" />
                  </div>
                  <button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl text-xs transition">Send Verification Code ➔</button>
                </form>
              ) : (
                <form onSubmit={handleUpdatePassword} className="space-y-4 animate-fadeIn">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Verification Code / OTP</label>
                    <input type="text" required value={verifyCode} onChange={(e) => setVerifyCode(e.target.value)} placeholder="Paste verification code from email" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-emerald-500 font-mono" />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-2">New Password</label>
                    <input type="password" required minLength={6} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-emerald-500" />
                  </div>

                  <div className="flex gap-3">
                    <button type="submit" disabled={loading} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl text-xs transition">Update Password</button>
                    <button type="button" onClick={() => setStep(1)} className="bg-slate-800 text-slate-300 font-bold px-4 rounded-xl text-xs">Cancel</button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: SIGN OUT */}
        {currentTab === 'signout' && (
          <div className="max-w-md py-8 text-center space-y-4">
            <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center mx-auto text-2xl">🚪</div>
            <h3 className="text-xl font-bold text-white">Sign Out of KeelEngine?</h3>
            <p className="text-xs text-slate-400 leading-relaxed">You will need to enter your email and password again next time you access your saved relocation recommendations.</p>
            <div className="pt-4 flex gap-3">
              <button onClick={handleSignOut} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3.5 rounded-xl text-xs transition shadow-lg">Confirm Sign Out</button>
              <button onClick={() => navigate('/profile/basic')} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3.5 rounded-xl text-xs transition">Cancel</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}