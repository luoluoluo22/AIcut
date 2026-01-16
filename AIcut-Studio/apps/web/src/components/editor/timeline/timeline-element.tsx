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
      mediaName: mediaItem?.name || element.name
    });
    toast.info("正在调起 AI 字幕识别服务...");

    try {
      // 1. 先触发一次快照保存，确保 AI 助手拿到最新状态 (包括 trim)
      const currentState = useTimelineStore.getState();

      await fetch("/api/ai-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateSnapshot",
          data: currentState
        })
      });

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
            mediaName: mediaItem?.name || element.name
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
          textElements.push({
            id: el.id,
            content: (el as any).content,
            startTime: el.startTime,
            duration: el.duration - el.trimStart - el.trimEnd,
            voiceId: (el as any).voiceId
          });
        }
      }
    } else if (element.type === "text") {
      // 单选模式：只处理当前元素
      textElements.push({
        id: element.id,
        content: (element as any).content,
        startTime: element.startTime,
        duration: element.duration - element.trimStart - element.trimEnd,
        voiceId: (element as any).voiceId
      });
    }

    if (textElements.length === 0) {
      toast.error("没有可生成语音的文本");
      return;
    }

    toast.info(`正在为 ${textElements.length} 段文本生成语音...`);

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
    if (element.type === "text") {
      return (
        <div className="w-full h-full flex items-center justify-start pl-2">
          <span className="text-xs text-white truncate">{element.content}</span>
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

      const rawImageUrl =
        mediaItem.type === "image" ? mediaItem.url : mediaItem.thumbnailUrl;

      // Encode URL for CSS background-image (handle spaces, parentheses, and special chars)
      // encodeURI handles spaces but not parentheses, so we need additional handling
      const imageUrl = rawImageUrl
        ? encodeURI(rawImageUrl).replace(/\(/g, '%28').replace(/\)/g, '%29')
        : null;

      return (
        <div className="w-full h-full flex items-center justify-center">
          <div
            className={`w-full h-full relative ${isSelected ? "bg-primary" : "bg-transparent"
              }`}
          >
            <div
              className={`absolute top-[0.25rem] bottom-[0.25rem] left-0 right-0`}
              style={{
                backgroundImage: imageUrl ? `url("${imageUrl}")` : "none",
                backgroundRepeat: "repeat-x",
                backgroundSize: `${tileWidth}px ${trackHeight}px`,
                backgroundPosition: "left center",
                pointerEvents: "none",
              }}
              aria-label={`${mediaItem.type === "image" ? "背景图" : "缩略图"}: ${mediaItem.name}`}
            />
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
                name: element.name,
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
