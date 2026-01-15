/**
 * Media Metadata Storage Adapter
 * Stores metadata about media files (not the actual blobs)
 */

const DB_NAME = "aicut-media-metadata";
const STORE_NAME = "media-items";
const DB_VERSION = 1;

export interface StoredMediaMetadata {
    id: string;
    projectId: string;
    name: string;
    type: "video" | "audio" | "image";
    mimeType: string;
    duration?: number;
    width?: number;
    height?: number;
    fps?: number;
    createdAt: string;
}

class MediaMetadataAdapter {
    private dbPromise: Promise<IDBDatabase> | null = null;

    private getDB(): Promise<IDBDatabase> {
        if (this.dbPromise) return this.dbPromise;

        this.dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error("Failed to open MediaMetadata database:", request.error);
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

    async save(metadata: StoredMediaMetadata): Promise<void> {
        const db = await this.getDB();
        const transaction = db.transaction([STORE_NAME], "readwrite");
        const store = transaction.objectStore(STORE_NAME);

        return new Promise((resolve, reject) => {
            const request = store.put(metadata);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    }

    async load(id: string): Promise<StoredMediaMetadata | null> {
        const db = await this.getDB();
        const transaction = db.transaction([STORE_NAME], "readonly");
        const store = transaction.objectStore(STORE_NAME);

        return new Promise((resolve, reject) => {
            const request = store.get(id);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result || null);
        });
    }

    async loadAllForProject(projectId: string): Promise<StoredMediaMetadata[]> {
        const db = await this.getDB();
        const transaction = db.transaction([STORE_NAME], "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index("projectId");

        return new Promise((resolve, reject) => {
            const request = index.getAll(projectId);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result || []);
        });
    }

    async delete(id: string): Promise<void> {
        const db = await this.getDB();
        const transaction = db.transaction([STORE_NAME], "readwrite");
        const store = transaction.objectStore(STORE_NAME);

        return new Promise((resolve, reject) => {
            const request = store.delete(id);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    }

    async deleteAllForProject(projectId: string): Promise<void> {
        const items = await this.loadAllForProject(projectId);
        await Promise.all(items.map((item) => this.delete(item.id)));
    }
}

export const mediaMetadataAdapter = new MediaMetadataAdapter();
