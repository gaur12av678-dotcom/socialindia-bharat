import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { CommunityPost } from '../types';
import { postService } from '../services/postService';
import { PostCard } from '../components/community/PostCard';
import { CreatePostBox } from '../components/community/CreatePostBox';
import { useTranslation } from '../i18n';
import { MessageSquare, Image as ImageIcon, Video as VideoIcon, BarChart2, Loader2, RefreshCw } from 'lucide-react';

const PAGE_SIZE = 5;

export const CommunityPage: React.FC = () => {
  const { isHindi } = useTranslation();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'video' | 'image' | 'poll'>('all');

  const cursorRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const localOffsetRef = useRef<number>(0);
  const requestSeqRef = useRef<number>(0);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadInitialPosts = useCallback(async (activeFilter: 'all' | 'video' | 'image' | 'poll' = filterType) => {
    const seq = ++requestSeqRef.current;
    setLoading(true);
    cursorRef.current = null;
    localOffsetRef.current = 0;

    try {
      const page = await postService.getPostsPage({
        pageSize: PAGE_SIZE,
        cursor: null,
        localOffset: 0,
        postType: activeFilter
      });
      if (seq !== requestSeqRef.current) return;
      setPosts(page.posts);
      cursorRef.current = page.cursor;
      localOffsetRef.current = page.nextLocalOffset;
      setHasMore(page.hasMore);
    } catch (err) {
      if (seq !== requestSeqRef.current) return;
      console.error('Failed to load community posts:', err);
    } finally {
      if (seq === requestSeqRef.current) {
        setLoading(false);
      }
    }
  }, [filterType]);

  const loadMorePosts = useCallback(async () => {
    if (loading || loadingMore || !hasMore) return;
    const seq = requestSeqRef.current;
    setLoadingMore(true);

    try {
      const page = await postService.getPostsPage({
        pageSize: PAGE_SIZE,
        cursor: cursorRef.current,
        localOffset: localOffsetRef.current,
        postType: filterType
      });
      if (seq !== requestSeqRef.current) return;

      setPosts(prev => {
        const seen = new Set(prev.map(p => p.postId));
        const nextPosts = page.posts.filter(p => !seen.has(p.postId));
        return [...prev, ...nextPosts];
      });
      cursorRef.current = page.cursor;
      localOffsetRef.current = page.nextLocalOffset;
      setHasMore(page.hasMore);
    } catch (err) {
      console.error('Failed to load more posts:', err);
    } finally {
      if (seq === requestSeqRef.current) {
        setLoadingMore(false);
      }
    }
  }, [loading, loadingMore, hasMore, filterType]);

  useEffect(() => {
    loadInitialPosts(filterType);
  }, [filterType, loadInitialPosts]);

  useEffect(() => {
    const handlePostCreated = (e: any) => {
      const newPost = e.detail?.post as CommunityPost | undefined;
      if (newPost) {
        if (filterType === 'all' || newPost.postType === filterType) {
          setPosts(prev => [newPost, ...prev.filter(p => p.postId !== newPost.postId)]);
        }
      } else {
        loadInitialPosts(filterType);
      }
    };

    const handlePostDeleted = (e: any) => {
      const deletedId = e.detail?.postId as string | undefined;
      if (deletedId) {
        setPosts(prev => prev.filter(p => p.postId !== deletedId));
      }
    };

    window.addEventListener('socialindia:post_created', handlePostCreated);
    window.addEventListener('socialindia:post_deleted', handlePostDeleted);
    return () => {
      window.removeEventListener('socialindia:post_created', handlePostCreated);
      window.removeEventListener('socialindia:post_deleted', handlePostDeleted);
    };
  }, [filterType, loadInitialPosts]);

  // Progressive infinite scroll: load next batch of 5 posts when sentinel enters viewport
  useEffect(() => {
    if (!hasMore || loading || loadingMore) return;
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMorePosts();
        }
      },
      { rootMargin: '350px', threshold: 0.05 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, loadMorePosts]);

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
      
      {/* Top Title Banner */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-social-light-blue text-social-blue flex items-center justify-center shadow-xs">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {isHindi ? 'एक्सप्लोर' : 'Explore'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isHindi ? 'फोटो, वीडियो और पोस्ट के ज़रिए सबके साथ जुड़ें' : 'Share photos, videos and updates with the SocialIndia community'}
            </p>
          </div>
        </div>

        <button
          onClick={() => loadInitialPosts(filterType)}
          disabled={loading}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 transition-colors cursor-pointer"
          title="Refresh Feed"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
        </button>
      </div>

      {/* 1. Create Community Post Box at top */}
      <CreatePostBox onPostCreated={() => loadInitialPosts(filterType)} />

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setFilterType('all')}
          className={`px-4 py-1.5 rounded-full text-xs border transition-all cursor-pointer shrink-0 ${
            filterType === 'all'
              ? 'yt-chip-active shadow-xs'
              : 'yt-chip-inactive'
          }`}
        >
          {isHindi ? 'सभी पोस्ट' : 'All Posts'}
        </button>

        <button
          type="button"
          onClick={() => setFilterType('video')}
          className={`px-4 py-1.5 rounded-full text-xs border flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
            filterType === 'video'
              ? 'yt-chip-active shadow-xs'
              : 'yt-chip-inactive'
          }`}
        >
          <VideoIcon className="w-3.5 h-3.5" />
          <span>{isHindi ? 'वीडियो' : 'Videos'}</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterType('image')}
          className={`px-4 py-1.5 rounded-full text-xs border flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
            filterType === 'image'
              ? 'yt-chip-active shadow-xs'
              : 'yt-chip-inactive'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>{isHindi ? 'फ़ोटो पोस्ट' : 'Photos'}</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterType('poll')}
          className={`px-4 py-1.5 rounded-full text-xs border flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
            filterType === 'poll'
              ? 'yt-chip-active shadow-xs'
              : 'yt-chip-inactive'
          }`}
        >
          <BarChart2 className="w-3.5 h-3.5" />
          <span>{isHindi ? 'लाइव पोल' : 'Polls'}</span>
        </button>
      </div>

      {/* Posts List Feed */}
      {loading ? (
        <div className="space-y-4 py-8">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-44 rounded-2xl bg-slate-100 dark:bg-slate-900 animate-pulse border border-slate-200/50 dark:border-slate-800/50" />
          ))}
        </div>
      ) : posts.length === 0 ? (
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
          {posts.map((post) => (
            <PostCard
              key={post.postId}
              post={post}
              showFollowButton
              onPostDeleted={() => {
                setPosts(prev => prev.filter(p => p.postId !== post.postId));
              }}
            />
          ))}

          {/* Sentinel for infinite scroll */}
          <div ref={sentinelRef} className="h-2 w-full pointer-events-none" />

          {hasMore && (
            <div className="flex justify-center pt-2 pb-4">
              {loadingMore ? (
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span>{isHindi ? 'और पोस्ट लोड हो रहे हैं...' : 'Loading more posts...'}</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={loadMorePosts}
                  className="px-5 py-2 rounded-full text-xs border yt-chip-inactive cursor-pointer transition-all"
                >
                  {isHindi ? 'और पोस्ट देखें' : 'Load more posts'}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
