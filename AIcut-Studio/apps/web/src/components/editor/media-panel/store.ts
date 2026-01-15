import {
  CaptionsIcon,
  ArrowLeftRightIcon,
  SparklesIcon,
  StickerIcon,
  MusicIcon,
  VideoIcon,
  BlendIcon,
  SlidersHorizontalIcon,
  LucideIcon,
  TypeIcon,
  SettingsIcon,
} from "lucide-react";
import { create } from "zustand";

export type Tab =
  | "media"
  | "sounds"
  | "text"
  | "stickers"
  | "effects"
  | "transitions"
  | "captions"
  | "filters"
  | "adjustment"
  | "settings";

export const tabs: { [key in Tab]: { icon: LucideIcon; label: string } } = {
  media: {
    icon: VideoIcon,
    label: "媒体库",
  },
  sounds: {
    icon: MusicIcon,
    label: "音频",
  },
  text: {
    icon: TypeIcon,
    label: "文本",
  },
  stickers: {
    icon: StickerIcon,
    label: "贴纸",
  },
  effects: {
    icon: SparklesIcon,
    label: "特效",
  },
  transitions: {
    icon: ArrowLeftRightIcon,
    label: "转场",
  },
  captions: {
    icon: CaptionsIcon,
    label: "字幕",
  },
  filters: {
    icon: BlendIcon,
    label: "滤镜",
  },
  adjustment: {
    icon: SlidersHorizontalIcon,
    label: "调节",
  },
  settings: {
    icon: SettingsIcon,
    label: "设置",
  },
};

interface MediaPanelStore {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  highlightMediaId: string | null;
  requestRevealMedia: (mediaId: string) => void;
  clearHighlight: () => void;
}

export const useMediaPanelStore = create<MediaPanelStore>((set) => ({
  activeTab: "media",
  setActiveTab: (tab) => set({ activeTab: tab }),
  highlightMediaId: null,
  requestRevealMedia: (mediaId) =>
    set({ activeTab: "media", highlightMediaId: mediaId }),
  clearHighlight: () => set({ highlightMediaId: null }),
}));
