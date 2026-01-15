import { TProject } from "@/types/project";
import { MediaFile } from "@/types/media";
import { TimelineTrack } from "@/types/timeline";
import { SavedSoundsData, SoundEffect } from "@/types/sounds";
import { mediaBlobAdapter } from "./media-blob-adapter";
import { mediaMetadataAdapter, StoredMediaMetadata } from "./media-metadata-adapter";
import { IndexedDBAdapter } from "./indexeddb-adapter";

// Project storage adapter
const projectAdapter = new IndexedDBAdapter<TProject>("aicut-projects", "projects", 1);

// Timeline storage adapter
const timelineAdapter = new IndexedDBAdapter<{ id: string; projectId: string; tracks: TimelineTrack[] }>(
  "aicut-timelines",
  "timelines",
  1
);

class StorageService {
  constructor() { }

  // ============ PROJECT ============

  async saveProject({ project }: { project: TProject }): Promise<void> {
    console.log("Saving project", project.id);
    await projectAdapter.set(project.id, project);
  }

  async loadProject({ id }: { id: string }): Promise<TProject | null> {
    const project = await projectAdapter.get(id);
    if (project) {
      // Parse dates back from strings
      return {
        ...project,
        createdAt: new Date(project.createdAt),
        updatedAt: new Date(project.updatedAt),
        scenes: project.scenes.map((s) => ({
          ...s,
          createdAt: new Date(s.createdAt),
          updatedAt: new Date(s.updatedAt),
        })),
      };
    }

    // Fallback for 'demo' project
    if (id === "demo") {
      const now = new Date();
      const demoProject: TProject = {
        id: "demo",
        name: "AIcut Local Project",
        thumbnail: null,
        createdAt: now,
        updatedAt: now,
        scenes: [
          {
            id: "scene1",
            name: "Scene 1",
            isMain: true,
            createdAt: now,
            updatedAt: now,
          },
        ],
        currentSceneId: "scene1",
        backgroundColor: "#000000",
        backgroundType: "color",
        blurIntensity: 0,
        bookmarks: [],
        fps: 30,
        canvasSize: { width: 1920, height: 1080 },
        canvasMode: "landscape",
      };
      // Save demo project for future loads
      await this.saveProject({ project: demoProject });
      return demoProject;
    }

    return null;
  }

  async loadAllProjects(): Promise<TProject[]> {
    const keys = await projectAdapter.list();
    const projects = await Promise.all(
      keys.map((key) => this.loadProject({ id: key }))
    );
    return projects.filter((p): p is TProject => p !== null);
  }

  async deleteProject({ id }: { id: string }): Promise<void> {
    await projectAdapter.remove(id);
    await this.deleteProjectMedia({ projectId: id });
    await this.deleteProjectTimeline({ projectId: id });
  }

  // ============ MEDIA ============

  async saveMediaFile({
    projectId,
    mediaItem,
  }: {
    projectId: string;
    mediaItem: MediaFile;
  }): Promise<void> {
    console.log(`Saving media file: ${mediaItem.id} (${mediaItem.name})`);

    // 1. Save the actual blob
    if (mediaItem.file) {
      await mediaBlobAdapter.saveBlob(mediaItem.id, projectId, mediaItem.file);
    }

    // 2. Save metadata (without the File object)
    const metadata: StoredMediaMetadata = {
      id: mediaItem.id,
      projectId,
      name: mediaItem.name,
      type: mediaItem.type,
      mimeType: mediaItem.file?.type || "application/octet-stream",
      duration: mediaItem.duration,
      width: mediaItem.width,
      height: mediaItem.height,
      fps: mediaItem.fps,
      filePath: mediaItem.filePath,
      createdAt: new Date().toISOString(),
    };
    await mediaMetadataAdapter.save(metadata);
  }

  async loadMediaFile({
    projectId,
    id,
  }: {
    projectId: string;
    id: string;
  }): Promise<MediaFile | null> {
    // 1. Load metadata
    const metadata = await mediaMetadataAdapter.load(id);
    if (!metadata) return null;

    // 2. Load blob
    const file = await mediaBlobAdapter.loadBlob(id);
    if (!file) return null;

    // 3. Reconstruct MediaFile
    const url = URL.createObjectURL(file);
    return {
      id: metadata.id,
      name: metadata.name,
      type: metadata.type,
      file,
      url,
      thumbnailUrl: undefined, // Will be regenerated
      duration: metadata.duration,
      width: metadata.width,
      height: metadata.height,
      fps: metadata.fps,
      filePath: metadata.filePath,
    };
  }

  async loadAllMediaFiles({
    projectId,
  }: {
    projectId: string;
  }): Promise<MediaFile[]> {
    // 1. Load all metadata for project
    const metadataList = await mediaMetadataAdapter.loadAllForProject(projectId);

    // 2. Load blobs and reconstruct MediaFiles
    const mediaFiles: MediaFile[] = [];

    for (const metadata of metadataList) {
      const file = await mediaBlobAdapter.loadBlob(metadata.id);
      if (!file) {
        console.warn(`Blob not found for media ${metadata.id}, skipping`);
        continue;
      }

      const url = URL.createObjectURL(file);
      mediaFiles.push({
        id: metadata.id,
        name: metadata.name,
        type: metadata.type,
        file,
        url,
        thumbnailUrl: undefined, // Will be regenerated by media-store
        duration: metadata.duration,
        width: metadata.width,
        height: metadata.height,
        fps: metadata.fps,
        filePath: metadata.filePath,
      });
    }

    return mediaFiles;
  }

  async deleteMediaFile({
    projectId,
    id,
  }: {
    projectId: string;
    id: string;
  }): Promise<void> {
    await mediaBlobAdapter.deleteBlob(id);
    await mediaMetadataAdapter.delete(id);
  }

  async deleteProjectMedia({ projectId }: { projectId: string }): Promise<void> {
    await mediaBlobAdapter.deleteAllBlobsForProject(projectId);
    await mediaMetadataAdapter.deleteAllForProject(projectId);
  }

  // ============ TIMELINE ============

  async saveTimeline({
    projectId,
    tracks,
    sceneId,
  }: {
    projectId: string;
    tracks: TimelineTrack[];
    sceneId?: string;
  }): Promise<void> {
    const key = sceneId ? `${projectId}_${sceneId}` : projectId;
    console.log(`Saving timeline for project ${projectId} (scene: ${sceneId || 'default'})`);
    await timelineAdapter.set(key, { id: key, projectId, tracks });
  }

  async loadTimeline({
    projectId,
    sceneId,
  }: {
    projectId: string;
    sceneId?: string;
  }): Promise<TimelineTrack[] | null> {
    const key = sceneId ? `${projectId}_${sceneId}` : projectId;
    const data = await timelineAdapter.get(key);
    if (data && data.tracks) {
      return data.tracks;
    }

    // Return default empty track
    return [
      {
        id: "track1",
        name: "Main Track",
        type: "media",
        elements: [],
        muted: false,
      },
    ];
  }

  async deleteProjectTimeline({ projectId }: { projectId: string }): Promise<void> {
    await timelineAdapter.remove(projectId);
  }

  // ============ UTILS ============

  async clearAllData(): Promise<void> {
    await projectAdapter.clear();
    await timelineAdapter.clear();
    // Note: Blob and Metadata adapters don't have a global clear yet
  }

  async getStorageInfo(): Promise<{
    projects: number;
    isOPFSSupported: boolean;
    isIndexedDBSupported: boolean;
  }> {
    const keys = await projectAdapter.list();
    return {
      projects: keys.length,
      isOPFSSupported: "storage" in navigator && "getDirectory" in navigator.storage,
      isIndexedDBSupported: typeof indexedDB !== "undefined",
    };
  }

  async getProjectStorageInfo({
    projectId,
  }: {
    projectId: string;
  }): Promise<{ mediaItems: number; hasTimeline: boolean }> {
    const metadata = await mediaMetadataAdapter.loadAllForProject(projectId);
    const timeline = await this.loadTimeline({ projectId });
    return {
      mediaItems: metadata.length,
      hasTimeline: timeline !== null && timeline.length > 0,
    };
  }

  // ============ SOUNDS ============

  async loadSavedSounds(): Promise<SavedSoundsData> {
    return { sounds: [], lastModified: new Date().toISOString() };
  }

  async saveSoundEffect(_sound: SoundEffect): Promise<void> { }
  async removeSavedSound(_id: string): Promise<void> { }
  async isSoundSaved(_id: string): Promise<boolean> {
    return false;
  }
  async clearSavedSounds(): Promise<void> { }

  isFullySupported(): boolean {
    return typeof indexedDB !== "undefined";
  }
}

export const storageService = new StorageService();
export { StorageService };
