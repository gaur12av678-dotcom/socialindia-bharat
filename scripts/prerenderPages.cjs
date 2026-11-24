const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://socialindia.web.app';
const DEFAULT_IMAGE = `${SITE_URL}/socialindia-logo.png`;
const HOME_TITLE = 'SocialIndia – India’s Own Social Media & Video Platform';
const HOME_DESCRIPTION =
  'SocialIndia is India’s own social media platform. Watch videos, explore Clips, discover creators, share photos and videos, and connect and chat with people.';

const distDir = path.join(__dirname, '../dist');
const templatePath = path.join(distDir, 'index.html');

if (!fs.existsSync(templatePath)) {
  console.error('dist/index.html not found! Run vite build first.');
  process.exit(1);
}

const templateHtml = fs.readFileSync(templatePath, 'utf8');

let seedVideos = [];
const seedPath = path.join(__dirname, 'videos_seed.json');
if (fs.existsSync(seedPath)) {
  try {
    seedVideos = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  } catch (e) {
    console.warn('Could not read videos_seed.json for prerender:', e);
  }
}

function escapeHtml(str) {
  const s = typeof String.prototype.toWellFormed === 'function'
    ? String(str || '').toWellFormed()
    : String(str || '');
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function cleanText(str) {
  const s = typeof String.prototype.toWellFormed === 'function'
    ? String(str || '').toWellFormed()
    : String(str || '');
  return s.replace(/\s+/g, ' ').trim();
}

function truncateDescription(raw, fallback) {
  const cleaned = cleanText(raw);
  if (!cleaned || /^watch on socialindia\.?$/i.test(cleaned)) return fallback;
  if (cleaned.length <= 158) return cleaned;
  return `${cleaned.slice(0, 155).trimEnd()}...`;
}

function toIsoDuration(seconds) {
  const s = Math.max(1, Math.round(Number(seconds) || 30));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rem = s % 60;
  let out = 'PT';
  if (h > 0) out += `${h}H`;
  if (m > 0) out += `${m}M`;
  if (rem > 0 || (h === 0 && m === 0)) out += `${rem}S`;
  return out;
}

function toIsoUploadDate(dateStr) {
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
    }
  } catch (_) {}
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

const sharedNavHtml = `
  <header style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;padding-bottom:16px;margin-bottom:24px;border-bottom:1px solid #e2e8f0;">
    <a href="/" style="font-size:20px;font-weight:800;color:#2563eb;text-decoration:none;">SocialIndia</a>
    <nav aria-label="Primary navigation" style="display:flex;flex-wrap:wrap;gap:14px;font-size:14px;font-weight:600;">
      <a href="/" style="color:#0f172a;text-decoration:none;">Home</a>
      <a href="/trending" style="color:#0f172a;text-decoration:none;">Trending</a>
      <a href="/shorts" style="color:#0f172a;text-decoration:none;">Clips</a>
      <a href="/community" style="color:#0f172a;text-decoration:none;">Community</a>
      <a href="/about" style="color:#0f172a;text-decoration:none;">About</a>
      <a href="/faq" style="color:#0f172a;text-decoration:none;">FAQ</a>
      <a href="/downloads" style="color:#0f172a;text-decoration:none;">Downloads</a>
      <a href="/gopro" style="color:#0f172a;text-decoration:none;">Go Pro</a>
    </nav>
  </header>
`;

const sharedFooterHtml = `
  <footer style="margin-top:44px;padding-top:24px;border-top:1px solid #e2e8f0;font-size:13px;color:#475569;">
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:20px;margin-bottom:20px;">
      <div>
        <strong style="display:block;margin-bottom:8px;color:#0f172a;">Platform</strong>
        <div style="display:flex;flex-direction:column;gap:6px;">
          <a href="/" style="color:#2563eb;text-decoration:none;">Home</a>
          <a href="/trending" style="color:#2563eb;text-decoration:none;">Trending Videos</a>
          <a href="/shorts" style="color:#2563eb;text-decoration:none;">Clips &amp; Shorts</a>
          <a href="/community" style="color:#2563eb;text-decoration:none;">Community</a>
          <a href="/search" style="color:#2563eb;text-decoration:none;">Search</a>
          <a href="/studio" style="color:#2563eb;text-decoration:none;">Creator Studio</a>
        </div>
      </div>
      <div>
        <strong style="display:block;margin-bottom:8px;color:#0f172a;">Products &amp; Growth</strong>
        <div style="display:flex;flex-direction:column;gap:6px;">
          <a href="/downloads" style="color:#2563eb;text-decoration:none;">Download App (APK &amp; PWA)</a>
          <a href="/gopro" style="color:#2563eb;text-decoration:none;">SocialIndia Pro</a>
          <a href="/advertising" style="color:#2563eb;text-decoration:none;">Advertising</a>
          <a href="/adinfo" style="color:#2563eb;text-decoration:none;">Ad Transparency Center</a>
          <a href="/developers" style="color:#2563eb;text-decoration:none;">Developer Portal</a>
        </div>
      </div>
      <div>
        <strong style="display:block;margin-bottom:8px;color:#0f172a;">Support &amp; Company</strong>
        <div style="display:flex;flex-direction:column;gap:6px;">
          <a href="/about" style="color:#2563eb;text-decoration:none;">About SocialIndia</a>
          <a href="/faq" style="color:#2563eb;text-decoration:none;">FAQ</a>
          <a href="/help" style="color:#2563eb;text-decoration:none;">Help Center</a>
          <a href="/contact" style="color:#2563eb;text-decoration:none;">Contact Us</a>
          <a href="/grievance" style="color:#2563eb;text-decoration:none;">Grievance Redressal</a>
        </div>
      </div>
      <div>
        <strong style="display:block;margin-bottom:8px;color:#0f172a;">Legal &amp; Safety</strong>
        <div style="display:flex;flex-direction:column;gap:6px;">
          <a href="/privacy" style="color:#2563eb;text-decoration:none;">Privacy Policy</a>
          <a href="/terms" style="color:#2563eb;text-decoration:none;">Terms of Service</a>
          <a href="/refund" style="color:#2563eb;text-decoration:none;">Refund Policy</a>
          <a href="/guidelines" style="color:#2563eb;text-decoration:none;">Community Guidelines</a>
        </div>
      </div>
    </div>
    <p>&copy; ${new Date().getFullYear()} SocialIndia. Built by Bharat. Contact: socialindia.ib@gmail.com</p>
  </footer>
`;

const isQualitySeedVideo = (v) => {
  if (!v || !v.videoId || !v.title) return false;
  const t = cleanText(v.title);
  if (t.length < 6) return false;
  if (/^\d+$/.test(t)) return false;
  if (/^(check|test|testing|demo|sample)$/i.test(t)) return false;
  if (/64ce2ae8e3535d266be88a/i.test(t)) return false;
  return true;
};

const qualitySeedVideos = seedVideos.filter(isQualitySeedVideo);

function renderVideoLinkItems(list) {
  return list
    .map(v => {
      const url = v.isShort ? `/shorts/${v.videoId}` : `/watch/${v.videoId}`;
      return `<li><a href="${escapeHtml(url)}" style="color:#2563eb;text-decoration:none;font-weight:600;">${escapeHtml(cleanText(v.title))}</a></li>`;
    })
    .join('\n');
}

const featuredVideosHtml = renderVideoLinkItems(qualitySeedVideos.slice(0, 24));
const allLongVideosHtml = renderVideoLinkItems(qualitySeedVideos.filter(v => !v.isShort));
const allClipsHtml = renderVideoLinkItems(qualitySeedVideos.filter(v => v.isShort));

const pages = [
  {
    path: 'about',
    title: 'About SocialIndia – India’s Own Social Platform',
    description: 'Learn about SocialIndia, built by Bharat for Indian creators and communities to watch videos, explore Clips, share photos, and connect.',
    schema: {
      '@type': 'AboutPage',
      'name': 'About SocialIndia',
      'url': `${SITE_URL}/about`,
      'description': 'Learn about SocialIndia, built by Bharat for Indian creators and communities.'
    },
    heading: 'About SocialIndia · Built by Bharat.',
    content: `
      <p>SocialIndia is India’s own social media and video platform where people watch videos, explore Clips, discover creators, share photos and videos, and connect and chat with people across Bharat.</p>
      <p>Our goal is to provide an independent, fast, and creator-first digital platform built for Indian users, regional languages, and local communities.</p>
      <h2>What You Can Do on SocialIndia</h2>
      <ul>
        <li>Watch long-form videos and explore vertical <a href="/shorts">SocialIndia Clips</a> in high definition.</li>
        <li>Share photos, updates, and polls in the <a href="/community">Community Feed</a>.</li>
        <li>Build your channel and track earnings in <a href="/studio">Creator Studio</a>.</li>
        <li>Install the official Android APK or Progressive Web App from the <a href="/downloads">Downloads</a> page.</li>
      </ul>
      <h2>Founder &amp; Contact</h2>
      <p>Gaurav Saini, Founder – SocialIndia.</p>
      <p>General inquiries &amp; support: socialindia.ib@gmail.com · India</p>
    `
  },
  {
    path: 'community',
    title: 'Community Posts, Photos & Polls – SocialIndia',
    description: 'Share photos, updates, and polls in the SocialIndia community. Follow creators, join discussions, and connect with people across India.',
    schema: {
      '@type': 'CollectionPage',
      'name': 'SocialIndia Community Feed',
      'url': `${SITE_URL}/community`,
      'description': 'Share photos, posts, creator updates, and interactive discussions on SocialIndia.'
    },
    heading: 'SocialIndia Community Posts, Photos & Discussions',
    content: `
      <p>Connect with creators, educators, artists, and communities across India. Share photos, status updates, video previews, and interactive polls in the SocialIndia Community Feed.</p>
      <h2>What Happens in the SocialIndia Community Feed</h2>
      <ul>
        <li><strong>Creator Announcements:</strong> Get early previews of upcoming videos, live broadcasts, and behind-the-scenes photos directly from channels you follow.</li>
        <li><strong>Interactive Polls &amp; Discussions:</strong> Vote on community polls, share feedback in comment threads, and connect with viewers who share your interests.</li>
        <li><strong>Regional &amp; Cultural Conversations:</strong> Discover trending topics across Indian cities, languages, entertainment, technology, and cricket.</li>
      </ul>
      <h2>Safe &amp; Welcoming Community Standards</h2>
      <p>Every member contributes to making SocialIndia respectful and constructive. Review our <a href="/guidelines">Community Guidelines</a> or visit <a href="/trending">Trending Videos</a> and <a href="/shorts">SocialIndia Clips</a>.</p>
    `
  },
  {
    path: 'trending',
    title: 'Trending Videos & Clips in India – SocialIndia',
    description: 'Watch trending videos, viral Clips, music, entertainment, and top Indian creators across SocialIndia today.',
    schema: {
      '@type': 'CollectionPage',
      'name': 'Trending Videos & Clips – SocialIndia',
      'url': `${SITE_URL}/trending`,
      'description': 'Watch trending videos and viral Clips across India on SocialIndia.'
    },
    heading: 'Trending Videos & Viral Creators in India',
    content: `
      <p>Watch what India is watching right now. Explore trending videos and Clips across entertainment, music, comedy, technology, news commentary, and regional culture.</p>
      ${allLongVideosHtml ? `<h2>All Trending &amp; Featured Videos on SocialIndia</h2><ul>${allLongVideosHtml}</ul>` : ''}
      <p>Looking for fast vertical clips? Explore <a href="/shorts">SocialIndia Clips</a> or <a href="/search">search all channels and videos</a>.</p>
    `
  },
  {
    path: 'shorts',
    title: 'Explore Clips & Short Videos – SocialIndia',
    description: 'Explore fast, entertaining Clips and short videos on SocialIndia. Watch Indian creators, like, comment, and share moments across Bharat.',
    schema: {
      '@type': 'CollectionPage',
      'name': 'SocialIndia Clips & Shorts',
      'url': `${SITE_URL}/shorts`,
      'description': 'Explore viral Clips and short videos from Indian creators on SocialIndia.'
    },
    heading: 'SocialIndia Clips – Explore Short Videos',
    content: `
      <p>Explore vertical Clips and short videos from Indian creators. Watch comedy skits, news explainers, music clips, devotionals, sports highlights, and daily moments in a fast swipeable player built for Bharat.</p>
      ${allClipsHtml ? `<h2>Popular &amp; Recent Clips on SocialIndia</h2><ul>${allClipsHtml}</ul>` : ''}
      <h2>Why Watch &amp; Create Clips on SocialIndia</h2>
      <ul>
        <li><strong>Fast Adaptive Playback:</strong> Smooth vertical streaming engineered for Indian mobile data networks as well as desktop browsers.</li>
        <li><strong>Full Creator Engagement:</strong> Like, comment, save for offline viewing, share links, and follow your favorite creators in one tap.</li>
        <li><strong>Built-In Sounds &amp; Creator Studio:</strong> Upload vertical Clips with background tracks via <a href="/studio">Creator Studio</a> and grow your audience organically.</li>
        <li><strong>Reward Points &amp; Milestones:</strong> Active creators and viewers earn engagement points and can unlock monetization as their channel grows.</li>
      </ul>
      <p>Want to watch full-length uploads? Visit <a href="/trending">Trending Videos</a> or download the mobile app from <a href="/downloads">Downloads</a>.</p>
    `
  },
  {
    path: 'faq',
    title: 'Frequently Asked Questions (FAQ) – SocialIndia',
    description: 'Find answers about SocialIndia reward points, wallet balance, creator monetization, video and Clip uploads, and account safety.',
    schema: {
      '@type': 'FAQPage',
      'mainEntity': [
        {
          '@type': 'Question',
          'name': 'How do I earn points on SocialIndia?',
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': 'You earn points organically by engaging: watching videos (+2 points), liking videos and Clips (+5 points), commenting (+10 points), and uploading new videos (+20 points).'
          }
        },
        {
          '@type': 'Question',
          'name': 'How do I convert points into wallet balance?',
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': 'You can convert accumulated points directly into wallet cash balance (INR) from the Wallet or Reward Points section in your profile settings.'
          }
        },
        {
          '@type': 'Question',
          'name': 'How do I unlock monetization on SocialIndia?',
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': 'Monetization unlocks when your channel reaches 500 followers and at least 1,000 views on any single video.'
          }
        },
        {
          '@type': 'Question',
          'name': 'Is SocialIndia free to use?',
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': 'Yes! Watching videos, exploring Clips, sharing photos and videos, and chatting with people on SocialIndia is completely free for all users.'
          }
        }
      ]
    },
    heading: 'Frequently Asked Questions (FAQ)',
    content: `
      <p>Find clear answers about using SocialIndia, creator monetization, reward points, mobile downloads, and account safety.</p>
      <h2>How do I earn points on SocialIndia?</h2>
      <p>You earn points organically by engaging with the platform: watching videos, liking videos and Clips, commenting on creator posts, and publishing new videos.</p>
      <h2>How do I convert points into wallet balance?</h2>
      <p>You can convert accumulated reward points into wallet balance directly from the Wallet or Reward Points section inside your account settings.</p>
      <h2>How do I unlock creator monetization?</h2>
      <p>Monetization unlocks when your channel reaches 500 followers and at least 1,000 views on any single video. Manage your channel in <a href="/studio">Creator Studio</a>.</p>
      <h2>Is SocialIndia free to use?</h2>
      <p>Yes. Watching videos, exploring Clips, sharing photos and videos, and chatting with people are completely free for all users. Optional creator perks are available on <a href="/gopro">SocialIndia Pro</a>.</p>
      <p>Need more assistance? Visit the <a href="/help">Help Center</a> or <a href="/contact">Contact Us</a>.</p>
    `
  },
  {
    path: 'contact',
    title: 'Contact Us – SocialIndia Support',
    description: 'Contact SocialIndia for general support, creator questions, feedback, partnerships, and platform inquiries.',
    schema: {
      '@type': 'ContactPage',
      'name': 'Contact SocialIndia',
      'url': `${SITE_URL}/contact`,
      'description': 'Contact SocialIndia for general support and inquiries.'
    },
    heading: 'Contact SocialIndia',
    content: `
      <p>Reach out to SocialIndia for general customer support, creator channel questions, brand sponsorships, technical feedback, and platform partnership inquiries across India.</p>
      <h2>Direct Email Support</h2>
      <p>Official Support Email: <a href="mailto:socialindia.ib@gmail.com">socialindia.ib@gmail.com</a>. Please include your registered username or channel handle so our support team can assist you faster.</p>
      <h2>Specialized Support &amp; Policy Channels</h2>
      <ul>
        <li><strong>Common Questions:</strong> Browse answers about uploads, points, monetization, and accounts in our <a href="/faq">FAQ</a> and <a href="/help">Help Center</a>.</li>
        <li><strong>Formal Grievances &amp; Takedowns:</strong> For copyright notices, privacy requests, or safety complaints, submit the <a href="/grievance">Grievance Redressal</a> form to generate a complaint tracking ID.</li>
        <li><strong>Brand Advertising:</strong> Promote your business or app on SocialIndia via <a href="/advertising">SocialIndia Advertising</a>.</li>
        <li><strong>Developer &amp; Embed Inquiries:</strong> Check metadata and canonical URL guides in our <a href="/developers">Developer Portal</a>.</li>
      </ul>
    `
  },
  {
    path: 'grievance',
    title: 'Grievance Redressal & Support – SocialIndia',
    description: 'Submit a formal content, privacy, or safety grievance to the SocialIndia Grievance & Support Team and receive a tracking ID.',
    schema: {
      '@type': 'ContactPage',
      'name': 'Grievance Redressal & Support – SocialIndia',
      'url': `${SITE_URL}/grievance`
    },
    heading: 'Grievance Redressal & Support',
    content: `
      <p>SocialIndia provides a structured Grievance Redressal mechanism for users, creators, and copyright holders to report content violations, impersonation, privacy concerns, or account disputes.</p>
      <h2>How Grievance Tracking Works</h2>
      <p>When you submit a formal report through the Grievance Redressal form, the system records your complaint in our moderation queue and generates a unique tracking ID on screen. Save your tracking ID for follow-up communication with the SocialIndia Grievance &amp; Support Team at <a href="mailto:socialindia.ib@gmail.com">socialindia.ib@gmail.com</a>.</p>
      <h2>Categories Covered Under Grievance Redressal</h2>
      <ul>
        <li>Copyright and intellectual property infringement claims with original proof of ownership.</li>
        <li>Harassment, impersonation, privacy leaks, or non-consensual content reports.</li>
        <li>Account suspension appeals and monetization or payout review requests.</li>
      </ul>
      <p>Before submitting, please review our <a href="/guidelines">Community Guidelines</a>, <a href="/privacy">Privacy Policy</a>, and <a href="/terms">Terms of Service</a>.</p>
    `
  },
  {
    path: 'advertising',
    title: 'Advertise on SocialIndia – Brand Promotions',
    description: 'Promote your brand with video ads, sponsored feed cards, and creator collaborations reaching audiences across India on SocialIndia.',
    schema: {
      '@type': 'WebPage',
      'name': 'SocialIndia Advertising',
      'url': `${SITE_URL}/advertising`
    },
    heading: 'SocialIndia Advertising & Brand Promotions',
    content: `
      <p>Promote your brand, mobile app, e-commerce store, or creator launch with native video advertisements, sponsored feed cards, and creator campaigns tailored for Indian audiences.</p>
      <h2>Why Advertise with SocialIndia?</h2>
      <ul>
        <li><strong>Nationwide Bharat Reach:</strong> Connect with engaged viewers across Tier 1 metros as well as fast-growing Tier 2 and Tier 3 cities across India.</li>
        <li><strong>Non-Intrusive Native Placements:</strong> Run campaigns across home feeds, watch pages, and community discovery without disrupting viewer experience.</li>
        <li><strong>Transparent Performance Tracking:</strong> Monitor campaign impressions, clicks, and engagement directly from your advertiser campaign dashboard.</li>
        <li><strong>Creator-First Ecosystem:</strong> Ad revenue helps support Indian creators who publish original videos, Clips, and educational content.</li>
      </ul>
      <p>Learn about our advertising disclosure standards in the <a href="/adinfo">Ad Transparency Center</a>, review billing rules in our <a href="/refund">Refund Policy</a>, or <a href="/contact">contact our team</a> to start a campaign.</p>
    `
  },
  {
    path: 'adinfo',
    title: 'Ad Transparency Center – SocialIndia',
    description: 'Learn how ads work on SocialIndia, how sponsored content is labeled, and how user privacy is respected.',
    schema: {
      '@type': 'WebPage',
      'name': 'SocialIndia Ad Transparency Center',
      'url': `${SITE_URL}/adinfo`
    },
    heading: 'SocialIndia Ad Transparency & Standards',
    content: `
      <p>SocialIndia is committed to honest, clear, and user-respecting advertising across the entire platform. Every sponsored video, brand promotion, or feed placement is visibly labeled so viewers always know when content is paid advertising.</p>
      <h2>Our Core Advertising Standards</h2>
      <ul>
        <li><strong>Clear Sponsored Labeling:</strong> All promoted cards and in-stream ads display clear sponsored badges and advertiser attribution.</li>
        <li><strong>Privacy-Respecting Delivery:</strong> Advertising operates strictly within the commitments described in our <a href="/privacy">Privacy Policy</a>.</li>
        <li><strong>Strict Safety Review:</strong> Misleading claims, financial scams, phishing links, counterfeit goods, and unsafe promotions are prohibited under our <a href="/guidelines">Community Guidelines</a>.</li>
        <li><strong>Ad-Free Viewing Option:</strong> Viewers who prefer an uninterrupted experience can upgrade to <a href="/gopro">SocialIndia Pro</a>.</li>
      </ul>
      <p>Interested in promoting your business responsibly across Bharat? Visit <a href="/advertising">SocialIndia Advertising</a> or report an ad concern via <a href="/grievance">Grievance Redressal</a>.</p>
    `
  },
  {
    path: 'gopro',
    title: 'SocialIndia Pro – Creator Tools & Perks',
    description: 'Upgrade to SocialIndia Pro for verified channel badges, ad-free viewing, priority support, and advanced Creator Studio tools.',
    schema: {
      '@type': 'WebPage',
      'name': 'SocialIndia Pro Subscription',
      'url': `${SITE_URL}/gopro`
    },
    heading: 'SocialIndia Pro – Creator Tools & Verified Perks',
    content: `
      <p>Unlock enhanced creator capabilities and an uninterrupted viewing experience with SocialIndia Pro. Designed for growing Indian creators, educators, independent journalists, musicians, and brands.</p>
      <h2>What Is Included in SocialIndia Pro</h2>
      <ul>
        <li><strong>Verified Creator Badge Eligibility:</strong> Stand out in search results, watch pages, comments, and community threads with verified channel credibility.</li>
        <li><strong>Ad-Free Streaming Experience:</strong> Watch long-form videos and explore <a href="/shorts">SocialIndia Clips</a> without sponsored interruptions.</li>
        <li><strong>Advanced Creator Studio Insights:</strong> Track audience performance, watch engagement, and monetization readiness inside <a href="/studio">Creator Studio</a>.</li>
        <li><strong>Priority Creator Support:</strong> Faster assistance for channel verification reviews and technical account questions.</li>
      </ul>
      <p>Review membership billing and cancellation rules on our <a href="/refund">Refund Policy</a> and <a href="/terms">Terms of Service</a> pages, or check common questions in our <a href="/faq">FAQ</a>.</p>
    `
  },
  {
    path: 'downloads',
    title: 'Download SocialIndia App – Android APK & PWA',
    description: 'Download the SocialIndia Android app (APK) or install the fast PWA to watch videos, explore Clips, and chat on mobile.',
    schema: {
      '@type': 'SoftwareApplication',
      'name': 'SocialIndia Mobile App',
      'operatingSystem': 'Android, Web',
      'applicationCategory': 'SocialNetworkingApplication',
      'url': `${SITE_URL}/downloads`,
      'offers': {
        '@type': 'Offer',
        'price': '0',
        'priceCurrency': 'INR'
      }
    },
    heading: 'Download SocialIndia Mobile App (Android APK & PWA)',
    content: `
      <p>Take SocialIndia everywhere on your smartphone or desktop. Install the lightweight Progressive Web App (PWA) directly from your browser or access your personal offline Downloads library to watch saved videos and Clips anytime, even without an active internet connection.</p>
      <h2>Mobile App &amp; Offline Library Features</h2>
      <ul>
        <li><strong>Offline Video &amp; Clips Vault:</strong> Save videos locally on your device so you can watch them smoothly in the full video and Clips player while traveling or on low connectivity.</li>
        <li><strong>Fast Native-Like Experience:</strong> Instant launch from your home screen with push-ready notifications, dark/light themes, and Hindi &amp; English interface support.</li>
        <li><strong>Create &amp; Chat on the Go:</strong> Upload Clips, post in the <a href="/community">Community Feed</a>, and message creators or friends directly from mobile.</li>
      </ul>
      <p>Need help installing or managing offline downloads? Visit our <a href="/help">Help Center</a>, read our <a href="/faq">FAQ</a>, or explore <a href="/trending">Trending Videos</a>.</p>
    `
  },
  {
    path: 'developers',
    title: 'Developer Portal & Embeds – SocialIndia',
    description: 'Explore SocialIndia developer resources, canonical video links, metadata standards, and platform embed workflows.',
    schema: {
      '@type': 'WebPage',
      'name': 'SocialIndia Developer Portal',
      'url': `${SITE_URL}/developers`
    },
    heading: 'SocialIndia Developer Portal & Embeds',
    content: `
      <p>Build web integrations, creator tools, and rich link previews for SocialIndia content using clean canonical URLs, structured Schema.org markup, and responsive embed workflows.</p>
      <h2>Platform URL &amp; Metadata Standards</h2>
      <ul>
        <li><strong>Canonical Video &amp; Clip Routes:</strong> Share and reference long-form videos via <code>/watch/&lt;videoId&gt;</code> and vertical Clips via <code>/shorts/&lt;videoId&gt;</code>.</li>
        <li><strong>Creator Channel Handles:</strong> Every creator profile resolves cleanly through handle routing (<code>/@username</code>) with OpenGraph preview tags.</li>
        <li><strong>Structured Data &amp; Discovery:</strong> Every public video and page exposes OpenGraph, Twitter Card, and Schema.org <code>VideoObject</code> JSON-LD metadata for rich social and search indexing.</li>
        <li><strong>Progressive Web App Compatibility:</strong> Supports standard Web App Manifest and offline media caching for modern mobile and desktop browsers.</li>
      </ul>
      <p>Have a technical integration question or partnership proposal? Reach out via <a href="/contact">Contact Us</a> or read <a href="/about">About SocialIndia</a>.</p>
    `
  },
  {
    path: 'guidelines',
    title: 'Community Guidelines & Safety – SocialIndia',
    description: 'Read SocialIndia Community Guidelines on respectful conduct, copyright, originality, and keeping the platform safe for everyone.',
    schema: {
      '@type': 'WebPage',
      'name': 'SocialIndia Community Guidelines',
      'url': `${SITE_URL}/guidelines`
    },
    heading: 'SocialIndia Community Guidelines & Content Safety',
    content: `
      <p>SocialIndia is built for creators and viewers across Bharat to share knowledge, entertainment, culture, and discussions safely. These Community Guidelines apply to all videos, Clips, thumbnails, titles, comments, community posts, and direct messages on the platform.</p>
      <h2>Core Safety &amp; Content Pillars</h2>
      <ul>
        <li><strong>Respect &amp; Anti-Harassment:</strong> Hate speech, caste or religious slurs, bullying, threats, doxxing, and targeted harassment are strictly prohibited.</li>
        <li><strong>Copyright &amp; Originality:</strong> Only upload videos, audio tracks, images, and thumbnails that you created or hold valid rights to distribute.</li>
        <li><strong>Zero Tolerance for Harmful Content:</strong> Child exploitation, graphic violence, self-harm promotion, and illegal activities result in immediate removal and permanent account bans.</li>
        <li><strong>No Spam, Scams, or Fake Engagement:</strong> Deceptive metadata, phishing links, impersonation, and artificial view/follower manipulation are not permitted.</li>
      </ul>
      <h2>Reporting &amp; Enforcement</h2>
      <p>Use the report option on any video, comment, or profile, or file a formal complaint via <a href="/grievance">Grievance Redressal</a>. Also review our <a href="/terms">Terms of Service</a> and <a href="/privacy">Privacy Policy</a>.</p>
    `
  },
  {
    path: 'help',
    title: 'Help Center & Guides – SocialIndia',
    description: 'Get help with your SocialIndia account, video and Clip uploads, community posts, Creator Studio, and monetization.',
    schema: {
      '@type': 'WebPage',
      'name': 'SocialIndia Help Center',
      'url': `${SITE_URL}/help`
    },
    heading: 'SocialIndia Help Center & Guides',
    content: `
      <p>Welcome to the SocialIndia Help Center. Find step-by-step guidance for uploading videos and Clips, customizing your channel, saving offline downloads, earning reward points, and enabling creator monetization.</p>
      <h2>Popular Help Topics</h2>
      <ul>
        <li><strong>Uploading Videos &amp; Clips:</strong> Upload MP4 or WebM videos, set custom thumbnails, write clear titles and descriptions, and publish from <a href="/studio">Creator Studio</a>.</li>
        <li><strong>Monetization &amp; Reward Points:</strong> Learn how views, likes, comments, and follower milestones unlock wallet conversion and UPI payouts in our <a href="/faq">FAQ</a>.</li>
        <li><strong>Channel Verification (Blue Tick):</strong> Submit your creator details from account settings to request official channel verification.</li>
        <li><strong>Account Safety &amp; Privacy:</strong> Understand how your account credentials and personal data are protected in our <a href="/privacy">Privacy Policy</a>.</li>
      </ul>
      <p>Still need help? Reach out directly via <a href="/contact">Contact Us</a> or file a formal ticket through <a href="/grievance">Grievance Redressal</a>.</p>
    `
  },
  {
    path: 'privacy',
    title: 'Privacy Policy – SocialIndia',
    description: 'Read the SocialIndia Privacy Policy to learn how account, video, community, and messaging data is processed and protected.',
    schema: {
      '@type': 'WebPage',
      'name': 'SocialIndia Privacy Policy',
      'url': `${SITE_URL}/privacy`
    },
    heading: 'SocialIndia Privacy Policy',
    content: `
      <p>This Privacy Policy explains what information SocialIndia collects, how it is used to operate video streaming, Clips, community discussions, messaging, and creator accounts, and how you can control your personal data.</p>
      <h2>Information We Process</h2>
      <ul>
        <li><strong>Account &amp; Profile Details:</strong> Display name, handle, email address, profile photo, and channel preferences stored securely via Firebase Authentication and Cloud Firestore.</li>
        <li><strong>Creator Content &amp; Interactions:</strong> Videos, Clips, thumbnails, community posts, comments, likes, and subscriptions published on the platform.</li>
        <li><strong>Device &amp; Offline Storage:</strong> Offline downloads and playback preferences saved locally in your browser so features work reliably on slow or offline connections.</li>
      </ul>
      <h2>Data Security &amp; Your Rights</h2>
      <p>We never sell personal data to third-party brokers. You can manage profile details from your settings or contact <a href="mailto:socialindia.ib@gmail.com">socialindia.ib@gmail.com</a> for data access, correction, or account deletion requests. Formal privacy complaints may also be raised through <a href="/grievance">Grievance Redressal</a>.</p>
    `
  },
  {
    path: 'refund',
    title: 'Refund & Cancellation Policy – SocialIndia',
    description: 'Read the SocialIndia Refund and Cancellation Policy for Pro subscriptions, paid video unlocks, and advertising campaigns.',
    schema: {
      '@type': 'WebPage',
      'name': 'SocialIndia Refund Policy',
      'url': `${SITE_URL}/refund`
    },
    heading: 'SocialIndia Refund & Cancellation Policy',
    content: `
      <p>This Refund &amp; Cancellation Policy outlines how billing, cancellations, and refund requests are handled across <a href="/gopro">SocialIndia Pro</a> memberships, paid video unlocks, wallet deposits, and <a href="/advertising">SocialIndia Advertising</a> campaigns.</p>
      <h2>Refund Eligibility &amp; Review Process</h2>
      <ul>
        <li><strong>Duplicate or Failed Charges:</strong> If your UPI or payment method was debited multiple times or an unlock failed to activate, we verify the transaction ID and issue a prompt refund.</li>
        <li><strong>Subscription Cancellations:</strong> Users can cancel recurring <a href="/gopro">SocialIndia Pro</a> preferences before the next billing cycle from their account settings without penalty.</li>
        <li><strong>Advertising Balance:</strong> Unspent balances for paused or unapproved ad campaigns are reviewed in accordance with campaign terms.</li>
      </ul>
      <h2>How to Request Billing Help</h2>
      <p>Send your registered email, username, and payment reference ID to <a href="mailto:socialindia.ib@gmail.com">socialindia.ib@gmail.com</a> or visit <a href="/contact">Contact Us</a>. Policy disputes can also be logged in <a href="/grievance">Grievance Redressal</a>.</p>
    `
  },
  {
    path: 'terms',
    title: 'Terms of Service – SocialIndia',
    description: 'Review the SocialIndia Terms of Service covering user content, creator responsibilities, prohibited conduct, and account rules.',
    schema: {
      '@type': 'WebPage',
      'name': 'SocialIndia Terms of Service',
      'url': `${SITE_URL}/terms`
    },
    heading: 'SocialIndia Terms of Service',
    content: `
      <p>Welcome to SocialIndia. By creating an account or accessing our website and mobile application, you agree to these Terms of Service alongside our <a href="/privacy">Privacy Policy</a> and <a href="/guidelines">Community Guidelines</a>.</p>
      <h2>User Content &amp; Intellectual Property</h2>
      <p>You retain full ownership of the original videos, Clips, photos, captions, and posts you upload to SocialIndia. By publishing content publicly, you grant SocialIndia a non-exclusive license to host, stream, format thumbnails, and display your content to viewers across the platform.</p>
      <h2>Creator Accounts, Monetization &amp; Conduct</h2>
      <ul>
        <li>You are responsible for safeguarding your login credentials and ensuring uploaded content complies with applicable Indian laws and copyright rules.</li>
        <li>Monetization rewards and UPI payouts require authentic engagement; artificial clicks, bot traffic, or spam violate these terms.</li>
        <li>SocialIndia reserves the right to remove policy-violating content or restrict accounts involved in abuse or fraud.</li>
      </ul>
      <p>Appeals and formal notices can be filed through <a href="/grievance">Grievance Redressal</a> or by emailing <a href="mailto:socialindia.ib@gmail.com">socialindia.ib@gmail.com</a>.</p>
    `
  },
  {
    path: 'search',
    title: 'Search Videos, Clips & Creators – SocialIndia',
    description: 'Search videos, viral Clips, creator channels, community posts, and trending hashtags across India on SocialIndia.',
    schema: {
      '@type': 'SearchResultsPage',
      'name': 'Search – SocialIndia',
      'url': `${SITE_URL}/search`
    },
    heading: 'Search SocialIndia Videos, Clips & Creators',
    content: `
      <p>Search across trending Indian videos, viral Clips, creator channels, music, news analysis, and community hashtags on SocialIndia.</p>
      <h2>Popular Discovery Sections</h2>
      <ul>
        <li>Browse <a href="/trending">Trending Videos</a> across India.</li>
        <li>Explore quick vertical clips in <a href="/shorts">SocialIndia Clips</a>.</li>
        <li>Share photos, polls, and discussions in <a href="/community">Community</a>.</li>
      </ul>
      ${featuredVideosHtml ? `<h2>Featured Videos</h2><ul>${featuredVideosHtml}</ul>` : ''}
    `
  },
  {
    path: 'studio',
    title: 'Creator Studio – Upload & Grow on SocialIndia',
    description: 'Upload videos and Clips, manage your channel, view analytics, and track monetization milestones in SocialIndia Creator Studio.',
    schema: {
      '@type': 'WebPage',
      'name': 'SocialIndia Creator Studio',
      'url': `${SITE_URL}/studio`
    },
    heading: 'SocialIndia Creator Studio',
    content: `
      <p>SocialIndia Creator Studio is the dedicated publishing and analytics workspace for Indian creators to upload long-form videos and vertical Clips, manage comments, grow followers, and track monetization milestones.</p>
      <h2>What You Can Manage in Creator Studio</h2>
      <ul>
        <li><strong>Video &amp; Clips Publishing:</strong> Upload high-definition videos and vertical Clips with custom thumbnails, SEO-friendly titles, descriptions, categories, and tags.</li>
        <li><strong>Audience &amp; Engagement Analytics:</strong> Monitor video views, likes, comments, shares, and follower growth in real time.</li>
        <li><strong>Monetization &amp; Payouts:</strong> Track progress toward the 500-follower and 1,000-view monetization milestone and manage UPI withdrawal requests.</li>
        <li><strong>Captions &amp; Sound Library:</strong> Enhance accessibility and creativity with subtitles and curated background audio tracks.</li>
      </ul>
      <p>Need tips on getting started? Read our <a href="/faq">FAQ</a>, browse the <a href="/help">Help Center</a>, or explore <a href="/gopro">SocialIndia Pro</a>.</p>
    `
  }
];

function buildSubpageJsonLd(schemaNode, breadcrumbItems) {
  const graph = [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      'name': 'SocialIndia',
      'url': `${SITE_URL}/`,
      'logo': {
        '@type': 'ImageObject',
        'url': DEFAULT_IMAGE,
        'width': 1200,
        'height': 630
      }
    }
  ];

  if (breadcrumbItems && breadcrumbItems.length > 0) {
    graph.push({
      '@type': 'BreadcrumbList',
      'itemListElement': breadcrumbItems.map((item, idx) => ({
        '@type': 'ListItem',
        'position': idx + 1,
        'name': item.name,
        'item': item.url
      }))
    });
  }

  if (schemaNode) {
    graph.push({
      'inLanguage': 'en-IN',
      'isPartOf': { '@type': 'WebSite', '@id': `${SITE_URL}/#website`, 'url': `${SITE_URL}/`, 'name': 'SocialIndia' },
      ...schemaNode
    });
  }

  return {
    '@context': 'https://schema.org',
    '@graph': graph
  };
}

function applyMetaAndRoot(html, { title, description, pageUrl, ogType, image, imageAlt, robots, jsonLdObject, heading, content }) {
  let out = html;
  const safeTitle = escapeHtml(title);
  const safeDesc = escapeHtml(description);
  const safeImage = escapeHtml(image || DEFAULT_IMAGE);
  const safeImageAlt = escapeHtml(imageAlt || title);
  const safeOgType = escapeHtml(ogType || 'website');

  out = out.replace(/<title>[\s\S]*?<\/title>/i, `<title>${safeTitle}</title>`);
  out = out.replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i, `<link rel="canonical" href="${pageUrl}" />`);
  out = out.replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i, `<meta name="description" content="${safeDesc}" />`);
  if (robots) {
    out = out.replace(/<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/i, `<meta name="robots" content="${robots}" />`);
  }
  out = out.replace(/<meta\s+property="og:type"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:type" content="${safeOgType}" />`);
  out = out.replace(/<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:title" content="${safeTitle}" />`);
  out = out.replace(/<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:description" content="${safeDesc}" />`);
  out = out.replace(/<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:url" content="${pageUrl}" />`);
  out = out.replace(/<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:image" content="${safeImage}" />`);
  out = out.replace(/<meta\s+property="og:image:secure_url"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:image:secure_url" content="${safeImage}" />`);
  out = out.replace(/<meta\s+property="og:image:alt"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:image:alt" content="${safeImageAlt}" />`);

  out = out.replace(/<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:title" content="${safeTitle}" />`);
  out = out.replace(/<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:description" content="${safeDesc}" />`);
  out = out.replace(/<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:image" content="${safeImage}" />`);
  out = out.replace(/<meta\s+name="twitter:image:alt"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:image:alt" content="${safeImageAlt}" />`);

  if (jsonLdObject) {
    const schemaBlock = `<!-- SEO_JSON_LD_START -->\n    <script type="application/ld+json">\n${JSON.stringify(jsonLdObject, null, 2)}\n    </script>\n    <!-- SEO_JSON_LD_END -->`;
    if (/<!--\s*SEO_JSON_LD_START\s*-->[\s\S]*?<!--\s*SEO_JSON_LD_END\s*-->/.test(out)) {
      out = out.replace(/<!--\s*SEO_JSON_LD_START\s*-->[\s\S]*?<!--\s*SEO_JSON_LD_END\s*-->/, schemaBlock);
    } else {
      out = out.replace('</head>', `    ${schemaBlock}\n  </head>`);
    }
  }

  const semanticRoot = `
    <div id="root">
      <div style="max-width:980px;margin:0 auto;padding:24px;font-family:system-ui,-apple-system,sans-serif;color:#0f172a;background:#ffffff;">
        ${sharedNavHtml}
        <main>
          <h1 style="font-size:28px;font-weight:800;color:#0f172a;margin-bottom:14px;">${escapeHtml(heading)}</h1>
          <div style="font-size:15px;line-height:1.75;color:#334155;">
            ${content}
          </div>
        </main>
        ${sharedFooterHtml}
      </div>
    </div>
  `.trim();

  out = out.replace('<div id="root"></div>', semanticRoot);
  return out;
}

// 1. Prerender semantic crawlable shell on Homepage (dist/index.html) preserving the full homepage @graph JSON-LD
const homepageHtml = applyMetaAndRoot(templateHtml, {
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  pageUrl: `${SITE_URL}/`,
  heading: HOME_TITLE,
  content: `
    <p><strong>SocialIndia</strong> is India’s own social media platform. Watch videos, explore <a href="/shorts">Clips</a>, discover creators, share photos and videos in the <a href="/community">Community</a>, and connect and chat with people across Bharat.</p>
    <p>Explore <a href="/trending">trending videos</a>, swipe through <a href="/shorts">SocialIndia Clips</a>, join <a href="/community">community posts and polls</a>, or download the <a href="/downloads">SocialIndia mobile app</a>.</p>
    ${featuredVideosHtml ? `<h2>Trending &amp; Featured Videos on SocialIndia</h2><ul>${featuredVideosHtml}</ul>` : ''}
  `
});
fs.writeFileSync(templatePath, homepageHtml, 'utf8');

// 2. Prerender all static/public routes with clean page-specific JSON-LD
let generatedCount = 0;
for (const p of pages) {
  const pageUrl = `${SITE_URL}/${p.path}`;
  const targetDir = path.join(distDir, p.path);
  fs.mkdirSync(targetDir, { recursive: true });

  const jsonLdObject = buildSubpageJsonLd(p.schema, [
    { name: 'Home', url: `${SITE_URL}/` },
    { name: p.heading, url: pageUrl }
  ]);

  const pageHtml = applyMetaAndRoot(templateHtml, {
    title: p.title,
    description: p.description,
    pageUrl,
    jsonLdObject,
    heading: p.heading,
    content: p.content
  });

  fs.writeFileSync(path.join(targetDir, 'index.html'), pageHtml, 'utf8');
  generatedCount++;
}

// 3. Prerender all public watch and clips/shorts routes from videos_seed.json so every sitemap URL has a unique canonical, title, description, thumbnail, and VideoObject JSON-LD
let videoPrerenderCount = 0;
for (const v of seedVideos) {
  if (!v || !v.videoId || !v.title) continue;
  const routeSegment = v.isShort ? 'shorts' : 'watch';
  const pageUrl = `${SITE_URL}/${routeSegment}/${v.videoId}`;
  const targetDir = path.join(distDir, routeSegment, v.videoId);
  fs.mkdirSync(targetDir, { recursive: true });

  const cleanTitle = cleanText(v.title);
  const pageTitle = v.isShort
    ? `${cleanTitle.slice(0, 70)} | Clips - SocialIndia`
    : `${cleanTitle.slice(0, 75)} - SocialIndia`;
  const pageDesc = truncateDescription(
    v.description,
    `Watch "${cleanTitle}" on SocialIndia, India’s own social media and video platform.`
  );
  const thumbUrl = v.thumbnailUrl || DEFAULT_IMAGE;

  const rawVideoUrl = String(v.videoUrl || '').trim();
  const driveFileMatch = rawVideoUrl.match(/https?:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
  const driveOpenMatch = rawVideoUrl.match(/https?:\/\/drive\.google\.com\/(?:open|uc)\?[^#]*\bid=([a-zA-Z0-9_-]+)/i);
  const ytMatch = rawVideoUrl.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,})/i);
  const isNonDirectUrl = Boolean(driveFileMatch || driveOpenMatch || ytMatch);
  const resolvedEmbedUrl = driveFileMatch
    ? `https://drive.google.com/file/d/${driveFileMatch[1]}/preview`
    : driveOpenMatch
      ? `https://drive.google.com/file/d/${driveOpenMatch[1]}/preview`
      : ytMatch
        ? `https://www.youtube.com/embed/${ytMatch[1]}`
        : pageUrl;

  const videoSchema = {
    '@type': 'VideoObject',
    'name': cleanTitle,
    'description': cleanText(v.description) || pageDesc,
    'thumbnailUrl': [thumbUrl],
    'uploadDate': toIsoUploadDate(v.createdAt),
    'duration': toIsoDuration(v.duration),
    ...(!isNonDirectUrl && rawVideoUrl ? { 'contentUrl': rawVideoUrl } : {}),
    'embedUrl': resolvedEmbedUrl,
    'publisher': { '@id': `${SITE_URL}/#organization` }
  };

  const jsonLdObject = buildSubpageJsonLd(videoSchema, [
    { name: 'Home', url: `${SITE_URL}/` },
    { name: v.isShort ? 'Clips' : 'Trending Videos', url: v.isShort ? `${SITE_URL}/shorts` : `${SITE_URL}/trending` },
    { name: cleanTitle, url: pageUrl }
  ]);

  const relatedPool = qualitySeedVideos.filter(item => item.videoId !== v.videoId && Boolean(item.isShort) === Boolean(v.isShort));
  const seedIdx = Math.max(0, relatedPool.findIndex(item => item.videoId > v.videoId));
  const rotatedRelated = [
    ...relatedPool.slice(seedIdx, seedIdx + 8),
    ...relatedPool.slice(0, Math.max(0, 8 - Math.max(0, relatedPool.length - seedIdx)))
  ].slice(0, 8);
  const relatedLinksHtml = renderVideoLinkItems(rotatedRelated);

  const durationSec = Math.max(1, Math.round(Number(v.duration) || 30));
  const durationDisplay = `${Math.floor(durationSec / 60)}:${String(durationSec % 60).padStart(2, '0')}`;
  const publishedDateDisplay = toIsoUploadDate(v.createdAt).split('T')[0];

  const videoHtml = applyMetaAndRoot(templateHtml, {
    title: pageTitle,
    description: pageDesc,
    pageUrl,
    ogType: 'video.other',
    image: thumbUrl,
    imageAlt: cleanTitle,
    robots: isQualitySeedVideo(v) ? undefined : 'noindex, nofollow',
    jsonLdObject,
    heading: cleanTitle,
    content: `
      <p><img src="${escapeHtml(thumbUrl)}" alt="${escapeHtml(cleanTitle)}" style="max-width:100%;border-radius:12px;margin-bottom:16px;" /></p>
      <p><strong>Format:</strong> ${v.isShort ? 'SocialIndia Clip (Short Video)' : 'Full Video'} &middot; <strong>Duration:</strong> ${durationDisplay} &middot; <strong>Published:</strong> ${publishedDateDisplay}</p>
      <p>${escapeHtml(cleanText(v.description) || pageDesc)}</p>
      <p>Stream on <a href="/" style="color:#2563eb;font-weight:600;">SocialIndia</a>, India&rsquo;s own social media and video platform. Like, comment, save for offline viewing, or explore <a href="${escapeHtml(v.isShort ? '/shorts' : '/trending')}" style="color:#2563eb;font-weight:600;">more ${v.isShort ? 'Clips' : 'trending videos'}</a>.</p>
      ${relatedLinksHtml ? `<h2>Up Next on SocialIndia</h2><ul>${relatedLinksHtml}</ul>` : ''}
    `
  });

  fs.writeFileSync(path.join(targetDir, 'index.html'), videoHtml, 'utf8');
  videoPrerenderCount++;
}

// 4. Handle sample-short-1 and sample-short-2: mark them noindex so Googlebot drops them from the index
for (const sampleId of ['sample-short-1', 'sample-short-2']) {
  const watchDir = path.join(distDir, 'watch', sampleId);
  fs.mkdirSync(watchDir, { recursive: true });

  const sampleHtml = applyMetaAndRoot(templateHtml, {
    title: 'Video Removed – SocialIndia',
    description: 'This sample video is no longer available on SocialIndia.',
    pageUrl: `${SITE_URL}/`,
    robots: 'noindex, nofollow',
    jsonLdObject: buildSubpageJsonLd({
      '@type': 'WebPage',
      'name': 'Video Removed – SocialIndia',
      'url': `${SITE_URL}/`
    }),
    heading: 'Video Removed or Not Available',
    content: `
      <p>This sample video is no longer available on SocialIndia.</p>
      <p><a href="/trending" style="color:#2563eb;font-weight:600;">Browse Trending Videos</a></p>
    `
  });

  fs.writeFileSync(path.join(watchDir, 'index.html'), sampleHtml, 'utf8');
}

console.log(`Successfully pre-rendered homepage, ${generatedCount} static routes, ${videoPrerenderCount} video/clip routes, and 2 noindex sample routes into dist/!`);
