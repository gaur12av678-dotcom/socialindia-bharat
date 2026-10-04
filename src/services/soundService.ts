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
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a88092.mp3',
    duration: 30,
  },
  {
    soundId: 'sound_2',
    title: 'Lo-Fi Midnight Chai Beats',
    artist: 'Chill India Collective',
    category: 'Lo-Fi & Chill',
    coverUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=300&q=80',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3',
    duration: 25,
  },
  {
    soundId: 'sound_3',
    title: 'Victory Gaming Hype Drops',
    artist: 'Cyber Gamer Pro',
    category: 'Gaming & Tech',
    coverUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=300&q=80',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_c1e2df80e9.mp3',
    duration: 15,
  },
  {
    soundId: 'sound_4',
    title: 'Acoustic Morning Vibes',
    artist: 'Sufi Strings Band',
    category: 'Romantic & Acoustic',
    coverUrl: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=300&q=80',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2021/08/09/audio_8848f0709b.mp3',
    duration: 20,
  },
  {
    soundId: 'sound_5',
    title: 'Viral Reel Techno Anthem',
    artist: 'Mumbai Electro Club',
    category: 'Trending Viral',
    coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&q=80',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3',
    duration: 30,
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
          tracks.push(d.data() as SoundTrack);
        });
      } else {
        // Seed initial default tracks if collection empty
        tracks = [...DEFAULT_SOUNDS];
        for (const tr of DEFAULT_SOUNDS) {
          setDoc(doc(db, 'sound_tracks', tr.soundId), tr).catch(() => {});
        }
      }

      // Filter by category if specified
      if (category && category !== 'All') {
        tracks = tracks.filter(t => t.category.toLowerCase().includes(category.toLowerCase()));
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
