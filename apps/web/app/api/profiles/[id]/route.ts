import { prisma } from "@ai-music-lab/db";
import { NextResponse } from "next/server";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  basePrompt: z.string().trim().max(2000).optional(),
  vocalLanguage: z.string().trim().min(2).max(12).optional(),
  bpm: z.number().int().min(40).max(240).nullable().optional(),
  referenceTrackId: z.string().min(1).nullable().optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid artist profile." },
      { status: 400 },
    );
  }

  if (parsed.data.referenceTrackId) {
    const track = await prisma.track.findUnique({
      where: { id: parsed.data.referenceTrackId },
      select: { status: true, fileName: true, masterFileName: true },
    });
    if (
      !track ||
      track.status !== "COMPLETED" ||
      (!track.fileName && !track.masterFileName)
    ) {
      return NextResponse.json(
        { error: "Only a completed track can be used as a reference." },
        { status: 400 },
      );
    }
  }

  const profile = await prisma.artistProfile
    .update({ where: { id }, data: parsed.data })
    .catch(() => null);
  if (!profile) {
    return NextResponse.json(
      { error: "Artist profile was not found." },
      { status: 404 },
    );
  }
  return NextResponse.json({ profile });
}
