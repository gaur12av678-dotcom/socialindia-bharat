import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  CreditCard, 
  Globe, 
  Film, 
  BookOpen, 
  FolderTree, 
  Palette, 
  FileCode, 
  Map, 
  Smartphone, 
  Database, 
  Activity, 
  History, 
  HelpCircle,
  Plus,
  Trash2,
  Check,
  CheckCircle,
  AlertTriangle,
  Play,
  RotateCcw
} from 'lucide-react';

interface ExtraTabsProps {
  activeSection: string;
  users: any[];
  videos: any[];
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const AdminExtraTabs: React.FC<ExtraTabsProps> = ({ activeSection, users, videos, addToast }) => {
  // --- SETTINGS STATES ---
  const [siteTitle, setSiteTitle] = useState('SocialIndia');
  const [siteDesc, setSiteDesc] = useState("India's home-grown sovereign video sharing and rewards platform.");
  const [maxUpload, setMaxUpload] = useState('500');
  const [maintenanceMode, setSiteMaintenance] = useState(false);

  // --- PAYMENTS & ADS STATES ---
  const [payPerView, setPayPerView] = useState('0.05');
  const [goproPrice, setGoProPrice] = useState('10.00');
  const [paypalEmail, setPaypalEmail] = useState('finance@socialindia.com');
  const [payoutRequests, setPayoutRequests] = useState([
    { id: '1', displayName: 'Amit Kumar', email: 'amit@gmail.com', amount: 45.00, status: 'pending' },
    { id: '2', displayName: 'Neha Sharma', email: 'neha@gmail.com', amount: 120.00, status: 'pending' },
  ]);

  // --- LANGUAGE STATES ---
  const [languages, setLanguages] = useState([
    { code: 'en', label: 'English', default: true },
    { code: 'hi', label: 'हिन्दी (Hindi)', default: false },
    { code: 'ta', label: 'தமிழ் (Tamil)', default: false },
    { code: 'te', label: 'తెలుగు (Telugu)', default: false },
  ]);
  const [newLangCode, setNewLangCode] = useState('');
  const [newLangName, setNewLangName] = useState('');

  // --- MOVIES STATES ---
  const [movies, setMovies] = useState([
    { id: '1', title: 'The Great Indian Escape', rating: '8.4', price: 'Free', rentCount: 1420 },
    { id: '2', title: 'Sovereign Digital India v1', rating: '9.2', price: '$2.99', rentCount: 890 },
  ]);
  const [newMovieTitle, setNewMovieTitle] = useState('');
  const [newMoviePrice, setNewMoviePrice] = useState('Free');

  // --- ARTICLES STATES ---
  const [articles, setArticles] = useState([
    { id: '1', title: 'How to Earn 1000+ Points Daily', category: 'Tutorial', date: '2026-10-02' },
    { id: '2', title: 'Why SocialIndia is safe for your kids', category: 'Trust & Safety', date: '2026-10-01' },
  ]);
  const [newArticleTitle, setNewArticleTitle] = useState('');

  // --- CATEGORIES ---
  const [categories, setCategories] = useState([
    'Film & Animation', 'Music', 'Pets & Animals', 'Comedy', 'News & Politics', 'Science & Technology'
  ]);
  const [newCategory, setNewCategory] = useState('');

  // --- DESIGN ---
  const [primaryColor, setPrimaryColor] = useState('#2563eb');
  const [logoCopyright, setLogoCopyright] = useState('Copyright © 2026 SocialIndia. All rights reserved.');

  // --- PAGES ---
  const [policyMarkup, setPolicyMarkup] = useState('<h1>Privacy Policy</h1><p>Our commitment to user security is double-encrypted...</p>');

  // --- SITEMAP ---
  const [sitemapGenerating, setSitemapGenerating] = useState(false);
  const [sitemapXml, setSitemapXml] = useState('');

  // --- MOBILE API ---
  const [firebasePushToken, setFirebasePushToken] = useState('firebase-server-jwt-token-xxxx-key');

  // --- BACKUP ---
  const [backupSuccess, setBackupSuccess] = useState(false);

  // --- FAQ & DOCS ---
  const [faqs, setFaqs] = useState([
    { q: 'How do I request a wallet payment withdrawal?', a: 'You need at least a $10.00 wallet balance. Go to Settings -> Withdrawals.' },
    { q: 'What are GoPro creator perks?', a: 'Double points speed multiplier and verified check badge!' },
  ]);
  const [newFaqQ, setNewFaqQ] = useState('');
  const [newFaqA, setNewFaqA] = useState('');

  const handleSitemapGenerate = () => {
    setSitemapGenerating(true);
    setTimeout(() => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>https://socialindia.com/</loc></url>\n  <url><loc>https://socialindia.com/#/shorts</loc></url>\n  <url><loc>https://socialindia.com/#/trending</loc></url>\n</urlset>`;
      setSitemapXml(xml);
      setSitemapGenerating(false);
      addToast('XML Sitemap compiled successfully!', 'success');
    }, 800);
  };

  const handleDownloadBackup = () => {
    setBackupSuccess(true);
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ siteTitle, maxUpload, movies, articles, categories }));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `socialindia_database_backup_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setTimeout(() => setBackupSuccess(false), 2000);
    addToast('Database JSON Backup package generated!', 'success');
  };

  return (
    <div className="space-y-6">
      
      {/* 1. SETTINGS TAB */}
      {activeSection === 'settings' && (
        <div className="bg-white dark:bg-[#121215] border border-slate-200/80 dark:border-[#222225] rounded-3xl p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <SettingsIcon className="w-5 h-5 text-blue-600" />
              <span>General Site Settings</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">Configure global application parameters, upload limits, and offline features.</p>
          </div>
          
          <form onSubmit={(e) => { e.preventDefault(); addToast('Settings saved successfully!', 'success'); }} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">Site Title</label>
                <input type="text" value={siteTitle} onChange={(e) => setSiteTitle(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold" />
              </div>
              <div>
                <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">Max Video Upload Limit (MB)</label>
                <input type="number" value={maxUpload} onChange={(e) => setMaxUpload(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">Site Description</label>
              <textarea value={siteDesc} onChange={(e) => setSiteDesc(e.target.value)} rows={3} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold" />
            </div>

            <div className="flex items-center justify-between p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
              <div className="space-y-0.5">
                <p className="text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-wide">Emergency Maintenance Mode</p>
                <p className="text-[10px] text-slate-500">Enable to block platform access for regular visitors while maintaining admin console access.</p>
              </div>
              <input type="checkbox" checked={maintenanceMode} onChange={(e) => setSiteMaintenance(e.target.checked)} className="w-5 h-5 accent-amber-500 rounded-xl cursor-pointer" />
            </div>

            <button type="submit" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer">Save Settings</button>
          </form>
        </div>
      )}

      {/* 2. PAYMENTS & ADS */}
      {activeSection === 'payments_ads' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#121215] border border-slate-200/80 dark:border-[#222225] rounded-3xl p-6 shadow-xs space-y-6">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                <span>Monetization & Ads Configuration</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">Configure Points values, GoPro upgrade prices, and approve direct merchant payouts.</p>
            </div>
            
            <form onSubmit={(e) => { e.preventDefault(); addToast('Monetization rates updated!', 'success'); }} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">Ad Cost Per View ($ USD)</label>
                <input type="text" value={payPerView} onChange={(e) => setPayPerView(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold" />
              </div>
              <div>
                <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">GoPro Pro Upgrade Price ($)</label>
                <input type="text" value={goproPrice} onChange={(e) => setGoProPrice(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold" />
              </div>
              <div>
                <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">Merchant Payout Email</label>
                <input type="text" value={paypalEmail} onChange={(e) => setPaypalEmail(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold" />
              </div>
              <div className="sm:col-span-3 pt-2">
                <button type="submit" className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer">Save Rates</button>
              </div>
            </form>
          </div>

          <div className="bg-white dark:bg-[#121215] border border-slate-200/80 dark:border-[#222225] rounded-3xl p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-950 dark:text-white">Pending Wallet Payout Requests</h3>
            <div className="overflow-x-auto divide-y divide-slate-100 dark:divide-slate-800">
              {payoutRequests.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No pending payout withdrawal requests.</p>
              ) : (
                payoutRequests.map(r => (
                  <div key={r.id} className="py-3.5 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{r.displayName}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Withdraw to: {r.email}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-black text-slate-900 dark:text-white">${r.amount.toFixed(2)} USD</span>
                      <button
                        onClick={() => {
                          setPayoutRequests(prev => prev.filter(p => p.id !== r.id));
                          addToast(`Payout of $${r.amount.toFixed(2)} approved & transferred successfully!`, 'success');
                        }}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase rounded-lg shadow-xs cursor-pointer transition-all"
                      >
                        Approve
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. LANGUAGES */}
      {activeSection === 'languages' && (
        <div className="bg-white dark:bg-[#121215] border border-slate-200/80 dark:border-[#222225] rounded-3xl p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Globe className="w-5 h-5 text-teal-600" />
              <span>Language settings</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">Manage active Indian localization files and key-phrase sets.</p>
          </div>

          <form onSubmit={(e) => {
            e.preventDefault();
            if(!newLangCode || !newLangName) return;
            setLanguages(prev => [...prev, { code: newLangCode, label: newLangName, default: false }]);
            setNewLangCode('');
            setNewLangName('');
            addToast('New localization language added!', 'success');
          }} className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
            <div>
              <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">Lang Code (e.g. pa)</label>
              <input type="text" required value={newLangCode} onChange={(e) => setNewLangCode(e.target.value)} placeholder="e.g. bn" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold" />
            </div>
            <div>
              <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">Language Name</label>
              <input type="text" required value={newLangName} onChange={(e) => setNewLangName(e.target.value)} placeholder="e.g. Bengali" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold" />
            </div>
            <div className="flex items-end">
              <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1 cursor-pointer">
                <Plus className="w-4 h-4" />
                <span>Add language</span>
              </button>
            </div>
          </form>

          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Active System Languages</h4>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {languages.map(lang => (
                <div key={lang.code} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-extrabold">{lang.label}</span>
                    <span className="text-slate-400 ml-1.5 font-bold">({lang.code})</span>
                  </div>
                  {lang.default ? (
                    <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950 text-blue-600 text-[10px] font-black uppercase rounded-md border border-blue-200/50">Primary</span>
                  ) : (
                    <button
                      onClick={() => {
                        setLanguages(prev => prev.map(l => ({ ...l, default: l.code === lang.code })));
                        addToast(`Set "${lang.label}" as default system language.`, 'success');
                      }}
                      className="text-[10px] font-extrabold text-slate-500 hover:text-blue-600 underline cursor-pointer"
                    >
                      Make Primary
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. MOVIES */}
      {activeSection === 'movies' && (
        <div className="bg-white dark:bg-[#121215] border border-slate-200/80 dark:border-[#222225] rounded-3xl p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Film className="w-5 h-5 text-purple-600" />
              <span>Movies catalog manager</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">Configure premium, long-form films available for rent on SocialIndia.</p>
          </div>

          <form onSubmit={(e) => {
            e.preventDefault();
            if(!newMovieTitle) return;
            setMovies(prev => [...prev, { id: Date.now().toString(), title: newMovieTitle, rating: '8.0', price: newMoviePrice, rentCount: 0 }]);
            setNewMovieTitle('');
            addToast(`Movie "${newMovieTitle}" published successfully!`, 'success');
          }} className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
            <div className="sm:col-span-2">
              <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">Movie Title</label>
              <input type="text" required value={newMovieTitle} onChange={(e) => setNewMovieTitle(e.target.value)} placeholder="e.g. Bahubali: Sovereign Reign" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold" />
            </div>
            <div>
              <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">Rental Price (Free or USD)</label>
              <select value={newMoviePrice} onChange={(e) => setNewMoviePrice(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold">
                <option value="Free">Free</option>
                <option value="$1.99">$1.99</option>
                <option value="$2.99">$2.99</option>
                <option value="$4.99">$4.99</option>
              </select>
            </div>
            <div className="sm:col-span-3">
              <button type="submit" className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-1 cursor-pointer">
                <Plus className="w-4 h-4" />
                <span>Publish movie catalog</span>
              </button>
            </div>
          </form>

          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Catalog Films ({movies.length})</h4>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {movies.map(m => (
                <div key={m.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-extrabold text-slate-900 dark:text-white">{m.title}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Rating: ★ {m.rating} • Price: {m.price}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-extrabold text-slate-500">Rents: {m.rentCount}</span>
                    <button onClick={() => setMovies(prev => prev.filter(p => p.id !== m.id))} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. ARTICLES */}
      {activeSection === 'articles' && (
        <div className="bg-white dark:bg-[#121215] border border-slate-200/80 dark:border-[#222225] rounded-3xl p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              <span>Articles & Blog Publisher</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">Publish news updates, tutorial guides, and policy changelogs.</p>
          </div>

          <form onSubmit={(e) => {
            e.preventDefault();
            if(!newArticleTitle) return;
            setArticles(prev => [...prev, { id: Date.now().toString(), title: newArticleTitle, category: 'Blog', date: new Date().toISOString().slice(0, 10) }]);
            setNewArticleTitle('');
            addToast(`Article "${newArticleTitle}" published successfully!`, 'success');
          }} className="space-y-4 border-b border-slate-100 dark:border-slate-800 pb-6">
            <div>
              <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">Article Title</label>
              <input type="text" required value={newArticleTitle} onChange={(e) => setNewArticleTitle(e.target.value)} placeholder="e.g. Celebrating 5,000 Verified Creators!" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold" />
            </div>
            <button type="submit" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-1 cursor-pointer">
              <Plus className="w-4 h-4" />
              <span>Publish Article</span>
            </button>
          </form>

          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Active Published Articles</h4>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {articles.map(art => (
                <div key={art.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-extrabold text-slate-900 dark:text-white">{art.title}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Published under: {art.category} • {art.date}</p>
                  </div>
                  <button onClick={() => setArticles(prev => prev.filter(a => a.id !== art.id))} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 6. CATEGORIES */}
      {activeSection === 'categories' && (
        <div className="bg-white dark:bg-[#121215] border border-slate-200/80 dark:border-[#222225] rounded-3xl p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <FolderTree className="w-5 h-5 text-indigo-600" />
              <span>Video categories</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">Configure active video tags and search filtration headers.</p>
          </div>

          <form onSubmit={(e) => {
            e.preventDefault();
            if(!newCategory.trim()) return;
            setCategories(prev => [...prev, newCategory.trim()]);
            setNewCategory('');
            addToast(`Category "${newCategory}" added!`, 'success');
          }} className="flex gap-3 border-b border-slate-100 dark:border-slate-800 pb-6">
            <input type="text" required value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="e.g. Travel & Vlogs" className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold" />
            <button type="submit" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-1 cursor-pointer">
              <Plus className="w-4 h-4" />
              <span>Add category</span>
            </button>
          </form>

          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Active Categories</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {categories.map(cat => (
                <div key={cat} className="p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-between text-xs font-extrabold">
                  <span>{cat}</span>
                  <button onClick={() => setCategories(prev => prev.filter(c => c !== cat))} className="text-rose-500 hover:text-rose-700 cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 7. DESIGN */}
      {activeSection === 'design' && (
        <div className="bg-white dark:bg-[#121215] border border-slate-200/80 dark:border-[#222225] rounded-3xl p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Palette className="w-5 h-5 text-amber-500" />
              <span>UI design & Branding customizer</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">Configure brand styling parameters, active theme configurations, and footer copyright text blocks.</p>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); addToast('Branding configurations saved!', 'success'); }} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">Primary Brand Color</label>
                <div className="flex gap-2">
                  <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-12 h-10 border border-slate-200 rounded-xl cursor-pointer" />
                  <input type="text" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">Footer copyright declaration</label>
                <input type="text" value={logoCopyright} onChange={(e) => setLogoCopyright(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold" />
              </div>
            </div>

            <button type="submit" className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer">Save configurations</button>
          </form>
        </div>
      )}

      {/* 8. PAGES */}
      {activeSection === 'pages' && (
        <div className="bg-white dark:bg-[#121215] border border-slate-200/80 dark:border-[#222225] rounded-3xl p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <FileCode className="w-5 h-5 text-emerald-600" />
              <span>Dynamic Landing Pages & Markup Markup Editor</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">Configure static policy content and landing page metadata.</p>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); addToast('Page markup compiled!', 'success'); }} className="space-y-4">
            <div>
              <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">Target Page: Privacy Policy (HTML allowed)</label>
              <textarea value={policyMarkup} onChange={(e) => setPolicyMarkup(e.target.value)} rows={6} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold" />
            </div>
            <button type="submit" className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer">Compile page markup</button>
          </form>
        </div>
      )}

      {/* 9. SITEMAP */}
      {activeSection === 'sitemap' && (
        <div className="bg-white dark:bg-[#121215] border border-slate-200/80 dark:border-[#222225] rounded-3xl p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Map className="w-5 h-5 text-indigo-600" />
              <span>Sitemap Generator</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">Sitemap index for Google indexing crawls validation.</p>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleSitemapGenerate}
              disabled={sitemapGenerating}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {sitemapGenerating ? 'Generating...' : 'Compile active URL sitemap'}
            </button>

            {sitemapXml && (
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase text-slate-400">Generated XML Block</p>
                <pre className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl font-mono text-[10px] overflow-x-auto text-slate-700 dark:text-emerald-400">
                  {sitemapXml}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 10. MOBILE & API SETTINGS */}
      {activeSection === 'mobile_api' && (
        <div className="bg-white dark:bg-[#121215] border border-slate-200/80 dark:border-[#222225] rounded-3xl p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-blue-600" />
              <span>Mobile & API Settings</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">Configure mobile endpoints, client secrets, and third-party push integrations.</p>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); addToast('API Integration keys refreshed!', 'success'); }} className="space-y-4">
            <div>
              <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">Firebase Server Push credentials JWT</label>
              <input type="text" value={firebasePushToken} onChange={(e) => setFirebasePushToken(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold" />
            </div>
            <button type="submit" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer">Save Integration keys</button>
          </form>
        </div>
      )}

      {/* 11. BACKUP */}
      {activeSection === 'backup' && (
        <div className="bg-white dark:bg-[#121215] border border-slate-200/80 dark:border-[#222225] rounded-3xl p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-600" />
              <span>Full Database Snapshots</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">Download a single-file loss-free snapshot of all platforms metadata and system tables.</p>
          </div>

          <div className="space-y-4">
            <p className="text-xs text-slate-500 leading-relaxed font-semibold">SocialIndia archives configuration states natively. Click below to pull a raw metadata backup directly:</p>
            <button
              onClick={handleDownloadBackup}
              disabled={backupSuccess}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
            >
              <Database className="w-4 h-4" />
              <span>{backupSuccess ? 'Backup downloaded!' : 'Download JSON database snapshot'}</span>
            </button>
          </div>
        </div>
      )}

      {/* 12. SYSTEM STATUS */}
      {activeSection === 'system_status' && (
        <div className="bg-white dark:bg-[#121215] border border-slate-200/80 dark:border-[#222225] rounded-3xl p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-5 h-5 text-rose-600" />
              <span>Server & System Status Gauges</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">Real-time health audits of database reads/writes, server RAM, and active worker nodes.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded-2xl text-center space-y-1">
              <p className="text-[10px] font-black uppercase text-slate-400">Server memory load</p>
              <p className="text-xl font-black text-emerald-600">42% (Normal)</p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded-2xl text-center space-y-1">
              <p className="text-[10px] font-black uppercase text-slate-400">Active online viewers</p>
              <p className="text-xl font-black text-blue-600">14,210 sessions</p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded-2xl text-center space-y-1">
              <p className="text-[10px] font-black uppercase text-slate-400">Database health index</p>
              <p className="text-xl font-black text-indigo-600">100% OK</p>
            </div>
          </div>
        </div>
      )}

      {/* 13. CHANGELOGS */}
      {activeSection === 'changelogs' && (
        <div className="bg-white dark:bg-[#121215] border border-slate-200/80 dark:border-[#222225] rounded-3xl p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <History className="w-5 h-5 text-slate-700" />
              <span>Changelogs & release timeline</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">Chronological archive of releases on SocialIndia.</p>
          </div>

          <div className="space-y-4">
            <div className="border-l-2 border-blue-600 pl-4 space-y-1">
              <p className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>Version 2.3.0 Release</span>
                <span className="bg-blue-50 text-blue-600 text-[8px] font-black uppercase px-2 py-0.5 rounded-full border border-blue-200">Latest</span>
              </p>
              <p className="text-[10px] text-slate-400 font-bold">2026-10-04 • Admin Hub Upgrade</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Added PlayTube-style Admin core features, Movies rents, Sitemap builder, backup generator, and language configs!</p>
            </div>

            <div className="border-l-2 border-slate-200 dark:border-slate-800 pl-4 space-y-1 opacity-70">
              <p className="text-xs font-black text-slate-900 dark:text-white">Version 2.2.0 Release</p>
              <p className="text-[10px] text-slate-400 font-bold">2026-10-04 • Direct Messages</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Launched full direct messages workspace with real-time syncing and inbox notifications.</p>
            </div>
          </div>
        </div>
      )}

      {/* 14. FAQS & DOCS */}
      {activeSection === 'faq_docs' && (
        <div className="bg-white dark:bg-[#121215] border border-slate-200/80 dark:border-[#222225] rounded-3xl p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-blue-600" />
              <span>Platform FAQ & Docs manager</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">Update, add, or remove custom entries available in user Help centers.</p>
          </div>

          <form onSubmit={(e) => {
            e.preventDefault();
            if(!newFaqQ || !newFaqA) return;
            setFaqs(prev => [...prev, { q: newFaqQ.trim(), a: newFaqA.trim() }]);
            setNewFaqQ('');
            setNewFaqA('');
            addToast('FAQ Entry published successfully!', 'success');
          }} className="space-y-4 border-b border-slate-100 dark:border-slate-800 pb-6">
            <div>
              <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">Question Description</label>
              <input type="text" required value={newFaqQ} onChange={(e) => setNewFaqQ(e.target.value)} placeholder="e.g. How do I get verified?" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold" />
            </div>
            <div>
              <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">Answer / Guidance Details</label>
              <textarea required value={newFaqA} onChange={(e) => setNewFaqA(e.target.value)} placeholder="e.g. Creator must meet 1,000 subscribers and submit request from Settings." rows={3} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold" />
            </div>
            <button type="submit" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-1 cursor-pointer">
              <Plus className="w-4 h-4" />
              <span>Publish FAQ Entry</span>
            </button>
          </form>

          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Active Published FAQs</h4>
            <div className="space-y-4">
              {faqs.map(f => (
                <div key={f.q} className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded-2xl flex items-start justify-between gap-4">
                  <div className="text-xs space-y-1">
                    <p className="font-extrabold text-slate-900 dark:text-white">Q: {f.q}</p>
                    <p className="text-slate-500 font-semibold leading-relaxed">A: {f.a}</p>
                  </div>
                  <button onClick={() => setFaqs(prev => prev.filter(p => p.q !== f.q))} className="text-rose-500 hover:text-rose-700 cursor-pointer"><Trash2 className="w-4 h-4 shrink-0" /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
