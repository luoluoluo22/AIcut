// TTS 音色常量配置
export interface VoiceOption {
    id: string;
    name: string;
    gender: "male" | "female";
    language: string;
    description?: string;
}

// 默认可用的音色列表
// 这里可以根据实际使用的 TTS 服务（如 Edge TTS、Azure、OpenAI 等）进行配置
export const TTS_VOICES: VoiceOption[] = [
    // 中文女声
    { id: "zh-CN-XiaoxiaoNeural", name: "晓晓", gender: "female", language: "zh-CN", description: "温柔甜美" },
    { id: "zh-CN-XiaoyiNeural", name: "晓伊", gender: "female", language: "zh-CN", description: "清新自然" },
    // { id: "zh-CN-XiaohanNeural", name: "晓涵", gender: "female", language: "zh-CN", description: "知性优雅" },
    // { id: "zh-CN-XiaomengNeural", name: "晓梦", gender: "female", language: "zh-CN", description: "活泼可爱" },
    // { id: "zh-CN-XiaoruiNeural", name: "晓睿", gender: "female", language: "zh-CN", description: "成熟稳重" },
    // { id: "zh-CN-XiaoshuangNeural", name: "晓双", gender: "female", language: "zh-CN", description: "甜美童音" },

    // 中文男声
    { id: "zh-CN-YunxiNeural", name: "云希", gender: "male", language: "zh-CN", description: "阳光少年" },
    { id: "zh-CN-YunjianNeural", name: "云健", gender: "male", language: "zh-CN", description: "沉稳磁性" },
    { id: "zh-CN-YunyangNeural", name: "云扬", gender: "male", language: "zh-CN", description: "专业播音" },
    { id: "zh-CN-YunxiaNeural", name: "云夏", gender: "male", language: "zh-CN", description: "活力青年" },

    // 英文
    { id: "en-US-JennyNeural", name: "Jenny", gender: "female", language: "en-US", description: "American Female" },
    { id: "en-US-GuyNeural", name: "Guy", gender: "male", language: "en-US", description: "American Male" },
    { id: "en-GB-SoniaNeural", name: "Sonia", gender: "female", language: "en-GB", description: "British Female" },
    { id: "en-GB-RyanNeural", name: "Ryan", gender: "male", language: "en-GB", description: "British Male" },
];

// 默认音色
export const DEFAULT_VOICE_ID = "zh-CN-XiaoxiaoNeural";

// 根据 ID 获取音色信息
export function getVoiceById(id: string): VoiceOption | undefined {
    return TTS_VOICES.find(v => v.id === id);
}

// 按语言分组的音色
export function getVoicesByLanguage(): Record<string, VoiceOption[]> {
    return TTS_VOICES.reduce((acc, voice) => {
        const lang = voice.language;
        if (!acc[lang]) {
            acc[lang] = [];
        }
        acc[lang].push(voice);
        return acc;
    }, {} as Record<string, VoiceOption[]>);
}

// 语言名称映射
export const LANGUAGE_NAMES: Record<string, string> = {
    "zh-CN": "中文",
    "en-US": "英语 (美国)",
    "en-GB": "英语 (英国)",
};
