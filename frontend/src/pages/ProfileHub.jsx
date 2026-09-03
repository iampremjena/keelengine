import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export default function ProfileSavedSuggestions({ session }) {
  const [savedItems, setSavedItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user?.id) {
      loadSavedItems();
    }
  }, [session]);

  const loadSavedItems = async () => {
    try {
      const { data, error } = await supabase
        .from('saved_suggestions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedItems(data || []);
    } catch (err) {
      console.error("Error loading saved items:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (id) => {
    try {
      const { error } = await supabase
        .from('saved_suggestions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setSavedItems(savedItems.filter(item => item.id !== id));
    } catch (err) {
      alert("Could not remove item");
    }
  };

  if (loading) return <div className="p-4 text-slate-400">Loading saved items...</div>;

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-white">Your Saved Neighborhoods</h3>
      {savedItems.length === 0 ? (
        <p className="text-slate-400 text-sm">No saved neighborhoods yet.</p>
      ) : (
        savedItems.map((item) => (
          <div key={item.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex justify-between items-center">
            <div>
              <h4 className="text-lg font-bold text-white">{item.neighborhood}</h4>
              <p className="text-xs text-slate-400">Target: {item.destination} • {item.rent_range} • {item.commute_duration} Mins</p>
            </div>
            <button 
              onClick={() => handleRemove(item.id)}
              className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-lg font-bold"
            >
              Remove
            </button>
          </div>
        ))
      )}
    </div>
  );
}