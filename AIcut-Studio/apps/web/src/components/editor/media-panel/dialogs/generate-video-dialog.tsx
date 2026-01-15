import { useState, useRef } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Video, Loader2, Upload, ImageIcon, X, Wand2 } from "lucide-react";
import { toast } from "sonner";

interface GenerateVideoDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onGenerate: (data: { mode: 'text' | 'image', prompt: string, image?: File }) => Promise<void>;
}

export function GenerateVideoDialog({
    open,
    onOpenChange,
    onGenerate,
}: GenerateVideoDialogProps) {
    const [mode, setMode] = useState<'text' | 'image'>('text');
    const [prompt, setPrompt] = useState("");
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                toast.error("只能上传图片作为参考图");
                return;
            }
            setSelectedImage(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const clearImage = () => {
        setSelectedImage(null);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleGenerate = async () => {
        if (!prompt.trim() && mode === 'text') {
            toast.error("请输入视频描述词");
            return;
        }
        if (mode === 'image' && !selectedImage) {
            toast.error("请先上传参考图");
            return;
        }

        setLoading(true);
        try {
            await onGenerate({
                mode,
                prompt: prompt.trim(),
                image: selectedImage || undefined
            });
            onOpenChange(false);
            resetForm();
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setPrompt("");
        clearImage();
        setMode('text');
    };

    return (
        <Dialog open={open} onOpenChange={(val) => {
            if (!loading) {
                onOpenChange(val);
                if (!val) resetForm();
            }
        }}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Video className="w-5 h-5 text-blue-500" />
                        AI 视频生成
                    </DialogTitle>
                    <DialogDescription>
                        利用 Grok 强大的生成能力，将文字或图片转化为高清视频。
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={mode} onValueChange={(v) => setMode(v as any)} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="text" className="flex items-center gap-1.5">
                            <Wand2 className="w-4 h-4" /> 文生视频
                        </TabsTrigger>
                        <TabsTrigger value="image" className="flex items-center gap-1.5">
                            <ImageIcon className="w-4 h-4" /> 图生视频
                        </TabsTrigger>
                    </TabsList>

                    <div className="mt-4 space-y-4">
                        <TabsContent value="image" className="mt-0 space-y-4">
                            {!previewUrl ? (
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl bg-muted/30 border-muted-foreground/20 hover:bg-muted/50 hover:border-muted-foreground/40 transition-all cursor-pointer group"
                                >
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="p-3 rounded-full bg-muted group-hover:bg-background transition-colors">
                                            <Upload className="w-6 h-6 text-muted-foreground" />
                                        </div>
                                        <div className="text-sm font-medium text-muted-foreground">点击上传参考图</div>
                                        <div className="text-xs text-muted-foreground/60">支持 PNG, JPG, WEBP</div>
                                    </div>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleImageSelect}
                                        className="hidden"
                                        accept="image/*"
                                    />
                                </div>
                            ) : (
                                <div className="relative group w-full h-40 rounded-xl overflow-hidden border border-muted bg-neutral-900 flex items-center justify-center">
                                    <img src={previewUrl} className="max-w-full max-h-full object-contain" alt="Preview" />
                                    <button
                                        onClick={clearImage}
                                        className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </TabsContent>

                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground ml-1">
                                {mode === 'image' ? '运动提示词 (可选)' : '视频描述词'}
                            </label>
                            <Textarea
                                placeholder={mode === 'image' ? "描述图片的动作，例如：让人物转头微笑，背景云朵流动..." : "输入想要生成的画面描述，例如：一架客机穿梭在赛博朋克的都市霓虹之中..."}
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                className="min-h-[120px] resize-none focus-visible:ring-blue-500/30"
                            />
                        </div>
                    </div>
                </Tabs>

                <DialogFooter className="flex items-center justify-between sm:justify-between border-t pt-4 mt-2">
                    <div className="text-[10px] text-muted-foreground max-w-[240px]">
                        提示：此操作将启动本地 Chrome 自动化，请确保浏览器已保持登录状态。
                    </div>
                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading} size="sm">
                            取消
                        </Button>
                        <Button
                            onClick={handleGenerate}
                            disabled={loading || (mode === 'text' && !prompt.trim()) || (mode === 'image' && !selectedImage)}
                            className="bg-blue-600 hover:bg-blue-700 h-9 px-6 transition-all shadow-sm"
                            size="sm"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" /> 处理中
                                </span>
                            ) : (
                                "开始生成"
                            )}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
