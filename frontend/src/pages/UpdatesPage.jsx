import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function UpdatesPage({ session }) {
  const [posts, setPosts] = useState([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  // Check if current user is the Admin
  const isAdmin = session?.user?.email === 'iampremjena@gmail.com';

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    const { data } = await supabase.from('forum_updates').select('*').order('created_at', { ascending: false });
    if (data) setPosts(data);
  };

  const handlePost = async (e) => {
    e.preventDefault();
    if (!title || !content) return;
    setLoading(true);

    const { error } = await supabase.from('forum_updates').insert([{
      title, content, author_email: session.user.email
    }]);

    setLoading(false);
    if (!error) {
      setTitle(''); setContent('');
      fetchPosts(); // Refresh the feed
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="glass p-10 rounded-3xl shadow-2xl border border-slate-700/40">
        <h2 className="text-3xl font-black text-white mb-2 tracking-tight">Platform Updates</h2>
        <p className="text-slate-400 text-sm mb-10 border-b border-slate-700/50 pb-5">
          The latest features, data drops, and engineering updates from the KeelEngine team.
        </p>

        {/* ADMIN ONLY: Create Post Box */}
        {isAdmin && (
          <form onSubmit={handlePost} className="mb-12 bg-slate-900/50 p-6 rounded-2xl border border-emerald-500/30">
            <h3 className="text-emerald-400 font-bold mb-4 text-sm uppercase tracking-wider">Admin Dashboard: Write Update</h3>
            <input type="text" placeholder="Update Title..." value={title} onChange={(e)=>setTitle(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500 mb-4" />
            <textarea placeholder="Write the update details here..." rows="4" value={content} onChange={(e)=>setContent(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500 mb-4"></textarea>
            <button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-xl transition shadow-lg">{loading ? 'Posting...' : 'Publish to Global Feed'}</button>
          </form>
        )}

        {/* GLOBAL FEED */}
        <div className="space-y-6">
          {posts.length === 0 ? (
            <p className="text-slate-500 italic text-center py-10">No updates posted yet.</p>
          ) : (
            posts.map(post => (
              <div key={post.id} className="bg-slate-950/40 p-6 rounded-2xl border border-slate-800 hover:border-slate-600 transition">
                <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest">{new Date(post.created_at).toLocaleDateString()}</span>
                <h3 className="text-xl font-bold text-white mt-1 mb-3">{post.title}</h3>
                <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}