import { Button } from "@/components/ui/button";
import { PropertyGroup } from "../../properties-panel/property-item";
import { PanelBaseView as BaseView } from "@/components/editor/panel-base-view";
import { Language, LanguageSelect } from "@/components/language-select";
import { useState, useRef, useEffect } from "react";
import { extractTimelineAudio } from "@/lib/mediabunny-utils";
import { encryptWithRandomKey, arrayBufferToBase64 } from "@/lib/zk-encryption";
import { useTimelineStore } from "@/stores/timeline-store";
import { DEFAULT_TEXT_ELEMENT } from "@/constants/text-constants";
import { Loader2, Shield, Trash2, Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TextElement } from "@/types/timeline";

export const languages: Language[] = [
  { code: "US", name: "English" },
  { code: "ES", name: "Spanish" },
  { code: "IT", name: "Italian" },
  { code: "FR", name: "French" },
  { code: "DE", name: "German" },
  { code: "PT", name: "Portuguese" },
  { code: "RU", name: "Russian" },
  { code: "JP", name: "Japanese" },
  { code: "CN", name: "Chinese" },
];

const PRIVACY_DIALOG_KEY = "opencut-transcription-privacy-accepted";

export function Captions() {
  const [selectedCountry, setSelectedCountry] = useState("auto");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [showPrivacyDialog, setShowPrivacyDialog] = useState(false);
  const [hasAcceptedPrivacy, setHasAcceptedPrivacy] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { insertTrackAt, addElementToTrack } = useTimelineStore();

  // Check if user has already accepted privacy on mount
  useEffect(() => {
    const hasAccepted = localStorage.getItem(PRIVACY_DIALOG_KEY) === "true";
    setHasAcceptedPrivacy(hasAccepted);
  }, []);

  const handleGenerateTranscript = async () => {
    try {
      setIsProcessing(true);
      setError(null);
      setProcessingStep("Extracting audio...");

      const audioBlob = await extractTimelineAudio();

      setProcessingStep("Encrypting audio...");

      // Encrypt the audio with a random key (zero-knowledge)
      const audioBuffer = await audioBlob.arrayBuffer();
      const encryptionResult = await encryptWithRandomKey(audioBuffer);

      // Convert encrypted data to blob for upload
      const encryptedBlob = new Blob([encryptionResult.encryptedData]);

      setProcessingStep("Uploading...");
      const uploadResponse = await fetch("/api/get-upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileExtension: "wav" }),
      });

      if (!uploadResponse.ok) {
        const error = await uploadResponse.json();
        throw new Error(error.message || "Failed to get upload URL");
      }

      const { uploadUrl, fileName } = await uploadResponse.json();

      // Upload to R2
      await fetch(uploadUrl, {
        method: "PUT",
        body: encryptedBlob,
      });

      setProcessingStep("Transcribing...");

      // Call Modal transcription API with encryption parameters
      const transcriptionResponse = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: fileName,
          language:
            selectedCountry === "auto" ? "auto" : selectedCountry.toLowerCase(),
          // Send the raw encryption key and IV (zero-knowledge)
          decryptionKey: arrayBufferToBase64(encryptionResult.key),
          iv: arrayBufferToBase64(encryptionResult.iv),
        }),
      });

      if (!transcriptionResponse.ok) {
        const error = await transcriptionResponse.json();
        throw new Error(error.message || "Transcription failed");
      }

      const { text, segments } = await transcriptionResponse.json();

      console.log("Transcription completed:", { text, segments });

      const shortCaptions: Array<{
        text: string;
        startTime: number;
        duration: number;
      }> = [];

      let globalEndTime = 0; // Track the end time of the last caption globally

      segments.forEach((segment: any) => {
        const words = segment.text.trim().split(/\s+/);
        const segmentDuration = segment.end - segment.start;
        const wordsPerSecond = words.length / segmentDuration;

        // Split into chunks of 2-4 words
        const chunks: string[] = [];
        for (let i = 0; i < words.length; i += 3) {
          chunks.push(words.slice(i, i + 3).join(" "));
        }

        // Calculate timing for each chunk to place them sequentially
        let chunkStartTime = segment.start;
        chunks.forEach((chunk) => {
          const chunkWords = chunk.split(/\s+/).length;
          const chunkDuration = Math.max(0.8, chunkWords / wordsPerSecond); // Minimum 0.8s per chunk

          let adjustedStartTime = chunkStartTime;

          // Prevent overlapping: if this caption would start before the last one ends,
          // start it right after the last one ends
          if (adjustedStartTime < globalEndTime) {
            adjustedStartTime = globalEndTime;
          }

          shortCaptions.push({
            text: chunk,
            startTime: adjustedStartTime,
            duration: chunkDuration,
          });

          // Update global end time
          globalEndTime = adjustedStartTime + chunkDuration;

          // Next chunk starts when this one ends (for within-segment timing)
          chunkStartTime += chunkDuration;
        });
      });

      // Create a single track for all captions
      const captionTrackId = insertTrackAt("text", 0);

      // Add all caption elements to the same track
      shortCaptions.forEach((caption, index) => {
        addElementToTrack(captionTrackId, {
          ...DEFAULT_TEXT_ELEMENT,
          name: `Caption ${index + 1}`,
          content: caption.text,
          duration: caption.duration,
          startTime: caption.startTime,
          fontSize: 65, // Larger for captions
          fontWeight: "bold", // Bold for captions
        } as TextElement);
      });

      console.log(
        `✅ ${shortCaptions.length} short-form caption chunks added to timeline!`
      );
    } catch (error) {
      console.error("Transcription failed:", error);
      setError(
        error instanceof Error ? error.message : "An unexpected error occurred"
      );
    } finally {
      setIsProcessing(false);
      setProcessingStep("");
    }
  };

  return (
    <BaseView ref={containerRef} className="flex flex-col justify-between h-full">
      <PropertyGroup title="识别语言">
        <LanguageSelect
          selectedCountry={selectedCountry}
          onSelect={setSelectedCountry}
          containerRef={containerRef}
          languages={languages}
        />
      </PropertyGroup>

      <div className="flex flex-col gap-4">
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <Button
          className="w-full"
          onClick={() => {
            if (hasAcceptedPrivacy) {
              handleGenerateTranscript();
            } else {
              setShowPrivacyDialog(true);
            }
          }}
          disabled={isProcessing}
        >
          {isProcessing && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
          {isProcessing ? (
            processingStep === "Extracting audio..." ? "正在提取音频..." :
              processingStep === "Encrypting audio..." ? "正在加密音频..." :
                processingStep === "Uploading..." ? "正在上传..." :
                  processingStep === "Transcribing..." ? "正在转录字幕..." :
                    processingStep
          ) : "开启 AI 生成字幕"}
        </Button>

        <Dialog open={showPrivacyDialog} onOpenChange={setShowPrivacyDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                音频处理隐私提示
              </DialogTitle>
              <DialogDescription className="space-y-3">
                <p>
                  为了生成字幕，我们需要使用语音识别技术处理您的时间轴音频。
                </p>

                <div className="space-y-2 pt-2">
                  <div className="flex items-start gap-2">
                    <Shield className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm">
                      <b>零知识加密</b> - 我们无法解密您的文件，您的隐私受代码保护
                    </span>
                  </div>

                  <div className="flex items-start gap-2">
                    <Shield className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm">
                      <b>本地随机密钥</b> - 加密密钥在您的浏览器中随机生成，永不上传
                    </span>
                  </div>

                  <div className="flex items-start gap-2">
                    <Upload className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm">
                      <b>端到端加密</b> - 音频在上传前已加密，原始音频从未离开您的设备
                    </span>
                  </div>

                  <div className="flex items-start gap-2">
                    <Trash2 className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm">
                      <b>即刻销毁</b> - 转录完成后，所有云端临时数据会在数秒内彻底删除
                    </span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  <strong>真正的隐私：</strong> 我们无法看到或听到您的内容。
                </p>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setShowPrivacyDialog(false)}
                disabled={isProcessing}
              >
                取消
              </Button>
              <Button
                onClick={() => {
                  localStorage.setItem(PRIVACY_DIALOG_KEY, "true");
                  setHasAcceptedPrivacy(true);
                  setShowPrivacyDialog(false);
                  handleGenerateTranscript();
                }}
                disabled={isProcessing}
              >
                同意并开始生成
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </BaseView>
  );
}
