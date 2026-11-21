export const SITE_URL = 'https://socialindia.web.app';
export const SITE_NAME = 'SocialIndia';
export const DEFAULT_IMAGE = `${SITE_URL}/socialindia-logo.png`;

export const DEFAULT_TITLE = 'SocialIndia – India’s Own Social Media & Video Platform';
export const DEFAULT_DESCRIPTION =
  'SocialIndia is India’s own social media platform. Watch videos, explore Clips, discover creators, share photos and videos, and connect and chat with people.';

export interface RouteSeoMeta {
  title: string;
  description: string;
  canonicalPath?: string;
  noIndex?: boolean;
}

export const ROUTE_SEO_META: Record<string, RouteSeoMeta> = {
  home: {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    canonicalPath: '',
  },
  trending: {
    title: 'Trending Videos & Clips in India – SocialIndia',
    description:
      'Watch trending videos, viral Clips, music, entertainment, and top Indian creators across SocialIndia today.',
    canonicalPath: 'trending',
  },
  shorts: {
    title: 'Explore Clips & Short Videos – SocialIndia',
    description:
      'Explore fast, entertaining Clips and short videos on SocialIndia. Watch Indian creators, like, comment, and share moments across Bharat.',
    canonicalPath: 'shorts',
  },
  community: {
    title: 'Community Posts, Photos & Polls – SocialIndia',
    description:
      'Share photos, updates, and polls in the SocialIndia community. Follow creators, join discussions, and connect with people across India.',
    canonicalPath: 'community',
  },
  explore: {
    title: 'Community Posts, Photos & Polls – SocialIndia',
    description:
      'Share photos, updates, and polls in the SocialIndia community. Follow creators, join discussions, and connect with people across India.',
    canonicalPath: 'community',
  },
  posts: {
    title: 'Community Posts, Photos & Polls – SocialIndia',
    description:
      'Share photos, updates, and polls in the SocialIndia community. Follow creators, join discussions, and connect with people across India.',
    canonicalPath: 'community',
  },
  search: {
    title: 'Search Videos, Clips & Creators – SocialIndia',
    description:
      'Search videos, viral Clips, creator channels, community posts, and trending hashtags across India on SocialIndia.',
    canonicalPath: 'search',
  },
  studio: {
    title: 'Creator Studio – Upload & Grow on SocialIndia',
    description:
      'Upload videos and Clips, manage your channel, view analytics, and track monetization milestones in SocialIndia Creator Studio.',
    canonicalPath: 'studio',
  },
  about: {
    title: 'About SocialIndia – India’s Own Social Platform',
    description:
      'Learn about SocialIndia, built by Bharat for Indian creators and communities to watch videos, explore Clips, share photos, and connect.',
    canonicalPath: 'about',
  },
  help: {
    title: 'Help Center & Guides – SocialIndia',
    description:
      'Get help with your SocialIndia account, video and Clip uploads, community posts, Creator Studio, and monetization.',
    canonicalPath: 'help',
  },
  faq: {
    title: 'Frequently Asked Questions (FAQ) – SocialIndia',
    description:
      'Find answers about SocialIndia reward points, wallet balance, creator monetization, video uploads, and account safety.',
    canonicalPath: 'faq',
  },
  contact: {
    title: 'Contact Us – SocialIndia Support',
    description:
      'Contact SocialIndia for general support, creator questions, feedback, partnerships, and platform inquiries.',
    canonicalPath: 'contact',
  },
  grievance: {
    title: 'Grievance Redressal & Support – SocialIndia',
    description:
      'Submit a formal content, privacy, or safety grievance to the SocialIndia Grievance & Support Team and receive a tracking ID.',
    canonicalPath: 'grievance',
  },
  advertising: {
    title: 'Advertise on SocialIndia – Brand Promotions',
    description:
      'Promote your brand with video ads, sponsored feed cards, and creator collaborations reaching audiences across India on SocialIndia.',
    canonicalPath: 'advertising',
  },
  adinfo: {
    title: 'Ad Transparency Center – SocialIndia',
    description:
      'Learn how ads work on SocialIndia, how sponsored content is labeled, and how user privacy is respected.',
    canonicalPath: 'adinfo',
  },
  'ad-info': {
    title: 'Ad Transparency Center – SocialIndia',
    description:
      'Learn how ads work on SocialIndia, how sponsored content is labeled, and how user privacy is respected.',
    canonicalPath: 'adinfo',
  },
  ad: {
    title: 'Ad Transparency Center – SocialIndia',
    description:
      'Learn how ads work on SocialIndia, how sponsored content is labeled, and how user privacy is respected.',
    canonicalPath: 'adinfo',
  },
  gopro: {
    title: 'SocialIndia Pro – Creator Tools & Perks',
    description:
      'Upgrade to SocialIndia Pro for verified channel badges, ad-free viewing, priority support, and advanced Creator Studio tools.',
    canonicalPath: 'gopro',
  },
  pro: {
    title: 'SocialIndia Pro – Creator Tools & Perks',
    description:
      'Upgrade to SocialIndia Pro for verified channel badges, ad-free viewing, priority support, and advanced Creator Studio tools.',
    canonicalPath: 'gopro',
  },
  downloads: {
    title: 'Download SocialIndia App – Android APK & PWA',
    description:
      'Download the SocialIndia Android app (APK) or install the fast PWA to watch videos, explore Clips, and chat on mobile.',
    canonicalPath: 'downloads',
  },
  developers: {
    title: 'Developer Portal & Embeds – SocialIndia',
    description:
      'Explore SocialIndia developer resources, canonical video links, metadata standards, and platform embed workflows.',
    canonicalPath: 'developers',
  },
  guidelines: {
    title: 'Community Guidelines & Safety – SocialIndia',
    description:
      'Read SocialIndia Community Guidelines on respectful conduct, copyright, originality, and keeping the platform safe for everyone.',
    canonicalPath: 'guidelines',
  },
  privacy: {
    title: 'Privacy Policy – SocialIndia',
    description:
      'Read the SocialIndia Privacy Policy to learn how account, video, community, and messaging data is processed and protected.',
    canonicalPath: 'privacy',
  },
  terms: {
    title: 'Terms of Service – SocialIndia',
    description:
      'Review the SocialIndia Terms of Service covering user content, creator responsibilities, prohibited conduct, and account rules.',
    canonicalPath: 'terms',
  },
  refund: {
    title: 'Refund & Cancellation Policy – SocialIndia',
    description:
      'Read the SocialIndia Refund and Cancellation Policy for Pro subscriptions, paid video unlocks, and advertising campaigns.',
    canonicalPath: 'refund',
  },
  language: {
    title: 'Language Settings – SocialIndia',
    description: 'Choose your preferred display language across SocialIndia.',
    canonicalPath: 'language',
  },
  // Authenticated / Private routes
  admin: {
    title: 'Super Admin Workspace – SocialIndia',
    description: DEFAULT_DESCRIPTION,
    canonicalPath: 'admin',
    noIndex: true,
  },
  settings: {
    title: 'Account Settings – SocialIndia',
    description: DEFAULT_DESCRIPTION,
    canonicalPath: 'settings',
    noIndex: true,
  },
  history: {
    title: 'Watch History – SocialIndia',
    description: DEFAULT_DESCRIPTION,
    canonicalPath: 'history',
    noIndex: true,
  },
  saved: {
    title: 'Saved Videos – SocialIndia',
    description: DEFAULT_DESCRIPTION,
    canonicalPath: 'saved',
    noIndex: true,
  },
  liked: {
    title: 'Liked Videos – SocialIndia',
    description: DEFAULT_DESCRIPTION,
    canonicalPath: 'liked',
    noIndex: true,
  },
  'liked-videos': {
    title: 'Liked Videos – SocialIndia',
    description: DEFAULT_DESCRIPTION,
    canonicalPath: 'liked',
    noIndex: true,
  },
  playlists: {
    title: 'My Playlists – SocialIndia',
    description: DEFAULT_DESCRIPTION,
    canonicalPath: 'playlists',
    noIndex: true,
  },
  playlist: {
    title: 'Playlist – SocialIndia',
    description: DEFAULT_DESCRIPTION,
    canonicalPath: 'playlists',
    noIndex: true,
  },
  subscriptions: {
    title: 'Subscriptions – SocialIndia',
    description: DEFAULT_DESCRIPTION,
    canonicalPath: 'subscriptions',
    noIndex: true,
  },
  upload: {
    title: 'Upload Video or Clip – SocialIndia',
    description: DEFAULT_DESCRIPTION,
    canonicalPath: 'upload',
    noIndex: true,
  },
  feedback: {
    title: 'Send Feedback – SocialIndia',
    description: DEFAULT_DESCRIPTION,
    canonicalPath: 'feedback',
    noIndex: true,
  },
  chat: {
    title: 'Chat & Messages – SocialIndia',
    description: DEFAULT_DESCRIPTION,
    canonicalPath: 'chat',
    noIndex: true,
  },
  messages: {
    title: 'Chat & Messages – SocialIndia',
    description: DEFAULT_DESCRIPTION,
    canonicalPath: 'chat',
    noIndex: true,
  },
  'profile-menu': {
    title: 'Account Menu – SocialIndia',
    description: DEFAULT_DESCRIPTION,
    canonicalPath: 'profile-menu',
    noIndex: true,
  },
  login: {
    title: 'Sign In – SocialIndia',
    description: DEFAULT_DESCRIPTION,
    canonicalPath: 'login',
    noIndex: true,
  },
  signin: {
    title: 'Sign In – SocialIndia',
    description: DEFAULT_DESCRIPTION,
    canonicalPath: 'signin',
    noIndex: true,
  },
  signup: {
    title: 'Create Account – SocialIndia',
    description: DEFAULT_DESCRIPTION,
    canonicalPath: 'signup',
    noIndex: true,
  },
  register: {
    title: 'Create Account – SocialIndia',
    description: DEFAULT_DESCRIPTION,
    canonicalPath: 'register',
    noIndex: true,
  },
  'create-account': {
    title: 'Create Account – SocialIndia',
    description: DEFAULT_DESCRIPTION,
    canonicalPath: 'register',
    noIndex: true,
  },
  'forgot-password': {
    title: 'Reset Password – SocialIndia',
    description: DEFAULT_DESCRIPTION,
    canonicalPath: 'forgot-password',
    noIndex: true,
  },
  'reset-password': {
    title: 'Reset Password – SocialIndia',
    description: DEFAULT_DESCRIPTION,
    canonicalPath: 'reset-password',
    noIndex: true,
  },
};

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  if (typeof document === 'undefined') return;
  let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonical(href: string) {
  if (typeof document === 'undefined') return;
  let el = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

export interface SeoApplyOptions {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  image?: string;
  imageAlt?: string;
  ogType?: string;
  noIndex?: boolean;
}

export function applySeoMetadata(opts: SeoApplyOptions) {
  if (typeof document === 'undefined') return;

  const title = opts.title || DEFAULT_TITLE;
  const description = opts.description || DEFAULT_DESCRIPTION;
  const canonicalUrl = opts.canonicalUrl || `${SITE_URL}/`;
  const image = opts.image || DEFAULT_IMAGE;
  const imageAlt = opts.imageAlt || title;
  const ogType = opts.ogType || 'website';
  const robotsValue = opts.noIndex ? 'noindex, nofollow' : 'index, follow';

  document.title = title;
  upsertCanonical(canonicalUrl);
  upsertMeta('name', 'description', description);
  upsertMeta('name', 'robots', robotsValue);

  upsertMeta('property', 'og:type', ogType);
  upsertMeta('property', 'og:site_name', SITE_NAME);
  upsertMeta('property', 'og:title', title);
  upsertMeta('property', 'og:description', description);
  upsertMeta('property', 'og:url', canonicalUrl);
  upsertMeta('property', 'og:image', image);
  upsertMeta('property', 'og:image:secure_url', image);
  upsertMeta('property', 'og:image:alt', imageAlt);

  upsertMeta('name', 'twitter:card', 'summary_large_image');
  upsertMeta('name', 'twitter:title', title);
  upsertMeta('name', 'twitter:description', description);
  upsertMeta('name', 'twitter:image', image);
  upsertMeta('name', 'twitter:image:alt', imageAlt);
}

export function truncateSeoDescription(raw: string | undefined | null, fallback = DEFAULT_DESCRIPTION): string {
  if (!raw) return fallback;
  const cleaned = raw.replace(/\s+/g, ' ').trim();
  if (!cleaned || /^watch on socialindia\.?$/i.test(cleaned)) return fallback;
  if (cleaned.length <= 158) return cleaned;
  return `${cleaned.slice(0, 155).trimEnd()}...`;
}
