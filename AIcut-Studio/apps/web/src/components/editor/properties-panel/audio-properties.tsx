import { MediaElement } from "@/types/timeline";
import { useTimelineStore } from "@/stores/timeline-store";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Volume2, VolumeX } from "lucide-react";

export function AudioProperties({ element }: { element: MediaElement }) {
  const { tracks, toggleTrackMute } = useTimelineStore();

  // Find the track containing this element
  const track = tracks.find(t => t.elements.some(e => e.id === element.id));
  const isMuted = track?.muted || element.muted || false;

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">音频</Label>
        <div className="flex items-center gap-2">
          {isMuted ? (
            <VolumeX className="w-4 h-4 text-muted-foreground" />
          ) : (
            <Volume2 className="w-4 h-4" />
          )}
          <span className="text-sm text-muted-foreground">
            {isMuted ? "已静音" : "激活"}
          </span>
        </div>
      </div>

      {track && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="mute-toggle" className="text-sm">轨道静音</Label>
            <Switch
              id="mute-toggle"
              checked={isMuted}
              onCheckedChange={() => track && toggleTrackMute(track.id)}
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label className="text-sm">时长</Label>
        <p className="text-sm text-muted-foreground">
          {(element.duration - element.trimStart - element.trimEnd).toFixed(2)}秒
        </p>
      </div>

      <div className="space-y-2">
        <Label className="text-sm">开始时间</Label>
        <p className="text-sm text-muted-foreground">
          {element.startTime.toFixed(2)}秒
        </p>
      </div>

      {(element.trimStart > 0 || element.trimEnd > 0) && (
        <div className="space-y-2">
          <Label className="text-sm">剪辑</Label>
          <p className="text-sm text-muted-foreground">
            开始: {element.trimStart.toFixed(2)}秒 / 结束: {element.trimEnd.toFixed(2)}秒
          </p>
        </div>
      )}
    </div>
  );
}
