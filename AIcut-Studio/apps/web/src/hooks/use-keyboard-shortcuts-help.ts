"use client";

import { useMemo } from "react";
import { useKeybindingsStore } from "@/stores/keybindings-store";
import { Action } from "@/constants/actions";
import { getPlatformAlternateKey, getPlatformSpecialKey } from "@/lib/utils";

export interface KeyboardShortcut {
  id: string;
  keys: string[];
  description: string;
  category: string;
  action: Action;
  icon?: React.ReactNode;
}

// Map actions to their descriptions and categories
const actionDescriptions: Record<
  Action,
  { description: string; category: string }
> = {
  "toggle-play": { description: "播放/暂停", category: "播放控制" },
  "stop-playback": { description: "停止播放", category: "播放控制" },
  "seek-forward": {
    description: "向后快进 1 秒",
    category: "播放控制",
  },
  "seek-backward": {
    description: "向前快退 1 秒",
    category: "播放控制",
  },
  "frame-step-forward": {
    description: "向后移动一帧",
    category: "导航",
  },
  "frame-step-backward": {
    description: "向前移动一帧",
    category: "导航",
  },
  "jump-forward": {
    description: "向后跳转 5 秒",
    category: "导航",
  },
  "jump-backward": {
    description: "向前跳转 5 秒",
    category: "导航",
  },
  "goto-start": { description: "跳至时间轴起点", category: "导航" },
  "goto-end": { description: "跳至时间轴终点", category: "导航" },
  "split-element": {
    description: "在播放头处分割元素",
    category: "编辑",
  },
  "delete-selected": {
    description: "删除所选元素",
    category: "编辑",
  },
  "select-all": { description: "选择所有元素", category: "选择" },
  "duplicate-selected": {
    description: "复制所选元素",
    category: "选择",
  },
  "toggle-snapping": { description: "开启/关闭吸附", category: "编辑" },
  undo: { description: "撤销", category: "历史记录" },
  redo: { description: "重做", category: "历史记录" },
  "copy-selected": {
    description: "复制所选元素",
    category: "编辑",
  },
  "paste-selected": {
    description: "在播放头处粘贴元素",
    category: "编辑",
  },
};

// Convert key binding format to display format
const formatKey = (key: string): string => {
  return key
    .replace("ctrl", getPlatformSpecialKey())
    .replace("alt", getPlatformAlternateKey())
    .replace("shift", "Shift")
    .replace("left", "←")
    .replace("right", "→")
    .replace("up", "↑")
    .replace("down", "↓")
    .replace("space", "Space")
    .replace("home", "Home")
    .replace("enter", "Enter")
    .replace("end", "End")
    .replace("delete", "Delete")
    .replace("backspace", "Backspace")
    .replace("-", "+");
};

export const useKeyboardShortcutsHelp = () => {
  const { keybindings } = useKeybindingsStore();

  const shortcuts = useMemo(() => {
    const result: KeyboardShortcut[] = [];

    // Group keybindings by action
    const actionToKeys: Record<Action, string[]> = {} as any;

    Object.entries(keybindings).forEach(([key, action]) => {
      if (action) {
        if (!actionToKeys[action]) {
          actionToKeys[action] = [];
        }
        actionToKeys[action].push(formatKey(key));
      }
    });

    // Convert to shortcuts format
    Object.entries(actionToKeys).forEach(([action, keys]) => {
      const actionInfo = actionDescriptions[action as Action];
      if (actionInfo) {
        result.push({
          id: action,
          keys,
          description: actionInfo.description,
          category: actionInfo.category,
          action: action as Action,
        });
      }
    });

    // Sort shortcuts by category first, then by description to ensure consistent ordering
    return result.sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.description.localeCompare(b.description);
    });
  }, [keybindings]);

  return {
    shortcuts,
  };
};
