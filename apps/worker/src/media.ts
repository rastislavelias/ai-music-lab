import { execFile } from "node:child_process";
import { rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

function formatLrcTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds - minutes * 60;
  return `${String(minutes).padStart(2, "0")}:${remainder
    .toFixed(2)
    .padStart(5, "0")}`;
}

function formatAssTime(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return `${hours}:${String(minutes).padStart(2, "0")}:${remainder
    .toFixed(2)
    .padStart(5, "0")}`;
}

function lyricLines(lyrics: string) {
  return lyrics
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(
      (line) =>
        line.length > 0 &&
        !/^\[[^\]]+\]$/.test(line) &&
        !/^\([^)]*\)$/.test(line),
    );
}

export async function probeDuration(audioPath: string) {
  const { stdout } = await execFileAsync("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    audioPath,
  ]);
  const duration = Number(stdout.trim());
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error("Could not determine audio duration.");
  }
  return duration;
}

export function buildEstimatedLrc(lyrics: string, duration: number) {
  const lines = lyricLines(lyrics);
  if (lines.length === 0) return "";

  const intro = Math.min(12, Math.max(5, duration * 0.06));
  const outro = Math.min(10, Math.max(4, duration * 0.04));
  const usable = Math.max(lines.length * 2, duration - intro - outro);
  const weights = lines.map((line) =>
    Math.max(2.2, line.split(/\s+/).length * 0.8),
  );
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let current = intro;
  return lines
    .map((line, index) => {
      const timestamp = current;
      current += usable * (weights[index]! / totalWeight);
      return `[${formatLrcTime(timestamp)}]${line}`;
    })
    .join("\n");
}

export function sanitizeNativeLrc(lrc: string) {
  return lrc
    .split(/\r?\n/)
    .filter((line) => {
      const match = /^\[\d+:\d+(?:\.\d+)?\](.*)$/.exec(line.trim());
      if (!match) return false;
      const text = match[1].trim();
      return (
        text.length > 0 &&
        !/^\[[^\]]+\]$/.test(text) &&
        !/^\([^)]*\)$/.test(text)
      );
    })
    .join("\n");
}

function parseLrc(lrc: string) {
  return lrc
    .split(/\r?\n/)
    .map((line) => {
      const match = /^\[(\d+):(\d+(?:\.\d+)?)\](.*)$/.exec(line.trim());
      if (!match) return null;
      return {
        time: Number(match[1]) * 60 + Number(match[2]),
        text: match[3].trim(),
      };
    })
    .filter((line): line is { time: number; text: string } =>
      Boolean(line && Number.isFinite(line.time) && line.text),
    );
}

function escapeAss(text: string) {
  return text
    .replaceAll("\\", "\\\\")
    .replaceAll("{", "\\{")
    .replaceAll("}", "\\}");
}

export async function renderVideo(input: {
  coverPath: string;
  audioPath: string;
  lrc: string;
  outputPath: string;
}) {
  const duration = await probeDuration(input.audioPath);
  const cues = parseLrc(input.lrc);
  const assPath = `${input.outputPath}.ass`;
  const temporaryPath = `${input.outputPath}.part.mp4`;
  const events = cues.map((cue, index) => {
    const next = cues[index + 1]?.time ?? duration;
    const end = Math.max(cue.time + 1, Math.min(duration, next - 0.08));
    return `Dialogue: 0,${formatAssTime(cue.time)},${formatAssTime(end)},Lyrics,,0,0,0,,${escapeAss(cue.text)}`;
  });
  const ass = `[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Lyrics,DejaVu Sans,54,&H00FFFFFF,&H000000FF,&H00101010,&H80000000,-1,0,0,0,100,100,0,0,1,3,1,2,120,120,115,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${events.join("\n")}
`;
  await writeFile(assPath, ass, "utf8");
  try {
    await execFileAsync(
      "ffmpeg",
      [
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-loop",
        "1",
        "-framerate",
        "30",
        "-i",
        input.coverPath,
        "-i",
        input.audioPath,
        "-vf",
        `scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,subtitles=${assPath}:fontsdir=/usr/share/fonts/truetype/dejavu,format=yuv420p`,
        "-map",
        "0:v:0",
        "-map",
        "1:a:0",
        "-c:v",
        "libx264",
        "-preset",
        "medium",
        "-crf",
        "18",
        "-c:a",
        "aac",
        "-b:a",
        "256k",
        "-shortest",
        "-movflags",
        "+faststart",
        temporaryPath,
      ],
      { maxBuffer: 10 * 1024 * 1024 },
    );
    await rename(temporaryPath, input.outputPath);
  } finally {
    await Promise.all([
      rm(assPath, { force: true }),
      rm(temporaryPath, { force: true }),
    ]);
  }
}

export function storedPath(storageRoot: string, fileName: string) {
  return path.join(storageRoot, path.basename(fileName));
}
