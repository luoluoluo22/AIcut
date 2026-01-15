
import { interpolate, Easing } from 'remotion';
import { Keyframe } from '@/types/timeline';

export function interpolateKeyframes(
    keyframes: Keyframe[] | undefined,
    time: number,
    defaultValue: number
): number {
    if (!keyframes || keyframes.length === 0) {
        return defaultValue;
    }

    // Ensure sorted (though store should maintain sort, safer to check)
    const sortedKeyframes = [...keyframes].sort((a, b) => a.time - b.time);

    // Before first keyframe
    if (time <= sortedKeyframes[0].time) {
        return sortedKeyframes[0].value;
    }

    // After last keyframe
    if (time >= sortedKeyframes[sortedKeyframes.length - 1].time) {
        return sortedKeyframes[sortedKeyframes.length - 1].value;
    }

    // Find range
    const nextIndex = sortedKeyframes.findIndex(kf => kf.time > time);
    const prevIndex = nextIndex - 1;

    const prevKf = sortedKeyframes[prevIndex];
    const nextKf = sortedKeyframes[nextIndex];

    // Interpolate
    let easing = Easing.linear;
    if (prevKf.easing === 'ease-in') easing = Easing.in(Easing.quad);
    else if (prevKf.easing === 'ease-out') easing = Easing.out(Easing.quad);
    else if (prevKf.easing === 'ease-in-out') easing = Easing.inOut(Easing.quad);

    return interpolate(
        time,
        [prevKf.time, nextKf.time],
        [prevKf.value, nextKf.value],
        {
            easing,
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp'
        }
    );
}
