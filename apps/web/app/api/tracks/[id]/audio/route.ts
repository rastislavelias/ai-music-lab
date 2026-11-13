import { prisma } from "@ai-music-lab/db";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";

const storageRoot = path.resolve(
  process.env.TRACK_STORAGE_PATH ?? "/data/tracks",
);

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const track = await prisma.track.findUnique({ where: { id } });

  if (!track?.fileName)
    return NextResponse.json(
      { error: "Audio ešte nie je dostupné." },
      { status: 404 },
    );

  const filePath = path.resolve(storageRoot, track.fileName);
  if (!filePath.startsWith(`${storageRoot}${path.sep}`)) {
    return NextResponse.json(
      { error: "Neplatná cesta k súboru." },
      { status: 400 },
    );
  }

  try {
    const info = await stat(filePath);
    const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream;
    const download = new URL(request.url).searchParams.get("download") === "1";
    return new Response(stream, {
      headers: {
        "Cache-Control": "private, max-age=3600",
        "Content-Length": String(info.size),
        "Content-Type": track.mimeType ?? "audio/mpeg",
        ...(download
          ? {
              "Content-Disposition": `attachment; filename="${track.fileName.replaceAll('"', "")}"`,
            }
          : {}),
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Audio súbor sa nenašiel." },
      { status: 404 },
    );
  }
}
