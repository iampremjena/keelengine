import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function ProfileHub({ session }) {
  const location = useLocation();
  const navigate = useNavigate();

  let currentSub = 'basic';
  if (location.pathname.includes('/saved')) currentSub = 'saved';
  if (location.pathname.includes('/security')) currentSub = 'security';

  useEffect(() => {
    document.title = "KeelEngine | Profile Hub";
  }, []);

  const [company, setCompany] = useState('');
  const [area, setArea] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [savedProps, setSavedProps] = useState([]);
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    async function loadProfileData() {
      if (!session?.user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_name, favorite_area, avatar_url')
        .eq('id', session.user.id)
        .single();
      
      if (profile) {
        setCompany(profile.company_name || '');
        setArea(profile.favorite_area || '');
        setAvatarUrl(profile.avatar_url || null);
      }

      const { data: props } = await supabase
        .from('saved_properties')
        .select('*')
        .eq('user_id', session.user.id);
      
      if (props) setSavedProps(props);
    }
    loadProfileData();
  }, [session]);

  const uploadAvatar = async (event) => {
    try {
      setUploadingAvatar(true);
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${session.user.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      // 1. Upload to Supabase Storage Bucket
      let { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const publicUrl = publicUrlData.publicUrl;

      // 3. Save URL to database
      let { error: updateError } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', session.user.id);
      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      alert('📸 Profile picture updated successfully!');
    } catch (error) {
      alert('Error uploading avatar: ' + error.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const saveBasicDetails = async () => {
    setLoading(true);
    const { error } = await supabase.from('profiles').update({ company_name: company, favorite_area: area }).eq('id', session.user.id);
    setLoading(false);
    if (error) alert(error.message);
    else alert('✅ Basic profile updates committed safely to Supabase!');
  };

  const updateSecurityPassword = async () => {
    if (!newPassword.trim()) return;
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (error) alert(error.message);
    else {
      alert('🔒 Access password updated safely across security clusters.');
      setNewPassword('');
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="glass p-10 rounded-3xl shadow-2xl border border-emerald-900/50">
        
        {/* Hub Title Header with Avatar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-slate-700 pb-6 gap-6">
          <div className="flex items-center gap-6">
            <div className="relative group">
              <div className="w-20 h-20 rounded-full border-2 border-emerald-500 overflow-hidden bg-slate-800 flex items-center justify-center">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl">👤</span>
                )}
              </div>
              <label className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition">
                <span className="text-[10px] text-white font-bold uppercase tracking-wider">{uploadingAvatar ? '...' : 'Upload'}</span>
                <input type="file" accept="image/*" onChange={uploadAvatar} disabled={uploadingAvatar} className="hidden" />
              </label>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white tracking-tight">My Profile Hub</h2>
              <p className="text-emerald-400 font-mono text-sm mt-1">{session?.user?.email}</p>
            </div>
          </div>
          <button onClick={handleSignOut} className="bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/30 px-4 py-2 rounded-lg text-sm font-bold transition">
            Sign Out
          </button>
        </div>
        
        {/* Navigation Selector Bars */}
        <div className="flex flex-wrap gap-4 mb-8">
          <button onClick={() => navigate('/profile/basic')} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${currentSub === 'basic' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-800 border border-slate-700 text-slate-400 hover:text-white'}`}>Basic Details</button>
          <button onClick={() => navigate('/profile/saved')} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${currentSub === 'saved' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-800 border border-slate-700 text-slate-400 hover:text-white'}`}>Saved Properties ({savedProps.length})</button>
          <button onClick={() => navigate('/profile/security')} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${currentSub === 'security' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-800 border border-slate-700 text-slate-400 hover:text-white'}`}>Security</button>
        </div>

        {/* SUBTABS */}
        {currentSub === 'basic' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Company Name</label>
                <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g. Goldman Sachs" className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500 transition" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Favorite Area in City</label>
                <input type="text" value={area} onChange={(e) => setArea(e.target.value)} placeholder="e.g. Islington" className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500 transition" />
              </div>
            </div>
            <button onClick={saveBasicDetails} disabled={loading} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-3 rounded-xl transition shadow-lg text-sm">{loading ? 'Saving Data...' : 'Save Profile Details'}</button>
          </div>
        )}

        {currentSub === 'saved' && (
          <div className="space-y-4">
            {savedProps.length === 0 ? (
              <div className="text-center py-10 bg-slate-900/30 rounded-2xl border border-slate-800"><p className="text-slate-400 text-sm">Your securely saved neighborhood recommendations will appear here.</p></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {savedProps.map((hub, idx) => (
                  <div key={idx} className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800 flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-white text-lg">{hub.neighborhood} <span className="text-xs text-slate-400 font-mono">({hub.outcode})</span></h4>
                      <p className="text-xs text-emerald-400 mt-1">Rent Benchmark: {hub.rent_range}</p>
                    </div>
                    <div className="bg-slate-950/60 border border-slate-700 rounded-lg px-3 py-1 text-center">
                      <span className="block text-[9px] text-slate-500 font-bold uppercase">Score</span>
                      <strong className="text-emerald-400 text-sm font-black">{hub.suggestion_score}</strong>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {currentSub === 'security' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Change Password</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password account vector..." className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white max-w-md outline-none focus:border-blue-500 transition" />
            </div>
            <button onClick={updateSecurityPassword} disabled={loading} className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-xl transition shadow-lg text-sm">{loading ? 'Updating Security...' : 'Update Password'}</button>
          </div>
        )}

      </div>
    </div>
  );
}