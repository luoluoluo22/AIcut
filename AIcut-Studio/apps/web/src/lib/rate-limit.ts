// Mock rate-limit lib for local development
// This replaces the actual rate limiting logic which depended on Upstash Redis

export const baseRateLimit = {
  limit: async (identifier: string) => {
    // In local development, we don't enforce rate limits.
    // Always return success.
    return { success: true, limit: 100, remaining: 99, reset: Date.now() + 60000 };
  },
};
