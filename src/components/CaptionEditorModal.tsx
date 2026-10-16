import React, { useState } from 'react';
import { 
  Subtitles, 
  Clock, 
  Plus, 
  Trash2, 
  Save, 
  X, 
  Sparkles, 
  Play, 
  HelpCircle,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Video, CaptionCue } from '../types';
import { videoService } from '../services/videoService';
import { formatDuration } from '../utils/videoUtils';

interface CaptionEditorModalProps {
  video: Video;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (updatedCaptions: CaptionCue[]) => void;
}

// Convert seconds (e.g. 75.5) to MM:SS string
function secondsToTimeString(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Convert MM:SS or S string to seconds number
function timeStringToSeconds(str: string): number {
  if (!str) return 0;
  const parts = str.trim().split(':');
  if (parts.length === 2) {
    const mins = parseFloat(parts[0]) || 0;
    const secs = parseFloat(parts[1]) || 0;
    return Math.max(0, mins * 60 + secs);
  }
  return Math.max(0, parseFloat(str) || 0);
}

export const CaptionEditorModal: React.FC<CaptionEditorModalProps> = ({
  video,
  isOpen,
  onClose,
  onSaved
}) => {
  const [cues, setCues] = useState<CaptionCue[]>(() => {
    if (video.captions && Array.isArray(video.captions) && video.captions.length > 0) {
      return [...video.captions].sort((a, b) => a.start - b.start);
    }
    return [
      { id: 'cue-1', start: 0, end: Math.min(5, Math.floor(video.duration || 10)), text: 'Welcome to this video on SocialIndia!' }
    ];
  });

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleAddCue = () => {
    const lastCue = cues[cues.length - 1];
    const newStart = lastCue ? Math.min(Math.floor(video.duration || 60), lastCue.end + 0.5) : 0;
    const newEnd = Math.min(Math.floor(video.duration || 60), newStart + 4);
    
    setCues(prev => [
      ...prev,
      {
        id: `cue-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        start: newStart,
        end: newEnd,
        text: ''
      }
    ]);
  };

  const handleRemoveCue = (id: string) => {
    setCues(prev => prev.filter(c => c.id !== id));
  };

  const handleUpdateCue = (id: string, field: 'start' | 'end' | 'text', value: any) => {
    setCues(prev => prev.map(c => {
      if (c.id === id) {
        return { ...c, [field]: value };
      }
      return c;
    }));
  };

  const handleAutoGenerateTemplate = () => {
    const duration = Math.max(10, Math.floor(video.duration || 60));
    const step = 8;
    const autoList: CaptionCue[] = [];
    let cur = 0;
    let idx = 1;
    while (cur < duration) {
      const next = Math.min(duration, cur + step);
      autoList.push({
        id: `auto-${idx}`,
        start: cur,
        end: next,
        text: idx === 1 
          ? `Welcome: ${video.title}` 
          : idx === 2 
          ? 'Enjoy watching on SocialIndia!' 
          : `Timestamp cue ${secondsToTimeString(cur)} - ${secondsToTimeString(next)}`
      });
      cur = next;
      idx++;
    }
    setCues(autoList);
  };

  const handleSave = async () => {
    setErrorMsg('');
    // Sort cues by start time
    const sorted = [...cues]
      .filter(c => c.text.trim().length > 0)
      .sort((a, b) => a.start - b.start);

    if (sorted.length === 0) {
      setErrorMsg('Please add at least one caption line with text.');
      return;
    }

    setIsSaving(true);
    try {
      await videoService.editVideo(video.videoId, {
        captions: sorted
      });
      setSavedSuccess(true);
      if (onSaved) {
        onSaved(sorted);
      }
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error('Failed to save captions:', err);
      setErrorMsg(err.message || 'Failed to save subtitles.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-[#18181c] border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between bg-slate-50/50 dark:bg-white/[0.02]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Subtitles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">
                Subtitles & Captions Editor
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {video.title} • {formatDuration(video.duration || 0)}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Subheader Banner */}
        <div className="px-4 py-2.5 bg-blue-50/80 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-900/40 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300 font-medium">
            <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>Add timestamped subtitle cues in Hindi, English, or any language.</span>
          </div>
          <button
            onClick={handleAutoGenerateTemplate}
            type="button"
            className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1"
          >
            Auto-Template
          </button>
        </div>

        {/* Caption Cues List (Scrollable) */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1 divide-y divide-slate-100 dark:divide-white/5">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {cues.length === 0 ? (
            <div className="text-center py-10 space-y-3">
              <Subtitles className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-bold text-slate-500">No subtitle cues added yet.</p>
              <button
                onClick={handleAddCue}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs cursor-pointer inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add First Caption Line
              </button>
            </div>
          ) : (
            cues.map((cue, index) => (
              <div key={cue.id} className="pt-3 first:pt-0 flex flex-col sm:flex-row sm:items-center gap-2.5">
                {/* Index & Timestamps */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-mono font-bold text-slate-400 w-5">
                    #{index + 1}
                  </span>
                  
                  {/* Start time */}
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-mono">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <input
                      type="text"
                      defaultValue={secondsToTimeString(cue.start)}
                      onBlur={(e) => handleUpdateCue(cue.id, 'start', timeStringToSeconds(e.target.value))}
                      placeholder="00:00"
                      className="w-14 bg-transparent text-center font-bold text-slate-800 dark:text-slate-200 outline-none"
                    />
                  </div>

                  <span className="text-slate-400 text-xs font-bold">to</span>

                  {/* End time */}
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-mono">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <input
                      type="text"
                      defaultValue={secondsToTimeString(cue.end)}
                      onBlur={(e) => handleUpdateCue(cue.id, 'end', timeStringToSeconds(e.target.value))}
                      placeholder="00:05"
                      className="w-14 bg-transparent text-center font-bold text-slate-800 dark:text-slate-200 outline-none"
                    />
                  </div>
                </div>

                {/* Subtitle Text Input */}
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={cue.text}
                    onChange={(e) => handleUpdateCue(cue.id, 'text', e.target.value)}
                    placeholder="Enter spoken text for this timestamp..."
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Delete button */}
                <button
                  type="button"
                  onClick={() => handleRemoveCue(cue.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer self-end sm:self-center shrink-0"
                  title="Delete line"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-white/10 flex items-center justify-between bg-slate-50/50 dark:bg-white/[0.02]">
          <button
            type="button"
            onClick={handleAddCue}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4 text-blue-500" />
            <span>Add Timestamp Line</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-black shadow-md shadow-blue-600/30 flex items-center gap-1.5 cursor-pointer transition-all"
            >
              {isSaving ? (
                <span>Saving...</span>
              ) : savedSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Captions</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
