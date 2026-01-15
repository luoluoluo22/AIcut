import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
// Mocking aws4fetch for local standalone
// import { AwsClient } from "aws4fetch";
import { nanoid } from "nanoid";
import { env } from "@/env";
import { baseRateLimit } from "@/lib/rate-limit";
import { isTranscriptionConfigured } from "@/lib/transcription-utils"; // Should assume returns configured: false

const uploadRequestSchema = z.object({
  fileExtension: z.enum(["wav", "mp3", "m4a", "flac"], {
    errorMap: () => ({
      message: "File extension must be wav, mp3, m4a, or flac",
    }),
  }),
});

export async function POST(request: NextRequest) {
  // Just return error for now as we don't have R2 in standalone
  return NextResponse.json(
    {
      error: "Transcription not configured",
      message: `Auto-captions not available in standalone mode.`,
    },
    { status: 503 }
  );
}
