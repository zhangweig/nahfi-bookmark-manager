import { useEffect, useMemo, useState } from 'react';
import { useStore } from '@/store/useStore';
import { FAVICON_CACHE_TTL, FAVICON_MIN_SIZE, ICON_QUALITY_VERSION } from '@/constants';
import { generateAvatarDataUri, getFaviconChain, getInitial } from '@/utils/favicon';

interface Source {
  url: string;
  name: string;
}
const cacheRequests = new Set<string>();

function IconImage({ sources, avatar }: { sources: Source[]; avatar: string }) {
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState('');
  const source = sources[index];
  const isAvatar = !source || source.name === 'avatar';
  const [dimensions, setDimensions] = useState(256);
  const advance = () => setIndex((current) => (current === index ? current + 1 : current));

  useEffect(() => {
    if (isAvatar || loaded === source.url) return;
    const timer = window.setTimeout(
      () => setIndex((current) => (current === index ? current + 1 : current)),
      2500,
    );
    return () => window.clearTimeout(timer);
  }, [index, isAvatar, loaded, source]);

  return (
    <div className="site-icon relative flex h-full w-full items-center justify-center">
      <img
        src={avatar}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-contain"
        style={{ opacity: !isAvatar && loaded === source.url ? 0 : 1 }}
        draggable={false}
      />
      {!isAvatar && (
        <img
          key={source.url}
          src={source.url}
          alt=""
          draggable={false}
          className="favicon-sharp relative h-full w-full object-contain"
          style={{
            opacity: loaded === source.url ? 1 : 0,
            maxWidth: dimensions < 64 ? 32 : '100%',
            maxHeight: dimensions < 64 ? 32 : '100%',
          }}
          onError={advance}
          onLoad={(event) => {
            if (
              event.currentTarget.naturalWidth < FAVICON_MIN_SIZE ||
              event.currentTarget.naturalHeight < FAVICON_MIN_SIZE
            ) {
              advance();
              return;
            }
            setDimensions(
              Math.min(event.currentTarget.naturalWidth, event.currentTarget.naturalHeight),
            );
            setLoaded(source.url);
          }}
        />
      )}
    </div>
  );
}

export function SiteIcon({
  id,
  url,
  title,
  enabled,
}: {
  id: string;
  url: string;
  title: string;
  enabled: boolean;
}) {
  let hostname = '';
  try {
    hostname = new URL(url).hostname;
  } catch {
    /* Invalid URLs use the avatar. */
  }
  const cached = useStore((s) => s.faviconCacheMap[hostname]);
  const retry = useStore((s) => s.faviconRetryMap[id] ?? 0);
  const avatar = generateAvatarDataUri(getInitial(title), title);
  const cachedUri =
    cached && Date.now() - cached.timestamp < FAVICON_CACHE_TTL ? cached.dataUri : '';
  const sources = useMemo(
    () =>
      enabled
        ? [...(cachedUri ? [{ url: cachedUri, name: 'cached' }] : []), ...getFaviconChain(url, 256)]
        : [],
    [enabled, cachedUri, url],
  );
  useEffect(() => {
    if (!enabled || !hostname || (cached?.qualityVersion === ICON_QUALITY_VERSION && retry === 0))
      return;
    const key = `${hostname}:${retry}`;
    if (cacheRequests.has(key)) return;
    cacheRequests.add(key);
    chrome.runtime.sendMessage(
      { type: 'RESOLVE_FAVICON', pageUrl: url, force: retry > 0 },
      (response) => {
        if (chrome.runtime.lastError || !response?.entry) {
          cacheRequests.delete(key);
          return;
        }
        useStore.setState((state) => ({
          faviconCacheMap: { ...state.faviconCacheMap, [hostname]: response.entry },
        }));
      },
    );
  }, [enabled, hostname, url, retry, cached?.qualityVersion]);
  return (
    <IconImage key={`${url}:${cachedUri}:${retry}:${enabled}`} sources={sources} avatar={avatar} />
  );
}
