import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Audio, Img, Video, OffthreadVideo, staticFile, Sequence, getRemotionEnvironment } from 'remotion';
import { useState, useEffect, useRef } from 'react';
import { TypewriterEffect, FadeEffect, FloatingEffect } from './EffectsLibrary';
// 取消静态导入，改为由 Root.tsx 动态传入 projectData
// import projectData from './project_data.json';

// 检测是否为预览模式（非渲染模式）
const isPreviewMode = () => {
    const env = getRemotionEnvironment();
    return env.isStudio || env.isPlayer;
};

const ClipItem: React.FC<{
    clip: any;
    track: any;
    isSelected: boolean;
    onContextMenu: (e: React.MouseEvent, id: string) => void;
    fps: number;
    showDebugUI: boolean;
}> = ({ clip, track, isSelected, onContextMenu, fps, showDebugUI }) => {
    const seqFrame = useCurrentFrame();
    const durationInFrames = Math.round(clip.duration * fps);

    if (track.type === 'image' || track.type === 'video') {
        const assetPath = clip.path || '';
        const normalizedPath = assetPath.startsWith('/') ? assetPath.slice(1) : assetPath;
        const assetUrl = staticFile(normalizedPath);

        const isVideoAsset = /\.(mp4|webm|mov|m4v)$/i.test(normalizedPath);

        // 调试日志：帮助诊断视频缩放问题
        useEffect(() => {
            if (isVideoAsset && seqFrame === 0) {
                console.log(`[Video Debug] Clip: ${clip.id}, Path: ${normalizedPath}, Duration: ${durationInFrames} frames`);
            }
        }, []);

        // Ken Burns 缩放动画
        const rawScale = interpolate(
            seqFrame,
            [0, durationInFrames],
            [1.0, 1.25],
            { extrapolateRight: 'clamp' }
        );
        const scale = Math.round(rawScale * 1000000) / 1000000;

        // 调试：输出当前帧和缩放值
        if (isVideoAsset && seqFrame % 60 === 0) {
            console.log(`[Scale Debug] Clip: ${clip.id}, Frame: ${seqFrame}, Scale: ${scale.toFixed(6)}, Size: ${(scale * 100).toFixed(2)}%`);
        }

        // 视频使用 OffthreadVideo（在独立线程解码，渲染为静态帧）
        // 这样可以安全地应用 transform 缩放
        if (isVideoAsset) {
            return (
                <AbsoluteFill
                    style={{
                        overflow: 'hidden',
                        backgroundColor: 'black',
                        zIndex: (isSelected && showDebugUI) ? 999 : 1,
                    }}
                    onContextMenu={(e) => showDebugUI && onContextMenu(e, clip.id)}
                >
                    {/* 使用 transform 缩放包装层 + rotate(0.02deg) 修复抖动 */}
                    <div style={{
                        width: '100%',
                        height: '100%',
                        // 添加极小的旋转角度来修复浏览器的视频缩放抖动问题
                        transform: `scale3d(${scale}, ${scale}, 1) rotate(0.02deg)`,
                        transformOrigin: '50% 50%',
                        willChange: 'transform',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center'
                    }}>
                        {/* OffthreadVideo: 在独立线程解码，渲染为静态图像帧 */}
                        <OffthreadVideo
                            src={assetUrl}
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                            }}
                            muted
                            volume={0}
                        />
                    </div>

                    {/* 选中高亮框 */}
                    {showDebugUI && isSelected && (
                        <AbsoluteFill style={{
                            border: '4px solid #00E5FF',
                            pointerEvents: 'none',
                            boxShadow: 'inset 0 0 20px rgba(0,229,255,0.3)',
                            zIndex: 10
                        }} />
                    )}
                    {showDebugUI && isSelected && (
                        <div style={{
                            position: 'absolute', top: 10, left: 10,
                            background: '#00E5FF', color: 'black', padding: '4px 8px',
                            fontWeight: 'bold', fontSize: 20, zIndex: 1000, pointerEvents: 'none'
                        }}>
                            {clip.id} (OffthreadVideo)
                        </div>
                    )}
                </AbsoluteFill>
            );
        }

        // 图片：使用 transform 缩放（已验证稳定）
        return (
            <AbsoluteFill
                style={{
                    overflow: 'hidden',
                    backgroundColor: 'black',
                    zIndex: (isSelected && showDebugUI) ? 999 : 1,
                }}
                onContextMenu={(e) => showDebugUI && onContextMenu(e, clip.id)}
            >
                <div style={{
                    width: '100%',
                    height: '100%',
                    transform: `scale3d(${scale}, ${scale}, 1) rotate(0.01deg)`,
                    transformOrigin: '50% 50%',
                    willChange: 'transform',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center'
                }}>
                    <Img
                        src={assetUrl}
                        style={{
                            width: '100.5%',
                            height: '100.5%',
                            objectFit: 'cover',
                        }}
                    />
                </div>

                {/* 选中高亮框 - 仅在预览模式显示 */}
                {showDebugUI && isSelected && (
                    <AbsoluteFill
                        style={{
                            border: '4px solid #00E5FF',
                            pointerEvents: 'none',
                            boxShadow: 'inset 0 0 20px rgba(0,229,255,0.3)',
                            zIndex: 10
                        }}
                    />
                )}

                {/* 选中 ID 标签 - 仅在预览模式显示 */}
                {showDebugUI && isSelected && (
                    <div style={{
                        position: 'absolute', top: 10, left: 10,
                        background: '#00E5FF', color: 'black', padding: '4px 8px',
                        fontWeight: 'bold', fontSize: 20, zIndex: 1000, pointerEvents: 'none'
                    }}>
                        {clip.id}
                    </div>
                )}
            </AbsoluteFill>
        );
    }


    if (track.type === 'text') {
        const text = clip.text || '';

        // 动态特效组装逻辑
        const renderContent = () => {
            // 优先使用 style 中的 color，其次是 clip 顶层的 color，默认为白色
            const textColor = clip.style?.color || clip.color || 'white';
            // 合并所有自定义样式
            const customStyle = clip.style || {};

            const baseContent = <span style={{
                color: textColor,
                ...customStyle
            }}>{text}</span>;

            // 1. 如果没有定义特效，使用默认组合（保持现有视觉效果）
            if (!clip.effects || clip.effects.length === 0) {
                return (
                    <FadeEffect frame={seqFrame} duration={durationInFrames}>
                        <TypewriterEffect
                            frame={seqFrame}
                            duration={durationInFrames}
                            text={text}
                            settings={{
                                fontFamily: 'SimSun, "宋体", Songti SC, STSong, serif',
                                fontSize: 42,
                                fontWeight: 400,
                                color: textColor,
                                ...customStyle
                            }}
                        >
                            {baseContent}
                        </TypewriterEffect>
                    </FadeEffect>
                );
            }

            // 2. 如果定义了特效数组，按顺序递归包装组件
            return clip.effects.reduceRight((acc: any, effect: any) => {
                const props = {
                    frame: seqFrame,
                    duration: durationInFrames,
                    settings: effect.props
                };

                switch (effect.type) {
                    case 'Fade':
                        return <FadeEffect {...props}>{acc}</FadeEffect>;
                    case 'Typewriter':
                        return <TypewriterEffect {...props} text={text}>{acc}</TypewriterEffect>;
                    case 'Floating':
                        return <FloatingEffect {...props}>{acc}</FloatingEffect>;
                    default:
                        return acc;
                }
            }, baseContent);
        };

        return (
            <AbsoluteFill
                style={{
                    zIndex: (isSelected && showDebugUI) ? 999 : 2,
                    pointerEvents: 'none',
                }}
            >
                <div
                    style={{
                        position: 'absolute',
                        left: `${clip.position.x * 100}%`,
                        top: `${clip.position.y * 100}%`,
                        transform: 'translate(-50%, -50%)',
                        width: 'auto',
                        height: 'auto',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}
                >
                    <div
                        onContextMenu={(e) => {
                            if (!showDebugUI) return;
                            e.stopPropagation();
                            onContextMenu(e, clip.id);
                        }}
                        style={{
                            textAlign: 'center',
                            whiteSpace: 'nowrap',
                            pointerEvents: showDebugUI ? 'auto' : 'none',
                            border: (showDebugUI && isSelected) ? '2px solid #00E5FF' : 'none',
                            textShadow: clip.style?.textShadow || 'none',
                            lineHeight: 1.4,
                            backfaceVisibility: 'hidden',
                            transform: 'translateZ(0)',
                            WebkitFontSmoothing: 'antialiased'
                        }}
                    >
                        {renderContent()}
                    </div>
                </div>
            </AbsoluteFill>
        );
    }

    if (track.type === 'audio') {
        const assetPath = clip.path || '';
        const normalizedPath = assetPath.startsWith('/') ? assetPath.slice(1) : assetPath;
        const assetUrl = staticFile(normalizedPath);

        return (
            <Audio
                src={assetUrl}
                volume={clip.volume !== undefined ? clip.volume : 1.0}
            />
        );
    }

    return null;
};

export const MemoryVideo: React.FC<{ initialProjectData: any }> = ({ initialProjectData }) => {
    const projectData = initialProjectData;
    const { fps } = useVideoConfig();
    const frame = useCurrentFrame();
    const [selectedId, setSelectedId] = useState<string | null>(null);

    // 检测是否为预览模式（仅在 Studio 或 Player 中显示调试 UI）
    const showDebugUI = isPreviewMode();

    const handleClipContextMenu = (e: React.MouseEvent, clipId: string) => {
        e.preventDefault();
        e.stopPropagation();
        setSelectedId(clipId);
        navigator.clipboard.writeText(clipId).catch(console.error);
        fetch('http://localhost:8001/api/select', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clip_id: clipId })
        }).catch(console.warn);
    };

    const handleBgContextMenu = (e: React.MouseEvent) => {
        if (!showDebugUI) return;
        e.preventDefault();
        const currentTime = (frame / fps).toFixed(2);
        const timeStr = `${currentTime}s`;
        setSelectedId(null);
        navigator.clipboard.writeText(timeStr).catch(console.error);
    };

    return (
        <AbsoluteFill
            style={{ backgroundColor: 'black' }}
            onContextMenu={handleBgContextMenu}
        >
            {projectData.tracks.map((track) => (
                track.clips.map((clip) => {
                    // 视频和图片类型的轨道需要预加载以避免切换时的卡顿
                    const isMediaTrack = track.type === 'video' || track.type === 'image';
                    const premountFrames = isMediaTrack ? 60 : 0; // 预加载 60 帧（2秒）

                    return (
                        <Sequence
                            key={clip.id}
                            from={Math.round(clip.start * fps)}
                            durationInFrames={Math.round(clip.duration * fps)}
                            name={clip.name || clip.id}
                            premountFor={premountFrames}
                        >
                            <ClipItem
                                clip={clip}
                                track={track}
                                isSelected={selectedId === clip.id}
                                onContextMenu={handleClipContextMenu}
                                fps={fps}
                                showDebugUI={showDebugUI}
                            />
                        </Sequence>
                    );
                })
            ))}

            {/* 底部 HUD 选择器 - 仅在预览模式显示 */}
            {showDebugUI && <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                width: '100%',
                padding: '10px',
                background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 100%)',
                display: 'flex',
                gap: '10px',
                zIndex: 2000,
                flexWrap: 'wrap',
                alignItems: 'flex-end',
                pointerEvents: 'auto'
            }}>
                <div style={{ color: '#888', fontSize: 12, marginBottom: 4, width: '100%' }}>
                    🔴 当前画面包含素材 (右键复制 ID):
                </div>
                {projectData.tracks.flatMap(track =>
                    track.clips
                        .filter(clip => {
                            const startf = clip.start * fps;
                            const endf = (clip.start + clip.duration) * fps;
                            return frame >= startf && frame < endf;
                        })
                        .map(clip => (
                            <div
                                key={'hud-' + clip.id}
                                onClick={(e) => { e.stopPropagation(); setSelectedId(clip.id); }}
                                onContextMenu={(e) => handleClipContextMenu(e, clip.id)}
                                style={{
                                    background: selectedId === clip.id ? '#00E5FF' : '#333',
                                    color: selectedId === clip.id ? '#000' : '#fff',
                                    padding: '4px 12px',
                                    borderRadius: '4px',
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                <span style={{
                                    width: 8, height: 8, borderRadius: '50%',
                                    background: track.type === 'video' ? '#3a96dd' :
                                        track.type === 'audio' ? '#4caf50' : '#ff9800'
                                }}></span>
                                {clip.name || clip.id}
                            </div>
                        ))
                )}
            </div>}
        </AbsoluteFill>
    );
};
