import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import AlertModal from '../components/AlertModal';

export default function ProfileHub({ session }) {
  const location = useLocation();
  const navigate = useNavigate();

  let currentSub = 'basic';
  if (location.pathname.includes('/saved')) currentSub = 'saved';
  if (location.pathname.includes('/security')) currentSub = 'security';

  const [fullName, setFullName] = useState('');
  const [pronouns, setPronouns] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [dob, setDob] = useState('');
  const [company, setCompany] = useState('');
  const [area, setArea] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(null);
  
  const [savedProps, setSavedProps] = useState([]);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: '', message: '', type: 'success' });
  const showAlert = (title, message, type) => setAlertConfig({ isOpen: true, title, message, type });

  useEffect(() => {
    document.title = "KeelEngine | Profile Hub";
    async function loadProfileData() {
      if (!session?.user) return;
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (profile) {
        setFullName(profile.full_name || '');
        setPronouns(profile.pronouns || '');
        setContactNumber(profile.contact_number || '');
        setDob(profile.dob || '');
        setCompany(profile.company_name || '');
        setArea(profile.favorite_area || '');
        setAvatarUrl(profile.avatar_url || null);
      }
      const { data: props } = await supabase.from('saved_properties').select('*').eq('user_id', session.user.id);
      if (props) setSavedProps(props);
    }
    loadProfileData();
  }, [session]);

  const uploadAvatar = async (event) => {
    try {
      setUploadingAvatar(true);
      const file = event.target.files[0];
      const fileName = `${session.user.id}-${Math.random()}.${file.name.split('.').pop()}`;
      await supabase.storage.from('avatars').upload(fileName, file);
      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
      await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', session.user.id);
      setAvatarUrl(data.publicUrl);
    } catch (e) { showAlert('Error', e.message, 'error'); } finally { setUploadingAvatar(false); }
  };

  const saveBasicDetails = async () => {
    setLoading(true);
    const updates = { full_name: fullName, pronouns, contact_number: contactNumber, dob, company_name: company, favorite_area: area };
    const { error } = await supabase.from('profiles').update(updates).eq('id', session.user.id);
    setLoading(false);
    if (error) showAlert('Error', error.message, 'error'); else showAlert('Success', 'Your profile details have been saved!', 'success');
  };

  const removeProperty = async (id) => {
    try {
      await supabase.from('saved_properties').delete().eq('id', id);
      setSavedProps(prev => prev.filter(p => p.id !== id));
      showAlert('Removed', 'Neighborhood removed from your list.', 'success');
    } catch (e) {
      showAlert('Error', 'Could not remove property.', 'error');
    }
  };

  const updateSecurityPassword = async () => {
    if (!newPassword.trim()) return;
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (error) showAlert('Error', error.message, 'error');
    else { showAlert('Secured', 'Your password was updated successfully.', 'success'); setNewPassword(''); }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <AlertModal {...alertConfig} onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })} />
      <div className="glass p-10 rounded-3xl shadow-2xl border border-emerald-900/50">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-slate-700 pb-6 gap-6">
          <div className="flex items-center gap-6">
            <div className="relative group">
              <div className="w-20 h-20 rounded-full border-2 border-emerald-500 overflow-hidden bg-slate-800 flex items-center justify-center">
                {avatarUrl ? <img src={avatarUrl} className="w-full h-full object-cover" /> : <span className="text-3xl">👤</span>}
              </div>
              <label className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition">
                <span className="text-[10px] text-white font-bold uppercase">{uploadingAvatar ? '...' : 'Upload'}</span>
                <input type="file" accept="image/*" onChange={uploadAvatar} disabled={uploadingAvatar} className="hidden" />
              </label>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white tracking-tight">My Profile</h2>
              <p className="text-emerald-400 font-mono text-sm mt-1">{session?.user?.email}</p>
            </div>
          </div>
          <button onClick={() => supabase.auth.signOut()} className="bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/30 px-4 py-2 rounded-lg text-sm font-bold transition">Sign Out</button>
        </div>
        
        <div className="flex flex-wrap gap-4 mb-8">
          <button onClick={() => navigate('/profile/basic')} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${currentSub === 'basic' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-800 border border-slate-700 text-slate-400 hover:text-white'}`}>Basic Details</button>
          <button onClick={() => navigate('/profile/saved')} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${currentSub === 'saved' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-800 border border-slate-700 text-slate-400 hover:text-white'}`}>Saved Properties ({savedProps.length})</button>
          <button onClick={() => navigate('/profile/security')} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${currentSub === 'security' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-800 border border-slate-700 text-slate-400 hover:text-white'}`}>Security</button>
        </div>

        {currentSub === 'basic' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div><label className="block text-sm text-slate-300 mb-2">Full Name</label><input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500" /></div>
              <div><label className="block text-sm text-slate-300 mb-2">Pronouns</label><input type="text" value={pronouns} onChange={(e) => setPronouns(e.target.value)} placeholder="e.g. He/Him, They/Them" className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500" /></div>
              <div><label className="block text-sm text-slate-300 mb-2">Contact Number</label><input type="tel" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500" /></div>
              <div><label className="block text-sm text-slate-300 mb-2">Date of Birth</label><input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500" /></div>
            </div>
            <button onClick={saveBasicDetails} disabled={loading} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-3 rounded-xl transition">{loading ? 'Saving...' : 'Save Details'}</button>
          </div>
        )}

        {currentSub === 'saved' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savedProps.map((hub, idx) => (
              <div key={idx} className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800 flex justify-between items-center group relative">
                <div>
                  <h4 className="font-bold text-white text-lg">{hub.neighborhood}</h4>
                  <p className="text-xs text-emerald-400 mt-1">Cost: {hub.rent_range}</p>
                </div>
                <div className="flex items-center gap-4">
                  <strong className="text-emerald-400 text-xl font-black">{hub.suggestion_score}</strong>
                  <button onClick={() => removeProperty(hub.id)} className="bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white p-2 rounded-lg transition" title="Remove">🗑️</button>
                </div>
              </div>
            ))}
            {savedProps.length === 0 && <p className="text-slate-500 col-span-2 text-center py-10">No properties saved yet.</p>}
          </div>
        )}

        {currentSub === 'security' && (
          <div className="space-y-6">
            <div className="relative max-w-md">
              <label className="block text-sm text-slate-300 mb-2">New Password</label>
              <input type={showPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 pr-12 text-white outline-none" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-10 text-xl opacity-70 hover:opacity-100 transition">{showPassword ? "🙈" : "👁️"}</button>
            </div>
            <button onClick={updateSecurityPassword} disabled={loading} className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-xl transition">Update Password</button>
          </div>
        )}

      </div>
    </div>
  );
}