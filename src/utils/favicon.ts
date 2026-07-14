// ─── Favicon URL generation ─────────────────────────────────────
// Multi-source favicon resolution with fallback chain.
//
// Google S2 is the PRIMARY source (position 0) because:
//   - It returns the highest-quality icons for the vast majority of sites
//   - sz=512 requests the maximum resolution Google supports
//   - Google has crawled and cached high-res favicons for millions of sites
//   - The returned image is always exactly the requested size
//
// Direct sources (apple-touch, android-chrome, favicon.ico) follow as
// fallbacks for when Google S2 is unreachable (e.g. in mainland China
// without VPN) or returns a default globe placeholder.
//
//   0. Google S2 (sz=512)                     — highest quality, primary
//   1. apple-touch-icon.png (180x180)          — direct, China-accessible
//   2. apple-touch-icon-precomposed.png        — older iOS variant
//   3. android-chrome-192x192.png (192x192)   — PWA icon
//   4. Chrome internal favicon cache (256)     — instant but often low-res
//   5. Direct /favicon.ico from site            — low-res but works in China
//   6. DuckDuckGo favicon service              — may work for some users
//   7. First-letter avatar (data URI)          — always works, final fallback
//
// onLoad threshold (FAVICON_MIN_SIZE = 128, defined in constants):
// Images with naturalWidth < 128 are rejected; the chain advances.
// For Google S2 this is a no-op (always returns 512). It IS effective
// for direct sources where naturalWidth reflects the true resolution.

export interface FaviconSource {
  url: string;
  name: 'apple-touch' | 'apple-touch-precomposed' | 'android-chrome' | 'chrome' | 'direct' | 'duckduckgo' | 'google' | 'avatar';
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

  // 0. Google S2 favicon service — primary source. Returns the highest-
  //    quality favicon available for the domain, always at the requested size.
  //    sz=512 is the maximum Google supports, giving us crisp icons on all
  //    display sizes including Retina 2x. If Google hasn't crawled the site
  //    or is unreachable (China), onError advances the chain.
  chain.push({
    url: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=${size}`,
    name: 'google',
  });

  // 1. apple-touch-icon.png — 180x180 on most sites. High resolution,
  //    works without VPN for Chinese sites. 404 returns instantly (no timeout).
  chain.push({
    url: `${origin}/apple-touch-icon.png`,
    name: 'apple-touch',
  });

  // 2. apple-touch-icon-precomposed.png — older iOS variant, same 180x180.
  chain.push({
    url: `${origin}/apple-touch-icon-precomposed.png`,
    name: 'apple-touch-precomposed',
  });

  // 3. android-chrome-192x192.png — PWA manifest icon, 192x192.
  chain.push({
    url: `${origin}/android-chrome-192x192.png`,
    name: 'android-chrome',
  });

  // 4. Chrome internal favicon cache — reads from browser's own cache,
  //    no external network request. Instant and works offline.
  //    Often only has 16x16 icons, which get rejected by the 128px threshold.
  if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
    chain.push({
      url: chrome.runtime.getURL(
        `/_favicon/?pageUrl=${encodeURIComponent(bookmarkUrl)}&size=${size}`,
      ),
      name: 'chrome',
    });
  }

  // 5. Direct /favicon.ico from the website itself.
  //    Usually 16x16 or 32x32 — rejected by the < 128px threshold.
  chain.push({
    url: `${origin}/favicon.ico`,
    name: 'direct',
  });

  // 6. DuckDuckGo favicon service — secondary fallback.
  chain.push({
    url: `https://icons.duckduckgo.com/ip3/${hostname}.ico`,
    name: 'duckduckgo',
  });

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
  const ch = letter.charAt(0).toUpperCase() || '?';
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
