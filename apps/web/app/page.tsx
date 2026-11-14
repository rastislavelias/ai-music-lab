import { prisma } from "@ai-music-lab/db";
import {
  MusicLab,
  type ArtistProfileView,
  type TrackView,
} from "../components/music-lab";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [tracks, profiles] = await Promise.all([
    prisma.track.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.artistProfile.findMany({ orderBy: { createdAt: "asc" } }),
  ]);
  const initialTracks: TrackView[] = tracks.map((track) => ({
    id: track.id,
    prompt: track.prompt,
    lyrics: track.lyrics,
    instrumental: track.instrumental,
    profileId: track.profileId,
    seed: track.seed,
    bpm: track.bpm,
    keyScale: track.keyScale,
    timeSignature: track.timeSignature,
    audioDuration: track.audioDuration,
    generationGroupId: track.generationGroupId,
    masterAvailable: Boolean(track.masterFileName),
    lyricsLrc: track.lyricsLrc,
    coverPrompt: track.coverPrompt,
    coverStatus: track.coverStatus,
    coverAvailable: Boolean(track.coverFileName),
    coverSeed: track.coverSeed,
    coverError: track.coverError,
    videoStatus: track.videoStatus,
    videoAvailable: Boolean(track.videoFileName),
    videoError: track.videoError,
    status: track.status,
    error: track.error,
    createdAt: track.createdAt.toISOString(),
    completedAt: track.completedAt?.toISOString() ?? null,
  }));
  const initialProfiles: ArtistProfileView[] = profiles.map((profile) => ({
    id: profile.id,
    name: profile.name,
    basePrompt: profile.basePrompt,
    vocalLanguage: profile.vocalLanguage,
    bpm: profile.bpm,
    referenceTrackId: profile.referenceTrackId,
  }));

  return (
    <MusicLab initialTracks={initialTracks} initialProfiles={initialProfiles} />
  );
}
