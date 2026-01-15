import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2 } from "lucide-react";

interface GenerateImageDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onGenerate: (prompt: string) => Promise<void>;
}

export function GenerateImageDialog({
    open,
    onOpenChange,
    onGenerate,
}: GenerateImageDialogProps) {
    const [prompt, setPrompt] = useState("");
    const [loading, setLoading] = useState(false);

    const handleGenerate = async () => {
        if (!prompt.trim()) return;
        setLoading(true);
        try {
            await onGenerate(prompt);
            onOpenChange(false);
            setPrompt("");
        } catch (e) {
            console.error(e);
            // Let parent handle toast
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-500" />
                        AI 生成图片
                    </DialogTitle>
                    <DialogDescription>
                        输入描述，AI 将为您生成对应的图片素材。
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <Textarea
                        placeholder="例如：一只在太空中飞翔的猫..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="min-h-[100px]"
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleGenerate();
                            }
                        }}
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                        取消
                    </Button>
                    <Button onClick={handleGenerate} disabled={loading || !prompt.trim()} className="min-w-[80px]">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "生成"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
