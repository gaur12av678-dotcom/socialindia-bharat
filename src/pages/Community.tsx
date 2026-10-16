import React, { useState, useEffect } from 'react';
import { CommunityPost } from '../types';
import { postService } from '../services/postService';
import { PostCard } from '../components/community/PostCard';
import { CreatePostBox } from '../components/community/CreatePostBox';
import { useTranslation } from '../i18n';
import { MessageSquare, Flame, Sparkles, Image as ImageIcon, BarChart2, Loader2, RefreshCw } from 'lucide-react';

export const CommunityPage: React.FC = () => {
  const { isHindi } = useTranslation();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'image' | 'poll'>('all');

  const loadPosts = async () => {
    setLoading(true);
    try {
      const data = await postService.getPosts();
      setPosts(data);
    } catch (err) {
      console.error('Failed to load community posts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const filteredPosts = posts.filter(p => {
    if (filterType === 'all') return true;
    return p.postType === filterType;
  });

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
      
      {/* Top Title Banner */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {isHindi ? 'कम्युनिटी पोस्ट फ़ीड' : 'Community Posts'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isHindi ? 'क्रिएटर्स के लाइव पोल, फ़ोटो और ताज़ा अपडेट्स' : 'Live polls, photos, and updates from creators across SocialIndia'}
            </p>
          </div>
        </div>

        <button
          onClick={loadPosts}
          disabled={loading}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 transition-colors cursor-pointer"
          title="Refresh Feed"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
        </button>
      </div>

      {/* 1. Create Community Post Box at top */}
      <CreatePostBox onPostCreated={loadPosts} />

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setFilterType('all')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
            filterType === 'all'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          {isHindi ? 'सभी पोस्ट' : 'All Posts'}
        </button>

        <button
          onClick={() => setFilterType('poll')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
            filterType === 'poll'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          <BarChart2 className="w-3.5 h-3.5" />
          <span>{isHindi ? 'लाइव पोल' : 'Polls'}</span>
        </button>

        <button
          onClick={() => setFilterType('image')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
            filterType === 'image'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>{isHindi ? 'फ़ोटो पोस्ट' : 'Photos'}</span>
        </button>
      </div>

      {/* Posts List Feed */}
      {loading ? (
        <div className="space-y-4 py-8">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-44 rounded-2xl bg-slate-100 dark:bg-slate-900 animate-pulse border border-slate-200/50 dark:border-slate-800/50" />
          ))}
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="py-16 text-center text-slate-400 space-y-3">
          <MessageSquare className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
            {isHindi ? 'अभी कोई पोस्ट उपलब्ध नहीं है' : 'No posts in this category yet'}
          </p>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            {isHindi ? 'ऊपर दिए गए बॉक्स से अपनी पहली कम्युनिटी पोस्ट या पोल प्रकाशित करें!' : 'Publish the first community post or poll from the box above!'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPosts.map((post) => (
            <PostCard
              key={post.postId}
              post={post}
              onPostDeleted={() => {
                setPosts(prev => prev.filter(p => p.postId !== post.postId));
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};
