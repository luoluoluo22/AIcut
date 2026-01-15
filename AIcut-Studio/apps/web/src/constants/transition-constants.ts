
import { MoveRight, ArrowRightToLine, ArrowLeftToLine, MonitorSmartphone, Layers, Search, Zap } from "lucide-react";

export interface TransitionOption {
    id: string; // unique id (often same as value)
    value: string; // used in timeline
    name: string;
    icon: any; // Lucide icon
    description: string;
    duration: number; // default duration in seconds
}

export const TRANSITIONS: TransitionOption[] = [
    {
        id: "fade",
        value: "fade",
        name: "淡入淡出",
        icon: Layers,
        description: "平滑地从一个画面过渡到另一个画面",
        duration: 0.5
    },
    {
        id: "slide-left",
        value: "slide-left",
        name: "向左滑动",
        icon: ArrowLeftToLine,
        description: "新画面从右向左滑入",
        duration: 0.5
    },
    {
        id: "slide-right",
        value: "slide-right",
        name: "向右滑动",
        icon: ArrowRightToLine,
        description: "新画面从左向右滑入",
        duration: 0.5
    },
    {
        id: "wipe-left",
        value: "wipe-left",
        name: "向左擦除",
        icon: MoveRight, // approximating
        description: "新画面从右向左擦除旧画面",
        duration: 0.5
    },
    {
        id: "wipe-right",
        value: "wipe-right",
        name: "向右擦除",
        icon: MoveRight, // approximating
        description: "新画面从左向右擦除旧画面",
        duration: 0.5
    },
    {
        id: "zoom-in",
        value: "zoom-in",
        name: "缩放进入",
        icon: Search,
        description: "新画面从小变大进入",
        duration: 0.5
    },
    {
        id: "flash",
        value: "flash",
        name: "闪白",
        icon: Zap,
        description: "通过白色闪光过渡",
        duration: 0.2
    },
    {
        id: "dissolve",
        value: "dissolve",
        name: "叠化",
        icon: MonitorSmartphone,
        description: "交叉叠化效果",
        duration: 0.5
    }
];
