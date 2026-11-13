import { prisma } from "@ai-music-lab/db";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const profileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  basePrompt: z.string().trim().max(2000).optional().default(""),
  vocalLanguage: z.string().trim().min(2).max(12).optional().default("en"),
  bpm: z.number().int().min(40).max(240).nullable().optional().default(null),
});

function toView(profile: {
  id: string;
  name: string;
  basePrompt: string;
  vocalLanguage: string;
  bpm: number | null;
  referenceTrackId: string | null;
}) {
  return profile;
}

export async function GET() {
  const profiles = await prisma.artistProfile.findMany({
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ profiles: profiles.map(toView) });
}

export async function POST(request: Request) {
  const parsed = profileSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid artist profile." },
      { status: 400 },
    );
  }
  const profile = await prisma.artistProfile.create({ data: parsed.data });
  return NextResponse.json({ profile: toView(profile) }, { status: 201 });
}
