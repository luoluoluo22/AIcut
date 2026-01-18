import { TProject, BlurIntensity, Scene } from "@/types/project";
import { create } from "zustand";
import { toast } from "sonner";
import { useMediaStore } from "./media-store";
import { useTimelineStore } from "./timeline-store";
import { useSceneStore } from "./scene-store";
import { generateUUID } from "@/lib/utils";
import { CanvasSize, CanvasMode } from "@/types/editor";

export const DEFAULT_CANVAS_SIZE: CanvasSize = { width: 1920, height: 1080 };
export const DEFAULT_FPS = 30;

export function createMainScene(): Scene {
  return {
    id: generateUUID(),
    name: "Main Scene",
    isMain: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

const createDefaultProject = (name: string): TProject => {
  const mainScene = createMainScene();

  return {
    id: generateUUID(),
    name,
    thumbnail: "",
    createdAt: new Date(),
    updatedAt: new Date(),
    scenes: [mainScene],
    currentSceneId: mainScene.id,
    backgroundColor: "#000000",
    backgroundType: "color",
    blurIntensity: 8,
    bookmarks: [],
    fps: DEFAULT_FPS,
    canvasSize: DEFAULT_CANVAS_SIZE,
    canvasMode: "preset",
  };
};

interface ProjectStore {
  activeProject: TProject | null;
  savedProjects: TProject[];
  isLoading: boolean;
  isInitialized: boolean;
  invalidProjectIds?: Set<string>;

  // Actions
  createNewProject: (name: string) => Promise<string>;
  loadProject: (id: string) => Promise<void>;
  saveCurrentProject: () => Promise<void>;
  loadAllProjects: () => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  closeProject: () => void;
  renameProject: (projectId: string, name: string) => Promise<void>;
  duplicateProject: (projectId: string) => Promise<string>;
  updateProjectBackground: (backgroundColor: string) => Promise<void>;
  updateBackgroundType: (
    type: "color" | "blur",
    options?: { backgroundColor?: string; blurIntensity?: BlurIntensity }
  ) => Promise<void>;
  updateProjectFps: (fps: number) => Promise<void>;
  updateCanvasSize: (size: CanvasSize, mode: CanvasMode) => Promise<void>;
  updateProject: (updates: Partial<TProject>) => Promise<void>;

  // Bookmark methods
  toggleBookmark: (time: number) => Promise<void>;
  isBookmarked: (time: number) => boolean;
  removeBookmark: (time: number) => Promise<void>;

  getFilteredAndSortedProjects: (
    searchQuery: string,
    sortOption: string
  ) => TProject[];

  // Global invalid project ID tracking
  isInvalidProjectId: (id: string) => boolean;
  markProjectIdAsInvalid: (id: string) => void;
  clearInvalidProjectIds: () => void;

  // Save status tracking
  hasUnsavedChanges: boolean;
  autoSaveTimer: NodeJS.Timeout | null;
  markAsUnsaved: () => void;
  markAsSaved: () => void;
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  activeProject: null,
  savedProjects: [],
  isLoading: true,
  isInitialized: false,
  invalidProjectIds: new Set<string>(),
  hasUnsavedChanges: false,
  autoSaveTimer: null,

  markAsUnsaved: () =>
    set((state) => {
      if (state.autoSaveTimer) clearTimeout(state.autoSaveTimer);
      const timer = setTimeout(() => {
        get().saveCurrentProject();
      }, 3000);
      return { hasUnsavedChanges: true, autoSaveTimer: timer };
    }),

  markAsSaved: () =>
    set((state) => {
      if (state.autoSaveTimer) clearTimeout(state.autoSaveTimer);
      return { hasUnsavedChanges: false, autoSaveTimer: null };
    }),

  // Implementation of bookmark methods
  toggleBookmark: async (time: number) => {
    const { activeProject } = get();
    if (!activeProject) return;

    // Round time to the nearest frame
    const fps = activeProject.fps || DEFAULT_FPS;
    const frameTime = Math.round(time * fps) / fps;

    const bookmarks = activeProject.bookmarks || [];
    let updatedBookmarks: number[];

    // Check if already bookmarked
    const bookmarkIndex = bookmarks.findIndex(
      (bookmark) => Math.abs(bookmark - frameTime) < 0.001
    );

    if (bookmarkIndex !== -1) {
      // Remove bookmark
      updatedBookmarks = bookmarks.filter((_, i) => i !== bookmarkIndex);
    } else {
      // Add bookmark
      updatedBookmarks = [...bookmarks, frameTime].sort((a, b) => a - b);
    }

    const updatedProject = {
      ...activeProject,
      bookmarks: updatedBookmarks,
      updatedAt: new Date(),
    };

    try {
      set({ activeProject: updatedProject, hasUnsavedChanges: true });

    } catch (error) {
      console.error("Failed to update project bookmarks:", error);
      toast.error("Failed to update bookmarks", {
        description: "Please try again",
      });
    }
  },

  isBookmarked: (time: number) => {
    const { activeProject } = get();
    if (!activeProject || !activeProject.bookmarks) return false;

    // Round time to the nearest frame
    const fps = activeProject.fps || DEFAULT_FPS;
    const frameTime = Math.round(time * fps) / fps;

    return activeProject.bookmarks.some(
      (bookmark) => Math.abs(bookmark - frameTime) < 0.001
    );
  },

  removeBookmark: async (time: number) => {
    const { activeProject } = get();
    if (!activeProject || !activeProject.bookmarks) return;

    // Round time to the nearest frame
    const fps = activeProject.fps || DEFAULT_FPS;
    const frameTime = Math.round(time * fps) / fps;

    const updatedBookmarks = activeProject.bookmarks.filter(
      (bookmark) => Math.abs(bookmark - frameTime) >= 0.001
    );

    if (updatedBookmarks.length === activeProject.bookmarks.length) {
      // No bookmark found to remove
      return;
    }

    const updatedProject = {
      ...activeProject,
      bookmarks: updatedBookmarks,
      updatedAt: new Date(),
    };

    try {
      set({ activeProject: updatedProject, hasUnsavedChanges: true });

    } catch (error) {
      console.error("Failed to update project bookmarks:", error);
      toast.error("Failed to remove bookmark", {
        description: "Please try again",
      });
    }
  },

  createNewProject: async (baseName: string) => {
    // Generate unique name
    const { savedProjects } = get();
    let name = baseName;
    let counter = 1;
    // Create a set of existing names for faster lookup
    const existingNames = new Set(savedProjects.map(p => p.name));

    // If name exists, try appending number until unique
    while (existingNames.has(name)) {
      name = `${baseName} ${counter}`;
      counter++;
    }

    const newProject = createDefaultProject(name);

    set({ activeProject: newProject });

    const mediaStore = useMediaStore.getState();
    const timelineStore = useTimelineStore.getState();
    const sceneStore = useSceneStore.getState();

    mediaStore.clearAllMedia();
    timelineStore.clearTimeline();

    sceneStore.initializeScenes({
      scenes: newProject.scenes,
      currentSceneId: newProject.currentSceneId,
    });

    try {
      // Reload all projects to update the list


      // Sync new project to file system for AI tools
      try {
        // No need to archive existing project here - it should be handled by save logic or switch logic
        // archiveProject with no args archives whatever is in ai_workspace which might be stale

        // Then update workspace with new project
        await fetch("/api/ai-edit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "updateSnapshot",
            data: {
              project: newProject,
              tracks: [],
              assets: []
            }
          })
        });
        console.log(`[Project Store] Created and synced new project ${newProject.id}`);
      } catch (e) {
        console.warn("[Project Store] Failed to sync new project:", e);
      }

      return newProject.id;
    } catch (error) {
      toast.error("Failed to save new project");
      throw error;
    } finally {
      get().markAsSaved();
    }
  },

  loadProject: async (id: string) => {
    console.log(`[Project Store] ========== loadProject("${id}") START ==========`);

    if (!get().isInitialized) {
      set({ isLoading: true });
    }

    // Prevent flicker when switching projects - clear all stores
    const mediaStore = useMediaStore.getState();
    const timelineStore = useTimelineStore.getState();
    const sceneStore = useSceneStore.getState();

    // Also import and clear media panel state dynamically to avoid circular deps
    const { useMediaPanelStore } = await import("@/components/editor/media-panel/store");
    const mediaPanelStore = useMediaPanelStore.getState();

    console.log(`[Project Store] Clearing stores...`);
    mediaStore.clearAllMedia();
    timelineStore.clearTimeline();
    sceneStore.clearScenes();
    mediaPanelStore.clearSelection();
    mediaPanelStore.setPreviewMedia(null);

    try {
      console.log(`[Project Store] Loading from filesystem via API...`);
      let project = null;

      // Load project from filesystem API
      try {
        const res = await fetch(`/api/ai-edit?action=getSnapshot&projectId=${id}`);
        const data = await res.json();
        console.log(`[Project Store] Filesystem API result:`, data.success ? `Found project` : data.error);
        if (data.success && data.snapshot?.project) {
          // Create project from filesystem snapshot
          const fsProject = data.snapshot.project;
          project = {
            id: fsProject.id || id,
            name: fsProject.name || id,
            thumbnail: fsProject.thumbnail || null,
            createdAt: new Date(fsProject.createdAt || Date.now()),
            updatedAt: new Date(fsProject.updatedAt || Date.now()),
            scenes: fsProject.scenes || [createMainScene()],
            currentSceneId: fsProject.currentSceneId || fsProject.scenes?.[0]?.id || "",
            backgroundColor: fsProject.backgroundColor || "#000000",
            backgroundType: fsProject.backgroundType || "color",
            blurIntensity: fsProject.blurIntensity || 0,
            bookmarks: fsProject.bookmarks || [],
            fps: fsProject.fps || 30,
            canvasSize: fsProject.canvasSize || { width: 1920, height: 1080 },
            canvasMode: fsProject.canvasMode || "preset",
          };
          console.log(`[Project Store] Loaded project ${id} from filesystem`);
        }
      } catch (e) {
        console.warn("[Project Store] Failed to load from filesystem:", e);
      }

      if (project) {
        console.log(`[Project Store] Setting activeProject to: ${project.id} ("${project.name}")`);
        set({ activeProject: project });

        let currentScene = null;
        if (project.scenes && project.scenes.length > 0) {
          sceneStore.initializeScenes({
            scenes: project.scenes,
            currentSceneId: project.currentSceneId,
          });
          // Get current scene directly from project data (don't rely on store state)
          currentScene =
            project.scenes.find((s) => s.id === project.currentSceneId) ||
            project.scenes.find((s) => s.isMain) ||
            project.scenes[0];
        }

        console.log(`[Project Store] Loading media and timeline from IndexedDB...`);
        await Promise.all([
          mediaStore.loadProjectMedia(id),
          timelineStore.loadProjectTimeline({
            projectId: id,
            sceneId: currentScene?.id,
          }),
        ]);
        console.log(`[Project Store] Media loaded: ${mediaStore.mediaFiles.length} files, Tracks: ${timelineStore.tracks.length}`);
      } else {
        throw new Error(`Project with id ${id} not found`);
      }
    } catch (error) {
      console.error("[Project Store] Failed to load project:", error);
      throw error; // Re-throw so the editor page can handle it
    } finally {
      set({ isLoading: false });

      // Sync to ai_workspace for AI tools
      const loadedProject = get().activeProject;
      console.log(`[Project Store] In finally block, activeProject: ${loadedProject?.id || "null"}`);
      if (loadedProject) {
        try {
          console.log(`[Project Store] Calling switchProject API for: ${loadedProject.id}`);
          await fetch("/api/ai-edit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "switchProject",
              data: { projectId: loadedProject.id }
            })
          });
          console.log(`[Project Store] ========== loadProject("${loadedProject.id}") COMPLETE ==========`);
        } catch (e) {
          console.warn("[Project Store] Failed to sync to ai_workspace:", e);
        }
      }
      get().markAsSaved();
    }
  },

  saveCurrentProject: async () => {
    const { activeProject } = get();
    if (!activeProject) return;

    try {
      const timelineStore = useTimelineStore.getState();
      const sceneStore = useSceneStore.getState();
      const currentScene = sceneStore.currentScene;

      // 1. First save timeline (no-op now but kept for compatibility)
      await Promise.all([
        timelineStore.saveProjectTimeline({
          projectId: activeProject.id,
          sceneId: currentScene?.id,
        }),
      ]);

      // 2. Sync current project state to workspace snapshot
      //    This ensures project name changes are reflected in the file
      try {
        const cleanTracks = timelineStore.tracks.filter(t =>
          t.name !== "AI 语音 (生成中...)" && t.name !== "AI 字幕 (生成中...)"
        );

        await fetch("/api/ai-edit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "saveSnapshot",
            data: {
              project: activeProject,
              tracks: cleanTracks,
              // media/assets are managed separately
            }
          })
        });
      } catch (e) {
        console.warn("[Project Store] Failed to sync snapshot:", e);
      }

      // 3. Archive to projects/ directory for AI tools
      try {
        await fetch("/api/ai-edit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "archiveProject",
            data: { projectId: activeProject.id }
          })
        });
        console.log(`[Project Store] Archived project ${activeProject.id} to projects/`);
      } catch (e) {
        console.warn("[Project Store] Failed to archive project:", e);
      }
      get().markAsSaved();
    } catch (error) {
      console.error("Failed to save project:", error);
    }
  },

  loadAllProjects: async () => {
    if (!get().isInitialized) {
      set({ isLoading: true });
    }

    try {
      // Load projects directly from filesystem
      const res = await fetch("/api/ai-edit?action=listProjects");
      const data = await res.json();

      if (data.success && Array.isArray(data.projects)) {
        const projects = data.projects.map((fp: any) => ({
          id: fp.id,
          name: fp.name,
          thumbnail: fp.thumbnail || null,
          createdAt: new Date(fp.createdAt || Date.now()),
          updatedAt: new Date(fp.updatedAt || Date.now()),
          scenes: [],
          currentSceneId: "",
          backgroundColor: "#000000",
          backgroundType: "color" as const,
          blurIntensity: 0,
          bookmarks: [],
          fps: 30,
          canvasSize: { width: 1920, height: 1080 },
          canvasMode: "preset" as const,
        }));

        set({ savedProjects: projects });
      }
    } catch (error) {
      console.error("Failed to load projects:", error);
      set({ savedProjects: [] });
    } finally {
      set({ isLoading: false, isInitialized: true });
    }
  },

  deleteProject: async (id: string) => {
    try {
      // Check if we're deleting the active project before making the API call
      const { activeProject } = get();
      const isDeletingActive = activeProject?.id === id;

      // Delete from filesystem via API
      await fetch("/api/ai-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deleteProject", data: { projectId: id } })
      });

      // If deleted active project, close it and clear data
      if (isDeletingActive) {
        set({ activeProject: null });
        const mediaStore = useMediaStore.getState();
        const timelineStore = useTimelineStore.getState();
        const sceneStore = useSceneStore.getState();

        mediaStore.clearAllMedia();
        timelineStore.clearTimeline();
        sceneStore.clearScenes();

        toast.info("项目已删除，正在返回项目列表...");

        // Redirect to projects page (this will be handled by the component that calls deleteProject)
        // We use a small delay to let the toast appear
        setTimeout(() => {
          window.location.href = "/projects";
        }, 500);
      }

      await get().loadAllProjects(); // Refresh the list
    } catch (error) {
      console.error("Failed to delete project:", error);
      toast.error("删除项目失败");
    }
  },

  closeProject: () => {
    set({ activeProject: null });

    const mediaStore = useMediaStore.getState();
    const timelineStore = useTimelineStore.getState();
    const sceneStore = useSceneStore.getState();

    mediaStore.clearAllMedia();
    timelineStore.clearTimeline();
    sceneStore.clearScenes();
  },

  renameProject: async (id: string, name: string) => {
    const { activeProject } = get();

    // Only allow renaming active project for now (to keep it simple)
    if (!activeProject || activeProject.id !== id) {
      toast.error("Please open the project first");
      return;
    }

    const updatedProject = {
      ...activeProject,
      name,
      updatedAt: new Date(),
    };

    try {
      set({ activeProject: updatedProject, hasUnsavedChanges: true });
      await get().saveCurrentProject();

      // Refresh project list to show new name
      await get().loadAllProjects();

      toast.success("项目已重命名");
    } catch (error) {
      console.error("Failed to rename project:", error);
      toast.error("重命名失败", {
        description:
          error instanceof Error ? error.message : "请重试",
      });
    }
  },

  duplicateProject: async (projectId: string) => {
    try {
      // Load project from filesystem API
      const res = await fetch(`/api/ai-edit?action=getSnapshot&projectId=${projectId}`);
      const data = await res.json();
      if (!data.success || !data.snapshot?.project) {
        toast.error("Project not found", {
          description: "Please try again",
        });
        throw new Error("Project not found");
      }
      const project = data.snapshot.project;

      const { savedProjects } = get();

      // Extract the base name (remove any existing numbering)
      const numberMatch = project.name.match(/^\((\d+)\)\s+(.+)$/);
      const baseName = numberMatch ? numberMatch[2] : project.name;
      const existingNumbers: number[] = [];

      // Check for pattern "(number) baseName" in existing projects
      savedProjects.forEach((p) => {
        const match = p.name.match(/^\((\d+)\)\s+(.+)$/);
        if (match && match[2] === baseName) {
          existingNumbers.push(parseInt(match[1], 10));
        }
      });

      const nextNumber =
        existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;

      const newProject: TProject = {
        ...project,
        id: generateUUID(),
        name: `(${nextNumber}) ${baseName}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };


      return newProject.id;
    } catch (error) {
      console.error("Failed to duplicate project:", error);
      toast.error("Failed to duplicate project", {
        description:
          error instanceof Error ? error.message : "Please try again",
      });
      throw error;
    }
  },

  updateProjectBackground: async (backgroundColor: string) => {
    const { activeProject } = get();
    if (!activeProject) return;

    const updatedProject = {
      ...activeProject,
      backgroundColor,
      updatedAt: new Date(),
    };

    try {
      set({ activeProject: updatedProject, hasUnsavedChanges: true });

    } catch (error) {
      console.error("Failed to update project background:", error);
      toast.error("Failed to update background", {
        description: "Please try again",
      });
    }
  },

  updateBackgroundType: async (
    type: "color" | "blur",
    options?: { backgroundColor?: string; blurIntensity?: BlurIntensity }
  ) => {
    const { activeProject } = get();
    if (!activeProject) return;

    const updatedProject = {
      ...activeProject,
      backgroundType: type,
      ...(options?.backgroundColor && {
        backgroundColor: options.backgroundColor,
      }),
      ...(options?.blurIntensity !== undefined && {
        blurIntensity: options.blurIntensity,
      }),
      updatedAt: new Date(),
    };

    try {
      set({ activeProject: updatedProject, hasUnsavedChanges: true });

    } catch (error) {
      console.error("Failed to update background type:", error);
      toast.error("Failed to update background", {
        description: "Please try again",
      });
    }
  },

  updateProjectFps: async (fps: number) => {
    const { activeProject } = get();
    if (!activeProject) return;

    const updatedProject = {
      ...activeProject,
      fps,
      updatedAt: new Date(),
    };

    try {
      set({ activeProject: updatedProject, hasUnsavedChanges: true });

    } catch (error) {
      console.error("Failed to update project FPS:", error);
      toast.error("Failed to update project FPS", {
        description: "Please try again",
      });
    }
  },

  updateCanvasSize: async (size: CanvasSize, mode: CanvasMode) => {
    const { activeProject } = get();
    if (!activeProject) return;

    const updatedProject = {
      ...activeProject,
      canvasSize: size,
      canvasMode: mode,
      updatedAt: new Date(),
    };

    try {
      set({ activeProject: updatedProject, hasUnsavedChanges: true });

    } catch (error) {
      console.error("Failed to update canvas size:", error);
      toast.error("Failed to update canvas size", {
        description: "Please try again",
      });
    }
  },

  updateProject: async (updates: Partial<TProject>) => {
    const { activeProject } = get();
    if (!activeProject) return;

    const updatedProject = { ...activeProject, ...updates };
    set({ activeProject: updatedProject, hasUnsavedChanges: true });

    // Archive to project directory immediately for important settings
    try {
      await fetch("/api/ai-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateSnapshot",
          data: { project: updatedProject }
        })
      });

      // Also archive to project directory
      await fetch("/api/ai-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "archiveProject",
          data: { projectId: activeProject.id }
        })
      });

      console.log("[Project Store] Project settings updated and archived");
    } catch (e) {
      console.error("[Project Store] Failed to archive project settings:", e);
    }
  },

  getFilteredAndSortedProjects: (searchQuery: string, sortOption: string) => {
    const { savedProjects } = get();

    const filteredProjects = savedProjects.filter((project) =>
      project.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const sortedProjects = [...filteredProjects].sort((a, b) => {
      const [key, order] = sortOption.split("-");

      if (key !== "createdAt" && key !== "name") {
        console.warn(`Invalid sort key: ${key}`);
        return 0;
      }

      const aValue = a[key];
      const bValue = b[key];

      if (aValue === undefined || bValue === undefined) return 0;

      if (order === "asc") {
        if (aValue < bValue) return -1;
        if (aValue > bValue) return 1;
        return 0;
      }
      if (aValue > bValue) return -1;
      if (aValue < bValue) return 1;
      return 0;
    });

    return sortedProjects;
  },

  // Global invalid project ID tracking
  isInvalidProjectId: (id: string) => {
    const invalidIds = get().invalidProjectIds || new Set();
    return invalidIds.has(id);
  },

  markProjectIdAsInvalid: (id: string) => {
    set((state) => ({
      invalidProjectIds: new Set([
        ...(state.invalidProjectIds || new Set()),
        id,
      ]),
    }));
  },

  clearInvalidProjectIds: () => {
    set({ invalidProjectIds: new Set() });
  },
}));
