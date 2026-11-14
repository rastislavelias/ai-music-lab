"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export type TrackView = {
  id: string;
  prompt: string;
  lyrics: string;
  instrumental: boolean;
  profileId: string | null;
  seed: number | null;
  bpm: number | null;
  keyScale: string;
  timeSignature: string;
  audioDuration: number | null;
  generationGroupId: string | null;
  masterAvailable: boolean;
  lyricsLrc: string;
  coverPrompt: string;
  coverStatus: string;
  coverAvailable: boolean;
  coverSeed: number | null;
  coverError: string | null;
  videoStatus: string;
  videoAvailable: boolean;
  videoError: string | null;
  status: string;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
};

export type ArtistProfileView = {
  id: string;
  name: string;
  basePrompt: string;
  vocalLanguage: string;
  bpm: number | null;
  referenceTrackId: string | null;
};

const activeStatuses = new Set(["QUEUED", "SUBMITTING", "PROCESSING"]);
const activeCoverStatuses = new Set(["QUEUED", "GENERATING"]);
const activeVideoStatuses = new Set(["QUEUED", "RENDERING"]);

const labels: Record<string, string> = {
  QUEUED: "Queued",
  SUBMITTING: "Submitting",
  PROCESSING: "Generating",
  COMPLETED: "Ready",
  FAILED: "Failed",
};

export function MusicLab({
  initialTracks,
  initialProfiles,
}: {
  initialTracks: TrackView[];
  initialProfiles: ArtistProfileView[];
}) {
  const [tracks, setTracks] = useState(initialTracks);
  const [profiles, setProfiles] = useState(initialProfiles);
  const [selectedProfileId, setSelectedProfileId] = useState(
    initialProfiles[0]?.id ?? "",
  );
  const [prompt, setPrompt] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [instrumental, setInstrumental] = useState(false);
  const [variants, setVariants] = useState(1);
  const [bpm, setBpm] = useState("110");
  const [keyScale, setKeyScale] = useState("A minor");
  const [timeSignature, setTimeSignature] = useState("4/4");
  const [audioDuration, setAudioDuration] = useState("180");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileName, setProfileName] = useState("");
  const [profileBasePrompt, setProfileBasePrompt] = useState("");
  const [profileBpm, setProfileBpm] = useState("");
  const [profileLanguage, setProfileLanguage] = useState("en");
  const [savingProfile, setSavingProfile] = useState(false);

  const selectedProfile = profiles.find(
    (profile) => profile.id === selectedProfileId,
  );
  const hasActive = useMemo(
    () =>
      tracks.some(
        (track) =>
          activeStatuses.has(track.status) ||
          activeCoverStatuses.has(track.coverStatus) ||
          activeVideoStatuses.has(track.videoStatus),
      ),
    [tracks],
  );

  useEffect(() => {
    if (!selectedProfile) return;
    setProfileBasePrompt(selectedProfile.basePrompt);
    setProfileBpm(selectedProfile.bpm?.toString() ?? "");
    setProfileLanguage(selectedProfile.vocalLanguage);
  }, [selectedProfile]);

  useEffect(() => {
    if (!hasActive) return;
    const timer = window.setInterval(async () => {
      const response = await fetch("/api/tracks", { cache: "no-store" });
      if (response.ok) setTracks((await response.json()).tracks);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [hasActive]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/tracks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          lyrics,
          instrumental,
          profileId: selectedProfileId || null,
          variants,
          bpm: bpm ? Number(bpm) : null,
          keyScale,
          timeSignature,
          audioDuration: audioDuration ? Number(audioDuration) : null,
        }),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error ?? "Could not queue the generation job.");
      setTracks((current) => [...body.tracks, ...current]);
      setPrompt("");
      setLyrics("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unknown error.");
    } finally {
      setSubmitting(false);
    }
  }

  async function createProfile() {
    if (profileName.trim().length < 2) return;
    setSavingProfile(true);
    setError(null);
    try {
      const response = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: profileName }),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error ?? "Could not create profile.");
      setProfiles((current) => [...current, body.profile]);
      setSelectedProfileId(body.profile.id);
      setProfileName("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unknown error.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function updateProfile(update: Partial<ArtistProfileView>) {
    if (!selectedProfile) return;
    const response = await fetch(`/api/profiles/${selectedProfile.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update),
    });
    const body = await response.json();
    if (!response.ok)
      throw new Error(body.error ?? "Could not update profile.");
    setProfiles((current) =>
      current.map((profile) =>
        profile.id === body.profile.id ? body.profile : profile,
      ),
    );
  }

  async function saveProfile() {
    setSavingProfile(true);
    setError(null);
    try {
      await updateProfile({
        basePrompt: profileBasePrompt,
        bpm: profileBpm ? Number(profileBpm) : null,
        vocalLanguage: profileLanguage,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unknown error.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function useAsReference(trackId: string) {
    setError(null);
    try {
      await updateProfile({ referenceTrackId: trackId });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unknown error.");
    }
  }

  function updateTrack(trackId: string, update: Partial<TrackView>) {
    setTracks((current) =>
      current.map((track) =>
        track.id === trackId ? { ...track, ...update } : track,
      ),
    );
  }

  return (
    <main className="min-h-screen px-5 py-10 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 flex items-end justify-between gap-6">
          <div>
            <div className="eyebrow">LOCAL · ACE-STEP 1.5</div>
            <h1>AI Music Lab</h1>
            <p className="mt-3 max-w-xl text-[var(--muted)]">
              Build a repeatable artist sound, generate variants, and keep a
              lossless master on your server.
            </p>
          </div>
          <div className="hidden rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-[var(--muted)] sm:block">
            {hasActive ? "● GPU working" : "○ Ready"}
          </div>
        </header>

        <Card className="panel mb-10">
          <CardContent className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.35fr_.65fr]">
            <form onSubmit={submit}>
              <div className="mb-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="profile" className="label">
                    Artist profile
                  </Label>
                  <Select
                    value={selectedProfileId || "__none__"}
                    onValueChange={(value) =>
                      setSelectedProfileId(value === "__none__" ? "" : value)
                    }
                  >
                    <SelectTrigger id="profile" className="mt-3">
                      <SelectValue placeholder="No profile" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No profile</SelectItem>
                      {profiles.map((profile) => (
                        <SelectItem key={profile.id} value={profile.id}>
                          {profile.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="variants" className="label">
                    Variants
                  </Label>
                  <Select
                    value={String(variants)}
                    onValueChange={(value) => setVariants(Number(value))}
                  >
                    <SelectTrigger id="variants" className="mt-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 track</SelectItem>
                      <SelectItem value="2">2 tracks</SelectItem>
                      <SelectItem value="4">4 tracks</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <Label htmlFor="generation-bpm" className="field-label">
                    BPM
                  </Label>
                  <Input
                    id="generation-bpm"
                    className="mt-2"
                    type="number"
                    min={40}
                    max={240}
                    value={bpm}
                    onChange={(event) => setBpm(event.target.value)}
                    placeholder="110"
                  />
                </div>
                <div>
                  <Label htmlFor="generation-duration" className="field-label">
                    Seconds
                  </Label>
                  <Input
                    id="generation-duration"
                    className="mt-2"
                    type="number"
                    min={10}
                    max={600}
                    value={audioDuration}
                    onChange={(event) => setAudioDuration(event.target.value)}
                    placeholder="180"
                  />
                </div>
                <div>
                  <Label htmlFor="generation-key" className="field-label">
                    Key / scale
                  </Label>
                  <Input
                    id="generation-key"
                    className="mt-2"
                    value={keyScale}
                    onChange={(event) => setKeyScale(event.target.value)}
                    placeholder="A minor"
                  />
                </div>
                <div>
                  <Label htmlFor="generation-meter" className="field-label">
                    Meter
                  </Label>
                  <Select
                    value={timeSignature}
                    onValueChange={setTimeSignature}
                  >
                    <SelectTrigger id="generation-meter" className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="4/4">4/4</SelectItem>
                      <SelectItem value="3/4">3/4</SelectItem>
                      <SelectItem value="6/8">6/8</SelectItem>
                      <SelectItem value="2/4">2/4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Label htmlFor="prompt" className="label">
                Song prompt
              </Label>
              <Textarea
                id="prompt"
                className="mt-3 min-h-36"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="A polished melodic deep-house track with an immediate groove, layered percussion, evolving bass and a memorable vocal hook…"
                minLength={3}
                maxLength={2000}
                required
              />
              {!instrumental && (
                <div className="mt-5">
                  <Label htmlFor="lyrics" className="label">
                    Lyrics
                  </Label>
                  <Textarea
                    id="lyrics"
                    className="mt-3 min-h-56"
                    value={lyrics}
                    onChange={(event) => setLyrics(event.target.value)}
                    placeholder={
                      "[Verse]\nWrite the words the singer should perform…\n\n[Chorus]\nAdd a memorable chorus…"
                    }
                    minLength={3}
                    maxLength={10000}
                    required
                  />
                </div>
              )}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                <Label className="toggle-row">
                  <Checkbox
                    checked={instrumental}
                    onCheckedChange={(checked) =>
                      setInstrumental(checked === true)
                    }
                  />
                  <span>Instrumental track</span>
                </Label>
                <Button
                  type="submit"
                  disabled={
                    submitting ||
                    prompt.trim().length < 3 ||
                    (!instrumental && lyrics.trim().length < 3)
                  }
                >
                  {submitting
                    ? "Queueing…"
                    : `Generate ${variants} ${variants === 1 ? "track" : "variants"}`}
                </Button>
              </div>
              {error && <p className="mt-4 text-sm text-rose-300">{error}</p>}
            </form>

            <aside className="rounded-2xl border border-white/8 bg-black/15 p-5">
              <div className="label">Artist profile</div>
              {selectedProfile ? (
                <div className="mt-4 grid gap-4">
                  <div>
                    <div className="text-sm font-bold">
                      {selectedProfile.name}
                    </div>
                    <div className="mt-1 text-xs text-[var(--muted)]">
                      {selectedProfile.referenceTrackId
                        ? "Style reference is active"
                        : "Choose a completed track as the style reference"}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="base-prompt" className="field-label">
                      Core sound
                    </Label>
                    <Textarea
                      id="base-prompt"
                      className="mt-2 min-h-28 text-[0.85rem]"
                      value={profileBasePrompt}
                      onChange={(event) =>
                        setProfileBasePrompt(event.target.value)
                      }
                      placeholder="Warm deep house, polished intimate production, smooth bass…"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="profile-bpm" className="field-label">
                        BPM
                      </Label>
                      <Input
                        id="profile-bpm"
                        className="mt-2"
                        type="number"
                        min={40}
                        max={240}
                        value={profileBpm}
                        onChange={(event) => setProfileBpm(event.target.value)}
                        placeholder="124"
                      />
                    </div>
                    <div>
                      <Label htmlFor="profile-language" className="field-label">
                        Language
                      </Label>
                      <Input
                        id="profile-language"
                        className="mt-2"
                        value={profileLanguage}
                        onChange={(event) =>
                          setProfileLanguage(event.target.value)
                        }
                        placeholder="en"
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={savingProfile}
                    onClick={saveProfile}
                  >
                    {savingProfile ? "Saving…" : "Save profile"}
                  </Button>
                </div>
              ) : (
                <div className="mt-4 grid gap-3">
                  <p className="m-0 text-sm leading-6 text-[var(--muted)]">
                    Create a profile to keep one core sound and reuse a
                    completed song as the reference for future generations.
                  </p>
                  <Input
                    value={profileName}
                    onChange={(event) => setProfileName(event.target.value)}
                    placeholder="Artist or project name"
                    maxLength={80}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={savingProfile || profileName.trim().length < 2}
                    onClick={createProfile}
                  >
                    Create artist profile
                  </Button>
                </div>
              )}
            </aside>
          </CardContent>
        </Card>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2>Your tracks</h2>
            <span className="text-sm text-[var(--muted)]">
              {tracks.length} items
            </span>
          </div>
          {tracks.length === 0 ? (
            <div className="empty">
              Nothing here yet. Your first track starts with a good prompt.
            </div>
          ) : (
            <div className="grid gap-4">
              {tracks.map((track, index) => (
                <TrackCard
                  key={track.id}
                  track={track}
                  index={index}
                  selectedProfile={selectedProfile}
                  onUseReference={useAsReference}
                  onUpdate={updateTrack}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function TrackCard({
  track,
  index,
  selectedProfile,
  onUseReference,
  onUpdate,
}: {
  track: TrackView;
  index: number;
  selectedProfile?: ArtistProfileView;
  onUseReference: (trackId: string) => Promise<void>;
  onUpdate: (trackId: string, update: Partial<TrackView>) => void;
}) {
  const complete = track.status === "COMPLETED";
  const isReference = selectedProfile?.referenceTrackId === track.id;
  const statusVariant =
    track.status === "COMPLETED"
      ? "default"
      : track.status === "FAILED"
        ? "destructive"
        : activeStatuses.has(track.status)
          ? "processing"
          : "secondary";
  const [coverPrompt, setCoverPrompt] = useState(
    track.coverPrompt ||
      `Cinematic wide album cover for an emotional slow-burning electronic song. An adult woman above a coastal city at sunset, eyes closed, face turned toward warm light, natural windswept dark hair, subtle dark streetwear, dramatic blue storm clouds opening into a golden horizon, distant birds, hopeful and intimate mood, realistic photography, teal and amber color grading, atmospheric depth, elegant composition, detailed natural skin, strong rim light.`,
  );
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function generateCover() {
    setBusy(true);
    setActionError(null);
    try {
      const response = await fetch(`/api/tracks/${track.id}/cover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: coverPrompt }),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error ?? "Could not queue cover generation.");
      onUpdate(track.id, {
        coverPrompt,
        coverStatus: body.coverStatus,
        coverSeed: body.coverSeed,
        coverError: null,
      });
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Unknown error.");
    } finally {
      setBusy(false);
    }
  }

  async function renderYouTubeVideo() {
    setBusy(true);
    setActionError(null);
    try {
      const response = await fetch(`/api/tracks/${track.id}/video`, {
        method: "POST",
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error ?? "Could not queue video rendering.");
      onUpdate(track.id, {
        videoStatus: body.videoStatus,
        videoError: null,
      });
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Unknown error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="track-card flex-row rounded-2xl">
      <CardContent className="contents">
        <div className="track-number">{String(index + 1).padStart(2, "0")}</div>
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant={statusVariant}>
              {labels[track.status] ?? track.status}
            </Badge>
            <Badge variant="secondary">
              {track.instrumental ? "INSTRUMENTAL" : "VOCALS"}
            </Badge>
            {isReference && <Badge variant="outline">REFERENCE</Badge>}
            {track.bpm && <Badge variant="secondary">{track.bpm} BPM</Badge>}
            {track.keyScale && (
              <Badge variant="secondary">{track.keyScale}</Badge>
            )}
            {track.timeSignature && (
              <Badge variant="secondary">{track.timeSignature}</Badge>
            )}
            {track.seed && <span className="seed">seed {track.seed}</span>}
            <time className="text-xs text-[var(--muted)]">
              {new Intl.DateTimeFormat("en-GB", {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(track.createdAt))}
            </time>
          </div>
          <p className="line-clamp-2 text-sm leading-6 text-white/85">
            {track.prompt}
          </p>
          {track.error && (
            <p className="mt-2 text-sm text-rose-300">{track.error}</p>
          )}
          {complete && (
            <div className="mt-4 grid gap-4">
              <SyncedPlayer track={track} />
              <div className="flex flex-wrap items-center gap-3">
                <a
                  className="download"
                  href={`/api/tracks/${track.id}/audio?download=1`}
                >
                  MP3
                </a>
                {track.masterAvailable && (
                  <a
                    className="download"
                    href={`/api/tracks/${track.id}/audio?master=1&download=1`}
                  >
                    FLAC master
                  </a>
                )}
                {track.coverAvailable && (
                  <a
                    className="download"
                    href={`/api/tracks/${track.id}/cover?download=1`}
                  >
                    Cover PNG
                  </a>
                )}
                {track.videoAvailable && (
                  <a
                    className="download"
                    href={`/api/tracks/${track.id}/video?download=1`}
                  >
                    YouTube MP4
                  </a>
                )}
                {selectedProfile && !isReference && (
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => onUseReference(track.id)}
                  >
                    Use as style reference
                  </Button>
                )}
              </div>
              <div className="media-actions">
                <div>
                  <Label className="field-label" htmlFor={`cover-${track.id}`}>
                    Cover art prompt
                  </Label>
                  <Textarea
                    id={`cover-${track.id}`}
                    className="mt-2 min-h-28 text-[0.82rem]"
                    value={coverPrompt}
                    onChange={(event) => setCoverPrompt(event.target.value)}
                    maxLength={2500}
                  />
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={
                      busy ||
                      coverPrompt.trim().length < 10 ||
                      activeCoverStatuses.has(track.coverStatus)
                    }
                    onClick={generateCover}
                  >
                    {activeCoverStatuses.has(track.coverStatus)
                      ? "Generating cover…"
                      : track.coverAvailable
                        ? "Regenerate cover"
                        : "Generate cover"}
                  </Button>
                  {track.coverAvailable && (
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={
                        busy || activeVideoStatuses.has(track.videoStatus)
                      }
                      onClick={renderYouTubeVideo}
                    >
                      {activeVideoStatuses.has(track.videoStatus)
                        ? "Rendering video…"
                        : track.videoAvailable
                          ? "Render video again"
                          : "Render YouTube video"}
                    </Button>
                  )}
                </div>
                {(actionError || track.coverError || track.videoError) && (
                  <p className="m-0 text-sm text-rose-300">
                    {actionError || track.coverError || track.videoError}
                  </p>
                )}
                <p className="m-0 text-xs leading-5 text-[var(--muted)]">
                  Covers use local Z-Image-Turbo. New songs use ACE-Step&apos;s
                  native latent-attention lyric alignment; older tracks may
                  still show estimated timing until regenerated.
                </p>
              </div>
            </div>
          )}
          {(activeStatuses.has(track.status) ||
            activeCoverStatuses.has(track.coverStatus) ||
            activeVideoStatuses.has(track.videoStatus)) && (
            <div className="progress mt-4">
              <span />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
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
    .filter((cue): cue is { time: number; text: string } =>
      Boolean(cue && Number.isFinite(cue.time) && cue.text),
    );
}

function SyncedPlayer({ track }: { track: TrackView }) {
  const cues = useMemo(() => parseLrc(track.lyricsLrc), [track.lyricsLrc]);
  const [currentTime, setCurrentTime] = useState(0);
  let currentLyric = "";
  for (const cue of cues) {
    if (cue.time > currentTime) break;
    currentLyric = cue.text;
  }
  return (
    <div className="visual-player-shell">
      <div className="visual-player">
        {track.coverAvailable ? (
          <img
            src={`/api/tracks/${track.id}/cover?v=${track.coverSeed ?? 0}`}
            alt="Generated cover art"
          />
        ) : (
          <div className="visual-placeholder" />
        )}
        <div className={`lyric-overlay ${currentLyric ? "is-active" : ""}`}>
          {currentLyric ||
            (track.instrumental ? "Instrumental" : "Play to see lyrics")}
        </div>
      </div>
      <audio
        controls
        preload="metadata"
        src={`/api/tracks/${track.id}/audio`}
        onTimeUpdate={(event) =>
          setCurrentTime(event.currentTarget.currentTime)
        }
        onSeeked={(event) => setCurrentTime(event.currentTarget.currentTime)}
      />
    </div>
  );
}
