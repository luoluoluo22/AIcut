"use client";

import { useDragDrop } from "@/hooks/use-drag-drop";
import { processMediaFiles } from "@/lib/media-processing";
import { useMediaStore } from "@/stores/media-store";
import { MediaFile } from "@/types/media";
import {
  ArrowDown01,
  CloudUpload,
  Grid2X2,
  Image,
  List,
  Loader2,
  Music,
  Video,
} from "lucide-react";
import { generateThumbnail, getVideoInfo } from "@/lib/mediabunny-utils";
import { useRef, useState, useMemo } from "react";
import { Sparkles, Video as VideoIcon } from "lucide-react";
import { GenerateImageDialog } from "../dialogs/generate-image-dialog";
import { GenerateVideoDialog } from "../dialogs/generate-video-dialog";
import { useHighlightScroll } from "@/hooks/use-highlight-scroll";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MediaDragOverlay } from "@/components/editor/media-panel/drag-overlay";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DraggableMediaItem } from "@/components/ui/draggable-item";
import { useProjectStore } from "@/stores/project-store";
import { useTimelineStore } from "@/stores/timeline-store";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePanelStore } from "@/stores/panel-store";
import { useMediaPanelStore } from "../store";

function MediaItemWithContextMenu({
  item,
  children,
  onRemove,
}: {
  item: MediaFile;
  children: React.ReactNode;
  onRemove: (e: React.MouseEvent, id: string) => Promise<void>;
}) {
  return (
    <ContextMenu>
      <ContextMenuTrigger>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem>Export clips</ContextMenuItem>
        <ContextMenuItem
          variant="destructive"
          onClick={(e) => onRemove(e, item.id)}
        >
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

export function MediaView() {
  const { mediaFiles, addMediaFile, removeMediaFile } = useMediaStore();
  const { activeProject } = useProjectStore();
  const { mediaViewMode, setMediaViewMode } = usePanelStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [sortBy, setSortBy] = useState<"name" | "type" | "duration" | "size">(
    "name"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const {
    highlightMediaId,
    clearHighlight,
    selectMedia,
    setPreviewMedia,
    isSelected
  } = useMediaPanelStore();
  const { highlightedId, registerElement } = useHighlightScroll(
    highlightMediaId,
    clearHighlight
  );

  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [isVideoGenerateOpen, setIsVideoGenerateOpen] = useState(false);

  const handleGenerateVideo = async (data: { mode: 'text' | 'image', prompt: string, image?: File }) => {
    if (!activeProject) {
      toast.error("请先打开一个项目");
      return;
    }

    try {
      const formData = new FormData();
      formData.append('mode', data.mode);
      formData.append('prompt', data.prompt);
      if (data.image) formData.append('image', data.image);

      const response = await fetch('/api/generate-video', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || '视频生成请求失败');
      }

      const result = await response.json();

      // Fetch the generated video as blob
      const res = await fetch(result.url);
      const blob = await res.blob();
      const file = new File([blob], result.name, { type: "video/mp4" });

      setIsProcessing(true);
      try {
        const { processMediaFiles } = await import("@/lib/media-processing");
        const processedFiles = await processMediaFiles([file], (p) => setProgress(p));

        for (const mediaFile of processedFiles) {
          await addMediaFile(activeProject.id, mediaFile);
        }
        toast.success("AI 视频生成成功");
      } finally {
        setIsProcessing(false);
        setProgress(0);
      }

    } catch (error) {
      console.error(error);
      toast.error("视频生成失败: " + (error instanceof Error ? error.message : "未知错误"));
      throw error;
    }
  };

  const handleGenerateImage = async (prompt: string) => {
    if (!activeProject) {
      toast.error("请先打开一个项目");
      return;
    }
    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Generation failed');
      }

      const data = await response.json();

      // Fetch the generated image as blob to create a File object
      const res = await fetch(data.url);
      const blob = await res.blob();
      const file = new File([blob], `ai-generated-${Date.now()}.png`, { type: "image/png" });

      setIsProcessing(true);
      try {
        // Dynamically import processMediaFiles to avoid circular dependencies if any
        const { processMediaFiles } = await import("@/lib/media-processing");
        // Parameter fixed: processMediaFiles takes (files, onProgress)
        const processedFiles = await processMediaFiles([file], (p) => setProgress(p));

        for (const mediaFile of processedFiles) {
          await addMediaFile(activeProject.id, mediaFile);
        }
        toast.success("AI 图片生成成功");
      } finally {
        setIsProcessing(false);
        setProgress(0);
      }

    } catch (error) {
      console.error(error);
      toast.error("Generation failed: " + (error instanceof Error ? error.message : "Unknown error"));
      throw error;
    }
  };

  const processFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    if (!activeProject) {
      toast.error("No active project");
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    try {
      const fileArray = Array.from(files);
      const total = fileArray.length;

      for (let i = 0; i < total; i++) {
        const file = fileArray[i];
        console.log(`[Upload] Processing and uploading ${file.name}...`);

        // --- NEW: Check for existing file with same name and cleanup ---
        const existingAsset = mediaFiles.find(a => a.name === file.name);
        if (existingAsset) {
          console.log(`[Upload] File ${file.name} already exists. Cleaning up old version...`);
          await fetch(`/api/media/delete-local?id=${existingAsset.id}`, { method: 'DELETE' });
          // Wait a bit for file system to settle
          await new Promise(r => setTimeout(r, 100));
        }

        // 1. Generate local metadata first (quick browser native)
        let thumbnail = "";
        let width = 0;
        let height = 0;
        let duration = 0;

        try {
          if (file.type.startsWith("video/")) {
            const info = await getVideoInfo(file);
            width = info.width;
            height = info.height;
            duration = info.duration;
            thumbnail = await generateThumbnail(file, 0.5);
          } else if (file.type.startsWith("image/")) {
            const { getImageDimensions } = await import("@/stores/media-store");
            const dim = await getImageDimensions(file);
            width = dim.width;
            height = dim.height;
          } else if (file.type.startsWith("audio/")) {
            const { getMediaDuration } = await import("@/stores/media-store");
            duration = await getMediaDuration(file);
          }
        } catch (e) {
          console.warn("Failed to extract metadata for upload, continuing anyway", e);
        }

        // 2. Upload to local server via FormData
        const formData = new FormData();
        formData.append("file", file);
        if (thumbnail) formData.append("thumbnail", thumbnail);
        formData.append("width", String(width));
        formData.append("height", String(height));
        formData.append("duration", String(duration));

        const response = await fetch("/api/media/upload-local", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Upload failed for ${file.name}`);
        }

        setProgress(Math.round(((i + 1) / total) * 100));
      }

      toast.success("Files uploaded to local materials folder");
      // Note: We don't call addMediaFile here! 
      // The AI Sync logic (SSE) will detect the new assets in project-snapshot.json 
      // and update the MediaStore automatically with the correct local URLs.
    } catch (error) {
      console.error("Error uploading files:", error);
      toast.error("Failed to upload files to local folder");
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const { isDragOver, dragProps } = useDragDrop({
    // When files are dropped, process them
    onDrop: processFiles,
  });

  const handleFileSelect = () => fileInputRef.current?.click(); // Open file picker

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(e.target.files);
    e.target.value = ""; // Reset input
  };

  const handleRemove = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();

    if (!activeProject) {
      toast.error("No active project");
      return;
    }

    try {
      console.log(`[Media View] Deleting asset ${id} and its physical file...`);
      const response = await fetch(`/api/media/delete-local?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error("Failed to delete local file");
      }

      toast.success("Asset and physical file deleted");
      // Note: We don't call removeMediaFile manually here!
      // The SSE snapshot_update will automatically remove it from MediaStore
    } catch (error) {
      console.error("Error deleting asset:", error);
      toast.error("Failed to delete file");
    }
  };

  const handleItemClick = (e: React.MouseEvent, item: MediaFile) => {
    e.stopPropagation();

    // Select the item
    selectMedia(item.id, {
      ctrl: e.ctrlKey || e.metaKey,
      shift: e.shiftKey,
      allIds: filteredMediaItems.map(m => m.id)
    });

    // Always set as preview when clicked
    setPreviewMedia(item);
  };

  const formatDuration = (duration: number) => {
    // Format seconds as mm:ss
    const min = Math.floor(duration / 60);
    const sec = Math.floor(duration % 60);
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  const filteredMediaItems = useMemo(() => {
    let filtered = mediaFiles.filter((item) => {
      if (item.ephemeral) return false;
      return true;
    });

    filtered.sort((a, b) => {
      let valueA: string | number;
      let valueB: string | number;

      switch (sortBy) {
        case "name":
          valueA = a.name.toLowerCase();
          valueB = b.name.toLowerCase();
          break;
        case "type":
          valueA = a.type;
          valueB = b.type;
          break;
        case "duration":
          valueA = a.duration || 0;
          valueB = b.duration || 0;
          break;
        case "size":
          valueA = a.file.size;
          valueB = b.file.size;
          break;
        default:
          return 0;
      }

      if (valueA < valueB) return sortOrder === "asc" ? -1 : 1;
      if (valueA > valueB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [mediaFiles, sortBy, sortOrder]);

  const previewComponents = useMemo(() => {
    const previews = new Map<string, React.ReactNode>();

    filteredMediaItems.forEach((item) => {
      let preview: React.ReactNode;

      if (item.type === "image") {
        preview = (
          <div className="w-full h-full flex items-center justify-center">
            <img
              src={item.url}
              alt={item.name}
              className="w-full max-h-full object-cover"
              loading="lazy"
            />
          </div>
        );
      } else if (item.type === "video") {
        if (item.thumbnailUrl) {
          preview = (
            <div className="relative w-full h-full">
              <img
                src={item.thumbnailUrl}
                alt={item.name}
                className="w-full h-full object-cover rounded"
                loading="lazy"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded">
                <Video className="h-6 w-6 text-white drop-shadow-md" />
              </div>
              {item.duration && (
                <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1 rounded">
                  {formatDuration(item.duration)}
                </div>
              )}
            </div>
          );
        } else {
          preview = (
            <div className="w-full h-full bg-muted/30 flex flex-col items-center justify-center text-muted-foreground rounded">
              <Video className="h-6 w-6 mb-1" />
              <span className="text-xs">Video</span>
              {item.duration && (
                <span className="text-xs opacity-70">
                  {formatDuration(item.duration)}
                </span>
              )}
            </div>
          );
        }
      } else if (item.type === "audio") {
        preview = (
          <div className="w-full h-full bg-linear-to-br from-green-500/20 to-emerald-500/20 flex flex-col items-center justify-center text-muted-foreground rounded border border-green-500/20">
            <Music className="h-6 w-6 mb-1" />
            <span className="text-xs">Audio</span>
            {item.duration && (
              <span className="text-xs opacity-70">
                {formatDuration(item.duration)}
              </span>
            )}
          </div>
        );
      } else {
        preview = (
          <div className="w-full h-full bg-muted/30 flex flex-col items-center justify-center text-muted-foreground rounded">
            <Image className="h-6 w-6" />
            <span className="text-xs mt-1">Unknown</span>
          </div>
        );
      }

      previews.set(item.id, preview);
    });

    return previews;
  }, [filteredMediaItems]);

  const renderPreview = (item: MediaFile) => previewComponents.get(item.id);

  return (
    <>
      <GenerateImageDialog
        open={isGenerateDialogOpen}
        onOpenChange={setIsGenerateDialogOpen}
        onGenerate={handleGenerateImage}
      />
      {/* Hidden file input for uploading media */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*,audio/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      <div
        className={`h-full flex flex-col gap-1 transition-colors relative ${isDragOver ? "bg-accent/30" : ""}`}
        {...dragProps}
      >
        <div className="p-3 pb-2 bg-panel">
          {/* Search and filter controls */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 flex-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleFileSelect}
                disabled={isProcessing}
                className="!bg-background px-3 justify-center items-center h-9 opacity-100 hover:opacity-75 transition-opacity"
                title="Upload files"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CloudUpload className="h-4 w-4" />
                )}
              </Button>

              <Button
                size="sm"
                onClick={() => setIsGenerateDialogOpen(true)}
                disabled={isProcessing}
                className="flex-1 h-9 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white border-0 shadow-sm transition-all"
              >
                <Sparkles className="h-3.5 w-3.5 mr-2" />
                AI Image
              </Button>

              <Button
                size="sm"
                onClick={() => setIsVideoGenerateOpen(true)}
                disabled={isProcessing}
                className="flex-1 h-9 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white border-0 shadow-sm transition-all ml-[-4px]"
              >
                <VideoIcon className="h-3.5 w-3.5 mr-2" />
                AI Video
              </Button>
            </div>
            <div className="flex items-center gap-0">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="text"
                      onClick={() =>
                        setMediaViewMode(
                          mediaViewMode === "grid" ? "list" : "grid"
                        )
                      }
                      disabled={isProcessing}
                      className="justify-center items-center"
                    >
                      {mediaViewMode === "grid" ? (
                        <List strokeWidth={1.5} className="!size-[1.05rem]" />
                      ) : (
                        <Grid2X2
                          strokeWidth={1.5}
                          className="!size-[1.05rem]"
                        />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {mediaViewMode === "grid"
                        ? "Switch to list view"
                        : "Switch to grid view"}
                    </p>
                  </TooltipContent>
                  <Tooltip>
                    <DropdownMenu>
                      <TooltipTrigger asChild>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="icon"
                            variant="text"
                            disabled={isProcessing}
                            className="justify-center items-center"
                          >
                            <ArrowDown01
                              strokeWidth={1.5}
                              className="!size-[1.05rem]"
                            />
                          </Button>
                        </DropdownMenuTrigger>
                      </TooltipTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            if (sortBy === "name") {
                              setSortOrder(
                                sortOrder === "asc" ? "desc" : "asc"
                              );
                            } else {
                              setSortBy("name");
                              setSortOrder("asc");
                            }
                          }}
                        >
                          Name{" "}
                          {sortBy === "name" &&
                            (sortOrder === "asc" ? "↑" : "↓")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            if (sortBy === "type") {
                              setSortOrder(
                                sortOrder === "asc" ? "desc" : "asc"
                              );
                            } else {
                              setSortBy("type");
                              setSortOrder("asc");
                            }
                          }}
                        >
                          Type{" "}
                          {sortBy === "type" &&
                            (sortOrder === "asc" ? "↑" : "↓")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            if (sortBy === "duration") {
                              setSortOrder(
                                sortOrder === "asc" ? "desc" : "asc"
                              );
                            } else {
                              setSortBy("duration");
                              setSortOrder("asc");
                            }
                          }}
                        >
                          Duration{" "}
                          {sortBy === "duration" &&
                            (sortOrder === "asc" ? "↑" : "↓")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            if (sortBy === "size") {
                              setSortOrder(
                                sortOrder === "asc" ? "desc" : "asc"
                              );
                            } else {
                              setSortBy("size");
                              setSortOrder("asc");
                            }
                          }}
                        >
                          File Size{" "}
                          {sortBy === "size" &&
                            (sortOrder === "asc" ? "↑" : "↓")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <TooltipContent>
                      <p>
                        Sort by {sortBy} (
                        {sortOrder === "asc" ? "ascending" : "descending"})
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>

        <div className="h-full w-full overflow-y-auto scrollbar-thin pt-1">
          <div className="flex-1 p-3 pt-0 w-full">
            {isDragOver || filteredMediaItems.length === 0 ? (
              <MediaDragOverlay
                isVisible={true}
                isProcessing={isProcessing}
                progress={progress}
                onClick={handleFileSelect}
                isEmptyState={filteredMediaItems.length === 0 && !isDragOver}
              />
            ) : mediaViewMode === "grid" ? (
              <GridView
                filteredMediaItems={filteredMediaItems}
                renderPreview={renderPreview}
                handleRemove={handleRemove}
                highlightedId={highlightedId}
                registerElement={registerElement}
                onItemClick={handleItemClick}
                isSelected={isSelected}
              />
            ) : (
              <ListView
                filteredMediaItems={filteredMediaItems}
                renderPreview={renderPreview}
                handleRemove={handleRemove}
                highlightedId={highlightedId}
                registerElement={registerElement}
                onItemClick={handleItemClick}
                isSelected={isSelected}
              />
            )}
          </div>
        </div>
      </div>

      <GenerateImageDialog
        open={isGenerateDialogOpen}
        onOpenChange={setIsGenerateDialogOpen}
        onGenerate={handleGenerateImage}
      />

      <GenerateVideoDialog
        open={isVideoGenerateOpen}
        onOpenChange={setIsVideoGenerateOpen}
        onGenerate={handleGenerateVideo}
      />
    </>
  );
}

function GridView({
  filteredMediaItems,
  renderPreview,
  handleRemove,
  highlightedId,
  registerElement,
  onItemClick,
  isSelected,
}: {
  filteredMediaItems: MediaFile[];
  renderPreview: (item: MediaFile) => React.ReactNode;
  handleRemove: (e: React.MouseEvent, id: string) => Promise<void>;
  highlightedId: string | null;
  registerElement: (id: string, element: HTMLElement | null) => void;
  onItemClick: (e: React.MouseEvent, item: MediaFile) => void;
  isSelected: (id: string) => boolean;
}) {
  const { addElementAtTime } = useTimelineStore();

  return (
    <div
      className="grid gap-2"
      style={{
        gridTemplateColumns: "repeat(auto-fill, 160px)",
      }}
    >
      {filteredMediaItems.map((item) => (
        <div key={item.id} ref={(el) => registerElement(item.id, el)}>
          <MediaItemWithContextMenu item={item} onRemove={handleRemove}>
            <DraggableMediaItem
              name={item.name}
              preview={renderPreview(item)}
              dragData={{
                id: item.id,
                type: item.type,
                name: item.name,
              }}
              showPlusOnDrag={false}
              onAddToTimeline={(currentTime) =>
                addElementAtTime(item, currentTime)
              }
              rounded={false}
              variant="card"
              isHighlighted={highlightedId === item.id}
              isSelected={isSelected(item.id)}
              onClick={(e) => onItemClick(e, item)}
            />
          </MediaItemWithContextMenu>
        </div>
      ))}
    </div>
  );
}

function ListView({
  filteredMediaItems,
  renderPreview,
  handleRemove,
  highlightedId,
  registerElement,
  onItemClick,
  isSelected,
}: {
  filteredMediaItems: MediaFile[];
  renderPreview: (item: MediaFile) => React.ReactNode;
  handleRemove: (e: React.MouseEvent, id: string) => Promise<void>;
  highlightedId: string | null;
  registerElement: (id: string, element: HTMLElement | null) => void;
  onItemClick: (e: React.MouseEvent, item: MediaFile) => void;
  isSelected: (id: string) => boolean;
}) {
  const { addElementAtTime } = useTimelineStore();

  return (
    <div className="space-y-1">
      {filteredMediaItems.map((item) => (
        <div key={item.id} ref={(el) => registerElement(item.id, el)}>
          <MediaItemWithContextMenu item={item} onRemove={handleRemove}>
            <DraggableMediaItem
              name={item.name}
              preview={renderPreview(item)}
              dragData={{
                id: item.id,
                type: item.type,
                name: item.name,
              }}
              showPlusOnDrag={false}
              onAddToTimeline={(currentTime) =>
                addElementAtTime(item, currentTime)
              }
              variant="compact"
              isHighlighted={highlightedId === item.id}
              isSelected={isSelected(item.id)}
              onClick={(e) => onItemClick(e, item)}
            />
          </MediaItemWithContextMenu>
        </div>
      ))}
    </div>
  );
}
