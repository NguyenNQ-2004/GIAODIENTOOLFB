/**
 * Persistent browser-local media storage for DEMO prototype mode.
 * Stores actual File/Blob binaries in IndexedDB (with in-memory fallback for non-browser tests),
 * and creates object URLs on demand without revoking URLs that are still referenced by drafts,
 * saved posts, or task item snapshots.
 *
 * In production, Codex should replace this module with Object Storage upload/signed-URL APIs.
 */

const IDB_NAME = 'fbpostpro_demo_media_v1';
const IDB_STORE = 'media_blobs';

interface StoredBlobRecord {
  id: string;
  blob: Blob;
  mimeType: string;
  originalName: string;
  savedAt: string;
}

export class DemoMediaStorage {
  private memoryStore = new Map<string, Blob>();
  private urlCache = new Map<string, string>();
  private dbPromise: Promise<IDBDatabase | null> | null = null;

  private getDb(): Promise<IDBDatabase | null> {
    if (typeof indexedDB === 'undefined') {
      return Promise.resolve(null);
    }
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve) => {
        try {
          const req = indexedDB.open(IDB_NAME, 1);
          req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(IDB_STORE)) {
              db.createObjectStore(IDB_STORE, { keyPath: 'id' });
            }
          };
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      });
    }
    return this.dbPromise;
  }

  public async saveMediaBlob(
    id: string,
    blob: Blob,
    meta: { mimeType: string; originalName: string }
  ): Promise<string | null> {
    this.memoryStore.set(id, blob);

    let previewUrl: string | null = null;
    if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
      const existing = this.urlCache.get(id);
      if (existing) {
        previewUrl = existing;
      } else {
        previewUrl = URL.createObjectURL(blob);
        this.urlCache.set(id, previewUrl);
      }
    }

    const db = await this.getDb();
    if (db) {
      await new Promise<void>((resolve) => {
        try {
          const tx = db.transaction(IDB_STORE, 'readwrite');
          const store = tx.objectStore(IDB_STORE);
          const record: StoredBlobRecord = {
            id,
            blob,
            mimeType: meta.mimeType,
            originalName: meta.originalName,
            savedAt: new Date().toISOString(),
          };
          store.put(record);
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        } catch {
          resolve();
        }
      });
    }

    return previewUrl;
  }

  public async getMediaBlob(id: string): Promise<Blob | null> {
    const cached = this.memoryStore.get(id);
    if (cached) return cached;

    const db = await this.getDb();
    if (!db) return null;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const store = tx.objectStore(IDB_STORE);
        const req = store.get(id);
        req.onsuccess = () => {
          const rec = req.result as StoredBlobRecord | undefined;
          if (rec?.blob) {
            this.memoryStore.set(id, rec.blob);
            resolve(rec.blob);
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

  public async getMediaPreviewUrl(id: string): Promise<string | null> {
    const cachedUrl = this.urlCache.get(id);
    if (cachedUrl) return cachedUrl;

    const blob = await this.getMediaBlob(id);
    if (!blob) return null;

    if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
      const url = URL.createObjectURL(blob);
      this.urlCache.set(id, url);
      return url;
    }
    return null;
  }

  public async hasMedia(id: string): Promise<boolean> {
    if (this.memoryStore.has(id)) return true;
    const blob = await this.getMediaBlob(id);
    return blob !== null;
  }

  /**
   * Deletes blob and revokes object URL ONLY when caller verifies no draft,
   * saved post, or task item snapshot references this media ID.
   */
  public async deleteMediaBlob(id: string): Promise<void> {
    const existingUrl = this.urlCache.get(id);
    if (existingUrl && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
      URL.revokeObjectURL(existingUrl);
    }
    this.urlCache.delete(id);
    this.memoryStore.delete(id);

    const db = await this.getDb();
    if (db) {
      await new Promise<void>((resolve) => {
        try {
          const tx = db.transaction(IDB_STORE, 'readwrite');
          tx.objectStore(IDB_STORE).delete(id);
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        } catch {
          resolve();
        }
      });
    }
  }

  public async clearAllDemoMedia(): Promise<void> {
    if (typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
      this.urlCache.forEach((url) => URL.revokeObjectURL(url));
    }
    this.urlCache.clear();
    this.memoryStore.clear();

    const db = await this.getDb();
    if (db) {
      await new Promise<void>((resolve) => {
        try {
          const tx = db.transaction(IDB_STORE, 'readwrite');
          tx.objectStore(IDB_STORE).clear();
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        } catch {
          resolve();
        }
      });
    }
  }
}

export const demoMediaStorage = new DemoMediaStorage();
