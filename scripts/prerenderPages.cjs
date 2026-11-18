const fs = require('fs');
const path = require('path');

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
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const sharedNavHtml = `
  <header style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;padding-bottom:16px;margin-bottom:24px;border-bottom:1px solid #e2e8f0;">
    <a href="/" style="font-size:20px;font-weight:800;color:#2563eb;text-decoration:none;">SocialIndia</a>
    <nav aria-label="Primary navigation" style="display:flex;flex-wrap:wrap;gap:14px;font-size:14px;font-weight:600;">
      <a href="/" style="color:#0f172a;text-decoration:none;">Home</a>
      <a href="/trending" style="color:#0f172a;text-decoration:none;">Trending</a>
      <a href="/shorts" style="color:#0f172a;text-decoration:none;">Shorts</a>
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
          <a href="/shorts" style="color:#2563eb;text-decoration:none;">Shorts</a>
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
    return `<li><a href="${escapeHtml(url)}" style="color:#2563eb;text-decoration:none;font-weight:600;">${escapeHtml(v.title)}</a></li>`;
  })
  .join('\n');

const pages = [
  {
    path: 'about',
    title: 'About SocialIndia – Built by Bharat.',
    description: 'SocialIndia is an Indian social media and video-sharing platform for sharing videos, discovering content, connecting with communities, and following creators.',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'AboutPage',
      'name': 'About SocialIndia',
      'url': 'https://socialindia.web.app/about',
      'description': 'SocialIndia is an Indian social media and video-sharing platform.'
    },
    heading: 'About SocialIndia · Built by Bharat.',
    content: `
      <p>SocialIndia is an Indian social media and video-sharing platform where people can watch trending videos, share short clips, connect with communities, and follow creators across Bharat.</p>
      <p>Our goal is to provide an independent, fast, and creator-first digital platform built for Indian users, regional languages, and local communities.</p>
      <h2>What You Can Do on SocialIndia</h2>
      <ul>
        <li>Watch long-form videos and vertical <a href="/shorts">SocialIndia Shorts</a> in high definition.</li>
        <li>Join polls, announcements, and discussions in the <a href="/community">Community Feed</a>.</li>
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
    title: 'Community & Discussions – SocialIndia',
    description: 'Join the SocialIndia community to discuss trending topics, vote in creator polls, share updates, and interact with fellow creators and audiences across India.',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      'name': 'SocialIndia Community Feed',
      'url': 'https://socialindia.web.app/community',
      'description': 'Explore posts, creator updates, and interactive discussions on SocialIndia.'
    },
    heading: 'SocialIndia Community & Discussions',
    content: `
      <p>Connect with creators and viewers across India. Participate in interactive polls, share updates, and discover discussions happening across the SocialIndia network.</p>
      <h2>Explore Community Conversations</h2>
      <p>Creators use the Community feed to share behind-the-scenes photos, run audience polls, announce upcoming video premieres, and reply directly to followers.</p>
      <p>Please review our <a href="/guidelines">Community Guidelines</a> to help keep conversations respectful, safe, and welcoming for everyone across Bharat.</p>
    `
  },
  {
    path: 'trending',
    title: 'Trending Videos in India – SocialIndia',
    description: 'Discover the most popular trending videos, viral short clips, music, gaming, and entertainment across India on SocialIndia today.',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      'name': 'Trending Videos – SocialIndia',
      'url': 'https://socialindia.web.app/trending',
      'description': 'Discover top trending and viral videos on SocialIndia.'
    },
    heading: 'Trending Videos & Viral Creators in India',
    content: `
      <p>Watch what India is watching right now. Explore top trending videos across entertainment, music, comedy, technology, news commentary, and regional culture.</p>
      ${featuredVideosHtml ? `<h2>Popular &amp; Recent Videos on SocialIndia</h2><ul>${featuredVideosHtml}</ul>` : ''}
      <p>Looking for fast vertical clips? Visit <a href="/shorts">SocialIndia Shorts</a> or <a href="/search">search all channels and videos</a>.</p>
    `
  },
  {
    path: 'shorts',
    title: 'Trending Shorts – Watch Short Videos on SocialIndia',
    description: 'Enjoy fast-paced, entertaining short video clips on SocialIndia Shorts. Discover viral dances, comedy skits, tutorials, and lifestyle moments.',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      'name': 'SocialIndia Shorts',
      'url': 'https://socialindia.web.app/shorts',
      'description': 'Watch viral short videos and quick clips on SocialIndia.'
    },
    heading: 'SocialIndia Shorts – Viral Short Video Streaming',
    content: `
      <p>Explore vertical short videos from Indian creators. Watch comedy skits, news explainers, music clips, devotionals, and daily vlogs in an instant swipeable player.</p>
      <h2>Why Watch &amp; Create Shorts on SocialIndia</h2>
      <ul>
        <li>Instant vertical playback optimized for mobile networks and desktop browsers.</li>
        <li>Like, comment, share, and follow creators directly from the feed.</li>
        <li>Upload short clips via <a href="/studio">Creator Studio</a> to grow your audience and earn reward points.</li>
      </ul>
    `
  },
  {
    path: 'faq',
    title: 'Frequently Asked Questions (FAQ) – SocialIndia',
    description: 'Find answers to common questions about earning reward points, wallet withdrawals, creator monetization, uploading videos, and account safety on SocialIndia.',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      'mainEntity': [
        {
          '@type': 'Question',
          'name': 'How do I earn points on SocialIndia?',
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': 'You earn points organically by engaging: watching videos (+2 points), liking videos and shorts (+5 points), commenting (+10 points), and uploading new videos (+20 points).'
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
            'text': 'Yes! Watching, uploading, liking, and commenting on SocialIndia is completely free for all users.'
          }
        }
      ]
    },
    heading: 'Frequently Asked Questions (FAQ)',
    content: `
      <p>Find clear answers about using SocialIndia, creator monetization, reward points, mobile downloads, and account safety.</p>
      <h2>How do I earn points on SocialIndia?</h2>
      <p>You earn points organically by engaging with the platform: watching videos, liking videos and shorts, commenting on creator posts, and publishing new videos.</p>
      <h2>How do I convert points into wallet balance?</h2>
      <p>You can convert accumulated reward points into wallet balance directly from the Wallet or Reward Points section inside your account settings.</p>
      <h2>How do I unlock creator monetization?</h2>
      <p>Monetization unlocks when your channel reaches 500 followers and at least 1,000 views on any single video. Manage your channel in <a href="/studio">Creator Studio</a>.</p>
      <h2>Is SocialIndia free to use?</h2>
      <p>Yes. Watching videos, uploading content, liking, commenting, and participating in the community are completely free for all users. Optional creator upgrades are available on <a href="/gopro">SocialIndia Pro</a>.</p>
      <p>Need more assistance? Visit the <a href="/help">Help Center</a> or <a href="/contact">Contact Us</a>.</p>
    `
  },
  {
    path: 'contact',
    title: 'Contact SocialIndia – General Support',
    description: 'Contact SocialIndia for general customer support, user queries, feedback, suggestions, and general questions.',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'ContactPage',
      'name': 'Contact SocialIndia',
      'url': 'https://socialindia.web.app/contact',
      'description': 'Contact SocialIndia for general support and questions.'
    },
    heading: 'Contact SocialIndia',
    content: `
      <p>Reach out to SocialIndia for general customer support, user questions, partnership inquiries, feedback, or platform suggestions.</p>
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
    description: 'Submit a grievance to the SocialIndia Grievance & Support Team and receive a complaint tracking ID.',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'ContactPage',
      'name': 'Grievance Redressal & Support – SocialIndia',
      'url': 'https://socialindia.web.app/grievance'
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
    title: 'Advertise on SocialIndia – Reach Millions of Indian Viewers',
    description: 'Grow your business with high-impact video ads, sponsored banners, and creator collaborations on SocialIndia. Target passionate audiences across Bharat.',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      'name': 'SocialIndia Advertising',
      'url': 'https://socialindia.web.app/advertising'
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
    description: 'Learn how advertisements work on SocialIndia, how personalized advertising is delivered responsibly, and how to manage your ad preferences.',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      'name': 'SocialIndia Ad Transparency Center',
      'url': 'https://socialindia.web.app/adinfo'
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
    title: 'SocialIndia Pro – Premium Creator Tools & Verified Badges',
    description: 'Upgrade to SocialIndia Pro for advanced studio analytics, priority monetization payouts, custom channel branding, and blue verification badges.',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      'name': 'SocialIndia Pro Subscription',
      'url': 'https://socialindia.web.app/gopro'
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
    description: 'Download the official SocialIndia Android app (APK) or install our fast Progressive Web App (PWA) for instant offline video viewing and smooth performance.',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      'name': 'SocialIndia Mobile App',
      'operatingSystem': 'Android, Web',
      'applicationCategory': 'SocialNetworkingApplication',
      'url': 'https://socialindia.web.app/downloads',
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
        <li>Watch trending videos and <a href="/shorts">Shorts</a> with fast adaptive playback.</li>
        <li>Save videos for offline viewing in your personal Downloads library.</li>
        <li>Receive real-time creator notifications and join <a href="/community">Community</a> discussions on the go.</li>
      </ul>
      <p>Need help installing the app? Visit our <a href="/help">Help Center</a> or <a href="/faq">FAQ</a>.</p>
    `
  },
  {
    path: 'developers',
    title: 'Developer Portal & API – SocialIndia',
    description: 'Explore the SocialIndia Developer Portal, documentation, SDKs, and REST APIs for integrating video embeds and creator authentication.',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      'name': 'SocialIndia Developer Portal',
      'url': 'https://socialindia.web.app/developers'
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
    description: 'Read the SocialIndia Community Guidelines to learn about content policies, safety standards, intellectual property rules, and respectful community conduct.',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      'name': 'SocialIndia Community Guidelines',
      'url': 'https://socialindia.web.app/guidelines'
    },
    heading: 'SocialIndia Community Guidelines & Content Safety',
    content: `
      <p>These guidelines describe content and conduct expectations across SocialIndia so creators and viewers can share ideas safely and respectfully.</p>
      <h2>Core Safety &amp; Content Pillars</h2>
      <ul>
        <li><strong>Respect &amp; Anti-Harassment:</strong> Hate speech, bullying, threats, and targeted harassment are prohibited.</li>
        <li><strong>Copyright &amp; Originality:</strong> Only upload videos, audio, and thumbnails you own or have permission to share.</li>
        <li><strong>No Spam or Scams:</strong> Deceptive metadata, phishing links, and artificial engagement manipulation are not permitted.</li>
        <li><strong>Reporting &amp; Review:</strong> Users can report concerning content or file formal complaints via <a href="/grievance">Grievance Redressal</a>.</li>
      </ul>
    `
  },
  {
    path: 'help',
    title: 'Help Center & Tutorials – SocialIndia',
    description: 'Get help with your SocialIndia account, video uploads, monetization setup, copyright questions, and password recovery.',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      'name': 'SocialIndia Help Center',
      'url': 'https://socialindia.web.app/help'
    },
    heading: 'SocialIndia Help Center & Guides',
    content: `
      <p>Everything you need to know about using SocialIndia: uploading videos and Shorts, troubleshooting playback, updating your channel profile, and managing monetization.</p>
      <h2>Popular Help Topics</h2>
      <ul>
        <li><strong>Uploading Videos:</strong> Supported formats, thumbnails, titles, and hashtags in <a href="/studio">Creator Studio</a>.</li>
        <li><strong>Monetization &amp; Points:</strong> Track your follower and view milestones in our <a href="/faq">FAQ</a>.</li>
        <li><strong>Account &amp; Privacy:</strong> Learn how your data is protected in our <a href="/privacy">Privacy Policy</a>.</li>
        <li><strong>Direct Assistance:</strong> Reach out via <a href="/contact">Contact Us</a> or <a href="/grievance">Grievance Redressal</a>.</li>
      </ul>
    `
  },
  {
    path: 'privacy',
    title: 'Privacy Policy – SocialIndia',
    description: 'Learn what information the SocialIndia application processes, how it is used, and how to contact SocialIndia about privacy requests.',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      'name': 'SocialIndia Privacy Policy',
      'url': 'https://socialindia.web.app/privacy'
    },
    heading: 'SocialIndia Privacy Policy',
    content: `
      <p>This Privacy Policy explains what information SocialIndia collects, how it is used to run video streaming, community features, and creator accounts, and how you can manage your privacy requests.</p>
      <h2>Information We Process</h2>
      <p>The application uses Firebase Authentication, Cloud Firestore, Firebase Storage, and Cloudinary for media uploads. Account profile information (display name, handle, email) and uploaded content (videos, thumbnails, comments, community posts) are processed to deliver platform features.</p>
      <h2>Your Rights &amp; Privacy Support</h2>
      <p>You may contact SocialIndia at socialindia.ib@gmail.com to request access, correction, or account deletion assistance. Formal complaints can also be submitted via <a href="/grievance">Grievance Redressal</a>.</p>
    `
  },
  {
    path: 'refund',
    title: 'Refund & Cancellation Policy – SocialIndia',
    description: 'Read the SocialIndia Refund and Cancellation Policy regarding paid video unlocks, pro subscriptions, wallet transactions, and ad campaigns.',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      'name': 'SocialIndia Refund Policy',
      'url': 'https://socialindia.web.app/refund'
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
    description: 'Terms governing use of SocialIndia, user content, prohibited conduct, reports, and account restrictions.',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      'name': 'SocialIndia Terms of Service',
      'url': 'https://socialindia.web.app/terms'
    },
    heading: 'SocialIndia Terms of Service',
    content: `
      <p>By accessing or using SocialIndia, you agree to these Terms of Service, our <a href="/privacy">Privacy Policy</a>, and our <a href="/guidelines">Community Guidelines</a>.</p>
      <h2>User Content &amp; Responsibilities</h2>
      <p>You retain ownership of original videos and posts you upload, while granting SocialIndia the license required to host, transcode, and display your content on the platform. You must not upload unlawful, infringing, or harmful material.</p>
      <h2>Account Safety &amp; Enforcement</h2>
      <p>Accounts violating platform safety rules or copyright laws may have content removed or access restricted. Appeals and formal grievances can be filed through <a href="/grievance">Grievance Redressal</a>.</p>
    `
  },
  {
    path: 'search',
    title: 'Search Videos & Channels – SocialIndia',
    description: 'Search for trending videos, channels, creators, music, shorts, and hashtags across India on SocialIndia.',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'SearchResultsPage',
      'name': 'Search – SocialIndia',
      'url': 'https://socialindia.web.app/search'
    },
    heading: 'Search SocialIndia Videos, Shorts & Creators',
    content: `
      <p>Search across trending Indian videos, viral short clips, creator channels, music, news analysis, and community hashtags on SocialIndia.</p>
      <h2>Popular Discovery Sections</h2>
      <ul>
        <li>Browse <a href="/trending">Trending Videos</a> across India.</li>
        <li>Watch quick vertical clips in <a href="/shorts">SocialIndia Shorts</a>.</li>
        <li>Explore creator polls and discussions in <a href="/community">Community</a>.</li>
      </ul>
      ${featuredVideosHtml ? `<h2>Featured Videos</h2><ul>${featuredVideosHtml}</ul>` : ''}
    `
  },
  {
    path: 'studio',
    title: 'Creator Studio – SocialIndia',
    description: 'Manage your videos, analyze view counts, view audience retention, track monetization earnings, and customize your channel in SocialIndia Creator Studio.',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      'name': 'SocialIndia Creator Studio',
      'url': 'https://socialindia.web.app/studio'
    },
    heading: 'SocialIndia Creator Studio',
    content: `
      <p>SocialIndia Creator Studio is the dedicated workspace for Indian video creators to upload videos and Shorts, review audience analytics, manage comments, and track monetization milestones.</p>
      <h2>Creator Studio Capabilities</h2>
      <ul>
        <li>Upload long-form videos and vertical Shorts with custom thumbnails, descriptions, and tags.</li>
        <li>Monitor views, watch engagement, follower growth, and reward points.</li>
        <li>Unlock monetization once you reach 500 followers and 1,000 views on any single video. See our <a href="/faq">FAQ</a> for details.</li>
      </ul>
    `
  }
];

function applyMetaAndRoot(html, { title, description, pageUrl, robots, schema, heading, content }) {
  let out = html;
  out = out.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);
  out = out.replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i, `<link rel="canonical" href="${pageUrl}" />`);
  out = out.replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i, `<meta name="description" content="${escapeHtml(description)}" />`);
  if (robots) {
    out = out.replace(/<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/i, `<meta name="robots" content="${robots}" />`);
  }
  out = out.replace(/<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:title" content="${escapeHtml(title)}" />`);
  out = out.replace(/<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:description" content="${escapeHtml(description)}" />`);
  out = out.replace(/<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:url" content="${pageUrl}" />`);
  out = out.replace(/<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:title" content="${escapeHtml(title)}" />`);
  out = out.replace(/<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:description" content="${escapeHtml(description)}" />`);

  if (schema) {
    const schemaTag = `\n    <!-- Page-Specific Schema.org Structured Data -->\n    <script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n    </script>\n  </head>`;
    out = out.replace('</head>', schemaTag);
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

// 1. Prerender semantic crawlable shell on Homepage (dist/index.html) so Googlebot sees all internal links immediately
const homepageHtml = applyMetaAndRoot(templateHtml, {
  title: 'SocialIndia (Social India) – India’s Video, Shorts & Community Platform',
  description: 'SocialIndia (Social India) is an Indian social media and video platform. Watch trending videos, viral Shorts, and connect with creators across Bharat.',
  pageUrl: 'https://socialindia.web.app/',
  heading: 'SocialIndia (Social India) – India’s Video, Shorts & Community Platform',
  content: `
    <p>Welcome to <strong>SocialIndia</strong> (also searched as <strong>Social India</strong>), an independent Indian social media and video-sharing platform built for creators, viewers, and communities across Bharat.</p>
    <p>Watch <a href="/trending">trending Indian videos</a>, swipe through viral <a href="/shorts">SocialIndia Shorts</a>, join <a href="/community">community polls and discussions</a>, or download the <a href="/downloads">SocialIndia Android app (APK &amp; PWA)</a>.</p>
    ${featuredVideosHtml ? `<h2>Trending &amp; Featured Videos on SocialIndia</h2><ul>${featuredVideosHtml}</ul>` : ''}
  `
});
fs.writeFileSync(templatePath, homepageHtml, 'utf8');

// 2. Prerender all static/public routes
let generatedCount = 0;
for (const p of pages) {
  const pageUrl = `https://socialindia.web.app/${p.path}`;
  const targetDir = path.join(distDir, p.path);
  fs.mkdirSync(targetDir, { recursive: true });

  const pageHtml = applyMetaAndRoot(templateHtml, {
    title: p.title,
    description: p.description,
    pageUrl,
    schema: p.schema,
    heading: p.heading,
    content: p.content
  });

  fs.writeFileSync(path.join(targetDir, 'index.html'), pageHtml, 'utf8');
  generatedCount++;
}

// 3. Handle sample-short-1 and sample-short-2: mark them noindex so Googlebot drops them from the index
for (const sampleId of ['sample-short-1', 'sample-short-2']) {
  const watchDir = path.join(distDir, 'watch', sampleId);
  fs.mkdirSync(watchDir, { recursive: true });

  const sampleHtml = applyMetaAndRoot(templateHtml, {
    title: 'Video Removed – SocialIndia',
    description: 'This sample video is no longer available on SocialIndia.',
    pageUrl: 'https://socialindia.web.app/',
    robots: 'noindex, nofollow',
    heading: 'Video Removed or Not Available',
    content: `
      <p>This sample video is no longer available on SocialIndia.</p>
      <p><a href="/trending" style="color:#2563eb;font-weight:600;">Browse Trending Videos</a></p>
    `
  });

  fs.writeFileSync(path.join(watchDir, 'index.html'), sampleHtml, 'utf8');
}

console.log(`Successfully pre-rendered homepage, ${generatedCount} static routes, and 2 noindex sample routes into dist/!`);
