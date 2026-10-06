import React, { useState, useEffect } from 'react';
import { useRouter } from '../hooks/useRouter';
import { useApp } from '../context/AppContext';
import { adService } from '../services/adService';
import { videoService } from '../services/videoService';
import { AdCampaign, Video } from '../types';
import { 
  ArrowLeft, 
  ExternalLink, 
  Play, 
  CheckCircle2, 
  ShieldCheck, 
  Globe, 
  Share2, 
  Info, 
  Sparkles, 
  Loader2,
  Users,
  Flag
} from 'lucide-react';

export const AdInfoPage: React.FC = () => {
  const { route, navigate } = useRouter();
  const { addToast } = useApp();
  const adId = route.param;

  const [ad, setAd] = useState<AdCampaign | null>(null);
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdData = async () => {
      if (!adId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const adData = await adService.getAdById(adId);
        setAd(adData);

        if (adData) {
          // Check if ad points to a video on platform
          let targetVidId = '';
          if (adData.ctaUrl && (adData.ctaUrl.includes('/watch/') || adData.ctaUrl.startsWith('video_'))) {
            targetVidId = adData.ctaUrl.replace(/.*\/watch\//, '');
          } else if (adData.videoUrl && adData.videoUrl.includes('/watch/')) {
            targetVidId = adData.videoUrl.replace(/.*\/watch\//, '');
          }

          if (targetVidId) {
            const vData = await videoService.getVideo(targetVidId);
            setVideo(vData);
          }
        }
      } catch (err) {
        console.error('Failed to load ad info:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAdData();
  }, [adId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-slate-100 dark:bg-slate-900">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#00A3FF]" />
          <p className="text-xs font-bold text-slate-500">Loading campaign information...</p>
        </div>
      </div>
    );
  }

  if (!ad) {
    return (
      <div className="min-h-screen p-6 max-w-4xl mx-auto text-center space-y-4">
        <button
          onClick={() => navigate('home')}
          className="p-2 bg-slate-200 dark:bg-slate-800 rounded-xl hover:bg-slate-300 transition-all cursor-pointer inline-flex items-center gap-2 text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>
        <div className="p-8 bg-white dark:bg-[#121212] rounded-3xl border border-slate-200 dark:border-[#222] shadow-sm space-y-3">
          <Info className="w-10 h-10 text-slate-400 mx-auto" />
          <h2 className="text-lg font-black text-slate-900 dark:text-white">Campaign Not Found</h2>
          <p className="text-xs text-slate-500 font-medium">This sponsored promotion may have expired or reached its campaign limit.</p>
        </div>
      </div>
    );
  }

  const handleOpenTargetVideo = () => {
    if (video) {
      navigate(`watch/${video.videoId}`);
    } else if (ad.ctaUrl && (ad.ctaUrl.includes('/watch/') || ad.ctaUrl.startsWith('video_'))) {
      const vidId = ad.ctaUrl.replace(/.*\/watch\//, '');
      navigate(`watch/${vidId}`);
    } else if (ad.ctaUrl) {
      window.open(ad.ctaUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleOpenExternalWebsite = () => {
    if (ad.adId) {
      adService.recordAdClick(ad.adId);
    }
    if (ad.ctaUrl && !ad.ctaUrl.includes('/watch/')) {
      window.open(ad.ctaUrl, '_blank', 'noopener,noreferrer');
    } else if (video) {
      navigate(`watch/${video.videoId}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#0B0F17] text-slate-900 dark:text-white p-4 sm:p-6 md:p-8 space-y-6">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Top Navigation Header */}
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={() => navigate('home')}
            className="px-4 py-2.5 bg-white dark:bg-[#1A1F2C] hover:bg-slate-200 dark:hover:bg-[#252C3D] text-slate-700 dark:text-slate-200 rounded-2xl transition-all cursor-pointer flex items-center gap-2 border border-slate-200/80 dark:border-slate-800 shadow-xs text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 rounded-full text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Sponsored Promotion</span>
            </span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                addToast('Campaign link copied to clipboard!', 'success');
              }}
              className="p-2.5 bg-white dark:bg-[#1A1F2C] hover:bg-slate-200 dark:hover:bg-[#252C3D] text-slate-600 dark:text-slate-300 rounded-2xl transition-all cursor-pointer border border-slate-200/80 dark:border-slate-800"
              title="Share Campaign"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Ad Card Container */}
        <div className="bg-white dark:bg-[#121824] border border-slate-200/80 dark:border-[#222D3D] rounded-3xl overflow-hidden shadow-md space-y-6">
          
          {/* Media / Video Banner */}
          {(video?.thumbnailUrl || ad.bannerUrl || video?.videoUrl) && (
            <div className="relative w-full aspect-video bg-slate-950 overflow-hidden group">
              <img
                src={video?.thumbnailUrl || ad.bannerUrl}
                alt={ad.headline || ad.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center">
                <button
                  onClick={handleOpenTargetVideo}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-black text-xs rounded-2xl shadow-xl transition-all cursor-pointer flex items-center gap-2 active:scale-95 uppercase tracking-wider"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>{video ? 'Watch Video on SocialIndia' : 'Open Promoted Content'}</span>
                </button>
              </div>

              <div className="absolute top-4 left-4 px-2.5 py-1 bg-black/80 backdrop-blur-md text-amber-400 border border-amber-400/30 text-[10px] font-black rounded-lg uppercase tracking-wider">
                Ad • YouTube Style Promotion
              </div>
            </div>
          )}

          {/* Advertiser & Campaign Header */}
          <div className="p-6 md:p-8 space-y-6">
            
            {/* Sponsor Info Header */}
            <div className="flex items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-[#1E2638] flex-wrap">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-[#1E2638] flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-700 text-lg font-black text-[#00A3FF]">
                  {ad.sponsorLogo ? (
                    <img src={ad.sponsorLogo} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (ad.sponsorName || ad.creatorUsername || 'A')[0].toUpperCase()
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      {ad.sponsorName || `@${ad.creatorUsername}`}
                    </h3>
                    <ShieldCheck className="w-4 h-4 text-blue-500 fill-blue-500/20" />
                  </div>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">Verified Promoter on SocialIndia</p>
                </div>
              </div>

              {ad.creatorUid && (
                <button
                  onClick={() => navigate('creator', ad.creatorUid)}
                  className="px-4 py-2 bg-slate-100 dark:bg-[#1E2638] hover:bg-slate-200 dark:hover:bg-[#2A344A] text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>View Creator Profile</span>
                </button>
              )}
            </div>

            {/* Campaign Headline & Description */}
            <div className="space-y-3">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-snug">
                {ad.headline || ad.title}
              </h1>
              {ad.description && (
                <p className="text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed whitespace-pre-line">
                  {ad.description}
                </p>
              )}
            </div>

            {/* CTA Link Bar */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                onClick={handleOpenExternalWebsite}
                className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-2xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 uppercase tracking-wider"
              >
                <span>{ad.ctaText || 'Visit Official Website'}</span>
                <ExternalLink className="w-4 h-4" />
              </button>

              {video && (
                <button
                  onClick={handleOpenTargetVideo}
                  className="px-6 py-3.5 bg-slate-100 dark:bg-[#1E2638] hover:bg-slate-200 dark:hover:bg-[#2A344A] text-slate-900 dark:text-white font-black text-xs rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 uppercase tracking-wider"
                >
                  <Play className="w-4 h-4 text-red-500 fill-red-500/20" />
                  <span>Watch Video</span>
                </button>
              )}
            </div>

            {/* YouTube Ad Center Transparency Card */}
            <div className="p-5 bg-slate-50 dark:bg-[#0E131F] border border-slate-200/80 dark:border-[#1E2638] rounded-2xl space-y-3 mt-6">
              <div className="flex items-center gap-2 text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                <Info className="w-4 h-4 text-[#00A3FF]" />
                <span>About this Promotion (SocialIndia Ad Center)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-semibold pt-1 text-slate-600 dark:text-slate-400">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Target Region</span>
                  <span className="text-slate-900 dark:text-white font-black">{ad.targetAudience || 'All Regions'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Ad Format</span>
                  <span className="text-slate-900 dark:text-white font-black">{ad.placement || 'Video / Banner'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Campaign Status</span>
                  <span className="text-emerald-500 font-black">Active & Verified</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 font-medium pt-2 border-t border-slate-200/60 dark:border-[#1E2638]">
                💡 SocialIndia Ads are created directly by creators and advertisers. Users earn wallet rewards for interacting with verified promotions.
              </p>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
