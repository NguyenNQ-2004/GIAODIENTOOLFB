/**
 * Persistent Demo Media Storage (IndexedDB in browser + in-memory fallback for tests/SSR).
 *
 * Design rules:
 * - Never treat blob: URLs as persistent storage; always store Blob keyed by stable mediaId.
 * - Reference-counted Object URL cache ensures URLs are NOT revoked while any draft,
 *   saved post, or TaskDrawer snapshot still displays them.
 * - Deleting or editing a draft never deletes blobs still referenced elsewhere.
 * - Codex replaces this module with Backend Object Storage upload + signed URLs in production.
 */

const DB_NAME = 'fbpostpro_demo_media_v3';
const STORE_NAME = 'media_blobs';
const DB_VERSION = 1;

interface CachedObjectUrl {
  url: string;
  refCount: number;
}

class DemoMediaStore {
  private memoryBlobs = new Map<string, Blob>();
  private urlCache = new Map<string, CachedObjectUrl>();
  private dbPromise: Promise<IDBDatabase | null> | null = null;

  private openDb(): Promise<IDBDatabase | null> {
    if (typeof indexedDB === 'undefined') {
      return Promise.resolve(null);
    }
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });

    return this.dbPromise;
  }

  public async saveBlob(mediaId: string, blob: Blob): Promise<void> {
    this.memoryBlobs.set(mediaId, blob);
    const db = await this.openDb();
    if (!db) return;

    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(blob, mediaId);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  public async getBlob(mediaId: string): Promise<Blob | null> {
    const cached = this.memoryBlobs.get(mediaId);
    if (cached) return cached;

    const db = await this.openDb();
    if (!db) return null;

    return new Promise<Blob | null>((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(mediaId);
        req.onsuccess = () => {
          const result = req.result;
          if (result instanceof Blob) {
            this.memoryBlobs.set(mediaId, result);
            resolve(result);
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  public async hasBlob(mediaId: string): Promise<boolean> {
    const blob = await this.getBlob(mediaId);
    return blob !== null;
  }

  public async acquireObjectUrl(mediaId: string): Promise<string | null> {
    const existing = this.urlCache.get(mediaId);
    if (existing) {
      existing.refCount += 1;
      return existing.url;
    }

    const blob = await this.getBlob(mediaId);
    if (!blob) return null;

    if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
      return null;
    }

    const url = URL.createObjectURL(blob);
    this.urlCache.set(mediaId, { url, refCount: 1 });
    return url;
  }

  public releaseObjectUrl(mediaId: string): void {
    const existing = this.urlCache.get(mediaId);
    if (!existing) return;
    existing.refCount -= 1;
    if (existing.refCount <= 0) {
      this.urlCache.delete(mediaId);
      if (typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
        URL.revokeObjectURL(existing.url);
      }
    }
  }

  public async deleteBlobIfUnused(mediaId: string, referencedIds: Set<string>): Promise<boolean> {
    if (referencedIds.has(mediaId)) {
      return false;
    }
    this.memoryBlobs.delete(mediaId);
    const cached = this.urlCache.get(mediaId);
    if (cached && cached.refCount <= 0) {
      this.urlCache.delete(mediaId);
      if (typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
        URL.revokeObjectURL(cached.url);
      }
    }

    const db = await this.openDb();
    if (!db) return true;

    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(mediaId);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
    return true;
  }

  public async clearAll(): Promise<void> {
    for (const entry of this.urlCache.values()) {
      if (typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
        URL.revokeObjectURL(entry.url);
      }
    }
    this.urlCache.clear();
    this.memoryBlobs.clear();

    const db = await this.openDb();
    if (!db) return;

    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  /** Test helper to inspect active ref count */
  public getActiveRefCount(mediaId: string): number {
    return this.urlCache.get(mediaId)?.refCount ?? 0;
  }
}

export const mediaStore = new DemoMediaStore();
