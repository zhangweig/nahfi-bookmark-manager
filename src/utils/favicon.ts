// ─── Favicon URL generation ─────────────────────────────────────
// Multi-source favicon resolution with fallback chain.
//
// CRITICAL: The order matters for users in China (no VPN).
// Google S2 and DuckDuckGo are blocked/slow in mainland China.
// The chain is ordered: local/fast first → external/VPN-dependent last.
//
// High-resolution sources are prioritized to avoid blurry icons on
// high-DPI (Retina) displays where a 128px request only yields 64px
// of physical pixels.
//
//   0. Chrome internal favicon cache (size=256)  — instant, no network
//   1. apple-touch-icon.png (180×180)            — high-res, most sites have it
//   2. android-chrome-192x192.png                — PWA icon, very high-res
//   3. Direct /favicon.ico from site             — low-res but works in China
//   4. DuckDuckGo favicon service                — may work for some users
//   5. Google S2 favicon service (sz=256)         — requires VPN in China
//   6. First-letter avatar (data URI)            — always works, final fallback

export interface FaviconSource {
  url: string;
  name: 'chrome' | 'apple-touch' | 'android-chrome' | 'direct' | 'duckduckgo' | 'google' | 'avatar';
}

/**
 * Build the ordered favicon fallback chain for a bookmark URL.
 * Each entry is tried in order; the next is used when the previous
 * fires onError or times out.
 *
 * @param size - Requested pixel size. Defaults to 256 for high-DPI displays.
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

  // 0. Chrome internal favicon cache — reads from browser's own cache,
  //    no external network request. Instant and works offline.
  //    Request size=256 for high-DPI displays.
  if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
    chain.push({
      url: chrome.runtime.getURL(
        `/_favicon/?pageUrl=${encodeURIComponent(bookmarkUrl)}&size=${size}`,
      ),
      name: 'chrome',
    });
  }

  // 1. apple-touch-icon.png — 180×180 on most sites. High resolution,
  //    works without VPN for Chinese sites. If the file doesn't exist,
  //    the server returns 404 quickly (unlike Google's packet-drop timeout).
  chain.push({
    url: `${origin}/apple-touch-icon.png`,
    name: 'apple-touch',
  });

  // 2. android-chrome-192x192.png — PWA manifest icon, 192×192.
  //    Very high resolution, available on sites with a web app manifest.
  chain.push({
    url: `${origin}/android-chrome-192x192.png`,
    name: 'android-chrome',
  });

  // 3. Direct /favicon.ico from the website itself.
  //    Usually 16×16 or 32×32 — low-res but works without VPN.
  //    Kept as a reliable fallback when high-res sources don't exist.
  chain.push({
    url: `${origin}/favicon.ico`,
    name: 'direct',
  });

  // 4. DuckDuckGo favicon service — sometimes works in China, sometimes not.
  chain.push({
    url: `https://icons.duckduckgo.com/ip3/${hostname}.ico`,
    name: 'duckduckgo',
  });

  // 5. Google S2 favicon service — blocked in mainland China without VPN.
  //    Requested at sz=256 for high-res when available.
  //    Kept as a late fallback for users who have VPN or are outside China.
  chain.push({
    url: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=${size}`,
    name: 'google',
  });

  // 6. Avatar — always works, final fallback.
  chain.push({ url: '', name: 'avatar' });

  return chain;
}

/**
 * Get a favicon URL. Kept for backward compatibility — prefer getFaviconChain().
 * Returns the first source in the chain (Chrome internal cache).
 */
export function getFaviconUrl(bookmarkUrl: string, size: number = 256): string {
  const chain = getFaviconChain(bookmarkUrl, size);
  return chain[0]?.url || generateAvatarDataUri('?');
}

/** Generate a favicon URL from Chrome's internal favicon endpoint. */
export function getChromeFaviconUrl(bookmarkUrl: string, size: number = 256): string {
  try {
    return chrome.runtime.getURL(
      `/_favicon/?pageUrl=${encodeURIComponent(bookmarkUrl)}&size=${size}`,
    );
  } catch {
    return generateAvatarDataUri('?');
  }
}

/** Generate a favicon URL from Google S2 service (requires VPN in China). */
export function getGoogleFaviconUrl(bookmarkUrl: string, size: number = 256): string {
  try {
    const url = new URL(bookmarkUrl);
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(url.hostname)}&sz=${size}`;
  } catch {
    return generateAvatarDataUri('?');
  }
}

/** Generate a favicon URL from DuckDuckGo service. */
export function getDuckDuckGoFaviconUrl(bookmarkUrl: string): string {
  try {
    const url = new URL(bookmarkUrl);
    return `https://icons.duckduckgo.com/ip3/${url.hostname}.ico`;
  } catch {
    return generateAvatarDataUri('?');
  }
}

/** Generate a direct /favicon.ico URL from the bookmark's domain. */
export function getDirectFaviconUrl(bookmarkUrl: string): string {
  try {
    const url = new URL(bookmarkUrl);
    return `https://${url.hostname}/favicon.ico`;
  } catch {
    return generateAvatarDataUri('?');
  }
}

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
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
    <rect width="128" height="128" rx="28" fill="${color}"/>
    <text x="64" y="64" dominant-baseline="central" text-anchor="middle"
      font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif"
      font-size="72" font-weight="700" fill="white">${ch}</text>
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
