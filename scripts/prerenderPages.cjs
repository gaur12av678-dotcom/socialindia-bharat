const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '../dist');
const templatePath = path.join(distDir, 'index.html');

if (!fs.existsSync(templatePath)) {
  console.error('dist/index.html not found! Run vite build first.');
  process.exit(1);
}

const templateHtml = fs.readFileSync(templatePath, 'utf8');

const pages = [
  {
    path: 'about',
    title: 'About Us – SocialIndia | India’s Video & Creator Platform',
    description: 'SocialIndia is India’s premier video and community platform designed for creators to connect, share high-quality videos and shorts, and monetize their talent.',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'AboutPage',
      'name': 'About SocialIndia',
      'url': 'https://socialindia.web.app/about',
      'description': 'SocialIndia is an Indian social media and video sharing platform where creators connect, publish videos, watch shorts, and earn rewards.',
      'mainEntity': {
        '@type': 'Organization',
        'name': 'SocialIndia',
        'url': 'https://socialindia.web.app/',
        'logo': 'https://socialindia.web.app/socialindia-logo.png'
      }
    },
    heading: 'About SocialIndia – India’s Video & Creator Platform',
    content: `
      <p>SocialIndia is an Indian social media and video sharing platform built for creators and audiences across Bharat. Share your talent, watch trending videos, discover inspiring shorts, and earn rewards through our engagement and monetization programs.</p>
      <h2>Our Mission</h2>
      <p>Empowering millions of Indian creators with cutting-edge creator tools, transparent monetization, lightning-fast video delivery, and community discussions.</p>
      <h2>Key Features</h2>
      <ul>
        <li><strong>Shorts & Long Videos:</strong> Seamless vertical short video player and high-definition video streaming.</li>
        <li><strong>Creator Monetization:</strong> Direct wallet payouts, points conversion, and sponsored brand campaigns.</li>
        <li><strong>Community & Posts:</strong> Share text thoughts, polls, behind-the-scenes updates, and discuss with fans.</li>
        <li><strong>Made for India:</strong> Multi-language support including Hindi and English with regional community focus.</li>
      </ul>
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
      <p>Connect with your favorite creators, participate in polls, and share thoughts with the SocialIndia community.</p>
      <h2>Explore Trending Discussions</h2>
      <p>Discover community posts, announcements from verified creators, behind-the-scenes photography, and interactive discussions.</p>
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
    heading: 'Trending Videos & Viral Creators',
    content: `
      <p>Watch what India is watching right now. Explore top trending videos across entertainment, music, comedy, technology, and regional culture.</p>
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
    heading: 'SocialIndia Shorts – Viral Fast Video Streaming',
    content: `
      <p>Explore unlimited vertical short videos from Indian creators. Like, comment, share, and remix trending sounds seamlessly.</p>
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
            'text': 'You can convert accumulated points directly into wallet cash balance (₹) from the Wallet or Reward Points section in your profile settings.'
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
      <h2>Frequently Asked Questions</h2>
      <div class="faq-item">
        <h3>How do I earn points on SocialIndia?</h3>
        <p>You earn points organically by engaging: watching videos (+2 points), liking videos and shorts (+5 points), commenting (+10 points), and uploading new videos (+20 points).</p>
      </div>
      <div class="faq-item">
        <h3>How do I convert points into wallet balance?</h3>
        <p>You can convert accumulated points directly into wallet cash balance (₹) from the Wallet or Reward Points section in your profile settings.</p>
      </div>
      <div class="faq-item">
        <h3>How do I unlock monetization?</h3>
        <p>Monetization unlocks when your channel reaches 500 followers and at least 1,000 views on any single video.</p>
      </div>
      <div class="faq-item">
        <h3>Is SocialIndia free to use?</h3>
        <p>Yes! Watching, uploading, liking, and commenting on SocialIndia is completely free for all users.</p>
      </div>
    `
  },
  {
    path: 'contact',
    title: 'Contact Us – SocialIndia Support & Grievance',
    description: 'Get in touch with the SocialIndia support team, partner with us, or contact our Grievance Officer in compliance with Indian Information Technology rules.',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'ContactPage',
      'name': 'Contact SocialIndia',
      'url': 'https://socialindia.web.app/contact',
      'description': 'Contact SocialIndia support, partnerships, and grievance officer.'
    },
    heading: 'Contact SocialIndia Support & Grievance Officer',
    content: `
      <p>We are here to assist creators, advertisers, and community members. Reach out to our team through our support channels.</p>
      <h2>Support Contacts</h2>
      <ul>
        <li><strong>Email:</strong> support@socialindia.web.app</li>
        <li><strong>Business Inquiries:</strong> contact@socialindia.web.app</li>
        <li><strong>Platform:</strong> Built in Bharat for Indian Creators</li>
      </ul>
      <h2>Grievance Redressal</h2>
      <p>In accordance with Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, users can submit concerns regarding content safety and account moderation directly to our team.</p>
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
      <p>Promote your brand with custom in-stream video advertisements, sponsored community cards, and banner campaigns tailored for Indian demographics.</p>
      <h2>Why Advertise with SocialIndia?</h2>
      <ul>
        <li>High-engagement audiences in Tier 1, 2, and 3 cities across India.</li>
        <li>Transparent impressions, CTR tracking, and conversion metrics.</li>
        <li>Direct creator integrations and sponsored content partnerships.</li>
      </ul>
    `
  },
  {
    path: 'adinfo',
    title: 'Ad Transparency Center – SocialIndia',
    description: 'Learn how advertisements work on SocialIndia, how personalized advertising is delivered responsibly, and how to manage your ad preferences.',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      'name': 'SocialIndia Ad Info',
      'url': 'https://socialindia.web.app/adinfo'
    },
    heading: 'SocialIndia Ad Transparency & Standards',
    content: `
      <p>We believe in honest, safe, and transparent advertising. Discover how ads are reviewed, how user privacy is preserved, and how creators earn from sponsorships.</p>
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
    heading: 'SocialIndia Pro – Supercharge Your Creator Journey',
    content: `
      <p>Unlock professional creator perks: Blue Verified Checkmark, 4K video uploads, in-depth audience demographics, instant payout processing, and VIP creator support.</p>
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
    heading: 'Download SocialIndia Mobile App',
    content: `
      <p>Experience SocialIndia anywhere on your smartphone. Download the official Android APK or install our lightweight Progressive Web App (PWA) directly from your browser.</p>
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
    heading: 'SocialIndia Developer Portal & APIs',
    content: `
      <p>Build on top of SocialIndia. Access developer tools, iframe embed codes, and video integration guides.</p>
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
      <p>SocialIndia is committed to a safe, welcoming, and vibrant creator ecosystem for all Indian citizens.</p>
      <h2>Key Policy Pillars</h2>
      <ul>
        <li><strong>Respect & Non-Discrimination:</strong> Harassment, hate speech, and bullying are strictly prohibited.</li>
        <li><strong>Copyright & Original Work:</strong> Only upload content that you own or have obtained legitimate rights to use.</li>
        <li><strong>Safety:</strong> Prohibiting violence, misleading scams, and harmful activities.</li>
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
      <p>Everything you need to know about using SocialIndia: troubleshooting playback, uploading 1080p/4K content, updating your profile, and securing your account.</p>
    `
  },
  {
    path: 'privacy',
    title: 'Privacy Policy – SocialIndia',
    description: 'SocialIndia Privacy Policy explains how we collect, store, and protect your personal information in compliance with Indian Information Technology and data protection laws.',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      'name': 'SocialIndia Privacy Policy',
      'url': 'https://socialindia.web.app/privacy'
    },
    heading: 'SocialIndia Privacy Policy',
    content: `
      <p>Your privacy is paramount. This Privacy Policy details the types of data collected, purpose of processing, and how user privacy rights are upheld under Indian data governance standards.</p>
      <h2>Data We Collect</h2>
      <p>Profile details (username, email, display picture), video metadata, and anonymous device diagnostic metrics for platform optimization.</p>
      <h2>Data Security</h2>
      <p>All sensitive authentication credentials and user communications are encrypted in transit and at rest using industry-standard Firebase security mechanisms.</p>
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
      <p>Details regarding refund requests for digital subscriptions, creator tips, paid video unlocks, and advertising wallet balances.</p>
    `
  },
  {
    path: 'terms',
    title: 'Terms of Service – SocialIndia',
    description: 'Terms of Service governing your use of the SocialIndia website, mobile apps, video player, and creator monetization features.',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      'name': 'SocialIndia Terms of Service',
      'url': 'https://socialindia.web.app/terms'
    },
    heading: 'SocialIndia Terms of Service',
    content: `
      <p>By using SocialIndia, you agree to these Terms of Service. Review user obligations, intellectual property rights, and platform terms.</p>
    `
  },
  {
    path: 'search',
    title: 'Search Videos & Channels – SocialIndia',
    description: 'Search for trending videos, channels, creators, music, shorts, and hashtags across India on SocialIndia.',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      'name': 'Search – SocialIndia',
      'url': 'https://socialindia.web.app/search'
    },
    heading: 'Search SocialIndia Videos & Creators',
    content: `
      <p>Search millions of videos, trending shorts, channels, and community posts across India.</p>
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
      <p>The centralized control room for Indian video creators. Upload content, track analytics, review comments, and manage payouts.</p>
    `
  }
];

// Helper to escape HTML
function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

let generatedCount = 0;

for (const p of pages) {
  const pageUrl = `https://socialindia.web.app/${p.path}`;
  const targetDir = path.join(distDir, p.path);
  fs.mkdirSync(targetDir, { recursive: true });

  let pageHtml = templateHtml;

  // 1. Replace Title
  pageHtml = pageHtml.replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(p.title)}</title>`);

  // 2. Replace Canonical link
  pageHtml = pageHtml.replace(/<link rel="canonical" href=".*?" \/>/i, `<link rel="canonical" href="${pageUrl}" />`);

  // 3. Replace Meta Description
  pageHtml = pageHtml.replace(/<meta\s+name="description"\s+content=".*?"\s*\/>/i, `<meta name="description" content="${escapeHtml(p.description)}" />`);

  // 4. Replace OpenGraph & Twitter tags
  pageHtml = pageHtml.replace(/<meta property="og:title" content=".*?" \/>/i, `<meta property="og:title" content="${escapeHtml(p.title)}" />`);
  pageHtml = pageHtml.replace(/<meta property="og:description" content=".*?" \/>/i, `<meta property="og:description" content="${escapeHtml(p.description)}" />`);
  pageHtml = pageHtml.replace(/<meta property="og:url" content=".*?" \/>/i, `<meta property="og:url" content="${pageUrl}" />`);
  pageHtml = pageHtml.replace(/<meta name="twitter:title" content=".*?" \/>/i, `<meta name="twitter:title" content="${escapeHtml(p.title)}" />`);
  pageHtml = pageHtml.replace(/<meta name="twitter:description" content=".*?" \/>/i, `<meta name="twitter:description" content="${escapeHtml(p.description)}" />`);

  // 5. Ingest Page-specific JSON-LD Schema
  const schemaTag = `\n    <!-- Page-Specific Schema.org Structured Data -->\n    <script type="application/ld+json">\n${JSON.stringify(p.schema, null, 2)}\n    </script>\n  </head>`;
  pageHtml = pageHtml.replace('</head>', schemaTag);

  // 6. Pre-render semantic server HTML inside #root
  const semanticRoot = `
    <div id="root">
      <div style="max-width:960px;margin:0 auto;padding:24px;font-family:system-ui,-apple-system,sans-serif;">
        <nav style="margin-bottom:16px;font-size:14px;color:#64748b;">
          <a href="/" style="color:#2563eb;text-decoration:none;font-weight:600;">Home</a> &rsaquo; <span>${escapeHtml(p.heading)}</span>
        </nav>
        <h1 style="font-size:28px;font-weight:800;color:#0f172a;margin-bottom:12px;">${escapeHtml(p.heading)}</h1>
        <div style="font-size:15px;line-height:1.7;color:#334155;">
          ${p.content}
        </div>
        <footer style="margin-top:40px;padding-top:20px;border-top:1px solid #e2e8f0;font-size:13px;color:#64748b;">
          <p>&copy; ${new Date().getFullYear()} SocialIndia. All rights reserved. <a href="/" style="color:#2563eb;text-decoration:none;">Go to SocialIndia Homepage</a></p>
        </footer>
      </div>
    </div>
  `.trim();

  pageHtml = pageHtml.replace('<div id="root"></div>', semanticRoot);

  fs.writeFileSync(path.join(targetDir, 'index.html'), pageHtml, 'utf8');
  generatedCount++;
}

// 7. Handle sample-short-1 and sample-short-2: mark them noindex so Googlebot drops them
for (const sampleId of ['sample-short-1', 'sample-short-2']) {
  const watchDir = path.join(distDir, 'watch', sampleId);
  fs.mkdirSync(watchDir, { recursive: true });

  let sampleHtml = templateHtml;
  sampleHtml = sampleHtml.replace(/<title>.*?<\/title>/i, `<title>Video Removed – SocialIndia</title>`);
  sampleHtml = sampleHtml.replace(/<meta name="robots" content=".*?" \/>/i, `<meta name="robots" content="noindex, nofollow" />`);
  sampleHtml = sampleHtml.replace(/<link rel="canonical" href=".*?" \/>/i, `<link rel="canonical" href="https://socialindia.web.app/" />`);
  
  const sampleRoot = `
    <div id="root">
      <div style="max-width:600px;margin:80px auto;padding:24px;text-align:center;font-family:system-ui,sans-serif;">
        <h1 style="font-size:24px;font-weight:700;color:#0f172a;">Video Removed or Not Available</h1>
        <p style="color:#64748b;margin:12px 0 24px;">This sample video is no longer available on SocialIndia.</p>
        <a href="/trending" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;border-radius:12px;text-decoration:none;font-weight:600;">Browse Trending Videos</a>
      </div>
    </div>
  `.trim();

  sampleHtml = sampleHtml.replace('<div id="root"></div>', sampleRoot);
  fs.writeFileSync(path.join(watchDir, 'index.html'), sampleHtml, 'utf8');
}

console.log(`Successfully pre-rendered ${generatedCount} static routes and 2 noindex sample routes into dist/!`);
