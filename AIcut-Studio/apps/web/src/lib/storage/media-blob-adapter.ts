/**
 * Media Blob Storage Adapter
 * Stores actual media file blobs in IndexedDB for persistence
 */

const DB_NAME = "aicut-media-blobs";
const STORE_NAME = "media-files";
const DB_VERSION = 1;

export interface StoredMediaBlob {
    id: string;
    projectId: string;
    name: string;
    type: string; // MIME type
    size: number;
    blob: Blob;
    createdAt: string;
}

class MediaBlobAdapter {
    private dbPromise: Promise<IDBDatabase> | null = null;

    private getDB(): Promise<IDBDatabase> {
        if (this.dbPromise) return this.dbPromise;

        this.dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error("Failed to open MediaBlob database:", request.error);
                reject(request.error);
            };

            request.onsuccess = () => resolve(request.result);

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
                    store.createIndex("projectId", "projectId", { unique: false });
                }
            };
        });

        return this.dbPromise;
    }

    /**
     * Save a media file blob to IndexedDB
     */
    async saveBlob(
        id: string,
        projectId: string,
        file: File
    ): Promise<void> {
        const db = await this.getDB();
        const transaction = db.transaction([STORE_NAME], "readwrite");
        const store = transaction.objectStore(STORE_NAME);

        const storedBlob: StoredMediaBlob = {
            id,
            projectId,
            name: file.name,
            type: file.type,
            size: file.size,
            blob: file, // File extends Blob, IndexedDB can store it directly
            createdAt: new Date().toISOString(),
        };

        return new Promise((resolve, reject) => {
            const request = store.put(storedBlob);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    }

    /**
     * Load a media file blob from IndexedDB and reconstruct as File
     */
    async loadBlob(id: string): Promise<File | null> {
        const db = await this.getDB();
        const transaction = db.transaction([STORE_NAME], "readonly");
        const store = transaction.objectStore(STORE_NAME);

        return new Promise((resolve, reject) => {
            const request = store.get(id);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const result = request.result as StoredMediaBlob | undefined;
                if (!result) {
                    resolve(null);
                    return;
                }

                // Reconstruct File from Blob
                const file = new File([result.blob], result.name, {
                    type: result.type,
                    lastModified: new Date(result.createdAt).getTime(),
                });
                resolve(file);
            };
        });
    }

    /**
     * Load all media blobs for a project
     */
    async loadAllBlobsForProject(
        projectId: string
    ): Promise<{ id: string; file: File }[]> {
        const db = await this.getDB();
        const transaction = db.transaction([STORE_NAME], "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index("projectId");

        return new Promise((resolve, reject) => {
            const request = index.getAll(projectId);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const results = request.result as StoredMediaBlob[];
                const files = results.map((result) => ({
                    id: result.id,
                    file: new File([result.blob], result.name, {
                        type: result.type,
                        lastModified: new Date(result.createdAt).getTime(),
                    }),
                }));
                resolve(files);
            };
        });
    }

    /**
     * Delete a media blob
     */
    async deleteBlob(id: string): Promise<void> {
        const db = await this.getDB();
        const transaction = db.transaction([STORE_NAME], "readwrite");
        const store = transaction.objectStore(STORE_NAME);

        return new Promise((resolve, reject) => {
            const request = store.delete(id);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    }

    /**
     * Delete all media blobs for a project
     */
    async deleteAllBlobsForProject(projectId: string): Promise<void> {
        const blobs = await this.loadAllBlobsForProject(projectId);
        await Promise.all(blobs.map((b) => this.deleteBlob(b.id)));
    }

    /**
     * Get storage usage stats
     */
    async getStats(): Promise<{ count: number; totalSize: number }> {
        const db = await this.getDB();
        const transaction = db.transaction([STORE_NAME], "readonly");
        const store = transaction.objectStore(STORE_NAME);

        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const results = request.result as StoredMediaBlob[];
                const totalSize = results.reduce((sum, r) => sum + r.size, 0);
                resolve({ count: results.length, totalSize });
            };
        });
    }
}

export const mediaBlobAdapter = new MediaBlobAdapter();
