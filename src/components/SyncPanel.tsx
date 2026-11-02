import { useEffect, useState } from 'react';
import { Cloud, RefreshCw } from 'lucide-react';
import { getSyncStatus, writeSync, type SyncStatus } from '@/utils/sync';

export function SyncPanel() {
  const [status, setStatus] = useState<SyncStatus>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const refresh = () => {
      getSyncStatus().then(setStatus).catch(console.error);
    };
    refresh();
    chrome.storage.onChanged.addListener(refresh);
    return () => chrome.storage.onChanged.removeListener(refresh);
  }, []);
  const retry = async () => {
    setBusy(true);
    try {
      await writeSync();
      setStatus(await getSyncStatus());
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="rounded-xl border border-blue-400/20 bg-blue-500/5 p-3 text-xs text-gray-600 dark:text-gray-300">
      <h3 className="mb-2 flex items-center gap-2 font-semibold">
        <Cloud size={14} />
        跨电脑同步
      </h3>
      <p className="leading-relaxed">
        在各台电脑安装相同 ID 的本扩展，登录同一 Chrome
        账号，并开启「书签」和「扩展程序」同步。快速启动收藏和显示设置会随账号同步。
      </p>
      <p className="mt-2 opacity-60">访问记录、图标缓存和文件夹个性化保留在本机。</p>
      <p role="status" className="mt-2">
        {status.error
          ? '同步暂不可用，修改已保存在本机，稍后重试。'
          : status.lastSuccess
            ? `已提交至 Chrome 同步 · ${new Date(status.lastSuccess).toLocaleTimeString()}`
            : '等待首次设置或快捷收藏变更'}
      </p>
      {status.error && (
        <button
          disabled={busy}
          onClick={retry}
          className="mt-2 flex items-center gap-1 text-blue-500"
        >
          <RefreshCw size={12} />
          {busy ? '重试中…' : '重试同步'}
        </button>
      )}
    </section>
  );
}
