"use client";

import { useEffect, useState, useCallback, RefObject } from "react";
import { createPortal } from "react-dom";

interface SelectionBoxProps {
    containerRef: RefObject<HTMLElement | null>;
    itemRefs: Map<string, HTMLElement>;
    onSelectionChange: (selectedIds: string[]) => void;
    disabled?: boolean;
}

interface SelectionRect {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
}

export function useSelectionBox({
    containerRef,
    itemRefs,
    onSelectionChange,
    disabled = false,
}: SelectionBoxProps) {
    const [isSelecting, setIsSelecting] = useState(false);
    const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(null);
    const [addToSelection, setAddToSelection] = useState(false);

    const getRelativeCoords = useCallback(
        (clientX: number, clientY: number) => {
            if (!containerRef.current) return { x: 0, y: 0 };
            const rect = containerRef.current.getBoundingClientRect();
            return {
                x: clientX - rect.left + containerRef.current.scrollLeft,
                y: clientY - rect.top + containerRef.current.scrollTop,
            };
        },
        [containerRef]
    );

    const checkIntersection = useCallback(
        (selection: SelectionRect) => {
            if (!containerRef.current) return [];

            const containerRect = containerRef.current.getBoundingClientRect();
            const scrollLeft = containerRef.current.scrollLeft;
            const scrollTop = containerRef.current.scrollTop;

            // 计算选择框在视口中的位置
            const selLeft = Math.min(selection.startX, selection.endX);
            const selTop = Math.min(selection.startY, selection.endY);
            const selRight = Math.max(selection.startX, selection.endX);
            const selBottom = Math.max(selection.startY, selection.endY);

            const selectedIds: string[] = [];

            itemRefs.forEach((element, id) => {
                const itemRect = element.getBoundingClientRect();

                // 转换为相对于容器的坐标
                const itemLeft = itemRect.left - containerRect.left + scrollLeft;
                const itemTop = itemRect.top - containerRect.top + scrollTop;
                const itemRight = itemLeft + itemRect.width;
                const itemBottom = itemTop + itemRect.height;

                // 检查是否相交
                if (
                    selLeft < itemRight &&
                    selRight > itemLeft &&
                    selTop < itemBottom &&
                    selBottom > itemTop
                ) {
                    selectedIds.push(id);
                }
            });

            return selectedIds;
        },
        [containerRef, itemRefs]
    );

    const handleMouseDown = useCallback(
        (e: MouseEvent) => {
            if (disabled) return;

            // 只处理左键点击
            if (e.button !== 0) return;

            // 检查是否点击在容器内
            if (!containerRef.current?.contains(e.target as Node)) return;

            // 检查是否点击在媒体项上（如果是，让媒体项的点击处理）
            const target = e.target as HTMLElement;
            const isOnMediaItem = target.closest('[data-media-item]');
            if (isOnMediaItem) return;

            e.preventDefault();

            const coords = getRelativeCoords(e.clientX, e.clientY);
            setIsSelecting(true);
            setAddToSelection(e.ctrlKey || e.metaKey);
            setSelectionRect({
                startX: coords.x,
                startY: coords.y,
                endX: coords.x,
                endY: coords.y,
            });
        },
        [containerRef, disabled, getRelativeCoords]
    );

    const handleMouseMove = useCallback(
        (e: MouseEvent) => {
            if (!isSelecting || !selectionRect) return;

            const coords = getRelativeCoords(e.clientX, e.clientY);
            setSelectionRect((prev) =>
                prev
                    ? {
                        ...prev,
                        endX: coords.x,
                        endY: coords.y,
                    }
                    : null
            );
        },
        [isSelecting, selectionRect, getRelativeCoords]
    );

    const handleMouseUp = useCallback(
        (e: MouseEvent) => {
            if (!isSelecting || !selectionRect) return;

            const selectedIds = checkIntersection(selectionRect);
            onSelectionChange(selectedIds);

            setIsSelecting(false);
            setSelectionRect(null);
        },
        [isSelecting, selectionRect, checkIntersection, onSelectionChange]
    );

    useEffect(() => {
        document.addEventListener("mousedown", handleMouseDown);
        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);

        return () => {
            document.removeEventListener("mousedown", handleMouseDown);
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };
    }, [handleMouseDown, handleMouseMove, handleMouseUp]);

    // 返回需要渲染的选择框
    const SelectionOverlay = () => {
        if (!isSelecting || !selectionRect || !containerRef.current) return null;

        const containerRect = containerRef.current.getBoundingClientRect();
        const scrollLeft = containerRef.current.scrollLeft;
        const scrollTop = containerRef.current.scrollTop;

        const left = Math.min(selectionRect.startX, selectionRect.endX) - scrollLeft + containerRect.left;
        const top = Math.min(selectionRect.startY, selectionRect.endY) - scrollTop + containerRect.top;
        const width = Math.abs(selectionRect.endX - selectionRect.startX);
        const height = Math.abs(selectionRect.endY - selectionRect.startY);

        return createPortal(
            <div
                className="fixed pointer-events-none z-50 border-2 border-primary bg-primary/20 rounded-sm"
                style={{
                    left: `${left}px`,
                    top: `${top}px`,
                    width: `${width}px`,
                    height: `${height}px`,
                }}
            />,
            document.body
        );
    };

    return {
        isSelecting,
        addToSelection,
        SelectionOverlay,
    };
}
