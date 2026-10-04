import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useRouter } from '../hooks/useRouter';
import { adService } from '../services/adService';
import { videoService } from '../services/videoService';
import { Video } from '../types';
import { 
  Users, 
  Plus, 
  Search, 
  ArrowLeft, 
  Wallet, 
  Loader2, 
  X, 
  Upload, 
  CheckCircle2, 
  Sparkles,
  Play,
  Globe,
  Film
} from 'lucide-react';

export const countryList = [
  'United States', 'Canada', 'India', 'Afghanistan', 'Albania', 'Algeria', 'Argentina', 
  'Australia', 'Austria', 'Bahrain', 'Bangladesh', 'Belgium', 'Brazil', 'Bulgaria', 
  'Chile', 'China', 'Colombia', 'Denmark', 'Egypt', 'Finland', 'France', 'Germany', 
  'Greece', 'Hong Kong', 'Hungary', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 
  'Italy', 'Japan', 'Jordan', 'Kenya', 'Kuwait', 'Malaysia', 'Mexico', 'Nepal', 
  'Netherlands', 'New Zealand', 'Nigeria', 'Norway', 'Oman', 'Pakistan', 'Philippines', 
  'Poland', 'Portugal', 'Qatar', 'Romania', 'Russia', 'Saudi Arabia', 'Singapore', 
  'South Africa', 'Spain', 'Sri Lanka', 'Sweden', 'Switzerland', 'Taiwan', 'Thailand', 
  'Turkey', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'Vietnam'
];

export const AdvertisingPage: React.FC = () => {
  const { currentUser, currentUserProfile, refreshProfile } = useApp();
  const { navigate } = useRouter();

  const [adsList, setAdsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Form Fields for Create Ad
  const [adName, setAdName] = useState('');
  const [targetCountry, setTargetCountry] = useState('United States');
  const [targetUrl, setTargetUrl] = useState('https://socialindia.app');
  const [adTitle, setAdTitle] = useState('');
  const [adDesc, setAdDescription] = useState('');
  const [pricingType, setPricingType] = useState<'click' | 'view'>('click');
  const [placement, setPlacement] = useState('Videos (Format Video / Image)');
  const [dailyLimit, setDailyLimit] = useState(1);
  const [totalLimit, setTotalLimit] = useState(5);
  
  // Media Type Selection
  const [mediaType, setMediaType] = useState<'upload' | 'socialindia_video'>('upload');
  const [uploadedMediaUrl, setUploadedMediaUrl] = useState('');
  const [userVideos, setUserVideos] = useState<Video[]>([]);
  const [selectedVideoId, setSelectedVideoId] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Load User Ads and Videos
  const loadData = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const userAds = await adService.getUserAds(currentUser.uid);
      setAdsList(userAds);

      const vList = await videoService.getCreatorVideos(currentUser.uid);
      setUserVideos(vList);
      if (vList.length > 0) {
        setSelectedVideoId(vList[0].videoId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  // Handle Media File Selection
  const handleMediaFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const url = await videoService.uploadFile(file);
      setUploadedMediaUrl(url);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to upload media file.');
    }
  };

  // Submit New Ad Handler
  const handleCreateAd = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!currentUser || !currentUserProfile) {
      setErrorMsg('Please sign in to create an ad.');
      return;
    }

    if (!adName.trim() || !adTitle.trim()) {
      setErrorMsg('Please enter campaign name and ad title.');
      return;
    }

    if (totalLimit <= 0) {
      setErrorMsg('Please enter a valid total spending limit.');
      return;
    }

    const currentWallet = currentUserProfile.walletBalance || 0;
    if (currentWallet < totalLimit) {
      setErrorMsg(`Insufficient Wallet Balance ($${currentWallet.toFixed(2)} USD). Convert points to wallet or top up balance first to cover $${totalLimit.toFixed(2)}.`);
      return;
    }

    let finalMedia = uploadedMediaUrl;
    if (mediaType === 'socialindia_video') {
      const pickedVid = userVideos.find(v => v.videoId === selectedVideoId);
      if (pickedVid) {
        finalMedia = pickedVid.videoUrl || pickedVid.thumbnailUrl;
      }
    }

    setIsSubmitting(true);
    try {
      await adService.createAdCampaign(currentUser.uid, {
        name: adName.trim(),
        targetAudience: targetCountry,
        ctaUrl: targetUrl.trim(),
        title: adTitle.trim(),
        description: adDesc.trim(),
        pricingType,
        placement,
        dailyLimit,
        totalLimit,
        videoUrl: finalMedia,
        bannerUrl: finalMedia
      });

      await refreshProfile();
      await loadData();
      setSuccessMsg(`✅ Ad campaign "${adName}" created successfully! $${totalLimit.toFixed(2)} deducted from Wallet.`);
      setTimeout(() => {
        setCreateModalOpen(false);
        setSuccessMsg('');
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create ad campaign.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredAds = adsList.filter(ad => 
    !searchQuery.trim() || ad.sponsorName?.toLowerCase().includes(searchQuery.toLowerCase()) || ad.headline?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-200/90 dark:bg-slate-900 text-slate-900 dark:text-white p-4 sm:p-6 md:p-8 space-y-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Top Header Card */}
        <div className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('home')}
              className="p-2.5 bg-slate-100 dark:bg-[#1E1E1E] hover:bg-slate-200 dark:hover:bg-[#2A2A2A] text-slate-700 dark:text-slate-300 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0 border border-slate-200 dark:border-[#2A2A2A]"
              title="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-[#00A3FF]/10 text-[#00A3FF] rounded-2xl">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  Advertising
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Promote your videos, products, and links to millions of viewers</p>
              </div>
            </div>
          </div>

          {/* Wallet Balance Pill */}
          <div className="px-5 py-2.5 bg-slate-50 dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#2B2B2B] rounded-2xl flex items-center gap-4 shrink-0 text-xs font-bold">
            <div className="flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-[#00A3FF]" />
              <span className="text-slate-500 dark:text-slate-400">Wallet:</span>
              <span className="text-[#00A3FF] font-black">${(currentUserProfile?.walletBalance || 0).toFixed(2)}</span>
            </div>
            <div className="w-px h-4 bg-slate-300 dark:bg-slate-700" />
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 dark:text-slate-400">Available Balance:</span>
              <span className="text-slate-900 dark:text-white font-black">$0.00</span>
            </div>
          </div>
        </div>

        {/* Main Controls & Campaigns Table Card */}
        <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#222222] rounded-3xl p-5 sm:p-7 shadow-sm space-y-6">
          
          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="search for advertising"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#2B2B2B] rounded-full text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#00A3FF]"
              />
            </div>

            {/* Create Ad Cyan Button */}
            <button
              onClick={() => setCreateModalOpen(true)}
              className="px-6 py-3 bg-[#00A3FF] hover:bg-[#0082CC] text-white font-black text-xs rounded-full shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-2 w-full sm:w-auto justify-center"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Create ad</span>
            </button>
          </div>

          {/* Ad Campaigns Data Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-[#2B2B2B]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-[#1A1A1A] text-slate-600 dark:text-slate-400 font-black uppercase tracking-wider border-b border-slate-200 dark:border-[#2B2B2B]">
                <tr>
                  <th className="p-4">Status</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Name</th>
                  <th className="p-4">Results</th>
                  <th className="p-4">Spent</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#222222] font-semibold text-slate-800 dark:text-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#00A3FF]" />
                      <span>Loading advertising campaigns...</span>
                    </td>
                  </tr>
                ) : filteredAds.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-slate-400 font-bold">
                      No data available in table
                    </td>
                  </tr>
                ) : (
                  filteredAds.map((ad) => (
                    <tr key={ad.adId} className="hover:bg-slate-50 dark:hover:bg-[#1A1A1A]/50 transition-colors">
                      <td className="p-4">
                        <span className="px-3 py-1 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full font-black text-[10px] uppercase">
                          {ad.status || 'Active'}
                        </span>
                      </td>
                      <td className="p-4">{ad.placement || 'Video Ad'}</td>
                      <td className="p-4 font-black text-slate-900 dark:text-white">{ad.sponsorName || ad.headline}</td>
                      <td className="p-4">{ad.results || 0} Clicks</td>
                      <td className="p-4 font-mono">${(ad.spent || 0).toFixed(2)} / ${(ad.totalLimit || 0).toFixed(2)}</td>
                      <td className="p-4 text-right">
                        <button className="px-3 py-1 bg-slate-100 dark:bg-[#2B2B2B] hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold cursor-pointer">
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>

      </div>

      {/* CREATE NEW AD FORM MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#2B2B2B] rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-[#222222] flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-[#00A3FF]" />
                <span>Create New Ad</span>
              </h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Form Body */}
            <form onSubmit={handleCreateAd} className="p-6 overflow-y-auto space-y-5 text-xs font-semibold">
              
              {errorMsg && (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 rounded-2xl font-bold">
                  {errorMsg}
                </div>
              )}

              {successMsg && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 rounded-2xl font-bold">
                  {successMsg}
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1.5 font-bold uppercase">Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Summer Video Promotion"
                  value={adName}
                  onChange={(e) => setAdName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#2B2B2B] rounded-xl text-slate-900 dark:text-white font-bold focus:outline-none focus:border-[#00A3FF]"
                />
              </div>

              {/* Target Audience Select Country */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1.5 font-bold uppercase">Target Audience</label>
                <select
                  value={targetCountry}
                  onChange={(e) => setTargetCountry(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#2B2B2B] rounded-xl text-slate-900 dark:text-white font-bold focus:outline-none cursor-pointer"
                >
                  {countryList.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* URL */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1.5 font-bold uppercase">URL *</label>
                <input
                  type="url"
                  required
                  placeholder="https://yourwebsite.com or video link"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#2B2B2B] rounded-xl text-slate-900 dark:text-white font-bold focus:outline-none focus:border-[#00A3FF]"
                />
              </div>

              {/* Title */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1.5 font-bold uppercase">Title *</label>
                <input
                  type="text"
                  required
                  placeholder="Ad Headline"
                  value={adTitle}
                  onChange={(e) => setAdTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#2B2B2B] rounded-xl text-slate-900 dark:text-white font-bold focus:outline-none focus:border-[#00A3FF]"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1.5 font-bold uppercase">Description</label>
                <textarea
                  rows={3}
                  placeholder="Ad body description..."
                  value={adDesc}
                  onChange={(e) => setAdDescription(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#2B2B2B] rounded-xl text-slate-900 dark:text-white font-medium focus:outline-none focus:border-[#00A3FF]"
                />
              </div>

              {/* Pricing */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1.5 font-bold uppercase">Pricing</label>
                <div className="flex items-center gap-6 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="pricing"
                      checked={pricingType === 'click'}
                      onChange={() => setPricingType('click')}
                      className="w-4 h-4 text-[#00A3FF]"
                    />
                    <span>Pay Per Click ($ 0.7)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="pricing"
                      checked={pricingType === 'view'}
                      onChange={() => setPricingType('view')}
                      className="w-4 h-4 text-[#00A3FF]"
                    />
                    <span>Pay Per View ($ 0.05)</span>
                  </label>
                </div>
              </div>

              {/* Placement */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1.5 font-bold uppercase">Placement</label>
                <input
                  type="text"
                  readOnly
                  value={placement}
                  className="w-full px-4 py-3 bg-slate-100 dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#2B2B2B] rounded-xl text-slate-600 dark:text-slate-400 font-bold"
                />
              </div>

              {/* Spending Limits */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1.5 font-bold uppercase">Spending limit per day ($)</label>
                  <input
                    type="number"
                    min={1}
                    value={dailyLimit}
                    onChange={(e) => setDailyLimit(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#2B2B2B] rounded-xl text-slate-900 dark:text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1.5 font-bold uppercase">Total ads spending limit ($) *</label>
                  <input
                    type="number"
                    min={1}
                    value={totalLimit}
                    onChange={(e) => setTotalLimit(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#2B2B2B] rounded-xl text-slate-900 dark:text-white font-bold"
                  />
                </div>
              </div>

              {/* Select Media */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-2 font-bold uppercase">Select Media</label>
                
                <div className="flex items-center gap-3 mb-3">
                  <button
                    type="button"
                    onClick={() => setMediaType('upload')}
                    className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                      mediaType === 'upload' ? 'bg-[#00A3FF] text-white' : 'bg-slate-100 dark:bg-[#1A1A1A] text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Upload File from Device
                  </button>

                  <button
                    type="button"
                    onClick={() => setMediaType('socialindia_video')}
                    className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                      mediaType === 'socialindia_video' ? 'bg-[#00A3FF] text-white' : 'bg-slate-100 dark:bg-[#1A1A1A] text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Promote SocialIndia Video/Short
                  </button>
                </div>

                {mediaType === 'upload' ? (
                  <div className="p-4 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl text-center space-y-2">
                    <input
                      type="file"
                      accept="video/*,image/*"
                      onChange={handleMediaFileSelect}
                      className="hidden"
                      id="ad-media-upload"
                    />
                    <label htmlFor="ad-media-upload" className="px-5 py-2.5 bg-[#00A3FF] text-white rounded-full font-bold cursor-pointer inline-flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      <span>{uploadedMediaUrl ? 'Change Uploaded File' : 'Upload Video/Image'}</span>
                    </label>
                    {uploadedMediaUrl && (
                      <p className="text-[10px] text-emerald-600 font-mono font-bold truncate">File Ready: {uploadedMediaUrl}</p>
                    )}
                  </div>
                ) : (
                  <div>
                    {userVideos.length === 0 ? (
                      <p className="text-slate-400 text-xs font-semibold">No uploaded videos found to promote. Upload a video first.</p>
                    ) : (
                      <select
                        value={selectedVideoId}
                        onChange={(e) => setSelectedVideoId(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#2B2B2B] rounded-xl text-slate-900 dark:text-white font-bold cursor-pointer"
                      >
                        {userVideos.map(v => (
                          <option key={v.videoId} value={v.videoId}>{v.title} ({v.isShort ? 'Short' : 'Video'})</option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
              </div>

              {/* Submit Footer Button */}
              <div className="pt-4 border-t border-slate-100 dark:border-[#222222] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-5 py-2.5 text-slate-500 font-bold hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-3 bg-[#00A3FF] hover:bg-[#0082CC] text-white font-black rounded-full shadow-lg flex items-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span>Publish Ad Campaign</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
