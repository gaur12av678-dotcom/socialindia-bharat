import React, { useState, useEffect, useRef } from 'react';
import { SoundTrack } from '../types';
import { soundService } from '../services/soundService';
import { useTranslation } from '../i18n';
import { Play, Pause, Music, Search, Check, X, Sparkles, Volume2, Flame } from 'lucide-react';

interface SoundLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSound: (sound: SoundTrack) => void;
  selectedSoundId?: string;
}

export const SoundLibraryModal: React.FC<SoundLibraryModalProps> = ({
  isOpen,
  onClose,
  onSelectSound,
  selectedSoundId
}) => {
  const { t, isHindi } = useTranslation();
  const [sounds, setSounds] = useState<SoundTrack[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [playingSoundId, setPlayingSoundId] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const categories = [
    { key: 'All', label: isHindi ? 'सभी' : 'All' },
    { key: 'Punjabi & Bollywood', label: isHindi ? 'पंजाबी व बॉलीवुड' : 'Punjabi & Bollywood' },
    { key: 'Lo-Fi & Chill', label: isHindi ? 'लो-फ़ाई और चिल' : 'Lo-Fi & Chill' },
    { key: 'Gaming & Tech', label: isHindi ? 'गेमिंग और टेक' : 'Gaming & Tech' },
    { key: 'Trending Viral', label: isHindi ? 'वायरल ट्रेंडिंग' : 'Trending Viral' },
    { key: 'Romantic & Acoustic', label: isHindi ? 'रोमांटिक और ध्वनिक' : 'Romantic & Acoustic' }
  ];

  useEffect(() => {
    loadSounds();
  }, [selectedCategory, searchQuery]);

  const loadSounds = async () => {
    if (searchQuery.trim()) {
      const res = await soundService.searchSounds(searchQuery);
      setSounds(res);
    } else {
      const res = await soundService.getSounds(selectedCategory);
      setSounds(res);
    }
  };

  const handleTogglePreview = (sound: SoundTrack, e: React.MouseEvent) => {
    e.stopPropagation();
    if (playingSoundId === sound.soundId) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPlayingSoundId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const newAudio = new Audio(sound.audioUrl);
      audioRef.current = newAudio;
      newAudio.play().catch(console.error);
      newAudio.onended = () => setPlayingSoundId(null);
      setPlayingSoundId(sound.soundId);
    }
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-2xl border border-blue-100 dark:border-blue-900/30">
              <Music className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-blue-400 flex items-center gap-1.5">
                <span>{isHindi ? 'शॉर्ट्स साउंड लाइब्रेरी' : 'Shorts Sound Library'}</span>
                <span className="text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <Flame className="w-3 h-3 fill-current" /> {isHindi ? 'वायरल ऑडियो' : 'Viral Audio'}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#94A3B8] font-semibold">
                {isHindi ? 'अपने शॉर्ट के लिए बैकग्राउंड संगीत या वायरल ऑडियो चुनें' : 'Select background music or viral audio for your Short'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              if (audioRef.current) audioRef.current.pause();
              onClose();
            }}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Categories Bar */}
        <div className="p-4 space-y-3 bg-slate-50/50 dark:bg-[#161616]/40 border-b border-slate-100 dark:border-slate-800">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isHindi ? 'साउंड, कलाकार या वायरल बीट्स खोजें...' : 'Search sounds, artists or viral beats...'}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155] rounded-xl text-xs font-semibold text-slate-900 dark:text-blue-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {categories.map((cat) => (
              <button
                key={cat.key}
                onClick={() => {
                  setSelectedCategory(cat.key);
                  setSearchQuery('');
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
                  selectedCategory === cat.key && !searchQuery
                    ? 'bg-blue-600 text-blue-200 shadow-xs'
                    : 'bg-white dark:bg-[#1E293B] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-blue-400'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sound List */}
        <div className="p-4 overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-slate-800/60 space-y-2">
          {sounds.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Music className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-xs font-extrabold text-slate-600 dark:text-slate-400">
                {isHindi ? `"${searchQuery}" से मेल खाता कोई साउंड नहीं मिला` : `No sounds found matching "${searchQuery}"`}
              </p>
            </div>
          ) : (
            sounds.map((sound) => {
              const isPlaying = playingSoundId === sound.soundId;
              const isSelected = selectedSoundId === sound.soundId;

              return (
                <div
                  key={sound.soundId}
                  className={`pt-2 first:pt-0 p-3 rounded-2xl flex items-center justify-between gap-3 transition-colors ${
                    isSelected ? 'bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  {/* Left: Thumbnail & Play button */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 group border border-slate-200 dark:border-slate-700 shadow-xs">
                      <img src={sound.coverUrl} alt={sound.title} className="w-full h-full object-cover" />
                      <button
                        onClick={(e) => handleTogglePreview(sound, e)}
                        className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity cursor-pointer ${
                          isPlaying ? 'opacity-100 bg-black/60' : 'opacity-80 group-hover:opacity-100'
                        }`}
                      >
                        {isPlaying ? (
                          <Pause className="w-5 h-5 text-blue-300 fill-current animate-pulse" />
                        ) : (
                          <Play className="w-5 h-5 text-blue-300 fill-current ml-0.5" />
                        )}
                      </button>
                    </div>

                    <div className="min-w-0">
                      <h4 className="text-xs font-black text-slate-900 dark:text-blue-400 truncate">
                        {sound.title}
                      </h4>
                      <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {sound.artist} • <span className="text-blue-600 dark:text-blue-400 font-bold">{sound.duration}s</span>
                      </p>
                      <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold mt-0.5">
                        🔥 {sound.usesCount || 0} {isHindi ? 'शॉर्ट्स में उपयोग' : 'Shorts used'}
                      </p>
                    </div>
                  </div>

                  {/* Right: Select Button */}
                  <button
                    onClick={() => {
                      if (audioRef.current) audioRef.current.pause();
                      onSelectSound(sound);
                      onClose();
                    }}
                    className={`px-4 py-2 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                      isSelected
                        ? 'bg-emerald-600 text-blue-200 shadow-xs'
                        : 'bg-blue-600 hover:bg-blue-700 text-blue-200 shadow-xs active:scale-95'
                    }`}
                  >
                    {isSelected ? (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>{isHindi ? 'चुना गया' : 'Selected'}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{isHindi ? 'साउंड उपयोग करें' : 'Use Sound'}</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
};
