import { MediaElement } from "@/types/timeline";
import { useTimelineStore } from "@/stores/timeline-store";
import { useMediaStore } from "@/stores/media-store";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PanelBaseView } from "@/components/editor/panel-base-view";
import {
  MEDIA_PROPERTIES_TABS,
  isMediaPropertiesTab,
  useMediaPropertiesStore
} from "@/stores/media-properties-store";
import {
  PropertyGroup,
  PropertyItem,
  PropertyItemLabel,
  PropertyItemValue
} from "./property-item";
import { usePlaybackStore } from "@/stores/playback-store";
import { Video, Image, Volume2, VolumeX, Clock, Scissors, Info, Layout, RotateCcw, Move, Diamond } from "lucide-react";
import { cn } from "@/lib/utils";
import { interpolateKeyframes } from "@/lib/animation";

// Helper component for keyframe control
function KeyframeButton({
  element,
  trackId,
  property,
  currentValue
}: {
  element: MediaElement;
  trackId: string;
  property: string;
  currentValue: number;
}) {
  const { addKeyframe, removeKeyframe } = useTimelineStore();
  const { currentTime } = usePlaybackStore();

  const relativeTime = currentTime - element.startTime;
  const isWithinElement = relativeTime >= 0 && relativeTime <= (element.duration - element.trimStart - element.trimEnd);

  if (!isWithinElement) return null;

  const keyframes = element.keyframes?.[property] || [];
  const existingKeyframe = keyframes.find(kf => Math.abs(kf.time - relativeTime) < 0.05);

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("size-5 ml-1", existingKeyframe ? "text-primary hover:text-primary/80" : "text-muted-foreground hover:text-white")}
      onClick={() => {
        if (existingKeyframe) {
          removeKeyframe(trackId, element.id, property, existingKeyframe.id);
        } else {
          addKeyframe(trackId, element.id, property, relativeTime, currentValue);
        }
      }}
      title={existingKeyframe ? "移除关键帧" : "添加关键帧"}
    >
      <Diamond className="size-3" fill={existingKeyframe ? "currentColor" : "none"} />
    </Button>
  );
}

export function MediaProperties({ element }: { element: MediaElement }) {
  const { tracks, toggleTrackMute, updateMediaElement, addKeyframe } = useTimelineStore();
  const { mediaFiles } = useMediaStore();
  const { activeTab, setActiveTab } = useMediaPropertiesStore();
  const { currentTime } = usePlaybackStore();

  // Find the track and asset metadata
  const track = tracks.find(t => t.elements.some(e => e.id === element.id));
  const media = mediaFiles.find(m => m.id === element.mediaId);
  const isMuted = track?.muted || element.muted || false;

  if (!media) return <div className="p-5 text-muted-foreground">无法加载媒体信息</div>;

  const duration = (element.duration - element.trimStart - element.trimEnd).toFixed(2);
  const trackId = track?.id || "";
  const relativeTime = Math.max(0, currentTime - element.startTime);

  // Helper to get current value (interpolated if keyframes exist)
  const getValue = (property: string, baseValue: number) => {
    return interpolateKeyframes(element.keyframes?.[property], relativeTime, baseValue);
  };

  // Helper to handle value change (auto-keyframe if needed)
  const handleValueChange = (property: string, newValue: number) => {
    const hasKeyframes = element.keyframes?.[property] && element.keyframes[property].length > 0;
    if (hasKeyframes) {
      addKeyframe(trackId, element.id, property, relativeTime, newValue);
    } else {
      updateMediaElement(trackId, element.id, { [property]: newValue });
    }
  };

  // Filter tabs based on media type
  const availableTabs = MEDIA_PROPERTIES_TABS.filter((t) => {
    if (media.type === "audio" && t.value === "visual") return false;
    // Pure images don't need audio tab
    if (media.type === "image" && t.value === "audio") return false;
    return true;
  });

  // Ensure we are on a valid tab and set initial tab for audio
  const currentTab = availableTabs.some(t => t.value === activeTab)
    ? activeTab
    : (media.type === "audio" ? "audio" : "visual");

  const currentScale = getValue("scale", element.scale ?? 1);
  const currentX = getValue("x", element.x ?? 960);
  const currentY = getValue("y", element.y ?? 540);
  const currentRotation = getValue("rotation", element.rotation ?? 0);
  const currentOpacity = getValue("opacity", element.opacity ?? 1);
  const currentVolume = getValue("volume", element.volume ?? 1);

  return (
    <PanelBaseView
      defaultTab={media.type === "audio" ? "audio" : "visual"}
      value={currentTab}
      onValueChange={(v) => {
        if (isMediaPropertiesTab(v)) setActiveTab(v);
      }}
      tabs={availableTabs.map((t) => ({
        value: t.value,
        label: t.label,
        content: t.value === "visual" ? (
          <div className="space-y-6">
            <PropertyGroup title="位置大小">
              {/* Scale Control */}
              <PropertyItem direction="column">
                <div className="flex justify-between items-center w-full mb-1">
                  <div className="flex items-center">
                    <PropertyItemLabel>缩放</PropertyItemLabel>
                    <KeyframeButton element={element} trackId={trackId} property="scale" currentValue={currentScale} />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-5 hover:bg-white/10"
                    onClick={() => updateMediaElement(trackId, element.id, { scale: 1 })}
                  >
                    <RotateCcw className="size-3 text-muted-foreground" />
                  </Button>
                </div>
                <PropertyItemValue>
                  <div className="flex items-center gap-3">
                    <Slider
                      value={[currentScale * 100]}
                      min={0}
                      max={400}
                      step={1}
                      onValueChange={([value]) => {
                        handleValueChange("scale", value / 100);
                      }}
                      className="flex-1"
                    />
                    <div className="relative">
                      <Input
                        type="number"
                        value={Math.round(currentScale * 100)}
                        onChange={(e) => {
                          handleValueChange("scale", (parseFloat(e.target.value) || 0) / 100);
                        }}
                        className="w-16 px-1 !text-xs h-7 rounded-sm text-right bg-panel-accent border-none pr-5 pr-1.5 focus-visible:ring-1 focus-visible:ring-primary/30"
                      />
                      <span className="absolute right-1.5 top-1.5 text-[10px] text-muted-foreground">%</span>
                    </div>
                  </div>
                </PropertyItemValue>
              </PropertyItem>

              {/* Position Control */}
              <PropertyItem direction="column" className="mt-4">
                <PropertyItemLabel>位置</PropertyItemLabel>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 bg-panel-accent/50 rounded px-2 py-1">
                    <span className="text-[10px] text-muted-foreground">X</span>
                    <Input
                      type="number"
                      value={Math.round(currentX)}
                      onChange={(e) => handleValueChange("x", parseInt(e.target.value) || 0)}
                      className="bg-transparent border-none p-0 h-5 text-right text-xs outline-none shadow-none focus-visible:ring-0"
                    />
                    <KeyframeButton element={element} trackId={trackId} property="x" currentValue={currentX} />
                  </div>
                  <div className="flex items-center gap-2 bg-panel-accent/50 rounded px-2 py-1">
                    <span className="text-[10px] text-muted-foreground">Y</span>
                    <Input
                      type="number"
                      value={Math.round(element.y ?? 540)}
                      onChange={(e) => updateMediaElement(trackId, element.id, { y: parseInt(e.target.value) || 0 })}
                      className="bg-transparent border-none p-0 h-5 text-right text-xs outline-none shadow-none focus-visible:ring-0"
                    />
                    <KeyframeButton element={element} trackId={trackId} property="x" currentValue={currentX} />
                  </div>
                  <div className="flex items-center gap-2 bg-panel-accent/50 rounded px-2 py-1">
                    <span className="text-[10px] text-muted-foreground">Y</span>
                    <Input
                      type="number"
                      value={Math.round(currentY)}
                      onChange={(e) => handleValueChange("y", parseInt(e.target.value) || 0)}
                      className="bg-transparent border-none p-0 h-5 text-right text-xs outline-none shadow-none focus-visible:ring-0"
                    />
                    <KeyframeButton element={element} trackId={trackId} property="y" currentValue={currentY} />
                  </div>
                </div>
              </PropertyItem>

              {/* Rotation Control */}
              <PropertyItem direction="column" className="mt-4">
                <div className="flex items-center mb-1">
                  <PropertyItemLabel>旋转</PropertyItemLabel>
                  <KeyframeButton element={element} trackId={trackId} property="rotation" currentValue={currentRotation} />
                </div>
                <PropertyItemValue>
                  <div className="flex items-center gap-3">
                    <Slider
                      value={[currentRotation]}
                      min={-180}
                      max={180}
                      step={1}
                      onValueChange={([value]) => {
                        handleValueChange("rotation", value);
                      }}
                      className="flex-1"
                    />
                    <div className="relative">
                      <Input
                        type="number"
                        value={Math.round(currentRotation)}
                        onChange={(e) => handleValueChange("rotation", parseInt(e.target.value) || 0)}
                        className="w-16 px-1.5 !text-xs h-7 rounded-sm text-right bg-panel-accent border-none focus-visible:ring-1 focus-visible:ring-primary/30"
                      />
                      <span className="absolute right-1 top-1.5 text-[10px] text-muted-foreground">°</span>
                    </div>
                  </div>
                </PropertyItemValue>
              </PropertyItem>

              {/* Opacity Control */}
              <PropertyItem direction="column" className="mt-4">
                <div className="flex items-center mb-1">
                  <PropertyItemLabel>不透明度</PropertyItemLabel>
                  <KeyframeButton element={element} trackId={trackId} property="opacity" currentValue={currentOpacity} />
                </div>
                <PropertyItemValue>
                  <div className="flex items-center gap-3">
                    <Slider
                      value={[currentOpacity * 100]}
                      min={0}
                      max={100}
                      step={1}
                      onValueChange={([value]) => {
                        handleValueChange("opacity", value / 100);
                      }}
                      className="flex-1"
                    />
                    <div className="relative">
                      <Input
                        type="number"
                        value={Math.round(currentOpacity * 100)}
                        onChange={(e) => handleValueChange("opacity", (parseFloat(e.target.value) || 0) / 100)}
                        className="w-16 px-1.5 !text-xs h-7 rounded-sm text-right bg-panel-accent border-none focus-visible:ring-1 focus-visible:ring-primary/30"
                      />
                      <span className="absolute right-1 top-1.5 text-[10px] text-muted-foreground">%</span>
                    </div>
                  </div>
                </PropertyItemValue>
              </PropertyItem>
            </PropertyGroup>

            <PropertyGroup title="画布布局">
              <PropertyItem>
                <PropertyItemLabel className="flex items-center gap-1.5">
                  <Layout className="size-3" />
                  填充模式
                </PropertyItemLabel>
                <PropertyItemValue className="text-right">
                  <span className="text-xs text-muted-foreground bg-white/5 px-2 py-0.5 rounded">自适应</span>
                </PropertyItemValue>
              </PropertyItem>
            </PropertyGroup>
          </div>
        ) : t.value === "audio" ? (
          <div className="space-y-6">
            <PropertyGroup title="音频调节">
              <PropertyItem direction="column">
                <div className="flex items-center mb-1">
                  <PropertyItemLabel>音量</PropertyItemLabel>
                  <KeyframeButton element={element} trackId={trackId} property="volume" currentValue={currentVolume} />
                </div>
                <PropertyItemValue>
                  <div className="flex items-center gap-3">
                    <Slider
                      value={[currentVolume * 100]}
                      min={0}
                      max={1000}
                      step={1}
                      onValueChange={([value]) => {
                        handleValueChange("volume", value / 100);
                      }}
                      className="flex-1"
                    />
                    <div className="relative">
                      <Input
                        type="number"
                        value={Math.round(currentVolume * 100)}
                        onChange={(e) => handleValueChange("volume", (parseFloat(e.target.value) || 0) / 100)}
                        className="w-16 px-1.5 !text-xs h-7 rounded-sm text-right bg-panel-accent border-none focus-visible:ring-1 focus-visible:ring-primary/30"
                      />
                      <span className="absolute right-1 top-1.5 text-[10px] text-muted-foreground">%</span>
                    </div>
                  </div>
                </PropertyItemValue>
              </PropertyItem>

              <PropertyItem className="mt-4">
                <PropertyItemLabel className="flex items-center gap-2">
                  {isMuted ? (
                    <VolumeX className="size-3.5 text-red-400" />
                  ) : (
                    <Volume2 className="size-3.5 text-green-400" />
                  )}
                  轨道静音
                </PropertyItemLabel>
                <PropertyItemValue className="flex justify-end">
                  <Switch
                    checked={isMuted}
                    onCheckedChange={() => track && toggleTrackMute(track.id)}
                  />
                </PropertyItemValue>
              </PropertyItem>
            </PropertyGroup>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="p-3.5 rounded-lg bg-panel-accent/50 border border-white/5 space-y-3">
              <div className="flex items-center gap-3 pb-3 border-b border-white/5">
                <div className={cn(
                  "p-2 rounded-md",
                  media.type === 'video' ? "bg-blue-500/10 text-blue-400" : "bg-purple-500/10 text-purple-400"
                )}>
                  {media.type === 'video' ? <Video className="size-4" /> : <Image className="size-4" />}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate max-w-[140px]">{media.name}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">{media.type === 'video' ? '视频' : media.type === 'audio' ? '音频' : '图片'}</p>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-muted-foreground">分辨率</span>
                  <span className="text-white/80">{media.width && media.height ? `${media.width} x ${media.height}` : "未知"}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-muted-foreground">原始时长</span>
                  <span className="text-white/80">{media.duration ? `${media.duration.toFixed(2)}s` : "--"}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-muted-foreground">开始时间</span>
                  <span className="text-white/80 font-mono">{element.startTime.toFixed(2)}s</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-muted-foreground">显示时长</span>
                  <span className="text-white/80 font-mono">{duration}s</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-muted-foreground">文件ID</span>
                  <span className="text-[9px] font-mono text-muted-foreground truncate ml-4 opacity-50">{media.id}</span>
                </div>
              </div>
            </div>
          </div>
        )
      }))}
    />
  );
}
