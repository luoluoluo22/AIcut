
import { TRANSITIONS } from "@/constants/transition-constants";
import { DraggableMediaItem } from "@/components/ui/draggable-item";
import { ScrollArea } from "@/components/ui/scroll-area";

export function TransitionsView() {
    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-between p-4 pb-2">
                <div>
                    <h2 className="text-sm font-semibold">转场</h2>
                    <p className="text-xs text-muted-foreground">拖拽添加到片段之间</p>
                </div>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-4 grid grid-cols-2 gap-3">
                    {TRANSITIONS.map((transition) => (
                        <DraggableMediaItem
                            key={transition.id}
                            name={transition.name}
                            variant="card"
                            aspectRatio={1.5}
                            showLabel={true}
                            className="bg-background border hover:border-primary/50 transition-colors"
                            dragData={{
                                id: transition.id,
                                type: "transition",
                                name: transition.name,
                                transitionType: transition.value,
                            }}
                            preview={
                                <div className="w-full h-full flex flex-col items-center justify-center p-4">
                                    <div className="w-full h-full flex items-center justify-center bg-accent/30 rounded-md overflow-hidden group-hover:bg-accent/50 transition-colors">
                                        <transition.icon className="h-8 w-8 text-foreground/70" />
                                    </div>
                                </div>
                            }
                        />
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
}
