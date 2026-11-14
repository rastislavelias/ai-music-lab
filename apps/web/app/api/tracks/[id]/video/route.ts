import { prisma } from "@ai-music-lab/db";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";

const storageRoot = path.resolve(
  process.env.TRACK_STORAGE_PATH ?? "/data/tracks",
);

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const track = await prisma.track.findUnique({ where: { id } });
  if (
    !track ||
    track.status !== "COMPLETED" ||
    track.coverStatus !== "READY" ||
    !track.coverFileName
  ) {
    return NextResponse.json(
      { error: "A completed track and generated cover are required." },
      { status: 400 },
    );
  }
  if (["QUEUED", "RENDERING"].includes(track.videoStatus)) {
    return NextResponse.json(
      { error: "Video rendering is already active." },
      { status: 409 },
    );
  }
  const updated = await prisma.track.update({
    where: { id },
    data: { videoStatus: "QUEUED", videoError: null },
  });
  return NextResponse.json({ videoStatus: updated.videoStatus });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const track = await prisma.track.findUnique({ where: { id } });
  if (!track?.videoFileName) {
    return NextResponse.json(
      { error: "Video is not available yet." },
      { status: 404 },
    );
  }
  const filePath = path.resolve(storageRoot, track.videoFileName);
  if (!filePath.startsWith(`${storageRoot}${path.sep}`)) {
    return NextResponse.json({ error: "Invalid file path." }, { status: 400 });
  }
  try {
    const info = await stat(filePath);
    const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream;
    const download = new URL(request.url).searchParams.get("download") === "1";
    return new Response(stream, {
      headers: {
        "Cache-Control": "private, max-age=3600",
        "Content-Length": String(info.size),
        "Content-Type": track.videoMimeType ?? "video/mp4",
        ...(download
          ? {
              "Content-Disposition": `attachment; filename="${track.videoFileName.replaceAll('"', "")}"`,
            }
          : {}),
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Video file was not found." },
      { status: 404 },
    );
  }
}
