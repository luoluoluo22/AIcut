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
import { Video, Image, Volume2, VolumeX, Clock, Scissors, Info, Layout, RotateCcw, Move } from "lucide-react";
import { cn } from "@/lib/utils";
import { MediaType } from "@/types/media";

export function MediaProperties({ element }: { element: MediaElement }) {
  const { tracks, toggleTrackMute, updateMediaElement } = useTimelineStore();
  const { mediaFiles } = useMediaStore();
  const { activeTab, setActiveTab } = useMediaPropertiesStore();

  // Find the track and asset metadata
  const track = tracks.find(t => t.elements.some(e => e.id === element.id));
  const media = mediaFiles.find(m => m.id === element.mediaId);
  const isMuted = track?.muted || element.muted || false;

  if (!media) return <div className="p-5 text-muted-foreground">无法加载媒体信息</div>;

  const duration = (element.duration - element.trimStart - element.trimEnd).toFixed(2);
  const trackId = track?.id || "";

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
                  <PropertyItemLabel>缩放</PropertyItemLabel>
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
                      value={[(element.scale ?? 1) * 100]}
                      min={0}
                      max={400}
                      step={1}
                      onValueChange={([value]) => {
                        updateMediaElement(trackId, element.id, { scale: value / 100 });
                      }}
                      className="flex-1"
                    />
                    <div className="relative">
                      <Input
                        type="number"
                        value={Math.round((element.scale ?? 1) * 100)}
                        onChange={(e) => {
                          updateMediaElement(trackId, element.id, { scale: (parseFloat(e.target.value) || 0) / 100 });
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
                      value={Math.round(element.x ?? 960)}
                      onChange={(e) => updateMediaElement(trackId, element.id, { x: parseInt(e.target.value) || 0 })}
                      className="bg-transparent border-none p-0 h-5 text-right text-xs outline-none shadow-none focus-visible:ring-0"
                    />
                  </div>
                  <div className="flex items-center gap-2 bg-panel-accent/50 rounded px-2 py-1">
                    <span className="text-[10px] text-muted-foreground">Y</span>
                    <Input
                      type="number"
                      value={Math.round(element.y ?? 540)}
                      onChange={(e) => updateMediaElement(trackId, element.id, { y: parseInt(e.target.value) || 0 })}
                      className="bg-transparent border-none p-0 h-5 text-right text-xs outline-none shadow-none focus-visible:ring-0"
                    />
                  </div>
                </div>
              </PropertyItem>

              {/* Rotation Control */}
              <PropertyItem direction="column" className="mt-4">
                <PropertyItemLabel>旋转</PropertyItemLabel>
                <PropertyItemValue>
                  <div className="flex items-center gap-3">
                    <Slider
                      value={[element.rotation ?? 0]}
                      min={-180}
                      max={180}
                      step={1}
                      onValueChange={([value]) => {
                        updateMediaElement(trackId, element.id, { rotation: value });
                      }}
                      className="flex-1"
                    />
                    <div className="relative">
                      <Input
                        type="number"
                        value={Math.round(element.rotation ?? 0)}
                        onChange={(e) => updateMediaElement(trackId, element.id, { rotation: parseInt(e.target.value) || 0 })}
                        className="w-16 px-1.5 !text-xs h-7 rounded-sm text-right bg-panel-accent border-none focus-visible:ring-1 focus-visible:ring-primary/30"
                      />
                      <span className="absolute right-1 top-1.5 text-[10px] text-muted-foreground">°</span>
                    </div>
                  </div>
                </PropertyItemValue>
              </PropertyItem>

              {/* Opacity Control */}
              <PropertyItem direction="column" className="mt-4">
                <PropertyItemLabel>不透明度</PropertyItemLabel>
                <PropertyItemValue>
                  <div className="flex items-center gap-3">
                    <Slider
                      value={[(element.opacity ?? 1) * 100]}
                      min={0}
                      max={100}
                      step={1}
                      onValueChange={([value]) => {
                        updateMediaElement(trackId, element.id, { opacity: value / 100 });
                      }}
                      className="flex-1"
                    />
                    <div className="relative">
                      <Input
                        type="number"
                        value={Math.round((element.opacity ?? 1) * 100)}
                        onChange={(e) => updateMediaElement(trackId, element.id, { opacity: (parseFloat(e.target.value) || 0) / 100 })}
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
                  <span className="text-xs text-muted-foreground bg-white/5 px-2 py-0.5 rounded">Contain (自适应)</span>
                </PropertyItemValue>
              </PropertyItem>
            </PropertyGroup>
          </div>
        ) : t.value === "audio" ? (
          <div className="space-y-6">
            <PropertyGroup title="调节">
              <PropertyItem direction="column">
                <PropertyItemLabel>音量</PropertyItemLabel>
                <PropertyItemValue>
                  <div className="flex items-center gap-3">
                    <Slider
                      value={[(element.volume ?? 1) * 100]}
                      min={0}
                      max={100}
                      step={1}
                      onValueChange={([value]) => {
                        updateMediaElement(trackId, element.id, { volume: value / 100 });
                      }}
                      className="flex-1"
                    />
                    <div className="relative">
                      <Input
                        type="number"
                        value={Math.round((element.volume ?? 1) * 100)}
                        onChange={(e) => updateMediaElement(trackId, element.id, { volume: (parseFloat(e.target.value) || 0) / 100 })}
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
                  静音全轨道
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
                  <p className="text-[10px] text-muted-foreground uppercase">{media.type}</p>
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
