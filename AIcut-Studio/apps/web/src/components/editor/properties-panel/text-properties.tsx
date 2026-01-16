import { Textarea } from "@/components/ui/textarea";
import { FontPicker } from "@/components/ui/font-picker";
import { FontFamily } from "@/constants/font-constants";
import { TextElement } from "@/types/timeline";
import { useTimelineStore } from "@/stores/timeline-store";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useRef } from "react";
import { PanelBaseView } from "@/components/editor/panel-base-view";
import {
  TEXT_PROPERTIES_TABS,
  isTextPropertiesTab,
  useTextPropertiesStore,
} from "@/stores/text-properties-store";
import {
  PropertyItem,
  PropertyItemLabel,
  PropertyItemValue,
} from "./property-item";
import { ColorPicker } from "@/components/ui/color-picker";
import { cn, uppercase } from "@/lib/utils";
import { Grid2x2, Mic, Play, Square, Loader2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TTS_VOICES,
  DEFAULT_VOICE_ID,
  getVoicesByLanguage,
  getVoiceById,
  LANGUAGE_NAMES,
} from "@/constants/tts-constants";

export function TextProperties({
  element,
  trackId,
}: {
  element: TextElement;
  trackId: string;
}) {
  const { updateTextElement } = useTimelineStore();
  const { activeTab, setActiveTab } = useTextPropertiesStore();
  const containerRef = useRef<HTMLDivElement>(null);
  // Local state for input values to allow temporary empty/invalid states
  const [fontSizeInput, setFontSizeInput] = useState(
    element.fontSize.toString()
  );
  const [opacityInput, setOpacityInput] = useState(
    Math.round(element.opacity * 100).toString()
  );

  // Track the last selected color for toggling
  const lastSelectedColor = useRef("#000000");

  // 试听音色相关状态
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const parseAndValidateNumber = (
    value: string,
    min: number,
    max: number,
    fallback: number
  ): number => {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) return fallback;
    return Math.max(min, Math.min(max, parsed));
  };

  const handleFontSizeChange = (value: string) => {
    setFontSizeInput(value);

    if (value.trim() !== "") {
      const fontSize = parseAndValidateNumber(value, 8, 300, element.fontSize);
      updateTextElement(trackId, element.id, { fontSize });
    }
  };

  const handleFontSizeBlur = () => {
    const fontSize = parseAndValidateNumber(
      fontSizeInput,
      8,
      300,
      element.fontSize
    );
    setFontSizeInput(fontSize.toString());
    updateTextElement(trackId, element.id, { fontSize });
  };

  const handleOpacityChange = (value: string) => {
    setOpacityInput(value);

    if (value.trim() !== "") {
      const opacityPercent = parseAndValidateNumber(
        value,
        0,
        100,
        Math.round(element.opacity * 100)
      );
      updateTextElement(trackId, element.id, { opacity: opacityPercent / 100 });
    }
  };

  const handleOpacityBlur = () => {
    const opacityPercent = parseAndValidateNumber(
      opacityInput,
      0,
      100,
      Math.round(element.opacity * 100)
    );
    setOpacityInput(opacityPercent.toString());
    updateTextElement(trackId, element.id, { opacity: opacityPercent / 100 });
  };

  // Update last selected color when a new color is picked
  const handleColorChange = (color: string) => {
    if (color !== "transparent") {
      lastSelectedColor.current = color;
    }
    updateTextElement(trackId, element.id, { backgroundColor: color });
  };

  // Toggle between transparent and last selected color
  const handleTransparentToggle = (isTransparent: boolean) => {
    const newColor = isTransparent ? "transparent" : lastSelectedColor.current;
    updateTextElement(trackId, element.id, { backgroundColor: newColor });
  };

  // 试听音色
  const handlePreviewVoice = async () => {
    const voiceId = element.voiceId || DEFAULT_VOICE_ID;
    const previewText = "这是一段试听文本。";

    // 1. 如果正在播放，停止
    if (isPreviewPlaying && previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.currentTime = 0;
      setIsPreviewPlaying(false);
      return;
    }

    setIsPreviewLoading(true);
    const previewPath = `/assets/tts/preview_${voiceId.replace(/[^a-zA-Z0-9-]/g, "_")}.mp3`;

    // 2. 辅助函数：播放音频
    const playAudio = async () => {
      if (!previewAudioRef.current) {
        previewAudioRef.current = new Audio();
        previewAudioRef.current.onended = () => setIsPreviewPlaying(false);
        previewAudioRef.current.onerror = () => {
          setIsPreviewPlaying(false);
          toast.error("播放失败");
        };
      }
      // 添加时间戳防止浏览器强缓存旧内容，但保留一定时间的缓存 (10秒内不强制刷新)
      const timestamp = Math.floor(Date.now() / 10000) * 10000;
      previewAudioRef.current.src = previewPath + "?t=" + timestamp;

      try {
        await previewAudioRef.current.play();
        setIsPreviewPlaying(true);
        setIsPreviewLoading(false);
        return true;
      } catch (e) {
        console.error("Play failed:", e);
        return false;
      }
    };

    // 3. 先尝试直接检查文件是否存在 (利用 HEAD 请求)
    try {
      const checkResponse = await fetch(previewPath, { method: "HEAD" });
      if (checkResponse.ok) {
        const size = checkResponse.headers.get("content-length");
        if (size && parseInt(size) > 1000) {
          // 文件存在且大小正常，直接播放
          if (await playAudio()) return;
        }
      }
    } catch (e) {
      // 忽略检查错误，继续尝试生成
    }

    // 4. 请求生成试听音频
    try {
      const response = await fetch("/api/ai-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "requestTask",
          data: {
            taskType: "tts_preview",
            voiceId,
            text: previewText
          }
        })
      });

      if (!response.ok) {
        throw new Error("请求失败");
      }

      toast.info(`正在生成 ${getVoiceById(voiceId)?.name || voiceId} 的试听...`);

      // 5. 轮询检查文件是否生成完成
      let attempts = 0;
      const maxAttempts = 30; // 增加重试次数

      const checkFile = async () => {
        try {
          const checkResponse = await fetch(previewPath + "?t=" + Date.now(), { method: "HEAD" });
          if (checkResponse.ok) {
            const size = checkResponse.headers.get("content-length");
            // 确保文件已写入数据
            if (size && parseInt(size) > 100) {
              await playAudio();
              return;
            }
          }
        } catch { } // 忽略轮询中的错误

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkFile, 500);
        } else {
          setIsPreviewLoading(false);
          toast.error("试听生成超时，请重试");
        }
      };

      // 稍等一下再开始检查
      setTimeout(checkFile, 1500);

    } catch (err) {
      setIsPreviewLoading(false);
      toast.error("试听请求失败");
    }
  };

  return (
    <PanelBaseView
      defaultTab="style"
      value={activeTab}
      onValueChange={(v) => {
        if (isTextPropertiesTab(v)) setActiveTab(v);
      }}
      ref={containerRef}
      tabs={TEXT_PROPERTIES_TABS.map((t) => ({
        value: t.value,
        label: t.label,
        content:
          t.value === "transform" ? (
            <div className="space-y-6">
              <PropertyItem direction="column">
                <PropertyItemLabel>水平位置 (X)</PropertyItemLabel>
                <PropertyItemValue>
                  <div className="flex items-center gap-2">
                    <Slider
                      value={[element.x]}
                      min={0}
                      max={1920}
                      step={1}
                      onValueChange={([value]) => {
                        updateTextElement(trackId, element.id, { x: value });
                      }}
                      className="w-full"
                    />
                    <Input
                      type="number"
                      value={element.x}
                      onChange={(e) => updateTextElement(trackId, element.id, { x: parseInt(e.target.value) || 0 })}
                      className="w-16 px-2 !text-xs h-7 rounded-sm text-center bg-panel-accent"
                    />
                  </div>
                </PropertyItemValue>
              </PropertyItem>
              <PropertyItem direction="column">
                <PropertyItemLabel>垂直位置 (Y)</PropertyItemLabel>
                <PropertyItemValue>
                  <div className="flex items-center gap-2">
                    <Slider
                      value={[element.y]}
                      min={0}
                      max={1080}
                      step={1}
                      onValueChange={([value]) => {
                        updateTextElement(trackId, element.id, { y: value });
                      }}
                      className="w-full"
                    />
                    <Input
                      type="number"
                      value={element.y}
                      onChange={(e) => updateTextElement(trackId, element.id, { y: parseInt(e.target.value) || 0 })}
                      className="w-16 px-2 !text-xs h-7 rounded-sm text-center bg-panel-accent"
                    />
                  </div>
                </PropertyItemValue>
              </PropertyItem>
              <PropertyItem direction="column">
                <PropertyItemLabel>旋转</PropertyItemLabel>
                <PropertyItemValue>
                  <div className="flex items-center gap-2">
                    <Slider
                      value={[element.rotation || 0]}
                      min={-180}
                      max={180}
                      step={1}
                      onValueChange={([value]) => {
                        updateTextElement(trackId, element.id, { rotation: value });
                      }}
                      className="w-full"
                    />
                    <Input
                      type="number"
                      value={element.rotation || 0}
                      onChange={(e) => updateTextElement(trackId, element.id, { rotation: parseInt(e.target.value) || 0 })}
                      className="w-16 px-2 !text-xs h-7 rounded-sm text-center bg-panel-accent"
                    />
                  </div>
                </PropertyItemValue>
              </PropertyItem>
            </div>
          ) : (
            <div className="space-y-6">
              <Textarea
                placeholder="在此输入文本..."
                defaultValue={element.content}
                className="min-h-18 resize-none bg-panel-accent"
                onChange={(e) =>
                  updateTextElement(trackId, element.id, {
                    content: e.target.value,
                  })
                }
              />
              <PropertyItem direction="column">
                <PropertyItemLabel>字体</PropertyItemLabel>
                <PropertyItemValue>
                  <FontPicker
                    defaultValue={element.fontFamily}
                    onValueChange={(value: FontFamily) =>
                      updateTextElement(trackId, element.id, {
                        fontFamily: value,
                      })
                    }
                  />
                </PropertyItemValue>
              </PropertyItem>
              <PropertyItem direction="column">
                <PropertyItemLabel>样式</PropertyItemLabel>
                <PropertyItemValue>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={
                        element.fontWeight === "bold" ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() =>
                        updateTextElement(trackId, element.id, {
                          fontWeight:
                            element.fontWeight === "bold" ? "normal" : "bold",
                        })
                      }
                      className="h-8 px-3 font-bold"
                    >
                      B
                    </Button>
                    <Button
                      variant={
                        element.fontStyle === "italic" ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() =>
                        updateTextElement(trackId, element.id, {
                          fontStyle:
                            element.fontStyle === "italic"
                              ? "normal"
                              : "italic",
                        })
                      }
                      className="h-8 px-3 italic"
                    >
                      I
                    </Button>
                    <Button
                      variant={
                        element.textDecoration === "underline"
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() =>
                        updateTextElement(trackId, element.id, {
                          textDecoration:
                            element.textDecoration === "underline"
                              ? "none"
                              : "underline",
                        })
                      }
                      className="h-8 px-3 underline"
                    >
                      U
                    </Button>
                    <Button
                      variant={
                        element.textDecoration === "line-through"
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() =>
                        updateTextElement(trackId, element.id, {
                          textDecoration:
                            element.textDecoration === "line-through"
                              ? "none"
                              : "line-through",
                        })
                      }
                      className="h-8 px-3 line-through"
                    >
                      S
                    </Button>
                  </div>
                </PropertyItemValue>
              </PropertyItem>
              <PropertyItem direction="column">
                <PropertyItemLabel>字号</PropertyItemLabel>
                <PropertyItemValue>
                  <div className="flex items-center gap-2">
                    <Slider
                      value={[element.fontSize]}
                      min={8}
                      max={300}
                      step={1}
                      onValueChange={([value]) => {
                        updateTextElement(trackId, element.id, {
                          fontSize: value,
                        });
                        setFontSizeInput(value.toString());
                      }}
                      className="w-full"
                    />
                    <Input
                      type="number"
                      value={fontSizeInput}
                      min={8}
                      max={300}
                      onChange={(e) => handleFontSizeChange(e.target.value)}
                      onBlur={handleFontSizeBlur}
                      className="w-12 px-2 !text-xs h-7 rounded-sm text-center bg-panel-accent
               [appearance:textfield]
               [&::-webkit-outer-spin-button]:appearance-none
               [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                </PropertyItemValue>
              </PropertyItem>
              <PropertyItem direction="column">
                <PropertyItemLabel>颜色</PropertyItemLabel>
                <PropertyItemValue>
                  <ColorPicker
                    value={uppercase(
                      (element.color || "FFFFFF").replace("#", "")
                    )}
                    onChange={(color) => {
                      updateTextElement(trackId, element.id, {
                        color: `#${color}`,
                      });
                    }}
                    containerRef={containerRef}
                  />
                </PropertyItemValue>
              </PropertyItem>
              <PropertyItem direction="column">
                <PropertyItemLabel>不透明度</PropertyItemLabel>
                <PropertyItemValue>
                  <div className="flex items-center gap-2">
                    <Slider
                      value={[element.opacity * 100]}
                      min={0}
                      max={100}
                      step={1}
                      onValueChange={([value]) => {
                        updateTextElement(trackId, element.id, {
                          opacity: value / 100,
                        });
                        setOpacityInput(value.toString());
                      }}
                      className="w-full"
                    />
                    <Input
                      type="number"
                      value={opacityInput}
                      min={0}
                      max={100}
                      onChange={(e) => handleOpacityChange(e.target.value)}
                      onBlur={handleOpacityBlur}
                      className="w-12 !text-xs h-7 rounded-sm text-center bg-panel-accent
               [appearance:textfield]
               [&::-webkit-outer-spin-button]:appearance-none
               [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                </PropertyItemValue>
              </PropertyItem>
              <PropertyItem direction="column">
                <PropertyItemLabel>背景</PropertyItemLabel>
                <PropertyItemValue>
                  <div className="flex items-center gap-2">
                    <ColorPicker
                      value={uppercase(
                        element.backgroundColor === "transparent"
                          ? lastSelectedColor.current.replace("#", "")
                          : (element.backgroundColor || "#000000").replace(
                            "#",
                            ""
                          )
                      )}
                      onChange={(color) => handleColorChange(`#${color}`)}
                      containerRef={containerRef}
                      className={
                        element.backgroundColor === "transparent"
                          ? "opacity-50 pointer-events-none"
                          : ""
                      }
                    />

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() =>
                            handleTransparentToggle(
                              element.backgroundColor !== "transparent"
                            )
                          }
                          className="size-9 rounded-full bg-panel-accent p-0 overflow-hidden"
                        >
                          <Grid2x2
                            className={cn(
                              "text-foreground",
                              element.backgroundColor === "transparent" &&
                              "text-primary"
                            )}
                          />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {element.backgroundColor === "transparent" ? "启用背景色" : "禁用背景色"}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </PropertyItemValue>
              </PropertyItem>
              {/* TTS 音色选择 */}
              <PropertyItem direction="column">
                <PropertyItemLabel>
                  <div className="flex items-center gap-1.5">
                    <Mic className="h-3.5 w-3.5 text-green-500" />
                    <span>语音音色</span>
                  </div>
                </PropertyItemLabel>
                <PropertyItemValue>
                  <Select
                    value={element.voiceId || DEFAULT_VOICE_ID}
                    onValueChange={(value) =>
                      updateTextElement(trackId, element.id, { voiceId: value })
                    }
                  >
                    <SelectTrigger className="w-full bg-panel-accent">
                      <SelectValue placeholder="选择音色" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(getVoicesByLanguage()).map(([lang, voices]) => (
                        <SelectGroup key={lang}>
                          <SelectLabel className="text-xs text-muted-foreground">
                            {LANGUAGE_NAMES[lang] || lang}
                          </SelectLabel>
                          {voices.map((voice) => (
                            <SelectItem key={voice.id} value={voice.id}>
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "text-xs px-1.5 py-0.5 rounded",
                                  voice.gender === "female"
                                    ? "bg-pink-500/20 text-pink-500"
                                    : "bg-blue-500/20 text-blue-500"
                                )}>
                                  {voice.gender === "female" ? "女" : "男"}
                                </span>
                                <span>{voice.name}</span>
                                {voice.description && (
                                  <span className="text-xs text-muted-foreground">
                                    ({voice.description})
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2 mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8"
                      onClick={handlePreviewVoice}
                      disabled={isPreviewLoading}
                    >
                      {isPreviewLoading ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      ) : isPreviewPlaying ? (
                        <Square className="h-3.5 w-3.5 mr-1.5" />
                      ) : (
                        <Play className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      {isPreviewLoading ? "生成中..." : isPreviewPlaying ? "停止" : "试听音色"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    右键点击字幕时使用此音色生成语音
                  </p>
                </PropertyItemValue>
              </PropertyItem>
            </div>
          ),
      }))}
    />
  );
}
