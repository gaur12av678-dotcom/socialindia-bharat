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
    title: 'About SocialIndia – Built by Bharat.',
    description: 'SocialIndia is an Indian social media and video-sharing platform for sharing videos, discovering content, connecting with communities, and following creators.',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'AboutPage',
      'name': 'About SocialIndia',
      'url': 'https://socialindia.web.app/about',
      'description': 'SocialIndia is an Indian social media and video-sharing platform.'
    },
    heading: 'SocialIndia · Built by Bharat.',
    content: `
      <p>SocialIndia is an Indian social media and video-sharing platform where people can share videos, discover content, connect with communities and follow creators.</p>
      <p>Our goal is to provide an independent platform built for Indian users, creators and communities.</p>
      <h2>Founder</h2>
      <p>Gaurav Saini, Founder – SocialIndia.</p>
      <p>Contact: socialindia.ib@gmail.com · India</p>
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
      <p>Contact SocialIndia for general customer support, user queries, feedback, suggestions, or general questions.</p>
      <p>Email: socialindia.ib@gmail.com</p>
      <p>Formal complaints are handled separately on the Grievance Redressal page.</p>
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
      <p>Contact the SocialIndia Grievance & Support Team at socialindia.ib@gmail.com or submit a complaint using the form.</p>
      <p>Automatic email acknowledgements are not configured. Keep the tracking ID shown after a successful submission.</p>
      <p>This page does not claim that a statutory Grievance Officer has been appointed or that all legal requirements are satisfied.</p>
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
      <p>These guidelines describe content and conduct expectations on SocialIndia. A report does not guarantee a particular outcome or removal time.</p>
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
    description: 'Learn what information the SocialIndia application processes, how it is used, and how to contact SocialIndia about privacy requests.',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      'name': 'SocialIndia Privacy Policy',
      'url': 'https://socialindia.web.app/privacy'
    },
    heading: 'SocialIndia Privacy Policy',
    content: `
      <p>The application uses Firebase Authentication, Firestore, Firebase Storage, and, for configured video uploads, Cloudinary. It may also load media from external providers such as YouTube and Google Drive.</p>
      <p>Contact SocialIndia – Privacy & Support at socialindia.ib@gmail.com. See this policy for actual data categories, retention limits, and privacy assistance.</p>
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
    description: 'Terms governing use of SocialIndia, user content, prohibited conduct, reports, and account restrictions.',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      'name': 'SocialIndia Terms of Service',
      'url': 'https://socialindia.web.app/terms'
    },
    heading: 'SocialIndia Terms of Service',
    content: `
      <p>By using SocialIndia, you agree to these Terms of Use. Review account responsibilities, user content, prohibited activities, copyright, and reporting options.</p>
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
