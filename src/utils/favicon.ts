export interface FaviconSource {
  url: string;
  name:
    | 'apple-touch'
    | 'apple-touch-precomposed'
    | 'android-chrome'
    | 'chrome'
    | 'direct'
    | 'duckduckgo'
    | 'google'
    | 'avatar';
}

/**
 * Build the ordered favicon fallback chain for a bookmark URL.
 * Each entry is tried in order; the next is used when the previous
 * fires onError or returns an image below the quality threshold.
 *
 * @param size - Requested pixel size for Chrome cache and Google S2. Defaults to 256 for Retina displays.
 */
export function getFaviconChain(bookmarkUrl: string, size: number = 256): FaviconSource[] {
  let hostname = '';
  let origin = '';
  try {
    const url = new URL(bookmarkUrl);
    hostname = url.hostname;
    origin = url.origin;
  } catch {
    return [{ url: generateAvatarDataUri('?'), name: 'avatar' }];
  }

  const chain: FaviconSource[] = [];

  // Prefer the browser cache: offline-capable and no third-party lookup.
  if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
    chain.push({
      url: chrome.runtime.getURL(
        `_favicon/?pageUrl=${encodeURIComponent(bookmarkUrl)}&size=${size}`,
      ),
      name: 'chrome',
    });
  }
  if (!['http:', 'https:'].includes(new URL(bookmarkUrl).protocol)) {
    return [...chain, { url: '', name: 'avatar' }];
  }
  chain.push(
    { url: `${origin}/favicon.ico`, name: 'direct' },
    { url: `${origin}/apple-touch-icon.png`, name: 'apple-touch' },
    { url: `${origin}/apple-touch-icon-precomposed.png`, name: 'apple-touch-precomposed' },
    { url: `${origin}/android-chrome-192x192.png`, name: 'android-chrome' },
    {
      url: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=${size}`,
      name: 'google',
    },
    { url: `https://icons.duckduckgo.com/ip3/${hostname}.ico`, name: 'duckduckgo' },
  );

  // 7. Avatar — always works, final fallback.
  chain.push({ url: '', name: 'avatar' });

  return chain;
}

// Re-export the threshold from constants so existing imports keep working.
export { FAVICON_MIN_SIZE } from '@/constants';

// ─── First-letter avatar (data URI) ──────────────────────────────
// Generates a colorful rounded-square avatar with the first letter
// of the title. Color is derived from the title string for consistency.

const AVATAR_COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#FFEAA7',
  '#DDA0DD',
  '#98D8C8',
  '#F7DC6F',
  '#BB8FCE',
  '#85C1E9',
  '#F0B27A',
  '#82E0AA',
  '#F1948A',
  '#AED6F1',
  '#D7BDE2',
  '#A3E4D7',
  '#F8C471',
  '#76D7C4',
  '#F5B041',
  '#7FB3D5',
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  const binary = Array.from(bytes, (b) => String.fromCharCode(b)).join('');
  return btoa(binary);
}

export function generateAvatarDataUri(letter: string, title?: string): string {
  const color = title ? AVATAR_COLORS[hashString(title) % AVATAR_COLORS.length] : '#8E8E93';
  const ch = (letter.charAt(0).toUpperCase() || '?').replace(
    /[&<>"']/g,
    (char) => `&#${char.charCodeAt(0)};`,
  );
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
    <rect width="256" height="256" rx="56" fill="${color}"/>
    <text x="128" y="128" dominant-baseline="central" text-anchor="middle"
      font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif"
      font-size="144" font-weight="700" fill="white">${ch}</text>
  </svg>`;
  return `data:image/svg+xml;base64,${utf8ToBase64(svg)}`;
}

// ─── Placeholder favicon (data URI) ─────────────────────────────

export function getPlaceholderFavicon(): string {
  return generateAvatarDataUri('?');
}

// ─── Extract domain from URL ────────────────────────────────────

export function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

// ─── Get first letter for placeholder avatar ────────────────────

export function getInitial(title: string): string {
  return title.charAt(0).toUpperCase() || '?';
}

// ─── Generate avatar color from title ───────────────────────────

export function getAvatarColor(title: string): string {
  return AVATAR_COLORS[hashString(title) % AVATAR_COLORS.length];
}
