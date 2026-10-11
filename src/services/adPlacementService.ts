// Central Adsterra placement manager:
// - Every location gets a UNIQUE ad unit (no duplicates on one page)
// - Rotation across page loads (different location => different ad)
// - Session frequency cap (default: 10 external ad units per session)

export type AdUnitType = 'native' | 'banner' | 'box';

export interface AdUnit {
  key: string;
  type: AdUnitType;
  height: number;
  width: number;
  invokeSrc?: string;        // for native
  atOptionsKey?: string;     // for iframe/box
}

const AD_UNITS: AdUnit[] = [
  { key: 'native-a', type: 'native', height: 0, width: 0,
    invokeSrc: 'https://pl31660368.profitableratecpmnetwork.com/c90b4e17b69c15f7e35856f8a1a9753c/invoke.js' },
  { key: 'box-b', type: 'box', height: 250, width: 300,
    atOptionsKey: 'd12213554cad0ca96fec6fe61f0cc604' },
  { key: 'banner-c', type: 'banner', height: 50, width: 320,
    atOptionsKey: '4d5ab16d208e0cc3f4f297c6bd771d7f' },
];

const SESSION_CAP = 10;
const SESSION_KEY = 'socialindia_ad_session';

interface AdSession { served: string[]; }

function getSession(): AdSession {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) || '{"served":[]}');
  } catch { return { served: [] }; }
}
function saveSession(s: AdSession) {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch {}
}

// simple string hash -> stable per locationTag
function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

// Units already mounted on THIS page (module-level, resets on navigation/reload)
const usedOnPage = new Set<string>();

export const adPlacementService = {
  // Claim a unique unit for a location. Returns null when session cap reached.
  claimUnit(locationTag: string): AdUnit | null {
    const session = getSession();
    if (session.served.length >= SESSION_CAP) return null;

    const start = hash(locationTag) % AD_UNITS.length;
    // Walk rotation until we find a unit not used on this page
    for (let i = 0; i < AD_UNITS.length; i++) {
      const unit = AD_UNITS[(start + i) % AD_UNITS.length];
      if (!usedOnPage.has(unit.key)) {
        usedOnPage.add(unit.key);
        session.served.push(unit.key);
        saveSession(session);
        return unit;
      }
    }
    return null; // all units already used on this page
  },

  resetPage(): void {
    usedOnPage.clear();
  },
};
