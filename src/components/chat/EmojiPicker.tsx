import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, X, Smile, ThumbsUp, Heart, PartyPopper, Sparkles, Flag } from 'lucide-react';
import { useTranslation } from '../../i18n';

interface EmojiPickerProps {
  onSelectEmoji: (emoji: string) => void;
  onClose: () => void;
  toggleButtonRef?: React.RefObject<HTMLElement | null>;
}

interface EmojiCategory {
  id: string;
  name: string;
  hindiName: string;
  icon: React.ReactNode;
  emojis: { emoji: string; keywords: string[] }[];
}

const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: 'smileys',
    name: 'Smileys & Emotion',
    hindiName: 'चेहरे व भाव',
    icon: <Smile className="w-4 h-4" />,
    emojis: [
      { emoji: '😀', keywords: ['grinning', 'face', 'happy', 'smile'] },
      { emoji: '😃', keywords: ['smiley', 'happy', 'joy', 'smile'] },
      { emoji: '😄', keywords: ['smile', 'happy', 'laugh'] },
      { emoji: '😁', keywords: ['beam', 'grin', 'teeth'] },
      { emoji: '😆', keywords: ['laughing', 'lol', 'haha'] },
      { emoji: '😅', keywords: ['sweat', 'smile', 'relief'] },
      { emoji: '🤣', keywords: ['rofl', 'rolling', 'laughing'] },
      { emoji: '😂', keywords: ['joy', 'crying', 'laughing', 'tears'] },
      { emoji: '🥹', keywords: ['holding', 'tears', 'proud', 'cry'] },
      { emoji: '😊', keywords: ['blush', 'smile', 'warm'] },
      { emoji: '😇', keywords: ['angel', 'halo', 'innocent'] },
      { emoji: '🙂', keywords: ['slightly', 'smiling', 'neutral'] },
      { emoji: '🙃', keywords: ['upside', 'down', 'silly'] },
      { emoji: '😉', keywords: ['wink', 'flirt'] },
      { emoji: '😌', keywords: ['relieved', 'peace', 'calm'] },
      { emoji: '😍', keywords: ['heart', 'eyes', 'love', 'crush'] },
      { emoji: '🥰', keywords: ['hearts', 'love', 'adored'] },
      { emoji: '😘', keywords: ['kiss', 'blow', 'love'] },
      { emoji: '😗', keywords: ['kissing'] },
      { emoji: '😙', keywords: ['kissing', 'smiling'] },
      { emoji: '😚', keywords: ['kissing', 'blush'] },
      { emoji: '😋', keywords: ['yum', 'delicious', 'food', 'tongue'] },
      { emoji: '😛', keywords: ['tongue', 'playful'] },
      { emoji: '😜', keywords: ['wink', 'tongue', 'crazy'] },
      { emoji: '🤪', keywords: ['zany', 'goofy', 'wild'] },
      { emoji: '😝', keywords: ['squinting', 'tongue'] },
      { emoji: '🤑', keywords: ['money', 'rich', 'dollar'] },
      { emoji: '🤗', keywords: ['hug', 'open', 'hands'] },
      { emoji: '🤭', keywords: ['giggle', 'shhh', 'whisper'] },
      { emoji: '🤫', keywords: ['shush', 'quiet', 'secret'] },
      { emoji: '🤔', keywords: ['thinking', 'hmm', 'ponder'] },
      { emoji: '🤐', keywords: ['zipper', 'mouth', 'silent'] },
      { emoji: '🤨', keywords: ['raised', 'eyebrow', 'skeptical'] },
      { emoji: '😐', keywords: ['neutral', 'meh'] },
      { emoji: '😑', keywords: ['expressionless'] },
      { emoji: '😶', keywords: ['no', 'mouth', 'speechless'] },
      { emoji: '😏', keywords: ['smirk', 'cool', 'flirt'] },
      { emoji: '😒', keywords: ['unamused', 'bored'] },
      { emoji: '🙄', keywords: ['rolling', 'eyes', 'whatever'] },
      { emoji: '😬', keywords: ['grimace', 'awkward'] },
      { emoji: '🤥', keywords: ['lying', 'pinocchio'] },
      { emoji: '😌', keywords: ['calm', 'phew'] },
      { emoji: '😔', keywords: ['pensive', 'sad'] },
      { emoji: '😪', keywords: ['sleepy', 'tired'] },
      { emoji: '🤤', keywords: ['drooling', 'hungry'] },
      { emoji: '😴', keywords: ['sleeping', 'zzz'] },
      { emoji: '😷', keywords: ['mask', 'sick'] },
      { emoji: '🤒', keywords: ['thermometer', 'ill'] },
      { emoji: '🤕', keywords: ['bandage', 'hurt'] },
      { emoji: '🤢', keywords: ['nauseated', 'gross'] },
      { emoji: '🤮', keywords: ['vomiting', 'puke'] },
      { emoji: '🤧', keywords: ['sneezing', 'cold'] },
      { emoji: '🥵', keywords: ['hot', 'heat', 'sweat'] },
      { emoji: '🥶', keywords: ['cold', 'freezing', 'ice'] },
      { emoji: '🥴', keywords: ['woozy', 'drunk'] },
      { emoji: '😵', keywords: ['dizzy', 'dead'] },
      { emoji: '🤯', keywords: ['exploding', 'mindblown'] },
      { emoji: '🤠', keywords: ['cowboy', 'hat'] },
      { emoji: '🥳', keywords: ['partying', 'celebrate'] },
      { emoji: '😎', keywords: ['sunglasses', 'cool', 'chill'] },
      { emoji: '🤓', keywords: ['nerd', 'geek', 'smart'] },
      { emoji: '🧐', keywords: ['monocle', 'inspect'] },
      { emoji: '😕', keywords: ['confused'] },
      { emoji: '😟', keywords: ['worried'] },
      { emoji: '🙁', keywords: ['slightly', 'frowning'] },
      { emoji: '☹️', keywords: ['frown', 'sad'] },
      { emoji: '😮', keywords: ['open', 'mouth', 'surprised'] },
      { emoji: '😯', keywords: ['hushed', 'shock'] },
      { emoji: '😲', keywords: ['astonished'] },
      { emoji: '😳', keywords: ['flushed', 'blushing'] },
      { emoji: '🥺', keywords: ['pleading', 'puppy', 'eyes'] },
      { emoji: '😦', keywords: ['frowning', 'gasp'] },
      { emoji: '😧', keywords: ['anguished'] },
      { emoji: '😨', keywords: ['fearful', 'scared'] },
      { emoji: '😰', keywords: ['anxious', 'sweat'] },
      { emoji: '😥', keywords: ['sad', 'relieved'] },
      { emoji: '😢', keywords: ['crying', 'tear', 'sad'] },
      { emoji: '😭', keywords: ['loudly', 'sobbing', 'crying'] },
      { emoji: '😱', keywords: ['screaming', 'scared'] },
      { emoji: '😖', keywords: ['confounded'] },
      { emoji: '😣', keywords: ['persevering'] },
      { emoji: '😞', keywords: ['disappointed'] },
      { emoji: '😓', keywords: ['downcast', 'sweat'] },
      { emoji: '😩', keywords: ['weary', 'tired'] },
      { emoji: '😫', keywords: ['tired'] },
      { emoji: '🥱', keywords: ['yawn', 'sleepy'] },
      { emoji: '😤', keywords: ['triumph', 'huff'] },
      { emoji: '😡', keywords: ['angry', 'mad', 'red'] },
      { emoji: '😠', keywords: ['angry', 'grumpy'] },
      { emoji: '🤬', keywords: ['cursing', 'swearing'] }
    ]
  },
  {
    id: 'gestures',
    name: 'Hands & Gestures',
    hindiName: 'हाथ व इशारे',
    icon: <ThumbsUp className="w-4 h-4" />,
    emojis: [
      { emoji: '👍', keywords: ['thumbs', 'up', 'yes', 'like', 'agree'] },
      { emoji: '👎', keywords: ['thumbs', 'down', 'no', 'dislike'] },
      { emoji: '👏', keywords: ['clap', 'applause', 'praise'] },
      { emoji: '🙌', keywords: ['raising', 'hands', 'hooray'] },
      { emoji: '🫶', keywords: ['heart', 'hands', 'love'] },
      { emoji: '👐', keywords: ['open', 'hands'] },
      { emoji: '🤲', keywords: ['palms', 'together', 'pray'] },
      { emoji: '🤝', keywords: ['handshake', 'deal', 'agreement'] },
      { emoji: '🙏', keywords: ['folded', 'hands', 'namaste', 'please', 'pray', 'thanks'] },
      { emoji: '✌️', keywords: ['peace', 'victory'] },
      { emoji: '🤞', keywords: ['crossed', 'fingers', 'luck'] },
      { emoji: '🫰', keywords: ['hand', 'heart', 'kpop'] },
      { emoji: '🤟', keywords: ['love', 'you', 'gesture'] },
      { emoji: '🤘', keywords: ['rock', 'on', 'horns'] },
      { emoji: '🤙', keywords: ['call', 'me', 'shaka'] },
      { emoji: '👌', keywords: ['ok', 'perfect'] },
      { emoji: '🤌', keywords: ['pinched', 'fingers', 'italian'] },
      { emoji: '🤏', keywords: ['pinching', 'small', 'little'] },
      { emoji: '👈', keywords: ['point', 'left'] },
      { emoji: '👉', keywords: ['point', 'right'] },
      { emoji: '👆', keywords: ['point', 'up'] },
      { emoji: '👇', keywords: ['point', 'down'] },
      { emoji: '☝️', keywords: ['index', 'up'] },
      { emoji: '👋', keywords: ['wave', 'hello', 'bye'] },
      { emoji: '🤚', keywords: ['raised', 'back', 'hand'] },
      { emoji: '🖐️', keywords: ['splayed', 'fingers'] },
      { emoji: '✋', keywords: ['high', 'five', 'stop'] },
      { emoji: '🖖', keywords: ['vulcan', 'salute', 'spock'] },
      { emoji: '👊', keywords: ['fist', 'punch', 'brofist'] },
      { emoji: '✊', keywords: ['raised', 'fist', 'power'] },
      { emoji: '🤛', keywords: ['left', 'fist'] },
      { emoji: '🤜', keywords: ['right', 'fist'] },
      { emoji: '✍️', keywords: ['writing', 'pen'] },
      { emoji: '💅', keywords: ['nail', 'polish', 'sass'] },
      { emoji: '🤳', keywords: ['selfie', 'phone'] },
      { emoji: '💪', keywords: ['muscle', 'strong', 'flex'] }
    ]
  },
  {
    id: 'hearts',
    name: 'Love & Hearts',
    hindiName: 'दिल व प्यार',
    icon: <Heart className="w-4 h-4" />,
    emojis: [
      { emoji: '❤️', keywords: ['red', 'heart', 'love'] },
      { emoji: '🧡', keywords: ['orange', 'heart'] },
      { emoji: '💛', keywords: ['yellow', 'heart'] },
      { emoji: '💚', keywords: ['green', 'heart'] },
      { emoji: '💙', keywords: ['blue', 'heart'] },
      { emoji: '💜', keywords: ['purple', 'heart'] },
      { emoji: '🖤', keywords: ['black', 'heart'] },
      { emoji: '🤍', keywords: ['white', 'heart'] },
      { emoji: '🤎', keywords: ['brown', 'heart'] },
      { emoji: '💔', keywords: ['broken', 'heart', 'sad'] },
      { emoji: '❤️‍🔥', keywords: ['heart', 'on', 'fire'] },
      { emoji: '❤️‍🩹', keywords: ['mending', 'heart'] },
      { emoji: '❣️', keywords: ['heart', 'exclamation'] },
      { emoji: '💕', keywords: ['two', 'hearts', 'love'] },
      { emoji: '💞', keywords: ['revolving', 'hearts'] },
      { emoji: '💓', keywords: ['beating', 'heart'] },
      { emoji: '💗', keywords: ['growing', 'heart'] },
      { emoji: '💖', keywords: ['sparkling', 'heart'] },
      { emoji: '💘', keywords: ['cupid', 'arrow'] },
      { emoji: '💝', keywords: ['ribbon', 'gift'] },
      { emoji: '💟', keywords: ['heart', 'decoration'] },
      { emoji: '💌', keywords: ['love', 'letter'] },
      { emoji: '💋', keywords: ['kiss', 'lips'] },
      { emoji: '🫂', keywords: ['people', 'hugging', 'hug'] }
    ]
  },
  {
    id: 'celebrate',
    name: 'Party & Activities',
    hindiName: 'पार्टी व उत्सव',
    icon: <PartyPopper className="w-4 h-4" />,
    emojis: [
      { emoji: '🎉', keywords: ['tada', 'party', 'celebrate'] },
      { emoji: '🎊', keywords: ['confetti', 'ball'] },
      { emoji: '🎈', keywords: ['balloon'] },
      { emoji: '🎂', keywords: ['birthday', 'cake'] },
      { emoji: '🍰', keywords: ['cake', 'slice'] },
      { emoji: '🍾', keywords: ['champagne', 'drink'] },
      { emoji: '🥂', keywords: ['cheers', 'clinking', 'glasses'] },
      { emoji: '🍻', keywords: ['beer', 'clinking'] },
      { emoji: '☕', keywords: ['coffee', 'tea', 'chai'] },
      { emoji: '🧋', keywords: ['boba', 'bubble', 'tea'] },
      { emoji: '🍕', keywords: ['pizza'] },
      { emoji: '🍔', keywords: ['burger'] },
      { emoji: '🍟', keywords: ['fries'] },
      { emoji: '🍿', keywords: ['popcorn', 'movie'] },
      { emoji: '🍫', keywords: ['chocolate'] },
      { emoji: '🍬', keywords: ['candy'] },
      { emoji: '🍩', keywords: ['doughnut'] },
      { emoji: '🏆', keywords: ['trophy', 'winner', 'first'] },
      { emoji: '🥇', keywords: ['gold', 'medal'] },
      { emoji: '🎯', keywords: ['bullseye', 'target'] },
      { emoji: '🎮', keywords: ['game', 'controller'] },
      { emoji: '🎬', keywords: ['clapper', 'movie', 'film'] },
      { emoji: '🎤', keywords: ['mic', 'microphone', 'sing'] },
      { emoji: '🎧', keywords: ['headphones', 'music'] },
      { emoji: '🎸', keywords: ['guitar', 'rock'] }
    ]
  },
  {
    id: 'india',
    name: 'India & Culture',
    hindiName: 'भारत व संस्कृति',
    icon: <Flag className="w-4 h-4" />,
    emojis: [
      { emoji: '🇮🇳', keywords: ['india', 'flag', 'bharat', 'tiranga'] },
      { emoji: '🙏', keywords: ['namaste', 'pranam', 'folded', 'hands'] },
      { emoji: '🪔', keywords: ['diya', 'lamp', 'diwali', 'deepavali'] },
      { emoji: '🕉️', keywords: ['om', 'hinduism', 'spiritual'] },
      { emoji: '🏏', keywords: ['cricket', 'bat', 'ball', 'sports'] },
      { emoji: '🦚', keywords: ['peacock', 'mora', 'national', 'bird'] },
      { emoji: '🐅', keywords: ['tiger', 'sher', 'national', 'animal'] },
      { emoji: '🐘', keywords: ['elephant', 'hathi', 'ganesha'] },
      { emoji: '🥭', keywords: ['mango', 'aam', 'national', 'fruit'] },
      { emoji: '🍛', keywords: ['curry', 'rice', 'desi', 'khana'] },
      { emoji: '🫓', keywords: ['roti', 'naan', 'flatbread'] },
      { emoji: '🫖', keywords: ['teapot', 'chai', 'garam'] },
      { emoji: '🪷', keywords: ['lotus', 'kamal', 'flower'] },
      { emoji: '🌺', keywords: ['hibiscus', 'flower'] },
      { emoji: '🌸', keywords: ['cherry', 'blossom', 'flower'] },
      { emoji: '🎆', keywords: ['fireworks', 'patakhe'] },
      { emoji: '🧨', keywords: ['firecracker', 'diwali'] },
      { emoji: '👑', keywords: ['crown', 'king', 'queen'] }
    ]
  },
  {
    id: 'symbols',
    name: 'Fire & Sparkles',
    hindiName: 'प्रतीक व सितारे',
    icon: <Sparkles className="w-4 h-4" />,
    emojis: [
      { emoji: '🔥', keywords: ['fire', 'flame', 'lit', 'hot'] },
      { emoji: '✨', keywords: ['sparkles', 'magic', 'shine', 'star'] },
      { emoji: '🌟', keywords: ['star', 'glow'] },
      { emoji: '⭐', keywords: ['star', 'favorite'] },
      { emoji: '💫', keywords: ['dizzy', 'sparkle'] },
      { emoji: '💥', keywords: ['collision', 'boom'] },
      { emoji: '💯', keywords: ['hundred', 'perfect', '100'] },
      { emoji: '⚡', keywords: ['lightning', 'fast', 'zap'] },
      { emoji: '🌈', keywords: ['rainbow'] },
      { emoji: '☀️', keywords: ['sun', 'sunny'] },
      { emoji: '🌙', keywords: ['crescent', 'moon'] },
      { emoji: '🚀', keywords: ['rocket', 'launch', 'moon'] },
      { emoji: '🔔', keywords: ['bell', 'notification'] },
      { emoji: '💡', keywords: ['bulb', 'idea'] },
      { emoji: '📍', keywords: ['pin', 'location'] },
      { emoji: '✅', keywords: ['check', 'done', 'yes'] },
      { emoji: '❌', keywords: ['cross', 'wrong', 'no'] },
      { emoji: '⚠️', keywords: ['warning', 'alert'] },
      { emoji: '💸', keywords: ['money', 'flying'] },
      { emoji: '💰', keywords: ['money', 'bag', 'wealth'] }
    ]
  }
];

export const EmojiPicker: React.FC<EmojiPickerProps> = ({ onSelectEmoji, onClose, toggleButtonRef }) => {
  const { isHindi } = useTranslation();
  const [activeTab, setActiveTab] = useState('smileys');
  const [search, setSearch] = useState('');
  const pickerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close when clicked outside, ignoring toggleButtonRef if clicked
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const targetNode = e.target as Node;
      if (
        pickerRef.current && 
        !pickerRef.current.contains(targetNode) &&
        (!toggleButtonRef?.current || !toggleButtonRef.current.contains(targetNode))
      ) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, toggleButtonRef]);

  // Filtered emojis based on search query
  const displayedEmojis = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      const cat = EMOJI_CATEGORIES.find(c => c.id === activeTab) || EMOJI_CATEGORIES[0];
      return cat.emojis.map(e => e.emoji);
    }

    const matched: string[] = [];
    for (const cat of EMOJI_CATEGORIES) {
      for (const item of cat.emojis) {
        if (
          item.keywords.some(k => k.includes(q)) ||
          item.emoji === q
        ) {
          if (!matched.includes(item.emoji)) {
            matched.push(item.emoji);
          }
        }
      }
    }
    return matched;
  }, [search, activeTab]);

  return (
    <div
      ref={pickerRef}
      className="absolute bottom-full left-0 mb-3 z-50 w-80 sm:w-88 bg-white dark:bg-[#161618] border border-slate-200 dark:border-[#2a2a2e] rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-900 dark:text-slate-100 animate-in fade-in zoom-in-95 duration-150"
      style={{ maxHeight: '380px' }}
    >
      {/* Search Header */}
      <div className="p-3 border-b border-slate-100 dark:border-[#222] flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder={isHindi ? 'इमोजी खोजें (उदा. smile, love, fire)...' : 'Search emojis (e.g. smile, love, fire)...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-7 py-1.5 bg-slate-100 dark:bg-[#202024] rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#222] rounded-lg cursor-pointer"
          title={isHindi ? 'इमोजी बंद करें' : 'Close Emojis'}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Category Tabs (shown only if not searching) */}
      {!search && (
        <div className="flex items-center justify-around px-2 py-1.5 border-b border-slate-100 dark:border-[#222] bg-slate-50/70 dark:bg-[#1a1a1e]">
          {EMOJI_CATEGORIES.map((cat) => {
            const isActive = activeTab === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-[#252528]'
                }`}
                title={isHindi ? cat.hindiName : cat.name}
              >
                {cat.icon}
              </button>
            );
          })}
        </div>
      )}

      {/* Emojis Grid */}
      <div className="flex-1 overflow-y-auto p-3 grid grid-cols-7 gap-1.5 scrollbar-thin">
        {displayedEmojis.length === 0 ? (
          <div className="col-span-7 py-8 text-center text-xs text-slate-400">
            {isHindi ? `"${search}" के लिए कोई इमोजी नहीं मिला` : `No emojis found for "${search}"`}
          </div>
        ) : (
          displayedEmojis.map((emoji, idx) => (
            <button
              key={`${emoji}-${idx}`}
              onClick={() => onSelectEmoji(emoji)}
              className="w-9 h-9 flex items-center justify-center text-xl rounded-xl hover:bg-slate-100 dark:hover:bg-[#25252b] active:scale-90 transition-transform cursor-pointer select-none"
            >
              {emoji}
            </button>
          ))
        )}
      </div>

      {/* Category Footer Label */}
      <div className="px-3 py-1.5 bg-slate-50 dark:bg-[#121214] border-t border-slate-100 dark:border-[#202024] flex items-center justify-between text-[10px] text-slate-400 font-bold">
        <span>{search ? (isHindi ? `${displayedEmojis.length} परिणाम मिले` : `Found ${displayedEmojis.length} results`) : (isHindi ? EMOJI_CATEGORIES.find(c => c.id === activeTab)?.hindiName : EMOJI_CATEGORIES.find(c => c.id === activeTab)?.name)}</span>
        <span className="text-[9px] text-slate-400">{isHindi ? 'जोड़ने के लिए क्लिक करें' : 'Click to insert'}</span>
      </div>
    </div>
  );
};
