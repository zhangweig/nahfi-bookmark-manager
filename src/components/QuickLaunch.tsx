import { Sparkles } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { BookmarkCard } from './BookmarkCard';

export function QuickLaunch() {
  const bookmarks = useStore((s) => s.allBookmarks);
  const meta = useStore((s) => s.metaMap);
  const settings = useStore((s) => s.settings);
  // One shortcut per URL, even when the bookmark exists in several folders.
  const seen = new Set<string>();
  const shortcuts = bookmarks.filter((node) => {
    if (!node.url || !meta[node.id]?.pinned || seen.has(node.url)) return false;
    seen.add(node.url);
    return true;
  });

  return (
    <section className="quick-launch" aria-label="Quick Launch">
      <div className="section-heading">
        <h2>
          <Sparkles size={12} />
          快速启动
        </h2>
        <span>{shortcuts.length ? `${shortcuts.length} 个快捷收藏` : '常用网站，触手可及'}</span>
      </div>
      {shortcuts.length ? (
        <div className="quick-launch-grid nahfi-scroll">
          {shortcuts.map((node) => (
            <BookmarkCard
              key={`${node.id}:${node.url}`}
              node={node}
              meta={meta[node.id]}
              settings={{ ...settings, showUrl: false }}
              cardSize="small"
            />
          ))}
        </div>
      ) : (
        <p className="quick-launch-empty">右键点击书签，选择「添加到快速启动」，即可固定在这里。</p>
      )}
    </section>
  );
}
