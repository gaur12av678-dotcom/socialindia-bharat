import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  deleteDoc, 
  updateDoc 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { SoundTrack, Video } from '../types';

export const DEFAULT_SOUNDS: SoundTrack[] = [
  {
    soundId: 'sound_1',
    title: 'Desi Bass & Dhol Beats',
    artist: 'DJ Bharat Swag',
    category: 'Punjabi & Bollywood',
    coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    duration: 30,
  },
  {
    soundId: 'sound_2',
    title: 'Lo-Fi Midnight Chai Beats',
    artist: 'Chill India Collective',
    category: 'Lo-Fi & Chill',
    coverUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=300&q=80',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    duration: 25,
  },
  {
    soundId: 'sound_3',
    title: 'Victory Gaming Hype Drops',
    artist: 'Cyber Gamer Pro',
    category: 'Gaming & Tech',
    coverUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=300&q=80',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    duration: 15,
  },
  {
    soundId: 'sound_4',
    title: 'Acoustic Morning Vibes',
    artist: 'Sufi Strings Band',
    category: 'Romantic & Acoustic',
    coverUrl: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=300&q=80',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
    duration: 20,
  },
  {
    soundId: 'sound_5',
    title: 'Viral Reel Techno Anthem',
    artist: 'Mumbai Electro Club',
    category: 'Trending Viral',
    coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&q=80',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
    duration: 30,
  },
  {
    soundId: 'sound_6',
    title: 'Bhangra Dhol Explosion',
    artist: 'Punjab Sound Masters',
    category: 'Punjabi & Bollywood',
    coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
    duration: 35,
  },
  {
    soundId: 'sound_7',
    title: 'Monsoon Cafe Rain Lo-Fi',
    artist: 'Acoustic Chai Lounge',
    category: 'Lo-Fi & Chill',
    coverUrl: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=300&q=80',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3',
    duration: 28,
  },
  {
    soundId: 'sound_8',
    title: 'Shorts Phonk Trap 2026',
    artist: 'Desi Trap City',
    category: 'Trending Viral',
    coverUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=300&q=80',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
    duration: 30,
  },
  {
    soundId: 'sound_9',
    title: 'Devotional Flute & Santoor Peace',
    artist: 'Divine Bharat Ragas',
    category: 'Classical & Fusion',
    coverUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=300&q=80',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3',
    duration: 40,
  },
  {
    soundId: 'sound_10',
    title: 'Neon Cyberpunk Rush',
    artist: 'Techno India Beats',
    category: 'Gaming & Tech',
    coverUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=300&q=80',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3',
    duration: 22,
  },
  {
    soundId: 'sound_11',
    title: 'Tum Ho Dil Mein Acoustic',
    artist: 'Sur Taal Duo',
    category: 'Romantic & Acoustic',
    coverUrl: 'https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=300&q=80',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3',
    duration: 26,
  },
  {
    soundId: 'sound_12',
    title: 'Garba Folk Dhamaal',
    artist: 'Gujarat Beatworks',
    category: 'Classical & Fusion',
    coverUrl: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=300&q=80',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3',
    duration: 32,
  },
  {
    soundId: 'sound_13',
    title: 'Dholak Fusion Dhamaka',
    artist: 'Desi Rhythm Band',
    category: 'Punjabi & Bollywood',
    coverUrl: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=300&q=80',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3',
    duration: 28,
  },
  {
    soundId: 'sound_14',
    title: 'Bhojpuri Thumka Beat 2026',
    artist: 'Purvanchal Beats Crew',
    category: 'Bhojpuri & Folk',
    coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3',
    duration: 30,
  },
  {
    soundId: 'sound_15',
    title: 'Tamil Kuthu Energy Drop',
    artist: 'Chennai Bass Project',
    category: 'Trending Viral',
    coverUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=300&q=80',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3',
    duration: 24,
  },
  {
    soundId: 'sound_16',
    title: 'Vande Mataram Patriot Symphony',
    artist: 'Sovereign Strings Ensemble',
    category: 'Classical & Fusion',
    coverUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=300&q=80',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3',
    duration: 35,
  },
  {
    soundId: 'sound_17',
    title: 'Mumbai Gully Rap Beats',
    artist: 'Bambai MC 808',
    category: 'Trending Viral',
    coverUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=300&q=80',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    duration: 22,
  },
  {
    soundId: 'sound_18',
    title: 'Himalayan Bansuri Meditation',
    artist: 'Rishikesh Flute Masters',
    category: 'Devotional & Spiritual',
    coverUrl: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=300&q=80',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    duration: 45,
  },
  {
    soundId: 'sound_19',
    title: 'Jaipur Shehnai & Sitar Utsav',
    artist: 'Royal Rajasthan Heritage',
    category: 'Classical & Fusion',
    coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    duration: 38,
  },
  {
    soundId: 'sound_20',
    title: 'Midnight Marine Drive Lo-Fi',
    artist: 'Bombay Chill Station',
    category: 'Lo-Fi & Chill',
    coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&q=80',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
    duration: 27,
  },
  {
    soundId: 'sound_21',
    title: 'Holi Color Blast EDM',
    artist: 'Festival DJ Squad',
    category: 'Trending Viral',
    coverUrl: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=300&q=80',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
    duration: 31,
  },
  {
    soundId: 'sound_22',
    title: 'Sufi Qawwali Soul Strings',
    artist: 'Nizamuddin Melody Circle',
    category: 'Romantic & Acoustic',
    coverUrl: 'https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=300&q=80',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
    duration: 34,
  },
  {
    soundId: 'sound_23',
    title: 'Cyber Desi Phonk Drift',
    artist: 'Delhi Drift King',
    category: 'Gaming & Tech',
    coverUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=300&q=80',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3',
    duration: 20,
  },
  {
    soundId: 'sound_24',
    title: 'Pahadi Folk Acoustic Breeze',
    artist: 'Uttarakhand Echoes',
    category: 'Bhojpuri & Folk',
    coverUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=300&q=80',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
    duration: 29,
  },
  {
    soundId: 'sound_25',
    title: 'Desi Meme Funny Laugh & Horn',
    artist: 'Comedy Club India',
    category: 'Funny & Comedy',
    coverUrl: 'https://images.unsplash.com/photo-1514306191717-452ec28c7814?w=300&q=80',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3',
    duration: 15,
  },
  {
    soundId: 'sound_26',
    title: 'Crazy Cartoon Funny Bounce',
    artist: 'Meme Mania Beats',
    category: 'Funny & Comedy',
    coverUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=300&q=80',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3',
    duration: 18,
  },
  {
    soundId: 'sound_27',
    title: 'Latest 2026 Club Pop Anthem',
    artist: 'Metro Sound Wave',
    category: 'Latest Releases',
    coverUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=300&q=80',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3',
    duration: 30,
  },
  {
    soundId: 'sound_28',
    title: 'Latest Desi Flow & Hype Bass',
    artist: 'NextGen Desi Hits',
    category: 'Latest Releases',
    coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3',
    duration: 28,
  },
  {
    soundId: 'sound_29',
    title: 'Funny Whistle & Goofy Stumble',
    artist: 'Shorts Comedy FX',
    category: 'Funny & Comedy',
    coverUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=300&q=80',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3',
    duration: 12,
  },
  {
    soundId: 'sound_30',
    title: 'Sunset Balcony Lo-Fi Guitar',
    artist: 'Chai Sutta Chill',
    category: 'Lo-Fi & Chill',
    coverUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=300&q=80',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3',
    duration: 32,
  }
];

export const soundService = {
  // Calculate REAL usages count dynamically from videos in Firestore
  async getRealUsesCount(soundId: string): Promise<number> {
    try {
      const q = query(
        collection(db, 'videos'),
        where('soundId', '==', soundId)
      );
      const snap = await getDocs(q);
      return snap.size;
    } catch (err) {
      console.warn('Failed to compute real sound usage:', err);
      return 0;
    }
  },

  // Get all sound tracks (combining admin library + user original sounds)
  async getSounds(category?: string): Promise<SoundTrack[]> {
    try {
      const snap = await getDocs(collection(db, 'sound_tracks'));
      let tracks: SoundTrack[] = [];

      if (!snap.empty) {
        snap.forEach((d) => {
          const item = d.data() as SoundTrack;
          // Auto-fix any old broken pixabay download links
          if (item.audioUrl && item.audioUrl.includes('pixabay.com')) {
            const fallback = DEFAULT_SOUNDS.find(s => s.soundId === item.soundId);
            if (fallback) item.audioUrl = fallback.audioUrl;
          }
          tracks.push(item);
        });

        // Ensure all DEFAULT_SOUNDS are present
        for (const defTrack of DEFAULT_SOUNDS) {
          if (!tracks.some(t => t.soundId === defTrack.soundId)) {
            tracks.push(defTrack);
            setDoc(doc(db, 'sound_tracks', defTrack.soundId), defTrack).catch(() => {});
          }
        }
      } else {
        // Seed initial default tracks if collection empty
        tracks = [...DEFAULT_SOUNDS];
        for (const tr of DEFAULT_SOUNDS) {
          setDoc(doc(db, 'sound_tracks', tr.soundId), tr).catch(() => {});
        }
      }

      // Filter by category if specified with smart synonyms (Popular, Funny, Latest, Lo-Fi, etc.)
      if (category && category !== 'All') {
        const catLower = category.toLowerCase().trim();
        tracks = tracks.filter(t => {
          const tCat = (t.category || '').toLowerCase();
          if (catLower === 'popular') {
            return tCat.includes('popular') || tCat.includes('trending') || tCat.includes('viral');
          }
          if (catLower === 'funny') {
            return tCat.includes('funny') || tCat.includes('comedy') || tCat.includes('meme');
          }
          if (catLower === 'latest') {
            return tCat.includes('latest') || tCat.includes('new');
          }
          if (catLower === 'lo-fi' || catLower === 'lofi') {
            return tCat.includes('lo-fi') || tCat.includes('lofi') || tCat.includes('chill');
          }
          if (catLower === 'romantic') {
            return tCat.includes('romantic') || tCat.includes('acoustic');
          }
          return tCat.includes(catLower);
        });
      }

      // Compute REAL uses count for each sound dynamically!
      const videosSnap = await getDocs(collection(db, 'videos'));
      const soundCounts: Record<string, number> = {};
      
      videosSnap.forEach((vDoc) => {
        const v = vDoc.data() as Video;
        if (v.soundId) {
          soundCounts[v.soundId] = (soundCounts[v.soundId] || 0) + 1;
        }
      });

      tracks = tracks.map(tr => ({
        ...tr,
        usesCount: soundCounts[tr.soundId] || 0
      }));

      // Sort by real uses count descending
      return tracks.sort((a, b) => (b.usesCount || 0) - (a.usesCount || 0));

    } catch (err) {
      console.warn('Failed to fetch sound tracks from Firestore, using default:', err);
      return DEFAULT_SOUNDS;
    }
  },

  // Get single sound by ID with real uses count & videos using it
  async getSoundWithVideos(soundId: string): Promise<{ sound: SoundTrack | null; videos: Video[] }> {
    try {
      let sound: SoundTrack | null = null;
      
      // Try fetching sound doc
      const sSnap = await getDoc(doc(db, 'sound_tracks', soundId));
      if (sSnap.exists()) {
        sound = sSnap.data() as SoundTrack;
        if (sound.audioUrl && sound.audioUrl.includes('pixabay.com')) {
          const fallback = DEFAULT_SOUNDS.find(s => s.soundId === soundId);
          if (fallback) sound.audioUrl = fallback.audioUrl;
        }
      } else {
        const defaultFound = DEFAULT_SOUNDS.find(s => s.soundId === soundId);
        if (defaultFound) sound = defaultFound;
      }

      // Fetch real videos using this sound ID
      const q = query(
        collection(db, 'videos'),
        where('soundId', '==', soundId)
      );
      const vSnap = await getDocs(q);
      const videos: Video[] = [];
      vSnap.forEach(d => videos.push(d.data() as Video));

      if (sound) {
        sound.usesCount = videos.length;
      }

      return { sound, videos };
    } catch (err) {
      console.error('Error fetching sound with videos:', err);
      return { sound: null, videos: [] };
    }
  },

  // Register an Original User Sound (e.g. "Original Sound - Username (Title)")
  async createOriginalSound(data: {
    soundId: string;
    title: string;
    artist: string;
    coverUrl: string;
    audioUrl: string;
    category?: string;
    duration?: number;
    creatorUid?: string;
  }): Promise<SoundTrack> {
    const soundTrack: SoundTrack = {
      soundId: data.soundId,
      title: data.title,
      artist: data.artist,
      coverUrl: data.coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80',
      audioUrl: data.audioUrl,
      category: data.category || 'Original Sound',
      duration: data.duration || 30,
      isOriginalSound: true,
      creatorUid: data.creatorUid || '',
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'sound_tracks', data.soundId), soundTrack);
      return soundTrack;
    } catch (err) {
      console.warn('Failed to save original sound to library:', err);
      return soundTrack;
    }
  },

  // Admin: Add new song to sound library
  async addSoundTrack(soundData: Omit<SoundTrack, 'soundId'>): Promise<SoundTrack> {
    const soundId = 'sound_' + Math.random().toString(36).substring(2, 11);
    const newSound: SoundTrack = {
      soundId,
      title: soundData.title.trim(),
      artist: soundData.artist.trim(),
      coverUrl: soundData.coverUrl.trim() || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80',
      audioUrl: soundData.audioUrl.trim(),
      category: soundData.category || 'Trending Viral',
      duration: soundData.duration || 30,
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'sound_tracks', soundId), newSound);
      return newSound;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `sound_tracks/${soundId}`);
      throw err;
    }
  },

  // Admin: Update existing sound track details
  async updateSoundTrack(soundId: string, data: Partial<SoundTrack>): Promise<void> {
    try {
      const docRef = doc(db, 'sound_tracks', soundId);
      await updateDoc(docRef, {
        ...data,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `sound_tracks/${soundId}`);
      throw err;
    }
  },

  // Admin: Delete sound track
  async deleteSoundTrack(soundId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'sound_tracks', soundId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `sound_tracks/${soundId}`);
      throw err;
    }
  },

  // Search sound tracks
  async searchSounds(queryStr: string): Promise<SoundTrack[]> {
    const q = queryStr.toLowerCase().trim();
    const all = await this.getSounds();
    if (!q) return all;
    return all.filter(s => 
      s.title.toLowerCase().includes(q) || 
      s.artist.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q)
    );
  }
};
