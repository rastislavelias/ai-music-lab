import { prisma } from "@ai-music-lab/db";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";

const storageRoot = path.resolve(
  process.env.TRACK_STORAGE_PATH ?? "/data/tracks",
);

function parseRange(range: string, size: number) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!match || (!match[1] && !match[2])) return null;

  let start: number;
  let end: number;
  if (!match[1]) {
    const suffixLength = Number(match[2]);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) return null;
    start = Math.max(0, size - suffixLength);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Number(match[2]) : size - 1;
  }

  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    start < 0 ||
    start >= size ||
    end < start
  ) {
    return null;
  }
  return { start, end: Math.min(end, size - 1) };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const track = await prisma.track.findUnique({ where: { id } });

  if (!track?.fileName)
    return NextResponse.json(
      { error: "Audio is not available yet." },
      { status: 404 },
    );

  const filePath = path.resolve(storageRoot, track.fileName);
  if (!filePath.startsWith(`${storageRoot}${path.sep}`)) {
    return NextResponse.json({ error: "Invalid file path." }, { status: 400 });
  }

  try {
    const info = await stat(filePath);
    const requestedRange = request.headers.get("range");
    const range = requestedRange ? parseRange(requestedRange, info.size) : null;
    if (requestedRange && !range) {
      return new Response(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${info.size}` },
      });
    }

    const start = range?.start ?? 0;
    const end = range?.end ?? info.size - 1;
    const stream = Readable.toWeb(
      createReadStream(filePath, { start, end }),
    ) as ReadableStream;
    const download = new URL(request.url).searchParams.get("download") === "1";
    return new Response(stream, {
      status: range ? 206 : 200,
      headers: {
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, max-age=3600",
        "Content-Length": String(end - start + 1),
        "Content-Type": track.mimeType ?? "audio/mpeg",
        ...(range
          ? { "Content-Range": `bytes ${start}-${end}/${info.size}` }
          : {}),
        ...(download
          ? {
              "Content-Disposition": `attachment; filename="${track.fileName.replaceAll('"', "")}"`,
            }
          : {}),
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Audio file was not found." },
      { status: 404 },
    );
  }
}
