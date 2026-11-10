const fs = require('fs');
const path = require('path');

function escapeXml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function cleanIsoDate(dateStr) {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toISOString();
    }
  } catch (_) {}
  return new Date().toISOString().split('T')[0];
}

const todayDate = new Date().toISOString().split('T')[0];

const staticPages = [
  { path: '', changefreq: 'daily', priority: '1.0' },
  { path: 'trending', changefreq: 'daily', priority: '0.9' },
  { path: 'shorts', changefreq: 'daily', priority: '0.9' },
  { path: 'community', changefreq: 'daily', priority: '0.8' },
  { path: 'search', changefreq: 'weekly', priority: '0.8' },
  { path: 'studio', changefreq: 'weekly', priority: '0.7' },
  { path: 'about', changefreq: 'monthly', priority: '0.7' },
  { path: 'help', changefreq: 'monthly', priority: '0.7' },
  { path: 'faq', changefreq: 'monthly', priority: '0.7' },
  { path: 'contact', changefreq: 'monthly', priority: '0.7' },
  { path: 'advertising', changefreq: 'monthly', priority: '0.6' },
  { path: 'adinfo', changefreq: 'monthly', priority: '0.6' },
  { path: 'gopro', changefreq: 'monthly', priority: '0.6' },
  { path: 'downloads', changefreq: 'monthly', priority: '0.6' },
  { path: 'developers', changefreq: 'monthly', priority: '0.5' },
  { path: 'privacy', changefreq: 'yearly', priority: '0.4' },
  { path: 'terms', changefreq: 'yearly', priority: '0.4' },
  { path: 'refund', changefreq: 'yearly', priority: '0.4' },
  { path: 'guidelines', changefreq: 'yearly', priority: '0.4' }
];

let videos = [];
const seedPath = path.join(__dirname, 'videos_seed.json');
if (fs.existsSync(seedPath)) {
  try {
    videos = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  } catch (e) {
    console.warn('Could not read seed videos:', e);
  }
} else if (fs.existsSync('/tmp/real_videos.json')) {
  try {
    videos = JSON.parse(fs.readFileSync('/tmp/real_videos.json', 'utf8'));
  } catch (e) {
    console.warn('Could not read /tmp/real_videos.json:', e);
  }
}

// 1. Generate Clean Page Sitemap (sitemap.xml)
let pageSitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

for (const page of staticPages) {
  const loc = page.path ? `https://socialindia.web.app/${page.path}` : 'https://socialindia.web.app/';
  pageSitemapXml += `  <url>
    <loc>${loc}</loc>
    <lastmod>${todayDate}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
}

// Add canonical watch URLs for all public videos to standard sitemap for page discovery
for (const v of videos) {
  if (!v.videoId) continue;
  const watchUrl = v.isShort ? `https://socialindia.web.app/shorts/${v.videoId}` : `https://socialindia.web.app/watch/${v.videoId}`;
  const videoDate = v.createdAt ? cleanIsoDate(v.createdAt).split('T')[0] : todayDate;
  pageSitemapXml += `  <url>
    <loc>${watchUrl}</loc>
    <lastmod>${videoDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
}

pageSitemapXml += `</urlset>
`;

// 2. Generate Google Video Sitemap (video-sitemap.xml)
let videoSitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
`;

for (const v of videos) {
  if (!v.videoId || !v.videoUrl) continue;
  const watchUrl = v.isShort ? `https://socialindia.web.app/shorts/${v.videoId}` : `https://socialindia.web.app/watch/${v.videoId}`;
  const title = escapeXml((v.title || 'SocialIndia Video').slice(0, 100));
  const desc = escapeXml((v.description || 'Watch on SocialIndia video platform.').slice(0, 2040));
  const thumb = escapeXml(v.thumbnailUrl || 'https://socialindia.web.app/icon-512.png');
  const contentLoc = escapeXml(v.videoUrl);
  const duration = Math.min(Math.max(Number(v.duration) || 30, 1), 28800);
  const pubDate = cleanIsoDate(v.createdAt);

  videoSitemapXml += `  <url>
    <loc>${watchUrl}</loc>
    <video:video>
      <video:thumbnail_loc>${thumb}</video:thumbnail_loc>
      <video:title>${title}</video:title>
      <video:description>${desc}</video:description>
      <video:content_loc>${contentLoc}</video:content_loc>
      <video:duration>${duration}</video:duration>
      <video:publication_date>${pubDate}</video:publication_date>
      <video:family_friendly>yes</video:family_friendly>
      <video:requires_subscription>no</video:requires_subscription>
      <video:live>no</video:live>
    </video:video>
  </url>
`;
}

videoSitemapXml += `</urlset>
`;

// 3. Generate Sitemap Index (sitemap_index.xml)
const sitemapIndexXml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://socialindia.web.app/sitemap.xml</loc>
    <lastmod>${todayDate}</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://socialindia.web.app/video-sitemap.xml</loc>
    <lastmod>${todayDate}</lastmod>
  </sitemap>
</sitemapindex>
`;

fs.writeFileSync(path.join(__dirname, '../public/sitemap.xml'), pageSitemapXml, 'utf8');
fs.writeFileSync(path.join(__dirname, '../public/video-sitemap.xml'), videoSitemapXml, 'utf8');
fs.writeFileSync(path.join(__dirname, '../public/sitemap_index.xml'), sitemapIndexXml, 'utf8');

console.log('Successfully generated:');
console.log(' - public/sitemap.xml with', staticPages.length + videos.length, 'URLs');
console.log(' - public/video-sitemap.xml with', videos.length, 'videos');
console.log(' - public/sitemap_index.xml pointing to both sitemaps');
