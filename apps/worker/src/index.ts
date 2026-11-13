import { prisma, type Track } from "@ai-music-lab/db";
import { createWriteStream } from "node:fs";
import { mkdir, rename, rm } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { AceStepClient } from "./ace-step";

const pollMs = Number(process.env.WORKER_POLL_MS ?? 5000);
const taskTimeoutMs = Number(process.env.WORKER_TASK_TIMEOUT_MS ?? 3_600_000);
const storageRoot = path.resolve(
  process.env.TRACK_STORAGE_PATH ?? "/data/tracks",
);
const execFileAsync = promisify(execFile);
const ace = new AceStepClient(
  process.env.ACESTEP_API_URL ?? "http://acestep:8001",
  process.env.ACESTEP_API_KEY || undefined,
);
let stopping = false;

function message(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function fail(id: string, error: unknown) {
  await prisma.track.update({
    where: { id },
    data: {
      status: "FAILED",
      error: message(error).slice(0, 2000),
      completedAt: new Date(),
    },
  });
}

async function claim(): Promise<Track | null> {
  const candidate = await prisma.track.findFirst({
    where: { status: "QUEUED" },
    orderBy: { createdAt: "asc" },
  });
  if (!candidate) return null;
  const claimed = await prisma.track.updateMany({
    where: { id: candidate.id, status: "QUEUED" },
    data: { status: "SUBMITTING", error: null },
  });
  return claimed.count === 1 ? candidate : null;
}

async function submit(track: Track) {
  try {
    const referenceTrack = track.referenceTrackId
      ? await prisma.track.findUnique({
          where: { id: track.referenceTrackId },
          select: { masterFileName: true, fileName: true },
        })
      : null;
    const referenceFileName =
      referenceTrack?.masterFileName ?? referenceTrack?.fileName;
    const referenceAudioPath = referenceFileName
      ? `/references/${path.basename(referenceFileName)}`
      : undefined;
    const taskId = await ace.submit({
      prompt: [track.basePrompt, track.prompt].filter(Boolean).join(", "),
      lyrics: track.lyrics,
      instrumental: track.instrumental,
      seed: track.seed ?? 1,
      bpm: track.bpm,
      vocalLanguage: track.vocalLanguage,
      referenceAudioPath,
    });
    await prisma.track.update({
      where: { id: track.id },
      data: {
        status: "PROCESSING",
        upstreamTaskId: taskId,
        submittedAt: new Date(),
      },
    });
    console.log(`[worker] Submitted ${track.id} as ${taskId}`);
  } catch (error) {
    console.error(
      `[worker] Submission failed for ${track.id}: ${message(error)}`,
    );
    await fail(track.id, error);
  }
}

async function finish(track: Track, result: string | undefined) {
  const audio = ace.parseFirstAudio(result);
  const response = await ace.download(audio.file);
  const masterFileName = `${track.id}.flac`;
  const fileName = `${track.id}.mp3`;
  const masterPath = path.join(storageRoot, masterFileName);
  const previewPath = path.join(storageRoot, fileName);
  const temporaryMasterPath = `${masterPath}.part`;
  const temporaryPreviewPath = `${previewPath}.part`;
  await mkdir(storageRoot, { recursive: true });
  try {
    await pipeline(
      Readable.fromWeb(response.body as never),
      createWriteStream(temporaryMasterPath, { flags: "wx" }),
    );
    await rename(temporaryMasterPath, masterPath);
    await execFileAsync("ffmpeg", [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-i",
      masterPath,
      "-codec:a",
      "libmp3lame",
      "-b:a",
      "192k",
      "-f",
      "mp3",
      temporaryPreviewPath,
    ]);
    await rename(temporaryPreviewPath, previewPath);
  } catch (error) {
    await Promise.all([
      rm(temporaryMasterPath, { force: true }),
      rm(temporaryPreviewPath, { force: true }),
      rm(masterPath, { force: true }),
      rm(previewPath, { force: true }),
    ]);
    throw error;
  }
  await prisma.track.update({
    where: { id: track.id },
    data: {
      status: "COMPLETED",
      fileName,
      mimeType: "audio/mpeg",
      masterFileName,
      masterMimeType: response.headers.get("content-type") ?? "audio/flac",
      completedAt: new Date(),
      error: null,
    },
  });
  console.log(`[worker] Completed ${track.id}`);
}

async function poll(track: Track) {
  if (!track.upstreamTaskId)
    return fail(track.id, "ACE-Step task ID is missing.");
  if (
    track.submittedAt &&
    Date.now() - track.submittedAt.getTime() > taskTimeoutMs
  ) {
    return fail(track.id, "Generation exceeded the configured time limit.");
  }
  try {
    const result = await ace.query(track.upstreamTaskId);
    if (result.status === 1) await finish(track, result.result);
    if (result.status === 2)
      await fail(track.id, result.error || "ACE-Step generation failed.");
  } catch (error) {
    console.warn(`[worker] Poll failed for ${track.id}: ${message(error)}`);
  }
}

async function main() {
  await mkdir(storageRoot, { recursive: true });
  await prisma.track.updateMany({
    where: { status: "SUBMITTING" },
    data: {
      status: "FAILED",
      error:
        "The worker restarted while submitting the job. Please generate the track again.",
      completedAt: new Date(),
    },
  });
  console.log("[worker] AI Music Lab worker started");

  while (!stopping) {
    try {
      const track = await claim();
      if (track) await submit(track);
      const active = await prisma.track.findMany({
        where: { status: "PROCESSING" },
        take: 10,
      });
      for (const item of active) await poll(item);
    } catch (error) {
      console.error(`[worker] Loop error: ${message(error)}`);
    }
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    stopping = true;
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
