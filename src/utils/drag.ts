const INTERNAL_BOOKMARK_MIME = 'application/x-nahfi-bookmark-id';
const INTERNAL_FOLDER_MIME = 'application/x-nahfi-folder';

export function setInternalDragData(dataTransfer: DataTransfer, id: string, isFolder: boolean) {
  dataTransfer.setData(INTERNAL_BOOKMARK_MIME, id);
  dataTransfer.setData('text/plain', id);
  if (isFolder) {
    dataTransfer.setData(INTERNAL_FOLDER_MIME, 'true');
    dataTransfer.setData('folder', 'true');
  }
}

export function getInternalDragData(dataTransfer: DataTransfer) {
  const id = dataTransfer.getData(INTERNAL_BOOKMARK_MIME) || dataTransfer.getData('text/plain');
  const isFolder =
    dataTransfer.getData(INTERNAL_FOLDER_MIME) === 'true' ||
    dataTransfer.getData('folder') === 'true';

  if (!id || !/^\d+$/.test(id)) {
    return null;
  }

  return { id, isFolder };
}

export function getDroppedUrl(dataTransfer: DataTransfer): string | null {
  const uriList = dataTransfer.getData('text/uri-list');
  const uri = uriList
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith('#'));

  const raw = uri || dataTransfer.getData('text/plain').trim();
  if (!raw || /^\d+$/.test(raw)) {
    return null;
  }

  try {
    const url = new URL(raw);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return url.toString();
    }
  } catch {
    return null;
  }

  return null;
}

export function getDroppedTitle(dataTransfer: DataTransfer, fallbackUrl: string): string {
  const text = dataTransfer.getData('text/plain').trim();
  if (text && text !== fallbackUrl && !/^https?:\/\//i.test(text)) {
    return text.slice(0, 120);
  }

  try {
    return new URL(fallbackUrl).hostname.replace(/^www\./, '');
  } catch {
    return fallbackUrl;
  }
}
