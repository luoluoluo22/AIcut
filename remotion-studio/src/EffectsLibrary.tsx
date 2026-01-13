import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';

// 基础特效接口
export interface EffectProps {
    children: React.ReactNode;
    frame: number;
    duration: number;
    settings?: any;
}

/**
 * 渐隐渐出特效
 */
export const FadeEffect: React.FC<EffectProps> = ({ children, frame, duration, settings }) => {
    const fadeInFrames = settings?.in || 20;
    const fadeOutFrames = settings?.out || 20;

    let opacity = 1;
    if (frame < fadeInFrames) {
        opacity = interpolate(frame, [0, fadeInFrames], [0, 1], { extrapolateRight: 'clamp' });
    } else if (frame > duration - fadeOutFrames) {
        opacity = interpolate(frame, [duration - fadeOutFrames, duration], [1, 0], { extrapolateRight: 'clamp' });
    }

    return <div style={{ opacity, width: '100%', height: '100%' }}>{children}</div>;
};

/**
 * 逐字打字机效果 (针对文本)
 */
export const TypewriterEffect: React.FC<EffectProps & { text: string }> = ({
    children,
    frame,
    text,
    settings
}) => {
    const charDelay = settings?.delay || 3;
    const charFadeDuration = settings?.fade || 10;
    const fontFamily = settings?.fontFamily || 'serif';
    const fontSize = settings?.fontSize || 42;
    const fontWeight = settings?.fontWeight || 400;
    const color = settings?.color || 'white';
    const letterSpacing = settings?.letterSpacing || '0.1em';

    const chars = text.split('');

    return (
        <div style={{ display: 'flex', whiteSpace: 'nowrap' }}>
            {chars.map((char, index) => {
                const charStart = index * charDelay;
                const charEnd = charStart + charFadeDuration;

                const opacity = interpolate(
                    frame,
                    [charStart, charEnd],
                    [0, 1],
                    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
                );

                return (
                    <span
                        key={index}
                        style={{
                            opacity,
                            display: 'inline-block',
                            fontFamily,
                            fontSize,
                            fontWeight,
                            color,
                            letterSpacing,
                        }}
                    >
                        {char}
                    </span>
                );
            })}
        </div>
    );
};

/**
 * 轻微浮动/缩放效果
 */
export const FloatingEffect: React.FC<EffectProps> = ({ children, frame, duration, settings }) => {
    const startScale = settings?.start || 1.0;
    const endScale = settings?.end || 1.05;

    const scale = interpolate(
        frame,
        [0, duration],
        [startScale, endScale],
        { extrapolateRight: 'clamp' }
    );

    return (
        <div style={{
            transform: `scale3d(${scale}, ${scale}, 1) rotate(0.01deg)`,
            willChange: 'transform',
            width: '100%',
            height: '100%'
        }}>
            {children}
        </div>
    );
};
