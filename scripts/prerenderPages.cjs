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

const featuredVideosHtml = seedVideos
  .filter(v => v && v.videoId && v.title)
  .slice(0, 12)
  .map(v => {
    const url = v.isShort ? `/shorts/${v.videoId}` : `/watch/${v.videoId}`;
    return `<li><a href="${escapeHtml(url)}" style="color:#2563eb;text-decoration:none;font-weight:600;">${escapeHtml(cleanText(v.title))}</a></li>`;
  })
  .join('\n');

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
      <p>Connect with creators and people across India. Share photos and videos, participate in interactive polls, and discover discussions happening across SocialIndia.</p>
      <h2>Explore Community Conversations</h2>
      <p>Creators use the Community feed to share photos, behind-the-scenes updates, audience polls, and video announcements while connecting directly with followers.</p>
      <p>Please review our <a href="/guidelines">Community Guidelines</a> to help keep conversations respectful, safe, and welcoming for everyone across Bharat.</p>
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
      ${featuredVideosHtml ? `<h2>Popular &amp; Recent Videos on SocialIndia</h2><ul>${featuredVideosHtml}</ul>` : ''}
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
      <p>Explore vertical Clips and short videos from Indian creators. Watch comedy skits, news explainers, music clips, devotionals, and daily moments in a swipeable player.</p>
      <h2>Why Watch &amp; Share Clips on SocialIndia</h2>
      <ul>
        <li>Instant vertical playback optimized for mobile networks and desktop browsers.</li>
        <li>Like, comment, share, and follow creators directly from the Clips feed.</li>
        <li>Upload Clips via <a href="/studio">Creator Studio</a> to grow your audience and earn reward points.</li>
      </ul>
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
      <p>Reach out to SocialIndia for general customer support, creator questions, partnership inquiries, feedback, or platform suggestions.</p>
      <h2>Direct Email Support</h2>
      <p>Email: <a href="mailto:socialindia.ib@gmail.com">socialindia.ib@gmail.com</a></p>
      <h2>Other Support Channels</h2>
      <ul>
        <li>Read answers to common questions in our <a href="/faq">FAQ</a> and <a href="/help">Help Center</a>.</li>
        <li>For formal content, privacy, or policy complaints, please use the <a href="/grievance">Grievance Redressal</a> form to receive a complaint tracking ID.</li>
        <li>For brand promotions and sponsorships, visit <a href="/advertising">SocialIndia Advertising</a>.</li>
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
      <p>If you need to report a formal content concern, copyright issue, account dispute, or safety complaint on SocialIndia, submit your request through the Grievance Redressal form.</p>
      <h2>How Grievance Tracking Works</h2>
      <p>Each submission generates a tracking ID on screen so you can reference your case when following up with the SocialIndia Grievance &amp; Support Team at socialindia.ib@gmail.com.</p>
      <p>Please save the tracking ID shown after submission. Review our <a href="/guidelines">Community Guidelines</a>, <a href="/privacy">Privacy Policy</a>, and <a href="/terms">Terms of Service</a> for policy details.</p>
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
      <p>Promote your brand, app, or product with custom in-stream video advertisements, sponsored feed cards, and creator campaigns built for Indian audiences.</p>
      <h2>Why Advertise with SocialIndia?</h2>
      <ul>
        <li>Reach engaged audiences across Tier 1, Tier 2, and Tier 3 cities in India.</li>
        <li>Clear campaign analytics with impressions, click-through rates, and performance tracking.</li>
        <li>Seamless native formats across home feeds, watch pages, and community discussions.</li>
      </ul>
      <p>Learn about our advertising disclosure standards in the <a href="/adinfo">Ad Transparency Center</a> or <a href="/contact">contact our team</a> to launch a campaign.</p>
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
      <p>We believe in honest, safe, and transparent advertising across SocialIndia. Every sponsored placement is clearly labeled so viewers always know when content is promoted.</p>
      <h2>Our Advertising Principles</h2>
      <ul>
        <li><strong>Clear Labeling:</strong> Sponsored videos and brand cards carry visible ad indicators.</li>
        <li><strong>User Privacy:</strong> Advertising operates in accordance with our <a href="/privacy">Privacy Policy</a>.</li>
        <li><strong>Safety Review:</strong> Prohibited, deceptive, or harmful promotions are restricted under our platform policies.</li>
      </ul>
      <p>Interested in promoting on SocialIndia? Explore <a href="/advertising">SocialIndia Advertising</a>.</p>
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
      <p>Unlock enhanced creator capabilities with SocialIndia Pro. Built for growing Indian channels, educators, entertainers, and brands.</p>
      <h2>What Is Included in SocialIndia Pro</h2>
      <ul>
        <li>Verified creator badge eligibility and standout channel branding.</li>
        <li>Ad-free viewing experience and high-quality video streaming.</li>
        <li>Extended analytics inside <a href="/studio">Creator Studio</a> and priority creator support.</li>
      </ul>
      <p>Review subscription terms and cancellation rules on our <a href="/refund">Refund Policy</a> and <a href="/terms">Terms of Service</a> pages.</p>
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
      <p>Take SocialIndia anywhere on your phone. Download the official Android app (APK) or install the lightweight Progressive Web App (PWA) directly from your browser.</p>
      <h2>App Highlights</h2>
      <ul>
        <li>Watch trending videos and explore <a href="/shorts">Clips</a> with fast adaptive playback.</li>
        <li>Save videos for offline viewing in your personal Downloads library.</li>
        <li>Share photos and videos, receive notifications, and chat with people on the go.</li>
      </ul>
      <p>Need help installing the app? Visit our <a href="/help">Help Center</a> or <a href="/faq">FAQ</a>.</p>
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
      <p>Build integrations and embed SocialIndia videos across blogs, portals, and web apps using standard web links and responsive embed workflows.</p>
      <h2>Developer Resources</h2>
      <ul>
        <li>Clean canonical watch URLs (<code>/watch/&lt;id&gt;</code> and <code>/shorts/&lt;id&gt;</code>) and creator handle routing (<code>/@handle</code>).</li>
        <li>Structured OpenGraph and Schema.org metadata for rich link previews.</li>
        <li>Integration support via <a href="/contact">Contact Us</a>.</li>
      </ul>
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
      <p>These guidelines describe content and conduct expectations across SocialIndia so creators and viewers can share ideas safely and respectfully.</p>
      <h2>Core Safety &amp; Content Pillars</h2>
      <ul>
        <li><strong>Respect &amp; Anti-Harassment:</strong> Hate speech, bullying, threats, and targeted harassment are prohibited.</li>
        <li><strong>Copyright &amp; Originality:</strong> Only upload videos, photos, audio, and thumbnails you own or have permission to share.</li>
        <li><strong>No Spam or Scams:</strong> Deceptive metadata, phishing links, and artificial engagement manipulation are not permitted.</li>
        <li><strong>Reporting &amp; Review:</strong> Users can report concerning content or file formal complaints via <a href="/grievance">Grievance Redressal</a>.</li>
      </ul>
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
      <p>Everything you need to know about using SocialIndia: uploading videos and Clips, sharing community posts, troubleshooting playback, updating your channel profile, and managing monetization.</p>
      <h2>Popular Help Topics</h2>
      <ul>
        <li><strong>Uploading Videos &amp; Clips:</strong> Supported formats, thumbnails, titles, and hashtags in <a href="/studio">Creator Studio</a>.</li>
        <li><strong>Monetization &amp; Points:</strong> Track your follower and view milestones in our <a href="/faq">FAQ</a>.</li>
        <li><strong>Account &amp; Privacy:</strong> Learn how your data is protected in our <a href="/privacy">Privacy Policy</a>.</li>
        <li><strong>Direct Assistance:</strong> Reach out via <a href="/contact">Contact Us</a> or <a href="/grievance">Grievance Redressal</a>.</li>
      </ul>
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
      <p>This Privacy Policy explains what information SocialIndia collects, how it is used to run video streaming, Clips, community features, messaging, and creator accounts, and how you can manage your privacy requests.</p>
      <h2>Information We Process</h2>
      <p>The application uses Firebase Authentication, Cloud Firestore, Firebase Storage, and Cloudinary for media uploads. Account profile information (display name, handle, email) and uploaded content (videos, photos, thumbnails, comments, community posts) are processed to deliver platform features.</p>
      <h2>Your Rights &amp; Privacy Support</h2>
      <p>You may contact SocialIndia at socialindia.ib@gmail.com to request access, correction, or account deletion assistance. Formal complaints can also be submitted via <a href="/grievance">Grievance Redressal</a>.</p>
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
      <p>This policy outlines how refunds, cancellations, and billing disputes are handled for <a href="/gopro">SocialIndia Pro</a> memberships, paid video unlocks, wallet transactions, and <a href="/advertising">advertising campaigns</a>.</p>
      <h2>Eligibility &amp; Support</h2>
      <ul>
        <li>Duplicate charges or failed digital unlocks are reviewed promptly upon contacting support with your transaction details.</li>
        <li>You can cancel recurring preferences from your account settings prior to the next billing period.</li>
        <li>Contact <a href="mailto:socialindia.ib@gmail.com">socialindia.ib@gmail.com</a> or visit <a href="/contact">Contact Us</a> for billing help.</li>
      </ul>
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
      <p>By accessing or using SocialIndia, you agree to these Terms of Service, our <a href="/privacy">Privacy Policy</a>, and our <a href="/guidelines">Community Guidelines</a>.</p>
      <h2>User Content &amp; Responsibilities</h2>
      <p>You retain ownership of original videos, photos, and posts you upload, while granting SocialIndia the license required to host, transcode, and display your content on the platform. You must not upload unlawful, infringing, or harmful material.</p>
      <h2>Account Safety &amp; Enforcement</h2>
      <p>Accounts violating platform safety rules or copyright laws may have content removed or access restricted. Appeals and formal grievances can be filed through <a href="/grievance">Grievance Redressal</a>.</p>
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
      <p>SocialIndia Creator Studio is the dedicated workspace for Indian creators to upload videos and Clips, review audience analytics, manage comments, and track monetization milestones.</p>
      <h2>Creator Studio Capabilities</h2>
      <ul>
        <li>Upload long-form videos and vertical Clips with custom thumbnails, descriptions, and tags.</li>
        <li>Monitor views, watch engagement, follower growth, and reward points.</li>
        <li>Unlock monetization once you reach 500 followers and 1,000 views on any single video. See our <a href="/faq">FAQ</a> for details.</li>
      </ul>
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

  const videoSchema = {
    '@type': 'VideoObject',
    'name': cleanTitle,
    'description': cleanText(v.description) || pageDesc,
    'thumbnailUrl': [thumbUrl],
    'uploadDate': toIsoUploadDate(v.createdAt),
    'duration': toIsoDuration(v.duration),
    'contentUrl': v.videoUrl || pageUrl,
    'embedUrl': pageUrl,
    'publisher': { '@id': `${SITE_URL}/#organization` }
  };

  const jsonLdObject = buildSubpageJsonLd(videoSchema, [
    { name: 'Home', url: `${SITE_URL}/` },
    { name: v.isShort ? 'Clips' : 'Trending Videos', url: v.isShort ? `${SITE_URL}/shorts` : `${SITE_URL}/trending` },
    { name: cleanTitle, url: pageUrl }
  ]);

  const videoHtml = applyMetaAndRoot(templateHtml, {
    title: pageTitle,
    description: pageDesc,
    pageUrl,
    ogType: 'video.other',
    image: thumbUrl,
    imageAlt: cleanTitle,
    jsonLdObject,
    heading: cleanTitle,
    content: `
      <p><img src="${escapeHtml(thumbUrl)}" alt="${escapeHtml(cleanTitle)}" style="max-width:100%;border-radius:12px;margin-bottom:16px;" /></p>
      <p>${escapeHtml(cleanText(v.description) || pageDesc)}</p>
      <p><a href="${escapeHtml(v.isShort ? '/shorts' : '/trending')}" style="color:#2563eb;font-weight:600;">Explore more ${v.isShort ? 'Clips' : 'videos'} on SocialIndia</a></p>
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
