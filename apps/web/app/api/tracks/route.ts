import { prisma } from "@ai-music-lab/db";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createTrackSchema = z
  .object({
    prompt: z
      .string()
      .trim()
      .min(3, "Prompt must contain at least 3 characters.")
      .max(2000),
    instrumental: z.boolean().optional().default(false),
    lyrics: z.string().trim().max(10000).optional().default(""),
  })
  .superRefine((track, context) => {
    if (!track.instrumental && track.lyrics.length < 3) {
      context.addIssue({
        code: "custom",
        path: ["lyrics"],
        message: "Lyrics must contain at least 3 characters for a vocal track.",
      });
    }
  });

function toView(track: {
  id: string;
  prompt: string;
  lyrics: string;
  instrumental: boolean;
  status: string;
  error: string | null;
  createdAt: Date;
  completedAt: Date | null;
}) {
  return {
    ...track,
    createdAt: track.createdAt.toISOString(),
    completedAt: track.completedAt?.toISOString() ?? null,
  };
}

export async function GET() {
  const tracks = await prisma.track.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ tracks: tracks.map(toView) });
}

export async function POST(request: Request) {
  const parsed = createTrackSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  const track = await prisma.track.create({ data: parsed.data });
  return NextResponse.json({ track: toView(track) }, { status: 201 });
}
