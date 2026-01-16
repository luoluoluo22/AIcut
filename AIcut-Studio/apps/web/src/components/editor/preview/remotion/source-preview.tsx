import React from 'react';
import { AbsoluteFill, OffthreadVideo, Img, Audio } from 'remotion';
import { MediaFile } from '@/types/media';
import { Music } from 'lucide-react';

export const SourcePreviewComposition: React.FC<{ media: MediaFile }> = ({ media }) => {
    let content = null;
    // Remotion handles relative URLs fine, but for local files (blob urls) it's also fine.

    if (media.type === 'video' && media.url) {
        content = <OffthreadVideo src={media.url} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />;
    } else if (media.type === 'image' && media.url) {
        content = <Img src={media.url} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />;
    } else if (media.type === 'audio' && media.url) {
        content = (
            <>
                <Audio src={media.url} />
                <div className="w-full h-full flex flex-col items-center justify-center text-white bg-gray-900">
                    <div className="bg-primary/20 p-8 rounded-full mb-4">
                        <Music size={64} />
                    </div>
                    <div className="text-xl font-bold">{media.name}</div>
                    <div className="text-sm opacity-70 mt-2">Audio Preview</div>
                </div>
            </>
        );
    } else {
        content = <div className="text-white">Unsupported media type</div>;
    }

    return (
        <AbsoluteFill style={{ backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
            {content}
        </AbsoluteFill>
    );
};
