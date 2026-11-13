"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

export type TrackView = {
  id: string;
  prompt: string;
  lyrics: string;
  instrumental: boolean;
  profileId: string | null;
  seed: number | null;
  generationGroupId: string | null;
  masterAvailable: boolean;
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
    () => tracks.some((track) => activeStatuses.has(track.status)),
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

        <section className="panel mb-10 grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.35fr_.65fr]">
          <form onSubmit={submit}>
            <div className="mb-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="profile" className="label">
                  Artist profile
                </label>
                <select
                  id="profile"
                  className="field mt-3"
                  value={selectedProfileId}
                  onChange={(event) => setSelectedProfileId(event.target.value)}
                >
                  <option value="">No profile</option>
                  {profiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="variants" className="label">
                  Variants
                </label>
                <select
                  id="variants"
                  className="field mt-3"
                  value={variants}
                  onChange={(event) => setVariants(Number(event.target.value))}
                >
                  <option value={1}>1 track</option>
                  <option value={2}>2 tracks</option>
                  <option value={4}>4 tracks</option>
                </select>
              </div>
            </div>

            <label htmlFor="prompt" className="label">
              Song prompt
            </label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="A slow-burning melancholic deep-house song with a restrained groove and an intimate chorus…"
              minLength={3}
              maxLength={2000}
              required
            />
            {!instrumental && (
              <div className="mt-5">
                <label htmlFor="lyrics" className="label">
                  Lyrics
                </label>
                <textarea
                  id="lyrics"
                  className="lyrics-input"
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
              <label className="toggle-row">
                <input
                  type="checkbox"
                  checked={instrumental}
                  onChange={(event) => setInstrumental(event.target.checked)}
                />
                <span>Instrumental track</span>
              </label>
              <button
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
              </button>
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
                  <label htmlFor="base-prompt" className="field-label">
                    Core sound
                  </label>
                  <textarea
                    id="base-prompt"
                    className="compact-textarea"
                    value={profileBasePrompt}
                    onChange={(event) =>
                      setProfileBasePrompt(event.target.value)
                    }
                    placeholder="Warm deep house, polished intimate production, smooth bass…"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="profile-bpm" className="field-label">
                      BPM
                    </label>
                    <input
                      id="profile-bpm"
                      className="field mt-2"
                      type="number"
                      min={40}
                      max={240}
                      value={profileBpm}
                      onChange={(event) => setProfileBpm(event.target.value)}
                      placeholder="124"
                    />
                  </div>
                  <div>
                    <label htmlFor="profile-language" className="field-label">
                      Language
                    </label>
                    <input
                      id="profile-language"
                      className="field mt-2"
                      value={profileLanguage}
                      onChange={(event) =>
                        setProfileLanguage(event.target.value)
                      }
                      placeholder="en"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  className="secondary"
                  disabled={savingProfile}
                  onClick={saveProfile}
                >
                  {savingProfile ? "Saving…" : "Save profile"}
                </button>
              </div>
            ) : (
              <div className="mt-4 grid gap-3">
                <p className="m-0 text-sm leading-6 text-[var(--muted)]">
                  Create a profile to keep one core sound and reuse a completed
                  song as the reference for future generations.
                </p>
                <input
                  className="field"
                  value={profileName}
                  onChange={(event) => setProfileName(event.target.value)}
                  placeholder="Artist or project name"
                  maxLength={80}
                />
                <button
                  type="button"
                  className="secondary"
                  disabled={savingProfile || profileName.trim().length < 2}
                  onClick={createProfile}
                >
                  Create artist profile
                </button>
              </div>
            )}
          </aside>
        </section>

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
}: {
  track: TrackView;
  index: number;
  selectedProfile?: ArtistProfileView;
  onUseReference: (trackId: string) => Promise<void>;
}) {
  const complete = track.status === "COMPLETED";
  const isReference = selectedProfile?.referenceTrackId === track.id;
  return (
    <article className="track-card">
      <div className="track-number">{String(index + 1).padStart(2, "0")}</div>
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className={`status status-${track.status.toLowerCase()}`}>
            {labels[track.status] ?? track.status}
          </span>
          <span className="chip">
            {track.instrumental ? "INSTRUMENTAL" : "VOCALS"}
          </span>
          {isReference && (
            <span className="chip reference-chip">REFERENCE</span>
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
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <audio
              controls
              preload="metadata"
              src={`/api/tracks/${track.id}/audio`}
            />
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
            {selectedProfile && !isReference && (
              <button
                type="button"
                className="text-button"
                onClick={() => onUseReference(track.id)}
              >
                Use as style reference
              </button>
            )}
          </div>
        )}
        {activeStatuses.has(track.status) && (
          <div className="progress mt-4">
            <span />
          </div>
        )}
      </div>
    </article>
  );
}
