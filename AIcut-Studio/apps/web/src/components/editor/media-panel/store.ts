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
  // 多选相关状态
  selectedMediaIds: Set<string>;
  lastSelectedId: string | null;
  selectMedia: (id: string, options?: { ctrl?: boolean; shift?: boolean; allIds?: string[] }) => void;
  selectMultiple: (ids: string[]) => void;
  clearSelection: () => void;
  isSelected: (id: string) => boolean;
}

export const useMediaPanelStore = create<MediaPanelStore>((set, get) => ({
  activeTab: "media",
  setActiveTab: (tab) => set({ activeTab: tab }),
  highlightMediaId: null,
  requestRevealMedia: (mediaId) =>
    set({ activeTab: "media", highlightMediaId: mediaId }),
  clearHighlight: () => set({ highlightMediaId: null }),
  // 多选相关
  selectedMediaIds: new Set<string>(),
  lastSelectedId: null,
  selectMedia: (id, options = {}) => {
    const { ctrl, shift, allIds } = options;
    const current = get().selectedMediaIds;
    const lastId = get().lastSelectedId;

    if (shift && lastId && allIds) {
      // Shift + 点击：范围选择
      const lastIndex = allIds.indexOf(lastId);
      const currentIndex = allIds.indexOf(id);
      if (lastIndex !== -1 && currentIndex !== -1) {
        const start = Math.min(lastIndex, currentIndex);
        const end = Math.max(lastIndex, currentIndex);
        const rangeIds = allIds.slice(start, end + 1);
        const newSelection = new Set(current);
        rangeIds.forEach((rangeId) => newSelection.add(rangeId));
        set({ selectedMediaIds: newSelection });
        return;
      }
    }

    if (ctrl) {
      // Ctrl + 点击：切换选择
      const newSelection = new Set(current);
      if (newSelection.has(id)) {
        newSelection.delete(id);
      } else {
        newSelection.add(id);
      }
      set({ selectedMediaIds: newSelection, lastSelectedId: id });
    } else {
      // 普通点击：单选
      set({ selectedMediaIds: new Set([id]), lastSelectedId: id });
    }
  },
  selectMultiple: (ids) => {
    set({ selectedMediaIds: new Set(ids), lastSelectedId: ids[ids.length - 1] || null });
  },
  clearSelection: () => {
    set({ selectedMediaIds: new Set(), lastSelectedId: null });
  },
  isSelected: (id) => get().selectedMediaIds.has(id),
  // 预览相关
  previewMedia: null as import("@/types/media").MediaFile | null,
  setPreviewMedia: (media) => set({ previewMedia: media }),
}));
