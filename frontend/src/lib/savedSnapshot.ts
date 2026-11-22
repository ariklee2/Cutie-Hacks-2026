/**
 * The browser remembers the last snapshot it created or opened (its name
 * only, in localStorage), so the landing page can offer to open it again
 * without re-uploading. The snapshot itself stays on the server in
 * data/<name>_snapshot.json. Client-side only.
 */
import { isValidSnapshotName } from '@/lib/snapshotName';

const KEY = 'insta-snapshot:last-name';

export function rememberSnapshot(name: string): void {
  try {
    localStorage.setItem(KEY, name);
  } catch {
    // Storage blocked (private mode, settings): just don't remember.
  }
}

export function savedSnapshotName(): string | null {
  try {
    const name = localStorage.getItem(KEY);
    return name && isValidSnapshotName(name) ? name : null;
  } catch {
    return null;
  }
}

export function forgetSnapshot(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to do.
  }
}
