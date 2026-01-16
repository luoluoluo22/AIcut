"use client";

import { useTimelineStore } from "@/stores/timeline-store";
import { TimelineMarker } from "@/types/timeline";
import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Copy, Trash2 } from "lucide-react";

interface TimelineUserMarkerProps {
    marker: TimelineMarker;
    trackId: string;
    zoomLevel: number;
}

export function TimelineUserMarker({
    marker,
    trackId,
    zoomLevel,
}: TimelineUserMarkerProps) {
    const {
        selectedMarkers,
        selectMarker,
        setMarkerDragState,
        removeMarker,
    } = useTimelineStore();

    const isSelected = selectedMarkers.some(
        (m) => m.trackId === trackId && m.markerId === marker.id
    );

    const handleMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();

        // Selection logic
        if (e.metaKey || e.ctrlKey || e.shiftKey) {
            selectMarker(trackId, marker.id, true);
        } else if (!isSelected) {
            selectMarker(trackId, marker.id, false);
        }

        // Start Drag logic
        setMarkerDragState({
            isDragging: true,
            markerId: marker.id,
            trackId: trackId,
            startMouseX: e.clientX,
            startMarkerTime: marker.time,
        });
    };

    const copyInfo = () => {
        // Check if we are copying multiple selected markers
        const isPartOfSelection = selectedMarkers.some(
            (m) => m.trackId === trackId && m.markerId === marker.id
        );

        if (isPartOfSelection && selectedMarkers.length > 1) {
            const state = useTimelineStore.getState();
            // Get all selected markers for this track (or all tracks? usually range is within a track)
            // Let's assume user wants info about all selected markers
            const selectedMarkersData = state.selectedMarkers.map((sm) => {
                const t = state.tracks.find((tr) => tr.id === sm.trackId);
                const m = t?.markers?.find((mr) => mr.id === sm.markerId);
                return { trackId: sm.trackId, ...m };
            }).filter((m): m is { trackId: string; id: string; time: number } => !!m.id);

            const sorted = selectedMarkersData.sort((a, b) => a.time - b.time);

            const payload = {
                type: "markers_info",
                count: sorted.length,
                range: sorted.length >= 2 ? {
                    start: sorted[0].time.toFixed(3),
                    end: sorted[sorted.length - 1].time.toFixed(3),
                    duration: (sorted[sorted.length - 1].time - sorted[0].time).toFixed(3)
                } : null,
                markers: sorted.map(m => ({
                    trackId: m.trackId,
                    time: m.time.toFixed(3)
                }))
            };

            navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
            toast.success("Creating time range info from selected markers!");
            return;
        }

        const info = JSON.stringify({ trackId, time: marker.time.toFixed(3) });
        navigator.clipboard.writeText(info);
        toast.success("Marker info copied!");
    };

    const leftPos =
        marker.time * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel;

    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                <div
                    className={cn(
                        "absolute z-30 cursor-move transform -translate-x-1/2",
                        "w-3 h-3 rotate-45 border shadow-sm transition-transform",
                        isSelected
                            ? "bg-amber-400 border-amber-600 scale-125 z-40"
                            : "bg-cyan-400 border-cyan-600 hover:scale-110"
                    )}
                    style={{ left: `${leftPos}px`, top: "2px" }}
                    onMouseDown={handleMouseDown}
                    onClick={(e) => e.stopPropagation()}
                />
            </ContextMenuTrigger>
            <ContextMenuContent>
                <ContextMenuItem onClick={copyInfo}>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Info
                </ContextMenuItem>
                <ContextMenuItem
                    onClick={() => removeMarker(trackId, marker.id)}
                    className="text-red-500 focus:text-red-500"
                >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Marker
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
}
