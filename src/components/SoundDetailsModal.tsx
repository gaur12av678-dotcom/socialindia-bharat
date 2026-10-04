import React, { useState, useEffect, useRef } from 'react';
import { SoundTrack, Video } from '../types';
import { soundService } from '../services/soundService';
import { useRouter } from '../hooks/useRouter';
import { Play, Pause, Music, X, Sparkles, Film, Eye, Flame } from 'lucide-react';
import { formatViews } from '../utils/videoUtils';

interface SoundDetailsModalProps {
  soundId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onUseSound: (sound: SoundTrack) => void;
}

export const SoundDetailsModal: React.FC<SoundDetailsModalProps> = ({
  soundId,
  isOpen,
  onClose,
  onUseSound
}) => {
  const { navigate } = useRouter();
  const [sound, setSound] = useState<SoundTrack | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (isOpen && soundId) {
      loadSoundDetails();
    } else {
      stopAudio();
    }
  }, [isOpen, soundId]);

  const loadSoundDetails = async () => {
    if (!soundId) return;
    setLoading(true);
    try {
      const res = await soundService.getSoundWithVideos(soundId);
      setSound(res.sound);
      setVideos(res.videos);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleAudio = () => {
    if (!sound?.audioUrl) return;

    if (isPlaying) {
      stopAudio();
    } else {
      if (audioRef.current) audioRef.current.pause();
      const newAudio = new Audio(sound.audioUrl);
      audioRef.current = newAudio;
      newAudio.play().catch(console.error);
      newAudio.onended = () => setIsPlaying(false);
      setIsPlaying(true);
    }
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
  };

  if (!isOpen || !soundId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Music className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
              Sound Track Details
            </h3>
          </div>

          <button
            onClick={() => {
              stopAudio();
              onClose();
            }}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {loading ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-500">Loading sound details...</p>
            </div>
          ) : sound ? (
            <>
              {/* Sound Header Card */}
              <div className="flex flex-col sm:flex-row items-center gap-6 p-5 bg-slate-50 dark:bg-[#1E293B]/50 rounded-3xl border border-slate-200 dark:border-slate-800">
                
                {/* Album Cover Thumbnail */}
                <div className="relative w-28 h-28 rounded-2xl overflow-hidden shadow-xl border-2 border-slate-200 dark:border-slate-700 shrink-0 group">
                  <img src={sound.coverUrl} alt={sound.title} className="w-full h-full object-cover" />
                  <button
                    onClick={toggleAudio}
                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-90 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    {isPlaying ? (
                      <Pause className="w-8 h-8 text-white fill-current animate-pulse" />
                    ) : (
                      <Play className="w-8 h-8 text-white fill-current ml-1" />
                    )}
                  </button>
                </div>

                {/* Info & Stats */}
                <div className="min-w-0 flex-1 space-y-2 text-center sm:text-left">
                  <div>
                    <h2 className="text-lg font-black text-slate-900 dark:text-white leading-snug">
                      {sound.title}
                    </h2>
                    <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                      {sound.artist} • <span className="text-slate-500">{sound.category}</span>
                    </p>
                  </div>

                  {/* Real Usage Counter */}
                  <div className="flex items-center justify-center sm:justify-start gap-3">
                    <span className="text-xs font-black text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 shadow-2xs">
                      <Film className="w-3.5 h-3.5 text-blue-500" />
                      <span>{sound.usesCount || videos.length} REAL Shorts</span>
                    </span>

                    {sound.isOriginalSound && (
                      <span className="text-[10px] font-black bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2.5 py-1 rounded-full">
                        Original Creator Sound
                      </span>
                    )}
                  </div>

                  {/* CTA Button */}
                  <div className="pt-2">
                    <button
                      onClick={() => {
                        stopAudio();
                        onUseSound(sound);
                        onClose();
                      }}
                      className="px-6 py-3 bg-[#065fd4] hover:bg-[#054fb1] text-white font-black text-xs rounded-2xl shadow-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center sm:justify-start gap-2 w-full sm:w-auto"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>📹 Use This Sound in My Short</span>
                    </button>
                  </div>
                </div>

              </div>

              {/* Grid of Shorts made with this sound */}
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Shorts created with this sound ({videos.length})
                </h3>

                {videos.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                    <Film className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="text-xs font-extrabold text-slate-600 dark:text-slate-300">
                      Be the first creator to make a Short with this sound!
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {videos.map((v) => (
                      <div
                        key={v.videoId}
                        onClick={() => {
                          stopAudio();
                          onClose();
                          navigate('shorts', v.videoId);
                        }}
                        className="group relative aspect-[9/16] rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer shadow-md hover:scale-[1.02] transition-all"
                      >
                        <img src={v.thumbnailUrl} alt={v.title} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-3 flex flex-col justify-end text-white">
                          <p className="text-xs font-black truncate drop-shadow-md">{v.title}</p>
                          <div className="flex items-center gap-1 text-[10px] font-bold text-slate-300 mt-1">
                            <Eye className="w-3 h-3 text-blue-400" />
                            <span>{formatViews(v.viewsCount)} views</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="py-8 text-center text-xs font-bold text-slate-500">
              Sound track not found.
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
