import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, X, Volume2, AlertCircle } from 'lucide-react';
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
  const [errorMsg, setErrorMsg] = useState('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (!isOpen) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
      setIsListening(false);
      setTranscript('');
      setErrorMsg('');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMsg(
        isHindi
          ? 'आपके ब्राउज़र में वॉइस सर्च समर्थित नहीं है। कृपया Chrome या Edge का उपयोग करें।'
          : 'Voice search is not supported in this browser. Please use Chrome or Edge.'
      );
      return;
    }

    let isMounted = true;

    const startSpeechRecognition = () => {
      if (!isMounted) return;

      try {
        if (recognitionRef.current) {
          try { recognitionRef.current.abort(); } catch {}
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = isHindi ? 'hi-IN' : 'en-IN';
        recognitionRef.current = recognition;

        recognition.onstart = () => {
          if (!isMounted) return;
          setIsListening(true);
          setErrorMsg('');
          setTranscript('');
        };

        recognition.onresult = (event: any) => {
          if (!isMounted) return;
          let current = '';
          for (let i = 0; i < event.results.length; i++) {
            current += event.results[i][0].transcript;
          }
          setTranscript(current);

          if (event.results[0].isFinal) {
            const finalQuery = current.trim();
            if (finalQuery) {
              setTimeout(() => {
                if (isMounted) {
                  onTranscript(finalQuery);
                  onClose();
                }
              }, 600);
            }
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('Speech recognition event error:', event.error);
          if (!isMounted) return;
          setIsListening(false);
          if (event.error === 'not-allowed') {
            setErrorMsg(
              isHindi
                ? 'माइक्रोफ़ोन अनुमति चालू नहीं है। कृपया नीचे "माइक्रोफ़ोन अनुमति दें" बटन दबाएं।'
                : 'Microphone permission not enabled. Tap "Allow Microphone" below to grant access.'
            );
          } else if (event.error === 'no-speech') {
            setErrorMsg(
              isHindi
                ? 'कोई आवाज़ सुनाई नहीं दी। कृपया माइक्रोफ़ोन दबाकर पुनः बोलें।'
                : 'No speech heard. Please tap the mic button and speak clearly.'
            );
          } else {
            setErrorMsg(
              isHindi
                ? 'वॉइस इनपुट में समस्या आई। पुनः प्रयास करें।'
                : 'Voice recognition error. Please tap the mic to try again.'
            );
          }
        };

        recognition.onend = () => {
          if (isMounted) {
            setIsListening(false);
          }
        };

        recognition.start();
      } catch (err: any) {
        console.warn('Speech recognition start error:', err);
        if (isMounted) {
          setIsListening(false);
          // If starting without user gesture was restricted by browser, prompt user to tap
          setErrorMsg(
            isHindi 
              ? 'बोलने के लिए नीचे माइक्रोफ़ोन बटन दबाएं।' 
              : 'Tap the microphone button below to start speaking.'
          );
        }
      }
    };

    // Auto-start listening on open
    startSpeechRecognition();

    return () => {
      isMounted = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, [isOpen, isHindi]);

  const requestPermissionAndListen = async () => {
    setErrorMsg('');
    setTranscript('');
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(t => t.stop());
      }
    } catch (e) {
      console.warn('Explicit getUserMedia request failed:', e);
    }
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        if (recognitionRef.current) {
          try { recognitionRef.current.abort(); } catch {}
        }
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = isHindi ? 'hi-IN' : 'en-IN';
        recognitionRef.current = recognition;

        recognition.onstart = () => {
          setIsListening(true);
          setErrorMsg('');
          setTranscript('');
        };

        recognition.onresult = (event: any) => {
          let current = '';
          for (let i = 0; i < event.results.length; i++) {
            current += event.results[i][0].transcript;
          }
          setTranscript(current);

          if (event.results[0].isFinal) {
            const finalQuery = current.trim();
            if (finalQuery) {
              setTimeout(() => {
                onTranscript(finalQuery);
                onClose();
              }, 600);
            }
          }
        };

        recognition.onerror = (event: any) => {
          setIsListening(false);
          if (event.error === 'not-allowed') {
            setErrorMsg(
              isHindi
                ? 'माइक्रोफ़ोन अनुमति ब्लॉक है। कृपया ब्राउज़र/ऐप सेटिंग्स में माइक्रोफ़ोन की अनुमति दें।'
                : 'Microphone permission blocked. Please enable microphone in Android / browser app settings.'
            );
          } else {
            setErrorMsg(isHindi ? 'पुनः प्रयास करें।' : 'Please try again.');
          }
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognition.start();
      } catch (err) {
        setErrorMsg(isHindi ? 'माइक्रोफ़ोन शुरू नहीं हो सका।' : 'Could not start microphone.');
      }
    }
  };

  const handleRetry = () => {
    requestPermissionAndListen();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-sm sm:max-w-md bg-white dark:bg-[#16171a] rounded-[28px] p-7 shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white flex flex-col items-center text-center space-y-6 animate-zoom-in">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="pt-2">
          <h3 className="text-xl font-black tracking-tight">
            {isListening 
              ? (isHindi ? 'सुन रहे हैं...' : 'Listening...') 
              : (isHindi ? 'बोलकर खोजें' : 'Search with your voice')}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isListening 
              ? (isHindi ? 'अब स्पष्ट बोलिए...' : 'Say a video title, creator, or topic') 
              : (isHindi ? 'खोजने के लिए माइक्रोफ़ोन बटन दबाएं' : 'Tap the microphone to speak')}
          </p>
        </div>

        {/* Pulsing Animated Mic Button */}
        <div className="relative flex items-center justify-center my-3">
          {isListening && (
            <>
              <span className="absolute w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-rose-500/20 animate-ping" />
              <span className="absolute w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-rose-500/30 animate-pulse" />
            </>
          )}
          <button
            onClick={isListening ? () => recognitionRef.current?.stop() : handleRetry}
            className={`relative z-10 w-18 h-18 sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-95 ${
              isListening
                ? 'bg-rose-600 text-white shadow-rose-600/40 ring-4 ring-rose-500/30'
                : 'bg-[#2563eb] hover:bg-[#1d4ed8] text-white shadow-blue-500/30'
            }`}
          >
            {isListening ? (
              <Mic className="w-9 h-9 animate-bounce" />
            ) : (
              <MicOff className="w-9 h-9" />
            )}
          </button>
        </div>

        {/* Live Transcript / Feedback */}
        <div className="w-full min-h-[50px] flex items-center justify-center px-4">
          {errorMsg ? (
            <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-2xl text-xs text-rose-600 dark:text-rose-400 text-left">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          ) : transcript ? (
            <div className="flex items-center gap-2 text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 italic">
              <Volume2 className="w-5 h-5 text-rose-500 animate-pulse shrink-0" />
              <span className="truncate max-w-[280px]">"{transcript}"</span>
            </div>
          ) : (
            <span className="text-xs text-slate-400 italic">
              {isHindi ? 'उदा. "Vande Bharat Shorts", "Coding Tutorials"' : 'e.g. "Trending Hindi Songs", "Tech News"'}
            </span>
          )}
        </div>

        {/* Footer actions */}
        <div className="w-full pt-1">
          {errorMsg && (
            <button
              onClick={handleRetry}
              className="w-full py-3 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98"
            >
              <Mic className="w-4 h-4" />
              <span>{isHindi ? 'माइक्रोफ़ोन अनुमति दें / पुनः बोलें' : 'Allow Microphone / Speak Again'}</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
