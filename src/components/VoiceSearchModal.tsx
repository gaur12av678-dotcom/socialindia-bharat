import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, X, Volume2, AlertCircle, Search } from 'lucide-react';
import { useTranslation } from '../i18n';

interface VoiceSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTranscript: (query: string) => void;
}

export const VoiceSearchModal: React.FC<VoiceSearchModalProps> = ({ isOpen, onClose, onTranscript }) => {
  const { isHindi } = useTranslation();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [alternatives, setAlternatives] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedLang, setSelectedLang] = useState<'hi-IN' | 'en-IN' | 'en-US'>(() => isHindi ? 'hi-IN' : 'en-IN');

  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef('');

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  const handleFinishTranscript = (textToSubmit?: string) => {
    const query = (textToSubmit ?? transcriptRef.current ?? transcript).trim();
    if (query) {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
      setIsListening(false);
      onTranscript(query);
      onClose();
    }
  };

  const startListening = () => {
    setErrorMsg('');
    setTranscript('');
    setAlternatives([]);
    transcriptRef.current = '';

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErrorMsg(
        isHindi
          ? 'आपके ब्राउज़र में वॉइस इनपुट समर्थित नहीं है। कृपया Chrome, Edge या समर्थित ब्राउज़र का उपयोग करें।'
          : 'Voice recognition is not supported in this browser. Please use Chrome or Edge.'
      );
      setIsListening(false);
      return;
    }

    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 3;
      recognition.lang = selectedLang;
      recognitionRef.current = recognition;

      recognition.onstart = () => {
        setIsListening(true);
        setErrorMsg('');
      };

      recognition.onresult = (event: any) => {
        const result = event.results[event.resultIndex] ?? event.results[event.results.length - 1];
        if (!result) return;

        const recognizedPhrases = Array.from(result as ArrayLike<{ transcript?: string }>)
          .map(item => item.transcript?.trim() || '')
          .filter((phrase, index, phrases) => phrase && phrases.indexOf(phrase) === index);
        const bestMatch = recognizedPhrases[0];
        if (!bestMatch) return;

        setTranscript(bestMatch);
        transcriptRef.current = bestMatch;
        setAlternatives(result.isFinal ? recognizedPhrases.slice(1) : []);

        if (result.isFinal) {
          try { recognition.stop(); } catch {}
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          setIsListening(false);
          setErrorMsg(
            isHindi
              ? 'माइक्रोफ़ोन अनुमति बंद है। कृपया अपने ब्राउज़र या मोबाइल में माइक्रोफ़ोन की अनुमति दें।'
              : 'Microphone permission blocked. Please allow microphone access in your browser.'
          );
        } else if (event.error === 'no-speech') {
          // If already captured something, don't show error, just wait
          if (!transcriptRef.current) {
            setErrorMsg(
              isHindi
                ? 'कोई आवाज़ सुनाई नहीं दी। कृपया माइक्रोफ़ोन दबाकर पुनः बोलें।'
                : 'No speech detected. Please tap the mic and try speaking again.'
            );
          }
        } else if (event.error === 'network') {
          setErrorMsg(
            isHindi
              ? 'नेटवर्क समस्या। कृपया इंटरनेट कनेक्शन जांचें।'
              : 'Network error occurred during voice recognition. Check your connection.'
          );
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err: any) {
      console.warn('Recognition start exception:', err);
      setIsListening(false);
      setErrorMsg(
        isHindi
          ? 'माइक्रोफ़ोन शुरू करने के लिए नीचे बटन दबाएं।'
          : 'Tap the microphone button below to start speaking.'
      );
    }
  };

  useEffect(() => {
    if (!isOpen) {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
      setIsListening(false);
      setTranscript('');
      setAlternatives([]);
      setErrorMsg('');
      return;
    }

    startListening();

    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
    };
  }, [isOpen, selectedLang]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-sm sm:max-w-md bg-white dark:bg-[#16171a] rounded-[28px] p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white flex flex-col items-center text-center space-y-5 animate-zoom-in">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Language selector chips */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-full text-[11px] font-bold">
          <button
            type="button"
            onClick={() => setSelectedLang('hi-IN')}
            className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
              selectedLang === 'hi-IN'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            🇮🇳 हिन्दी (Hindi)
          </button>
          <button
            type="button"
            onClick={() => setSelectedLang('en-IN')}
            className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
              selectedLang === 'en-IN'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            English (India)
          </button>
        </div>

        {/* Header Title */}
        <div>
          <h3 className="text-xl font-black tracking-tight flex items-center justify-center gap-2">
            <span>
              {isListening 
                ? (isHindi ? 'बोलिए, सुन रहे हैं...' : 'Listening...') 
                : (isHindi ? 'बोलकर खोजें' : 'Search with your voice')}
            </span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            {isListening 
              ? (isHindi ? 'अब कोई भी गाना, वीडियो या क्रिएटर का नाम बोलें' : 'Speak video title, creator or any topic clearly') 
              : (isHindi ? 'शुरू करने के लिए नीचे माइक दबाएं' : 'Tap the microphone below to speak')}
          </p>
        </div>

        {/* Pulsing Animated Mic Button */}
        <div className="relative flex items-center justify-center my-2">
          {isListening && (
            <>
              <span className="absolute w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-rose-500/20 animate-ping pointer-events-none" />
              <span className="absolute w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-rose-500/30 animate-pulse pointer-events-none" />
            </>
          )}
          <button
            onClick={isListening ? () => {
              if (recognitionRef.current) {
                try { recognitionRef.current.stop(); } catch {}
              }
              setIsListening(false);
            } : startListening}
            className={`relative z-10 w-20 h-20 sm:w-22 sm:h-22 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xl active:scale-95 ${
              isListening
                ? 'bg-rose-600 text-white shadow-rose-600/40 ring-4 ring-rose-500/30 scale-105'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/30'
            }`}
            title={isListening ? "Listening... tap to pause" : "Tap to speak"}
          >
            {isListening ? (
              <Mic className="w-10 h-10 animate-bounce" />
            ) : (
              <MicOff className="w-9 h-9" />
            )}
          </button>
        </div>

        {/* Live Audio Waves when speaking */}
        {isListening && (
          <div className="flex items-center justify-center gap-1 h-5">
            {[40, 75, 100, 60, 90, 45, 80, 55].map((height, idx) => (
              <span
                key={idx}
                className="w-1 bg-rose-500 rounded-full animate-pulse"
                style={{
                  height: `${height}%`,
                  animationDelay: `${idx * 120}ms`,
                  animationDuration: '600ms'
                }}
              />
            ))}
          </div>
        )}

        {/* Live Transcript / Recognized Query Box */}
        <div className="w-full min-h-[56px] flex flex-col items-center justify-center px-2">
          {errorMsg ? (
            <div className="w-full flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-2xl text-xs text-rose-600 dark:text-rose-400 text-left">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          ) : transcript ? (
            <div className="w-full space-y-2">
              <label className="flex items-center gap-2 p-3 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-2xl text-left">
                <Volume2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <input
                  type="text"
                  value={transcript}
                  onChange={event => {
                    setTranscript(event.target.value);
                    transcriptRef.current = event.target.value;
                  }}
                  aria-label={isHindi ? 'पहचाना गया वाक्य संपादित करें' : 'Edit recognized phrase'}
                  className="min-w-0 flex-1 bg-transparent text-sm sm:text-base font-extrabold text-slate-900 dark:text-white outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleFinishTranscript()}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95 transition-all"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>{isHindi ? 'खोजें' : 'Search'}</span>
                </button>
              </label>
              {alternatives.length > 0 && (
                <div className="flex flex-wrap justify-center gap-1.5">
                  {alternatives.map(phrase => (
                    <button
                      key={phrase}
                      type="button"
                      onClick={() => {
                        setTranscript(phrase);
                        transcriptRef.current = phrase;
                      }}
                      className="px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      {phrase}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <span className="text-xs text-slate-400 italic font-medium">
              {isHindi ? 'उदा. "Arijit Singh song", "Bharat News", "Funny Clips"' : 'e.g. "Trending Hindi Songs", "Tech News", "Cricket"'}
            </span>
          )}
        </div>

        {/* Retry / Action button */}
        <div className="w-full pt-1 space-y-2">
          {errorMsg && (
            <button
              onClick={startListening}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98"
            >
              <Mic className="w-4 h-4" />
              <span>{isHindi ? 'पुनः प्रयास करें / अनुमति दें' : 'Try Again / Allow Microphone'}</span>
            </button>
          )}

        </div>

      </div>
    </div>
  );
};
