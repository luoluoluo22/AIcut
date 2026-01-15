
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing } from 'remotion';

interface TransitionConfig {
    type: string;
    duration: number; // in seconds
}

interface TransitionWrapperProps {
    children: React.ReactNode;
    inConfig?: TransitionConfig;
    outConfig?: TransitionConfig;
    durationInFrames: number;
    fps: number;
}

const SingleTransition: React.FC<{
    kind: 'in' | 'out';
    config: TransitionConfig;
    children: React.ReactNode;
    durationInFrames: number;
    fps: number;
}> = ({ kind, config, children, durationInFrames, fps }) => {
    const frame = useCurrentFrame();
    const { width, height } = useVideoConfig();

    const transDuration = config.duration * fps;

    // Calculate input range
    const inputRange = kind === 'in'
        ? [0, transDuration]
        : [durationInFrames - transDuration, durationInFrames];

    let style: React.CSSProperties = {};

    switch (config.type) {
        case 'fade':
            const opacity = interpolate(
                frame,
                inputRange,
                kind === 'in' ? [0, 1] : [1, 0],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            );
            style.opacity = opacity;
            break;

        case 'slide-left': {
            // In: From Right (width) to 0
            // Out: From 0 to Left (-width)
            const x = interpolate(
                frame,
                inputRange,
                kind === 'in' ? [width, 0] : [0, -width],
                {
                    easing: Easing.out(Easing.cubic),
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp"
                }
            );
            style.transform = `translateX(${x}px)`;
            break;
        }

        case 'slide-right': {
            // In: From Left (-width) to 0
            // Out: From 0 to Right (width)
            const x = interpolate(
                frame,
                inputRange,
                kind === 'in' ? [-width, 0] : [0, width],
                {
                    easing: Easing.out(Easing.cubic),
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp"
                }
            );
            style.transform = `translateX(${x}px)`;
            break;
        }

        case 'wipe-left': {
            // Simple Clip Path Wipe
            // In: circle(0% -> 100%) or inset
            // Let's use clip-path inset for wipe
            const percentage = interpolate(
                frame,
                inputRange,
                kind === 'in' ? [100, 0] : [0, 100],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            );
            // Wipe Left: Right edge moves
            // In: inset(0 100% 0 0) -> inset(0 0 0 0)
            // Out: inset(0 0 0 0) -> inset(0 0 0 100%) - wait, wipe left usually means content moves or is revealed

            // Standard Wipe Left (reveal from right):
            // In: clip-path: inset(0 0 0 100%) -> inset(0 0 0 0) ? No that's wipe right

            // Let's stick to simple translateX logic for wipe representation if mask is hard, 
            // but clip-path is better.
            // Wipe Left: Revealing from Right to Left? Or wiping away to Left?

            // Let's define Wipe Left as: Content appears from right edge growing to left.
            // clip-path: inset(0 0 0 100%) -> inset(0 0 0 0) is Reveal Right.
            // clip-path: inset(0 100% 0 0) -> inset(0 0 0 0) is Reveal Left.

            // Let's use inset(0 ${p}% 0 0)
            style.clipPath = `inset(0 ${percentage}% 0 0)`;
            break;
        }

        case 'wipe-right': {
            const percentage = interpolate(
                frame,
                inputRange,
                kind === 'in' ? [100, 0] : [0, 100],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            );
            style.clipPath = `inset(0 0 0 ${percentage}%)`;
            break;
        }

        case 'zoom-in': {
            const scale = interpolate(
                frame,
                inputRange,
                kind === 'in' ? [0, 1] : [1, 2], // Out: zoom in more and fade out usually
                {
                    easing: Easing.out(Easing.cubic),
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp"
                }
            );
            style.transform = `scale(${scale})`;
            if (kind === 'out') {
                // For zoom out transition, usually we also fade out to avoid hard cut
                style.opacity = interpolate(frame, inputRange, [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            }
            break;
        }

        case 'flash': {
            // Not easy to do wrapper style, usually needs an overlay. 
            // We'll simulate by brightness
            const intensity = interpolate(
                frame,
                inputRange,
                kind === 'in' ? [2, 1] : [1, 2],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            );
            style.filter = `brightness(${intensity})`;
            // Fade in/out as well
            style.opacity = interpolate(frame, inputRange, kind === 'in' ? [0, 1] : [1, 0], { extrapolateRight: "clamp" });
            break;
        }
    }

    return (
        <AbsoluteFill style={style}>
            {children}
        </AbsoluteFill>
    );
};

export const TransitionWrapper: React.FC<TransitionWrapperProps> = ({
    children,
    inConfig,
    outConfig,
    durationInFrames,
    fps,
}) => {
    let content = <>{children}</>;

    // Apply transitions. Order matters for transform, but AbsoluteFill nesting handles it structurally.
    // Inner should be In, Outer should be Out? Or vice versa?
    // In transition animates the element appearing.
    // Out transition animates the element disappearing.

    // If we wrap Out(In(Content)):
    // In starts at 0, animates content. Out is idle (opacity 1, scale 1).
    // Out starts at end, animates result of In.
    // This seems correct.

    if (inConfig) {
        content = (
            <SingleTransition
                kind="in"
                config={inConfig}
                durationInFrames={durationInFrames}
                fps={fps}
            >
                {content}
            </SingleTransition>
        );
    }

    if (outConfig) {
        content = (
            <SingleTransition
                kind="out"
                config={outConfig}
                durationInFrames={durationInFrames}
                fps={fps}
            >
                {content}
            </SingleTransition>
        );
    }

    return <AbsoluteFill>{content}</AbsoluteFill>;
};
