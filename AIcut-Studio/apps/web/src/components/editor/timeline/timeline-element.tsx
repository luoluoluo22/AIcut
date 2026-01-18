"use client";

import {
  Scissors,
  Trash2,
  Copy,
  Search,
  RefreshCw,
  EyeOff,
  Eye,
  Volume2,
  VolumeX,
  Type,
  Wand2,
  Mic,
} from "lucide-react";
import { useMediaStore } from "@/stores/media-store";
import { useTimelineStore } from "@/stores/timeline-store";
import { usePlaybackStore } from "@/stores/playback-store";
import AudioWaveform from "../audio-waveform";
import { toast } from "sonner";
import { TimelineElementProps, MediaElement } from "@/types/timeline";
import { useTimelineElementResize } from "@/hooks/use-timeline-element-resize";
import {
  getTrackElementClasses,
  TIMELINE_CONSTANTS,
  getTrackHeight,
} from "@/constants/timeline-constants";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "../../ui/context-menu";
import { useMediaPanelStore } from "../media-panel/store";

export function TimelineElement({
  element,
  track,
  zoomLevel,
  isSelected,
  onElementMouseDown,
  onElementClick,
}: TimelineElementProps) {
  const { mediaFiles } = useMediaStore();
  const {
    dragState,
    copySelected,
    selectedElements,
    deleteSelected,
    splitSelected,
    toggleSelectedHidden,
    toggleSelectedMuted,
    duplicateElement,
    revealElementInMedia,
    replaceElementWithFile,
    getContextMenuState,
    addTrack,
    updateTrack,
    addElementToTrack,
  } = useTimelineStore();
  const { currentTime } = usePlaybackStore();

  const mediaItem =
    element.type === "media"
      ? mediaFiles.find((file) => file.id === element.mediaId)
      : null;
  const hasAudio = mediaItem?.type === "audio" || mediaItem?.type === "video";

  const { resizing, handleResizeStart, handleResizeMove, handleResizeEnd } =
    useTimelineElementResize({
      element,
      track,
      zoomLevel,
    });

  const {
    isMultipleSelected,
    isCurrentElementSelected,
    hasAudioElements,
    canSplitSelected,
  } = getContextMenuState(track.id, element.id);

  const effectiveDuration =
    element.duration - element.trimStart - element.trimEnd;
  const elementWidth = Math.max(
    TIMELINE_CONSTANTS.ELEMENT_MIN_WIDTH,
    effectiveDuration * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel
  );

  const isBeingDragged = dragState.elementId === element.id;
  const elementStartTime =
    isBeingDragged && dragState.isDragging
      ? dragState.currentTime
      : element.startTime;

  const elementLeft = elementStartTime * 50 * zoomLevel;

  const handleElementSplitContext = (e: React.MouseEvent) => {
    e.stopPropagation();
    splitSelected(
      currentTime,
      isMultipleSelected && isCurrentElementSelected ? undefined : track.id,
      isMultipleSelected && isCurrentElementSelected ? undefined : element.id
    );
  };

  const handleElementDuplicateContext = (e: React.MouseEvent) => {
    e.stopPropagation();
    duplicateElement(track.id, element.id);
  };

  const handleElementCopyContext = (e: React.MouseEvent) => {
    e.stopPropagation();
    copySelected();
  };

  const handleElementDeleteContext = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteSelected(
      isMultipleSelected && isCurrentElementSelected ? undefined : track.id,
      isMultipleSelected && isCurrentElementSelected ? undefined : element.id
    );
  };

  const handleToggleElementContext = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (hasAudio && element.type === "media") {
      toggleSelectedMuted(
        isMultipleSelected && isCurrentElementSelected ? undefined : track.id,
        isMultipleSelected && isCurrentElementSelected ? undefined : element.id
      );
    } else {
      toggleSelectedHidden(
        isMultipleSelected && isCurrentElementSelected ? undefined : track.id,
        isMultipleSelected && isCurrentElementSelected ? undefined : element.id
      );
    }
  };

  const handleReplaceClip = (e: React.MouseEvent) => {
    e.stopPropagation();

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "video/*,audio/*,image/*";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        await replaceElementWithFile(track.id, element.id, file);
      }
    };
    input.click();
  };

  const handleRevealInMedia = (e: React.MouseEvent) => {
    e.stopPropagation();
    revealElementInMedia(element.id);
  };

  const handleRecognizeSubtitles = async (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log("[AI Edit] handleRecognizeSubtitles triggered", {
      elementId: element.id,
      mediaId: (element as MediaElement).mediaId,
      mediaName: mediaItem?.name || element.name || (element as any).content || "未知素材"
    });
    toast.info("正在调起 AI 字幕识别服务...");

    // 1. 先触发一次快照保存，确保 AI 助手拿到最新状态 (包括 trim)
    try {
      const currentState = useTimelineStore.getState();

      await fetch("/api/ai-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateSnapshot",
          data: currentState
        })
      });
    } catch (e) { console.warn("Snapshot save failed:", e); }

    // 0. 添加 "Loading Placeholder" - 给用户即时反馈
    try {
      const effectiveDuration = element.duration - element.trimStart - element.trimEnd;
      // 创建临时轨道
      const placeholderTrackId = addTrack("text");
      updateTrack(placeholderTrackId, { name: "AI 字幕 (生成中...)" });

      // 添加 Loading 文本
      addElementToTrack(placeholderTrackId, {
        type: "text",
        content: "⏳ 正在识别字幕...",
        startTime: element.startTime,
        duration: effectiveDuration,
        trimStart: 0,
        trimEnd: 0,
        // 样式: 半透明背景，居中
        fontSize: 40,
        fontFamily: "Arial",
        color: "#ffffff",
        backgroundColor: "#000000aa",
        textAlign: "center",
        x: 960,
        y: 850, // 稍微靠下
        scale: 1,
        rotation: 0,
        opacity: 0.8,
        fontWeight: "normal",
        fontStyle: "normal",
        textDecoration: "none",
        voiceId: undefined
      });
    } catch (e) {
      console.warn("Failed to create placeholder:", e);
    }

    try {
      // 2. 请求任务
      await fetch("/api/ai-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "requestTask",
          data: {
            taskType: "subtitle_generation",
            elementId: element.id,
            mediaId: (element as MediaElement).mediaId,
            mediaName: mediaItem?.name || element.name || (element as any).content || "未知素材"
          }
        })
      });
      toast.success("识别请求已发送，请关注后台进度");
    } catch (err) {
      toast.error("发送失败，请检查服务连接");
    }
  };

  const handleGenerateSpeech = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // 确定要生成语音的文本元素
    const textElements: Array<{ id: string, content: string, startTime: number, duration: number, voiceId?: string }> = [];

    if (isMultipleSelected && isCurrentElementSelected) {
      // 多选模式：收集所有选中的文本元素
      const allTracks = useTimelineStore.getState().tracks;
      for (const sel of selectedElements) {
        const t = allTracks.find(tr => tr.id === sel.trackId);
        const el = t?.elements.find(e => e.id === sel.elementId);
        if (el && el.type === "text") {
          const textEl = el as TextElement;
          textElements.push({
            id: textEl.id,
            content: textEl.content,
            startTime: textEl.startTime,
            duration: textEl.duration - textEl.trimStart - textEl.trimEnd,
            voiceId: textEl.voiceId
          });
        }
      }
    } else if (element.type === "text") {
      // 单选模式：只处理当前元素
      const textEl = element as TextElement;
      textElements.push({
        id: textEl.id,
        content: textEl.content,
        startTime: textEl.startTime,
        duration: textEl.duration - textEl.trimStart - textEl.trimEnd,
        voiceId: textEl.voiceId
      });
    }

    if (textElements.length === 0) {
      toast.error("没有可生成语音的文本");
      return;
    }

    toast.info(`正在为 ${textElements.length} 段文本生成语音...`);

    // 1. 先触发一次快照保存 (在添加 Placeholder 之前)
    try {
      const currentState = useTimelineStore.getState();
      await fetch("/api/ai-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateSnapshot",
          data: currentState
        })
      });
    } catch (e) { console.warn("Snapshot save failed:", e); }

    // 0. 添加 "Loading Placeholder"
    try {
      const placeholderTrackId = addTrack("audio");
      updateTrack(placeholderTrackId, { name: "AI 语音 (生成中...)" });

      textElements.forEach(el => {
        addElementToTrack(placeholderTrackId, {
          type: "media", // Use media type for audio track
          mediaId: "placeholder-tts-generating", // Special ID for identification
          name: "正在生成语音...",
          startTime: el.startTime,
          duration: el.duration,
          trimStart: 0,
          trimEnd: 0,
          muted: false,
          volume: 1,
        });
      });

    } catch (e) {
      console.warn("Failed to create TTS placeholder:", e);
    }

    try {
      await fetch("/api/ai-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "requestTask",
          data: {
            taskType: "tts_generation",
            textElements: textElements
          }
        })
      });
      toast.success("语音生成请求已发送，请关注后台进度");
    } catch (err) {
      toast.error("发送失败，请检查服务连接");
    }
  };

  const renderElementContent = () => {
    // Check for TTS placeholder first
    if (element.mediaId === "placeholder-tts-generating") {
      return (
        <div className="w-full h-full flex items-center justify-center bg-indigo-500/50 rounded overflow-hidden relative">
          <div className="absolute inset-0 bg-white/10 animate-pulse" />
          <div className="flex items-center gap-2 z-10 px-2">
            <div className="w-3 h-3 rounded-full border-2 border-white/50 border-t-white animate-spin shrink-0" />
            <span className="text-xs text-white/90 font-medium truncate">AI 生成中...</span>
          </div>
        </div>
      );
    }

    if (element.type === "text") {
      const textContent = element.content || "Text";
      return (
        <div className="w-full h-full flex items-center justify-start pl-2">
          <span className="text-xs text-white truncate" title={textContent}>{textContent}</span>
        </div>
      );
    }

    const mediaItem = mediaFiles.find((file) => file.id === element.mediaId);
    if (!mediaItem) {
      return (
        <span className="text-xs text-foreground/80 truncate">
          {element.name}
        </span>
      );
    }

    if (
      mediaItem.type === "image" ||
      (mediaItem.type === "video" && mediaItem.thumbnailUrl)
    ) {
      const trackHeight = getTrackHeight(track.type);
      const tileWidth = trackHeight * (16 / 9);

      const imageUrl = mediaItem.thumbnailUrl || mediaItem.url || (element as any).thumbnailUrl;

      return (
        <div className="w-full h-full flex items-center justify-center relative">
          <div
            className={`w-full h-full relative ${isSelected ? "bg-primary/30" : "bg-transparent"
              }`}
          >
            {/* Background Preview */}
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: imageUrl ? `url("${imageUrl}")` : "none",
                backgroundRepeat: "repeat-x",
                backgroundSize: `${tileWidth}px ${trackHeight}px`,
                backgroundPosition: "left center",
                pointerEvents: "none",
                opacity: 0.8
              }}
              aria-label={`${mediaItem.type === "image" ? "背景图" : "缩略图"}: ${mediaItem.name}`}
            />

            {/* Text Fallback / Label */}
            <div className="absolute inset-x-0 bottom-0 top-0 flex items-center px-1 pointer-events-none overflow-hidden">
              <span className="text-[10px] text-white/90 truncate font-medium drop-shadow-sm">
                {element.name}
              </span>
            </div>
          </div>
        </div>
      );
    }

    if (mediaItem.type === "audio") {
      return (
        <div className="w-full h-full flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <AudioWaveform
              audioUrl={mediaItem.url || ""}
              height={24}
              className="w-full"
            />
          </div>
        </div>
      );
    }

    return (
      <span className="text-xs text-foreground/80 truncate">
        {element.name}
      </span>
    );
  };

  const handleElementMouseDown = (e: React.MouseEvent) => {
    if (onElementMouseDown) {
      onElementMouseDown(e, element);
    }
  };

  const isMuted = element.type === "media" && element.muted;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={`absolute top-0 h-full select-none timeline-element ${isBeingDragged ? "z-50" : "z-10"
            }`}
          style={{
            left: `${elementLeft}px`,
            width: `${elementWidth}px`,
          }}
          data-element-id={element.id}
          data-track-id={track.id}
          onMouseMove={resizing ? handleResizeMove : undefined}
          onMouseUp={resizing ? handleResizeEnd : undefined}
          onMouseLeave={resizing ? handleResizeEnd : undefined}
        >
          <div
            className={`relative h-full rounded-[0.5rem] cursor-pointer overflow-hidden ${getTrackElementClasses(
              track.type
            )} ${isSelected ? "" : ""} ${isBeingDragged ? "z-50" : "z-10"
              } ${element.hidden ? "opacity-50" : ""}`}
            onClick={(e) => onElementClick && onElementClick(e, element)}
            onMouseDown={handleElementMouseDown}
            onContextMenu={(e) =>
              onElementMouseDown && onElementMouseDown(e, element)
            }
          >
            <div className="absolute inset-0 flex items-center h-full">
              {renderElementContent()}
            </div>

            {(hasAudio ? isMuted : element.hidden) && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center pointer-events-none">
                {hasAudio ? (
                  <VolumeX className="h-6 w-6 text-white" />
                ) : (
                  <EyeOff className="h-6 w-6 text-white" />
                )}
              </div>
            )}

            {isSelected && (
              <>
                <div
                  className="absolute left-0 top-0 bottom-0 w-[0.6rem] cursor-w-resize bg-primary z-50 flex items-center justify-center"
                  onMouseDown={(e) => handleResizeStart(e, element.id, "left")}
                >
                  <div className="w-[0.2rem] h-[1.5rem] bg-foreground/75 rounded-full" />
                </div>
                <div
                  className="absolute right-0 top-0 bottom-0 w-[0.6rem] cursor-e-resize bg-primary z-50 flex items-center justify-center"
                  onMouseDown={(e) => handleResizeStart(e, element.id, "right")}
                >
                  <div className="w-[0.2rem] h-[1.5rem] bg-foreground/75 rounded-full" />
                </div>
              </>
            )}

            {/* Keyframes Indicator */}
            {element.keyframes && (
              <div className="absolute bottom-[2px] left-0 right-0 h-2 z-20 pointer-events-none overflow-hidden">
                {Array.from(new Set(Object.values(element.keyframes).flat().map(k => k.time))).map(time => {
                  const pct = (time / effectiveDuration) * 100;
                  if (pct < 0 || pct > 100) return null;
                  return (
                    <div
                      key={`kf-${time}`}
                      className="absolute bottom-0 w-1.5 h-1.5 bg-yellow-400 rotate-45 transform -translate-x-1/2"
                      style={{ left: `${pct}%` }}
                    />
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="z-200">
        {(!isMultipleSelected ||
          (isMultipleSelected &&
            isCurrentElementSelected &&
            canSplitSelected)) && (
            <ContextMenuItem onClick={handleElementSplitContext}>
              <Scissors className="h-4 w-4 mr-2" />
              {isMultipleSelected && isCurrentElementSelected
                ? `分割选中的 ${selectedElements.length} 个素材`
                : "在播放头处分割"}
            </ContextMenuItem>
          )}

        <ContextMenuItem onClick={handleElementCopyContext}>
          <Copy className="h-4 w-4 mr-2" />
          {isMultipleSelected && isCurrentElementSelected
            ? `复制选中的 ${selectedElements.length} 个素材`
            : "复制素材"}
        </ContextMenuItem>

        <ContextMenuItem
          onClick={(e) => {
            e.stopPropagation();
            const info = isMultipleSelected && isCurrentElementSelected
              ? selectedElements.map(el => ({
                id: el.elementId,
                trackId: el.trackId
              }))
              : {
                id: element.id,
                trackId: track.id,
                name: element.name || (element as any).content,
                startTime: element.startTime,
                duration: element.duration
              };

            navigator.clipboard.writeText(JSON.stringify(info, null, 2));
            toast.success("素材信息已复制到剪贴板");
          }}
        >
          <Type className="h-4 w-4 mr-2" />
          复制信息 (For AI)
        </ContextMenuItem>

        {(!isMultipleSelected && hasAudio) && (
          <ContextMenuItem onClick={handleRecognizeSubtitles} className="text-primary focus:text-primary">
            <Wand2 className="h-4 w-4 mr-2" />
            识别字幕 (AI)
          </ContextMenuItem>
        )}

        {(element.type === "text") && (
          <ContextMenuItem onClick={handleGenerateSpeech} className="text-green-500 focus:text-green-500">
            <Mic className="h-4 w-4 mr-2" />
            {isMultipleSelected && isCurrentElementSelected
              ? `生成语音 (${selectedElements.length} 段)`
              : "生成语音 (AI)"}
          </ContextMenuItem>
        )}

        <ContextMenuItem onClick={handleToggleElementContext}>
          {isMultipleSelected && isCurrentElementSelected ? (
            hasAudioElements ? (
              <VolumeX className="h-4 w-4 mr-2" />
            ) : (
              <EyeOff className="h-4 w-4 mr-2" />
            )
          ) : hasAudio ? (
            isMuted ? (
              <Volume2 className="h-4 w-4 mr-2" />
            ) : (
              <VolumeX className="h-4 w-4 mr-2" />
            )
          ) : element.hidden ? (
            <Eye className="h-4 w-4 mr-2" />
          ) : (
            <EyeOff className="h-4 w-4 mr-2" />
          )}
          <span>
            {isMultipleSelected && isCurrentElementSelected
              ? hasAudioElements
                ? `切换静音 (${selectedElements.length} 个素材)`
                : `切换隐藏 (${selectedElements.length} 个素材)`
              : hasAudio
                ? isMuted
                  ? "取消静音"
                  : "静音"
                : element.hidden
                  ? "显示"
                  : "隐藏"}{" "}
            {!isMultipleSelected && (element.type === "text" ? "文本" : "片段")}
          </span>
        </ContextMenuItem>

        {!isMultipleSelected && (
          <ContextMenuItem onClick={handleElementDuplicateContext}>
            <Copy className="h-4 w-4 mr-2" />
            创建副本 ({element.type === "text" ? "文本" : "片段"})
          </ContextMenuItem>
        )}

        {!isMultipleSelected && element.type === "media" && (
          <>
            <ContextMenuItem onClick={handleRevealInMedia}>
              <Search className="h-4 w-4 mr-2" />
              在素材库中查找
            </ContextMenuItem>
            <ContextMenuItem onClick={handleReplaceClip}>
              <RefreshCw className="h-4 w-4 mr-2" />
              替换片段
            </ContextMenuItem>
          </>
        )}

        <ContextMenuSeparator />

        <ContextMenuItem
          onClick={handleElementDeleteContext}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          {isMultipleSelected && isCurrentElementSelected
            ? `删除选中的 ${selectedElements.length} 个素材`
            : `删除${element.type === "text" ? "文本" : "片段"}`}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
