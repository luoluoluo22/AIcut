import { create } from "zustand";

export const MEDIA_PROPERTIES_TABS = [
    { value: "visual", label: "画面" },
    { value: "audio", label: "音频" },
    { value: "details", label: "详情" },
] as const;

export type MediaPropertiesTab = (typeof MEDIA_PROPERTIES_TABS)[number]["value"];

interface MediaPropertiesStore {
    activeTab: MediaPropertiesTab;
    setActiveTab: (tab: MediaPropertiesTab) => void;
}

export const useMediaPropertiesStore = create<MediaPropertiesStore>((set) => ({
    activeTab: "adjust",
    setActiveTab: (tab) => set({ activeTab: tab }),
}));

export function isMediaPropertiesTab(value: string): value is MediaPropertiesTab {
    return MEDIA_PROPERTIES_TABS.some((t) => t.value === value);
}
