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
    bpm: z.number().int().min(40).max(240).nullable().optional().default(null),
    keyScale: z.string().trim().max(40).optional().default(""),
    timeSignature: z
      .enum(["2/4", "3/4", "4/4", "6/8"])
      .optional()
      .default("4/4"),
    audioDuration: z
      .number()
      .int()
      .min(10)
      .max(600)
      .nullable()
      .optional()
      .default(null),
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
  bpm: number | null;
  keyScale: string;
  timeSignature: string;
  audioDuration: number | null;
  generationGroupId: string | null;
  masterFileName: string | null;
  lyricsLrc: string;
  coverPrompt: string;
  coverStatus: string;
  coverFileName: string | null;
  coverSeed: number | null;
  coverError: string | null;
  videoStatus: string;
  videoFileName: string | null;
  videoError: string | null;
  status: string;
  error: string | null;
  createdAt: Date;
  completedAt: Date | null;
}) {
  return {
    ...track,
    masterAvailable: Boolean(track.masterFileName),
    coverAvailable: Boolean(track.coverFileName),
    videoAvailable: Boolean(track.videoFileName),
    masterFileName: undefined,
    coverFileName: undefined,
    videoFileName: undefined,
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

  const { variants, profileId, bpm, ...input } = parsed.data;
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
          bpm: bpm ?? profile?.bpm ?? null,
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
