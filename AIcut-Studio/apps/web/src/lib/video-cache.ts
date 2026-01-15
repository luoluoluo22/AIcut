// MOCKED video-cache to remove mediabunny dependency

export interface WrappedCanvas {
  timestamp: number;
  duration: number;
  // minimal mock properties
}

export class VideoCache {
  async getFrameAt(
    mediaId: string,
    file: File,
    time: number
  ): Promise<any | null> { // Returning any/null for now as we don't have WrappedCanvas
    console.log(`[Mock VideoCache] getFrameAt ${mediaId} @ ${time}`);
    return null;
  }

  clearVideo(mediaId: string): void { }

  clearAll(): void { }

  getStats() {
    return {
      totalSinks: 0,
      activeSinks: 0,
      cachedFrames: 0,
    };
  }
}
export const videoCache = new VideoCache();
