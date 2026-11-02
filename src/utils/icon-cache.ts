// Background-only icon discovery. Remote documents are parsed as data, never executed.
import { getFaviconChain } from './favicon';
import { STORAGE_KEYS, ICON_QUALITY_VERSION } from '@/constants';
import type { FaviconCacheEntry, FaviconCacheStorage } from '@/types';

export const ICON_VERSION = ICON_QUALITY_VERSION;
const inflight = new Map<string, Promise<FaviconCacheEntry | null>>();
let writes: Promise<unknown> = Promise.resolve();
export function readIconCache(): Promise<FaviconCacheStorage> {
  return new Promise((resolve, reject) =>
    chrome.storage.local.get(STORAGE_KEYS.FAVICON_CACHE, (items) => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve(items[STORAGE_KEYS.FAVICON_CACHE] ?? {});
    }),
  );
}
async function persist(host: string, entry: FaviconCacheEntry) {
  const operation = writes.then(async () => {
    const cache = await readIconCache();
    cache[host] = entry;
    await new Promise<void>((resolve, reject) =>
      chrome.storage.local.set({ [STORAGE_KEYS.FAVICON_CACHE]: cache }, () => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve();
      }),
    );
  });
  writes = operation.catch(() => {});
  await operation;
}
function safeURL(value: string, base: string): string | null {
  try {
    const url = new URL(value.replace(/&amp;/g, '&'), base);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}
export function discoverLinks(
  html: string,
  base: string,
): { icons: string[]; manifests: string[] } {
  const icons: string[] = [],
    manifests: string[] = [];
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    const attrs: Record<string, string> = {};
    for (const match of tag.matchAll(/([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
      attrs[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4];
    }
    const url = safeURL(attrs.href ?? '', base);
    if (!url) continue;
    if (
      /(?:^|\s)(?:icon|apple-touch-icon|apple-touch-icon-precomposed)(?:\s|$)/i.test(
        attrs.rel ?? '',
      )
    )
      icons.push(url);
    if (/\bmanifest\b/i.test(attrs.rel ?? '')) manifests.push(url);
  }
  return { icons, manifests };
}
async function fetchLimited(url: string, limit: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4500);
  try {
    const response = await fetch(url, { signal: controller.signal, credentials: 'omit' });
    if (!response.ok || Number(response.headers.get('content-length')) > limit)
      throw new Error('Unavailable icon');
    const reader = response.body!.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    let chunk = await reader.read();
    while (!chunk.done) {
      const value = chunk.value;
      size += value.length;
      if (size > limit) {
        await reader.cancel();
        throw new Error('Icon too large');
      }
      chunks.push(value);
      chunk = await reader.read();
    }
    return {
      blob: new Blob(chunks as BlobPart[], { type: response.headers.get('content-type') ?? '' }),
      url: response.url || url,
    };
  } finally {
    clearTimeout(timer);
  }
}
export function qualityScore(
  width: number,
  height: number,
  vector: boolean,
  aggregated: boolean,
): number {
  // Aggregators may upscale a 16px source to 512px: requested size is not proof of detail.
  if (vector) return 1024;
  return Math.min(width, height, aggregated ? 64 : 512);
}
async function candidate(url: string): Promise<(FaviconCacheEntry & { score: number }) | null> {
  try {
    const { blob } = await fetchLimited(url, 2 * 1024 * 1024);
    const svg = blob.type.includes('svg') || /\.svg(?:\?|$)/i.test(url);
    let width = 512,
      height = 512;
    if (svg) {
      if (!/<svg\b/i.test(await blob.text())) return null;
    } else {
      const bitmap = await createImageBitmap(blob);
      width = bitmap.width;
      height = bitmap.height;
      bitmap.close();
      if (width < 16 || height < 16) return null;
    }
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += 8192)
      binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
    const dataUri = `data:${svg ? 'image/svg+xml' : blob.type.startsWith('image/') ? blob.type : 'image/png'};base64,${btoa(binary)}`;
    return {
      dataUri,
      timestamp: Date.now(),
      width,
      height,
      source: url,
      qualityVersion: ICON_VERSION,
      score: qualityScore(width, height, svg, /(?:google\.com|duckduckgo\.com)\//i.test(url)),
    };
  } catch {
    return null;
  }
}
export async function resolveBestIcon(
  pageUrl: string,
  force = false,
): Promise<FaviconCacheEntry | null> {
  const page = new URL(pageUrl);
  if (!['http:', 'https:'].includes(page.protocol)) return null;
  const key = page.host;
  if (inflight.has(key)) return inflight.get(key)!;
  const task = (async () => {
    const existing = (await readIconCache())[page.hostname];
    if (!force && existing?.qualityVersion === ICON_VERSION) return existing;
    const candidates = new Set<string>([
      `${page.origin}/apple-touch-icon.png`,
      `${page.origin}/android-chrome-512x512.png`,
      `${page.origin}/android-chrome-192x192.png`,
      `${page.origin}/favicon.svg`,
    ]);
    try {
      const document = await fetchLimited(page.href, 512 * 1024);
      const links = discoverLinks(await document.blob.text(), document.url);
      links.icons.slice(0, 12).forEach((url) => candidates.add(url));
      for (const url of links.manifests.slice(0, 1)) {
        try {
          const result = await fetchLimited(url, 128 * 1024);
          const manifest = JSON.parse(await result.blob.text());
          for (const icon of Array.isArray(manifest.icons) ? manifest.icons.slice(0, 12) : []) {
            const source = typeof icon.src === 'string' && safeURL(icon.src, result.url);
            if (source) candidates.add(source);
          }
        } catch {
          /* Continue with website icons. */
        }
      }
    } catch {
      /* Login-only/offline pages still have conventional icon paths. */
    }
    getFaviconChain(page.href, 256)
      .filter((source) => !['chrome', 'avatar'].includes(source.name))
      .forEach((source) => candidates.add(source.url));
    const urls = [...candidates];
    let best: Awaited<ReturnType<typeof candidate>> = null;
    for (let index = 0; index < urls.length; index += 3) {
      const results = await Promise.all(urls.slice(index, index + 3).map(candidate));
      for (const result of results)
        if (result && (!best || result.score > best.score)) best = result;
    }
    if (best) {
      // Never replace an existing known high-detail icon with a smaller one.
      const previousScore = existing?.width
        ? qualityScore(
            existing.width,
            existing.height ?? existing.width,
            existing.source?.includes('.svg') ?? false,
            false,
          )
        : 0;
      const chosen =
        previousScore > best.score ? { ...existing, qualityVersion: ICON_VERSION } : best;
      await persist(page.hostname, chosen);
      return chosen;
    }
    return existing ?? null;
  })();
  inflight.set(key, task);
  try {
    return await task;
  } finally {
    inflight.delete(key);
  }
}
