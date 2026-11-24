const fs = require('fs');
const path = require('path');

function escapeXml(unsafe) {
  if (!unsafe) return '';
  const wellFormed = typeof String.prototype.toWellFormed === 'function'
    ? String(unsafe).toWellFormed()
    : String(unsafe);
  return wellFormed
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\u2060\uFFFD]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function cleanText(str) {
  return String(str || '').replace(/\s+/g, ' ').trim();
}

function truncateAndEscapeXml(raw, maxEscapedLen) {
  const text = cleanText(raw);
  if (!text) return '';
  let out = '';
  for (const ch of text) {
    const escapedChar = escapeXml(ch);
    if (!escapedChar) continue;
    if (out.length + escapedChar.length > maxEscapedLen) break;
    out += escapedChar;
  }
  return out;
}

function cleanIsoDate(dateStr) {
  if (!dateStr) return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
    }
  } catch (_) {}
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function isIndexableVideo(v) {
  if (!v || !v.videoId) return false;
  const title = cleanText(v.title);
  if (!title || title.length < 6) return false;
  if (/^\d+$/.test(title)) return false;
  if (/^(check|test|testing|demo|sample)$/i.test(title)) return false;
  if (/64ce2ae8e3535d266be88a/i.test(title)) return false;
  return true;
}

function getVideoMediaTag(rawUrl) {
  const url = String(rawUrl || '').trim();
  const driveFileMatch = url.match(/https?:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (driveFileMatch) {
    const previewUrl = `https://drive.google.com/file/d/${driveFileMatch[1]}/preview`;
    return `<video:player_loc>${escapeXml(previewUrl)}</video:player_loc>`;
  }
  const driveOpenMatch = url.match(/https?:\/\/drive\.google\.com\/(?:open|uc)\?[^#]*\bid=([a-zA-Z0-9_-]+)/i);
  if (driveOpenMatch) {
    const previewUrl = `https://drive.google.com/file/d/${driveOpenMatch[1]}/preview`;
    return `<video:player_loc>${escapeXml(previewUrl)}</video:player_loc>`;
  }
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,})/i);
  if (ytMatch) {
    const embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}`;
    return `<video:player_loc>${escapeXml(embedUrl)}</video:player_loc>`;
  }
  return `<video:content_loc>${escapeXml(url)}</video:content_loc>`;
}

const nowIso = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

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
  { path: 'grievance', changefreq: 'monthly', priority: '0.6' },
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

let rawVideos = [];
const seedPath = path.join(__dirname, 'videos_seed.json');
if (fs.existsSync(seedPath)) {
  try {
    rawVideos = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  } catch (e) {
    console.warn('Could not read seed videos:', e);
  }
} else if (fs.existsSync('/tmp/real_videos.json')) {
  try {
    rawVideos = JSON.parse(fs.readFileSync('/tmp/real_videos.json', 'utf8'));
  } catch (e) {
    console.warn('Could not read /tmp/real_videos.json:', e);
  }
}

const videos = rawVideos.filter(isIndexableVideo);

// 1. Generate Clean Page Sitemap (sitemap.xml)
let pageSitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

for (const page of staticPages) {
  const loc = page.path ? `https://socialindia.web.app/${page.path}` : 'https://socialindia.web.app/';
  pageSitemapXml += `  <url>
    <loc>${loc}</loc>
    <lastmod>${nowIso}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
}

// Add canonical watch URLs for all public videos to standard sitemap for page discovery
for (const v of videos) {
  const watchUrl = v.isShort ? `https://socialindia.web.app/shorts/${v.videoId}` : `https://socialindia.web.app/watch/${v.videoId}`;
  const videoDate = v.createdAt ? cleanIsoDate(v.createdAt) : nowIso;
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
  const title = truncateAndEscapeXml(v.title || 'SocialIndia Video', 100) || 'SocialIndia Video';
  const descFallback = `Watch "${cleanText(v.title) || 'this video'}" on SocialIndia, India’s own social media and video platform.`;
  const desc = truncateAndEscapeXml(
    cleanText(v.description) && !/^watch on socialindia\.?$/i.test(cleanText(v.description))
      ? v.description
      : descFallback,
    2040
  ) || 'Watch videos and explore Clips on SocialIndia.';
  const thumb = escapeXml(v.thumbnailUrl || 'https://socialindia.web.app/socialindia-logo.png');
  const mediaTag = getVideoMediaTag(v.videoUrl);
  const duration = Math.min(Math.max(Math.round(Number(v.duration) || 30), 1), 28800);
  const pubDate = cleanIsoDate(v.createdAt);

  videoSitemapXml += `  <url>
    <loc>${watchUrl}</loc>
    <video:video>
      <video:thumbnail_loc>${thumb}</video:thumbnail_loc>
      <video:title>${title}</video:title>
      <video:description>${desc}</video:description>
      ${mediaTag}
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
    <lastmod>${nowIso}</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://socialindia.web.app/video-sitemap.xml</loc>
    <lastmod>${nowIso}</lastmod>
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
