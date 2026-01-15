import { NextRequest, NextResponse } from "next/server";
export async function POST(request: NextRequest) {
  return NextResponse.json(
    {
      error: "Transcription not configured",
      message: `Auto-captions not available in standalone mode.`,
    },
    { status: 503 }
  );
}
