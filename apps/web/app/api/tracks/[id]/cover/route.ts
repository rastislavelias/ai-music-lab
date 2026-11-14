import { prisma } from "@ai-music-lab/db";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { randomInt } from "node:crypto";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { z } from "zod";

const storageRoot = path.resolve(
  process.env.TRACK_STORAGE_PATH ?? "/data/tracks",
);
const requestSchema = z.object({
  prompt: z.string().trim().min(10).max(2500),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const parsed = requestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid cover prompt." },
      { status: 400 },
    );
  }
  const track = await prisma.track.findUnique({ where: { id } });
  if (!track || track.status !== "COMPLETED") {
    return NextResponse.json(
      { error: "Only a completed track can receive cover art." },
      { status: 400 },
    );
  }
  if (["QUEUED", "GENERATING"].includes(track.coverStatus)) {
    return NextResponse.json(
      { error: "Cover generation is already active." },
      { status: 409 },
    );
  }

  const updated = await prisma.track.update({
    where: { id },
    data: {
      coverPrompt: parsed.data.prompt,
      coverSeed: randomInt(1, 2_147_483_647),
      coverStatus: "QUEUED",
      coverError: null,
    },
  });
  return NextResponse.json({
    coverStatus: updated.coverStatus,
    coverSeed: updated.coverSeed,
  });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const track = await prisma.track.findUnique({ where: { id } });
  if (!track?.coverFileName) {
    return NextResponse.json(
      { error: "Cover art is not available yet." },
      { status: 404 },
    );
  }
  const filePath = path.resolve(storageRoot, track.coverFileName);
  if (!filePath.startsWith(`${storageRoot}${path.sep}`)) {
    return NextResponse.json({ error: "Invalid file path." }, { status: 400 });
  }
  try {
    const info = await stat(filePath);
    const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream;
    const download = new URL(request.url).searchParams.get("download") === "1";
    return new Response(stream, {
      headers: {
        "Cache-Control": "private, max-age=300",
        "Content-Length": String(info.size),
        "Content-Type": track.coverMimeType ?? "image/png",
        ...(download
          ? {
              "Content-Disposition": `attachment; filename="${track.coverFileName.replaceAll('"', "")}"`,
            }
          : {}),
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Cover file was not found." },
      { status: 404 },
    );
  }
}
