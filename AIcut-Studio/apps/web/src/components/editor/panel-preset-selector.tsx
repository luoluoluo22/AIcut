"use client";

import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { ChevronDown, RotateCcw, LayoutPanelTop } from "lucide-react";
import { usePanelStore, type PanelPreset } from "@/stores/panel-store";

const PRESET_LABELS: Record<PanelPreset, string> = {
  default: "默认布局",
  media: "媒体主导",
  inspector: "检查器主导",
  "vertical-preview": "竖屏预览",
};

const PRESET_DESCRIPTIONS: Record<PanelPreset, string> = {
  default: "经典布局：上方为媒体、预览和检查器，下方为时间轴",
  media: "专注媒体：左侧全高媒体面板，上方为预览和检查器",
  inspector: "专注参数：右侧全高检查器，上方为媒体和预览",
  "vertical-preview": "竖屏模式：右侧全高预览面板，适合移动端视频制作",
};

export function PanelPresetSelector() {
  const { activePreset, setActivePreset, resetPreset } = usePanelStore();

  const handlePresetChange = (preset: PanelPreset) => {
    setActivePreset(preset);
  };

  const handleResetPreset = (preset: PanelPreset, event: React.MouseEvent) => {
    event.stopPropagation();
    resetPreset(preset);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary"
          size="sm"
          className="h-8 px-2 flex items-center gap-1 text-xs"
          title="面板布局预设"
        >
          <LayoutPanelTop className="h-4 w-4" />
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <div className="px-3 py-2 text-xs font-medium text-muted-foreground">
          面板布局预设
        </div>
        <DropdownMenuSeparator />
        {(Object.keys(PRESET_LABELS) as PanelPreset[]).map((preset) => (
          <DropdownMenuItem
            key={preset}
            onClick={() => handlePresetChange(preset)}
            className="flex items-start justify-between gap-2 py-2 px-3 cursor-pointer"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">
                  {PRESET_LABELS[preset]}
                </span>
                {activePreset === preset && (
                  <div className="h-2 w-2 rounded-full bg-primary" />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 leading-tight">
                {PRESET_DESCRIPTIONS[preset]}
              </p>
            </div>
            <Button
              variant="secondary"
              size="icon"
              className="h-6 w-6 shrink-0 opacity-60 hover:opacity-100"
              onClick={(e) => handleResetPreset(preset, e)}
              title={`重置 ${PRESET_LABELS[preset]} 预设`}
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
