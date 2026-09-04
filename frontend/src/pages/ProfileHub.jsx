import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import AlertModal from '../components/AlertModal';

export default function ProfileHub({ session }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: '', message: '', type: 'success' });
  const showAlert = (title, message, type = 'success') => setAlertConfig({ isOpen: true, title, message, type });

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [age, setAge] = useState('');
  const [company, setCompany] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  const [savedItems, setSavedItems] = useState([]);
  const [expandedItemId, setExpandedItemId] = useState(null);

  const currentTab = location.pathname.split('/')[2] || 'basic';

  useEffect(() => {
    if (session?.user?.id) {
      loadUserProfile();
      loadSavedItems();
    }
  }, [session]);

  const loadUserProfile = async () => {
    try {
      const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (data) {
        setFirstName(data.first_name || ''); setLastName(data.last_name || '');
        setAge(data.age || ''); setCompany(data.company || ''); setAvatarUrl(data.avatar_url || '');
      }
    } catch (e) {} finally { setLoading(false); }
  };

  const loadSavedItems = async () => {
    try {
      const { data } = await supabase.from('saved_suggestions').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false });
      if (data) setSavedItems(data);
    } catch (e) {}
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from('profiles').upsert({ id: session.user.id, first_name: firstName, last_name: lastName, age: age ? Number(age) : null, company, avatar_url: avatarUrl, updated_at: new Date() });
      if (error) throw error;
      showAlert("Profile Updated", "Your profile details have been saved successfully.", "success");
    } catch (e) { showAlert("Update Failed", e.message, "error"); } finally { setLoading(false); }
  };

  const handleAvatarUpload = async (e) => {
    try {
      setUploading(true);
      if (!e.target.files || e.target.files.length === 0) return;
      const file = e.target.files[0];
      const filePath = `${session.user.id}/${Math.random()}.${file.name.split('.').pop()}`;
      const { error } = await supabase.storage.from('avatars').upload(filePath, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      setAvatarUrl(publicUrl);
      showAlert("Picture Uploaded", "Don't forget to click 'Save Profile Changes'.", "success");
    } catch (e) { showAlert("Upload Error", e.message, "error"); } finally { setUploading(false); }
  };

  const handleRemoveSaved = async (id) => {
    try {
      await supabase.from('saved_suggestions').delete().eq('id', id);
      setSavedItems(savedItems.filter(item => item.id !== id));
      showAlert("Removed", "Neighborhood removed.", "success");
    } catch (e) {}
  };

  const handleSignOut = async () => { await supabase.auth.signOut(); navigate('/'); };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-fadeIn">
      <AlertModal {...alertConfig} onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })} />
      <div className="glass rounded-3xl border border-slate-700/50 p-6 sm:p-8 shadow-2xl">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-800 mb-8">
          <div><h2 className="text-2xl sm:text-3xl font-black text-white">Account Profile</h2></div>
          <div className="flex flex-wrap gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 w-full md:w-auto">
            <Link to="/profile/basic" className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${currentTab === 'basic' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}>👤 Basic Details</Link>
            <Link to="/profile/saved" className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${currentTab === 'saved' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}>🔖 Saved ({savedItems.length})</Link>
            <Link to="/profile/signout" className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${currentTab === 'signout' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-red-400'}`}>🚪 Sign Out</Link>
          </div>
        </div>

        {currentTab === 'basic' && (
          <form onSubmit={handleProfileSave} className="space-y-6 max-w-2xl">
            <div className="flex items-center gap-6 bg-slate-950 p-5 rounded-2xl border border-slate-800">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-slate-800 border-2 border-emerald-500 overflow-hidden flex items-center justify-center relative shrink-0">
                {avatarUrl ? <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" /> : <span className="text-3xl">👤</span>}
              </div>
              <div>
                <label className="block text-xs font-bold text-white mb-1">Profile Picture</label>
                <input type="file" accept="image/*" onChange={handleAvatarUpload} disabled={uploading} className="text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 cursor-pointer" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div><label className="block text-xs font-bold text-slate-300 uppercase mb-2">First Name</label><input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm outline-none" /></div>
              <div><label className="block text-xs font-bold text-slate-300 uppercase mb-2">Last Name</label><input type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm outline-none" /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div><label className="block text-xs font-bold text-slate-300 uppercase mb-2">Age</label><input type="number" value={age} onChange={(e) => setAge(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm outline-none" /></div>
              <div><label className="block text-xs font-bold text-slate-300 uppercase mb-2">Company / Employer</label><input type="text" value={company} onChange={(e) => setCompany(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm outline-none" /></div>
            </div>
            <button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-6 rounded-xl text-xs transition shadow-lg">Save Profile Changes</button>
          </form>
        )}

        {currentTab === 'saved' && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white mb-4">Saved Locations ({savedItems.length})</h3>
            {savedItems.map((item) => {
              const isExpanded = expandedItemId === item.id;
              const details = item.details || {};
              return (
                <div key={item.id} className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden transition">
                  <div className="p-5 flex justify-between items-center cursor-pointer hover:bg-slate-900/50" onClick={() => setExpandedItemId(isExpanded ? null : item.id)}>
                    <div>
                      <h4 className="text-lg font-bold text-white">{item.neighborhood}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">Commute to: <strong className="text-slate-200">{item.destination}</strong> • {item.rent_range} • {item.commute_duration} Mins</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={(e) => { e.stopPropagation(); handleRemoveSaved(item.id); }} className="text-xs text-red-400 hover:bg-red-500/10 border border-red-500/30 px-3 py-1.5 rounded-lg transition">Delete</button>
                      <span className="text-emerald-400 font-bold text-xs">{isExpanded ? '▲ Hide' : '▼ View'}</span>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="p-5 border-t border-slate-800 bg-slate-900/40 text-xs space-y-4">
                      <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800">
                        <strong className="text-emerald-400 block mb-1">Did You Know?</strong>
                        <p className="text-slate-300">{details.Fun_Fact}</p>
                      </div>
                      <a href={`https://www.google.com/maps/dir/?api=1&origin=${details.Latitude},${details.Longitude}&destination=${encodeURIComponent(item.destination)}&travelmode=transit`} target="_blank" rel="noreferrer" className="inline-block bg-blue-600 text-white font-bold px-4 py-2 rounded-xl text-xs transition">View Maps Route ➔</a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {currentTab === 'signout' && (
          <div className="max-w-md py-8 text-center space-y-4">
            <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center mx-auto text-2xl">🚪</div>
            <h3 className="text-xl font-bold text-white">Sign Out of KeelEngine?</h3>
            <div className="pt-4 flex gap-3">
              <button onClick={handleSignOut} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3.5 rounded-xl text-xs transition">Confirm Sign Out</button>
              <button onClick={() => navigate('/profile/basic')} className="flex-1 bg-slate-800 text-slate-300 font-bold py-3.5 rounded-xl text-xs transition">Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}