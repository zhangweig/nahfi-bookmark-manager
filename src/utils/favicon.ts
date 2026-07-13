// ─── Favicon URL generation ─────────────────────────────────────
// Multi-source favicon resolution with fallback chain:
//   1. Google S2 favicon service
//   2. Chrome's extension favicon endpoint
//   3. DuckDuckGo favicon service
//   4. First-letter avatar

/** Generate a favicon URL using Google S2 service. */
export function getFaviconUrl(bookmarkUrl: string, size: number = 128): string {
  return getGoogleFaviconUrl(bookmarkUrl, size);
}

/** Generate a fallback favicon URL from Chrome's internal favicon endpoint. */
export function getChromeFaviconUrl(bookmarkUrl: string, size: number = 128): string {
  try {
    const url = new URL(bookmarkUrl);
    return chrome.runtime.getURL(
      `/_favicon/?pageUrl=${encodeURIComponent(url.toString())}&size=${size}`,
    );
  } catch {
    return generateAvatarDataUri('?');
  }
}

/** Generate a fallback favicon URL using Google S2 service. */
export function getGoogleFaviconUrl(bookmarkUrl: string, size: number = 128): string {
  try {
    const url = new URL(bookmarkUrl);
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(url.hostname)}&sz=${size}`;
  } catch {
    return generateAvatarDataUri('?');
  }
}

/** Generate a fallback favicon URL using DuckDuckGo service. */
export function getDuckDuckGoFaviconUrl(bookmarkUrl: string): string {
  try {
    const url = new URL(bookmarkUrl);
    const domain = url.hostname;
    return `https://icons.duckduckgo.com/ip3/${domain}.ico`;
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
