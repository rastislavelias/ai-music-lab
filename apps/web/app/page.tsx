import { prisma } from "@ai-music-lab/db";
import { MusicLab, type TrackView } from "../components/music-lab";

export const dynamic = "force-dynamic";

export default async function Home() {
  const tracks = await prisma.track.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const initialTracks: TrackView[] = tracks.map((track) => ({
    id: track.id,
    prompt: track.prompt,
    instrumental: track.instrumental,
    status: track.status,
    error: track.error,
    createdAt: track.createdAt.toISOString(),
    completedAt: track.completedAt?.toISOString() ?? null,
  }));

  return <MusicLab initialTracks={initialTracks} />;
}
