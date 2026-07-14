// ─── Favicon URL generation ─────────────────────────────────────
// Multi-source favicon resolution with fallback chain.
//
// CRITICAL: The order matters for both quality and China accessibility.
//
// High-resolution direct sources are tried FIRST. Most modern websites
// have apple-touch-icon.png (180×180), which loads instantly and is
// crystal-clear on Retina displays.
//
// Chrome's internal favicon cache is demoted to position 3 because it
// frequently only has a 16×16 version stored, resulting in blurry icons
// even when a size=256 is requested (the endpoint returns the native
// resolution, not an upscaled version).
//
//   0. apple-touch-icon.png (180×180)        — highest res, most sites have it
//   1. apple-touch-icon-precomposed.png       — older iOS variant, same 180px
//   2. android-chrome-192x192.png            — PWA icon, 192px
//   3. Chrome internal favicon cache (256)    — instant but often low-res
//   4. Direct /favicon.ico from site           — low-res but works in China
//   5. DuckDuckGo favicon service             — may work for some users
//   6. Google S2 favicon service (sz=256)     — requires VPN in China
//   7. First-letter avatar (data URI)         — always works, final fallback
//
// onLoad threshold: images with naturalWidth < 128 are rejected (16×16 or
// 32×32 favicons are too blurry on modern displays). The chain advances to
// the next source. If all sources return < 128px, the avatar is shown.

export interface FaviconSource {
  url: string;
  name: 'apple-touch' | 'apple-touch-precomposed' | 'android-chrome' | 'chrome' | 'direct' | 'duckduckgo' | 'google' | 'avatar';
}

/**
 * Build the ordered favicon fallback chain for a bookmark URL.
 * Each entry is tried in order; the next is used when the previous
 * fires onError or returns an image below the quality threshold.
 *
 * @param size - Requested pixel size for Chrome cache and Google S2. Defaults to 256.
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

  // 0. apple-touch-icon.png — 180×180 on most sites. High resolution,
  //    works without VPN for Chinese sites. If the file doesn't exist,
  //    the server returns 404 quickly (unlike Google's packet-drop timeout).
  chain.push({
    url: `${origin}/apple-touch-icon.png`,
    name: 'apple-touch',
  });

  // 1. apple-touch-icon-precomposed.png — older iOS variant, same 180×180.
  //    Some sites only have this version, not the standard one.
  chain.push({
    url: `${origin}/apple-touch-icon-precomposed.png`,
    name: 'apple-touch-precomposed',
  });

  // 2. android-chrome-192x192.png — PWA manifest icon, 192×192.
  //    Very high resolution, available on sites with a web app manifest.
  chain.push({
    url: `${origin}/android-chrome-192x192.png`,
    name: 'android-chrome',
  });

  // 3. Chrome internal favicon cache — reads from browser's own cache,
  //    no external network request. Instant and works offline.
  //    Demoted from position 0 because it frequently only has 16×16 icons.
  //    The onLoad threshold (< 128px) will reject these and advance the chain.
  if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
    chain.push({
      url: chrome.runtime.getURL(
        `/_favicon/?pageUrl=${encodeURIComponent(bookmarkUrl)}&size=${size}`,
      ),
      name: 'chrome',
    });
  }

  // 4. Direct /favicon.ico from the website itself.
  //    Usually 16×16 or 32×32 — rejected by the < 128px threshold.
  //    Kept as a fallback for the rare high-resolution favicon.ico files.
  chain.push({
    url: `${origin}/favicon.ico`,
    name: 'direct',
  });

  // 5. DuckDuckGo favicon service — sometimes works in China, sometimes not.
  chain.push({
    url: `https://icons.duckduckgo.com/ip3/${hostname}.ico`,
    name: 'duckduckgo',
  });

  // 6. Google S2 favicon service — blocked in mainland China without VPN.
  //    Requested at sz=256 for high-res when available.
  //    Kept as a late fallback for users who have VPN or are outside China.
  chain.push({
    url: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=${size}`,
    name: 'google',
  });

  // 7. Avatar — always works, final fallback.
  chain.push({ url: '', name: 'avatar' });

  return chain;
}

/** Minimum acceptable image dimension. Images smaller than this are
 *  rejected by the onLoad handler and the chain advances to the next source.
 *  128px is the threshold: 16×16, 32×32 and 64×64 favicons are rejected,
 *  128×128 and above are accepted and cached. */
export const FAVICON_MIN_SIZE = 128;

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
