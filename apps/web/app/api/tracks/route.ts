import { prisma } from "@ai-music-lab/db";
import { randomInt, randomUUID } from "node:crypto";
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
    profileId: z.string().min(1).nullable().optional().default(null),
    variants: z.number().int().min(1).max(4).optional().default(1),
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
  profileId: string | null;
  seed: number | null;
  generationGroupId: string | null;
  masterFileName: string | null;
  status: string;
  error: string | null;
  createdAt: Date;
  completedAt: Date | null;
}) {
  return {
    ...track,
    masterAvailable: Boolean(track.masterFileName),
    masterFileName: undefined,
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

  const { variants, profileId, ...input } = parsed.data;
  const profile = profileId
    ? await prisma.artistProfile.findUnique({ where: { id: profileId } })
    : null;
  if (profileId && !profile) {
    return NextResponse.json(
      { error: "Artist profile was not found." },
      { status: 404 },
    );
  }

  const generationGroupId = randomUUID();
  const tracks = await prisma.$transaction(
    Array.from({ length: variants }, () =>
      prisma.track.create({
        data: {
          ...input,
          profileId,
          basePrompt: profile?.basePrompt ?? "",
          referenceTrackId: profile?.referenceTrackId ?? null,
          vocalLanguage: profile?.vocalLanguage ?? "en",
          bpm: profile?.bpm ?? null,
          seed: randomInt(1, 2_147_483_647),
          generationGroupId,
        },
      }),
    ),
  );
  return NextResponse.json(
    { track: toView(tracks[0]!), tracks: tracks.map(toView) },
    { status: 201 },
  );
}
