import { collection, doc, getDoc, getDocs, setDoc, query, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { AdCampaign } from '../types';
import { userService } from './userService';

export const adService = {
  // Create new Ad Campaign with Wallet Balance deduction
  async createAdCampaign(uid: string, adData: Partial<AdCampaign>): Promise<AdCampaign> {
    const user = await userService.getUserProfile(uid);
    if (!user) throw new Error('User account not found');

    const totalCost = adData.totalLimit || 1;
    const currentWallet = user.walletBalance || 0;

    if (currentWallet < totalCost) {
      throw new Error(`Insufficient Wallet Balance ($${currentWallet.toFixed(2)}). Convert points or replenish your wallet to cover $${totalCost.toFixed(2)}.`);
    }

    // Deduct cost from wallet
    const newWalletBalance = Number((currentWallet - totalCost).toFixed(2));
    await userService.updateProfile(uid, { walletBalance: newWalletBalance });

    const adId = `ad_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const newAd: AdCampaign = {
      adId,
      sponsorName: adData.name || 'User Ad',
      sponsorLogo: user.photoURL || '',
      headline: adData.title || adData.name || 'Promoted Ad',
      description: adData.description || '',
      ctaText: 'Learn More',
      ctaUrl: adData.ctaUrl || 'https://socialindia.app',
      videoUrl: adData.videoUrl || '',
      bannerUrl: adData.bannerUrl || '',
      duration: 15,
      skipAfter: 5,
      cpm: 0.7,
      totalLimit: totalCost,
      dailyLimit: adData.dailyLimit || 1,
      spent: 0,
      status: 'active',
      targetAudience: adData.targetAudience || 'All',
      pricingType: adData.pricingType || 'click',
      placement: adData.placement || 'Videos',
      creatorUid: uid,
      createdAt: now,
    } as any;

    try {
      await setDoc(doc(db, 'ad_campaigns', adId), newAd);
      return newAd;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `ad_campaigns/${adId}`);
      throw err;
    }
  },

  // Get user's ad campaigns
  async getUserAds(uid: string): Promise<any[]> {
    try {
      const q = query(collection(db, 'ad_campaigns'), where('creatorUid', '==', uid));
      const snap = await getDocs(q);
      const ads = snap.docs.map(d => d.data());
      return ads.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (err) {
      console.warn('Get user ads warning:', err);
      return [];
    }
  }
};
