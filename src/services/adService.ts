import { collection, doc, getDoc, getDocs, setDoc, updateDoc, increment, query, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { AdCampaign } from '../types';
import { userService } from './userService';

export const adService = {
  // Create new Ad Campaign with Wallet / Bonus Balance deduction
  async createAdCampaign(uid: string, adData: Partial<AdCampaign>): Promise<AdCampaign> {
    const user = await userService.getUserProfile(uid);
    if (!user) throw new Error('User account not found');

    const totalCost = Number((adData.totalLimit || 1).toFixed(2));
    const wallet = Number((user.walletBalance || 0).toFixed(2));
    const bonus = Number((user.bonusBalance || 0).toFixed(2));
    const totalAvailable = Number((wallet + bonus).toFixed(2));

    if (totalAvailable < totalCost) {
      throw new Error(`Insufficient Balance. Total cost is $${totalCost.toFixed(2)}, but you have $${totalAvailable.toFixed(2)} (Wallet: $${wallet.toFixed(2)}, Bonus: $${bonus.toFixed(2)}).`);
    }

    // Deduct bonus first, then wallet
    const bonusDeduct = Number(Math.min(bonus, totalCost).toFixed(2));
    const remainingToDeduct = Number((totalCost - bonusDeduct).toFixed(2));
    const newBonus = Number(Math.max(0, bonus - bonusDeduct).toFixed(2));
    const newWallet = Number(Math.max(0, wallet - remainingToDeduct).toFixed(2));

    await userService.updateProfile(uid, { 
      walletBalance: newWallet,
      bonusBalance: newBonus 
    });

    const adId = `ad_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const newAd: AdCampaign = {
      adId,
      name: adData.name || 'User Ad',
      sponsorName: adData.name || `@${user.username}`,
      sponsorLogo: user.photoURL || '',
      headline: adData.title || adData.name || 'Promoted Ad',
      title: adData.title || adData.name || 'Promoted Ad',
      description: adData.description || '',
      ctaText: adData.ctaText || 'Learn More',
      ctaUrl: adData.ctaUrl || 'https://socialindia.app',
      videoUrl: adData.videoUrl || '',
      bannerUrl: adData.bannerUrl || '',
      duration: 15,
      skipAfter: 5,
      cpm: 0.7,
      totalLimit: totalCost,
      dailyLimit: adData.dailyLimit || 1,
      spent: 0,
      impressions: 0,
      clicks: 0,
      results: 0,
      status: 'active',
      targetAudience: adData.targetAudience || 'All',
      pricingType: adData.pricingType || 'click',
      placement: adData.placement || 'Videos',
      creatorUid: uid,
      creatorUsername: user.username,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await setDoc(doc(db, 'ad_campaigns', adId), newAd);
      return newAd;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `ad_campaigns/${adId}`);
      throw err;
    }
  },

  // Get active ads to display on Home, Watch, and Shorts
  async getActiveAds(limitCount: number = 10): Promise<AdCampaign[]> {
    try {
      const snap = await getDocs(collection(db, 'ad_campaigns'));
      const list: AdCampaign[] = [];
      snap.forEach(d => {
        const data = d.data() as AdCampaign;
        if (data.status === 'active' || (!data.status && (data.totalLimit || 0) > 0)) {
          list.push(data);
        }
      });
      // Sort newest first or shuffle
      return list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()).slice(0, limitCount);
    } catch (err) {
      console.warn('getActiveAds error:', err);
      return [];
    }
  },

  // Record impression when ad is displayed on screen
  async recordAdImpression(adId: string): Promise<void> {
    if (!adId) return;
    try {
      const adRef = doc(db, 'ad_campaigns', adId);
      await setDoc(adRef, {
        impressions: increment(1),
        results: increment(1),
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      console.warn('recordAdImpression error:', err);
    }
  },

  // Record click when viewer clicks the CTA or promoted link
  async recordAdClick(adId: string): Promise<void> {
    if (!adId) return;
    try {
      const adRef = doc(db, 'ad_campaigns', adId);
      await setDoc(adRef, {
        clicks: increment(1),
        results: increment(1),
        spent: increment(0.05),
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      console.warn('recordAdClick error:', err);
    }
  },

  // Toggle or Update ad status
  async updateAdStatus(adId: string, status: 'active' | 'paused' | 'ended'): Promise<void> {
    if (!adId) return;
    const adRef = doc(db, 'ad_campaigns', adId);
    await setDoc(adRef, {
      status,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  },

  // Get user's ad campaigns
  async getUserAds(uid: string): Promise<AdCampaign[]> {
    try {
      const q = query(collection(db, 'ad_campaigns'), where('creatorUid', '==', uid));
      const snap = await getDocs(q);
      const ads = snap.docs.map(d => d.data() as AdCampaign);
      return ads.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    } catch (err) {
      console.warn('Get user ads warning:', err);
      return [];
    }
  }
};
