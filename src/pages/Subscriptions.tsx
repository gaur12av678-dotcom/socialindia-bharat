import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useRouter } from '../hooks/useRouter';
import { subscriptionService } from '../services/subscriptionService';
import { videoService } from '../services/videoService';
import { Video } from '../types';
import { VideoGrid } from '../components/VideoGrid';
import { UserAvatar } from '../components/UserAvatar';
import { Users, Compass } from 'lucide-react';
import { useTranslation } from '../i18n';

export const Subscriptions: React.FC = () => {
  const { currentUser, addToast } = useApp();
  const { navigate } = useRouter();
  const { t, isHindi } = useTranslation();

  const [videos, setVideos] = useState<Video[]>([]);
  const [followedCreators, setFollowedCreators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribingCount, setSubscribingCount] = useState(0);

  useEffect(() => {
    if (!currentUser) return;

    const loadSubscriptionsFeed = async () => {
      setLoading(true);
      try {
        const subs = await subscriptionService.getSubscriptions(currentUser.uid);
        setSubscribingCount(subs.length);
        setFollowedCreators(subs);

        if (subs.length === 0) {
          setVideos([]);
          setLoading(false);
          return;
        }

        const creatorIds = subs.map(s => s.creatorId);
        
        // Fetch all public videos and filter in memory
        const allVideos = await videoService.getVideos();
        const filtered = allVideos.filter(v => creatorIds.includes(v.creatorId));
        setVideos(filtered);

      } catch (err) {
        console.error(err);
        addToast(isHindi ? 'सब्सक्रिप्शन फ़ीड लोड करने में विफल।' : 'Failed to load subscriptions feed.', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadSubscriptionsFeed();
  }, [currentUser]);

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Users className="w-12 h-12 text-slate-400 mb-4" />
        <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
          {isHindi ? 'सब्सक्रिप्शन देखने के लिए साइन इन करें' : 'Sign in to view subscriptions'}
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          {isHindi ? 'जिन क्रिएटर्स को आप फ़ॉलो करते हैं उनके वीडियो देखें।' : 'Explore videos from creators you follow.'}
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      
      {/* Followed Creators Top Bar */}
      {followedCreators.length > 0 && (
        <div className="flex items-center gap-4 overflow-x-auto pb-4 no-scrollbar border-b border-slate-100 dark:border-slate-800">
          {followedCreators.map((sub) => (
            <button
              key={sub.creatorId}
              onClick={() => navigate('creator', sub.creatorUsername)}
              className="flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer"
            >
              <UserAvatar
                uid={sub.creatorId}
                fallbackPhotoURL={sub.creatorPhotoURL}
                fallbackDisplayName={sub.creatorDisplayName || sub.creatorUsername}
                size="lg"
                className="w-14 h-14 ring-2 ring-transparent group-hover:ring-blue-500 transition-all shadow-sm"
              />
              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 group-hover:text-blue-600 truncate max-w-[76px]">
                {sub.creatorDisplayName}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Title Header */}
      <div className="flex items-center gap-2.5">
        <div className="p-2.5 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 text-blue-500 rounded-xl">
          <Users className="w-5 h-5 text-blue-500" />
        </div>
        <div>
          <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-tight">
            {t('nav_subscriptions', 'Subscriptions')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-500 mt-0.5">
            {isHindi 
              ? `${subscribingCount} फ़ॉलो किए गए चैनलों के ताज़ा वीडियो`
              : `Videos from the ${subscribingCount} channels you are currently following`}
          </p>
        </div>
      </div>

      {subscribingCount === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <Users className="w-16 h-16 bg-blue-50 dark:bg-blue-900/10 text-blue-500 rounded-2xl flex items-center justify-center mb-4 border border-blue-100 dark:border-blue-900/20 shadow-sm" />
          <h4 className="text-base font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-tight">
            {isHindi ? 'अभी कोई सब्सक्रिप्शन नहीं है' : 'No subscriptions yet'}
          </h4>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm">
            {isHindi 
              ? 'आपने अभी तक किसी क्रिएटर को फ़ॉलो नहीं किया है। होम फ़ीड देखें और अपने पसंदीदा क्रिएटर्स को फ़ॉलो करें!' 
              : "You aren't following any creators yet. Explore the home feed, find awesome channels, and follow them to see their content here!"}
          </p>
          <button
            onClick={() => navigate('home')}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <Compass className="w-4 h-4" />
            <span>{isHindi ? 'चैनल खोजें' : 'Discover Channels'}</span>
          </button>
        </div>
      ) : (
        <VideoGrid 
          videos={videos} 
          loading={loading} 
          emptyMessage={isHindi ? 'आपके फ़ॉलो किए गए क्रिएटर्स ने अभी कोई वीडियो प्रकाशित नहीं किया है।' : 'No videos published yet by your followed creators.'}
        />
      )}
    </div>
  );
};
