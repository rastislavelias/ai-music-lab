"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

export type TrackView = {
  id: string;
  prompt: string;
  instrumental: boolean;
  status: string;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
};

const activeStatuses = new Set(["QUEUED", "SUBMITTING", "PROCESSING"]);

const labels: Record<string, string> = {
  QUEUED: "Vo fronte",
  SUBMITTING: "Odosielam",
  PROCESSING: "Generujem",
  COMPLETED: "Hotovo",
  FAILED: "Zlyhalo",
};

export function MusicLab({ initialTracks }: { initialTracks: TrackView[] }) {
  const [tracks, setTracks] = useState(initialTracks);
  const [prompt, setPrompt] = useState("");
  const [instrumental, setInstrumental] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasActive = useMemo(
    () => tracks.some((track) => activeStatuses.has(track.status)),
    [tracks],
  );

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
        body: JSON.stringify({ prompt, instrumental }),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error ?? "Generovanie sa nepodarilo zaradiť.");
      setTracks((current) => [body.track, ...current]);
      setPrompt("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Neznáma chyba.");
    } finally {
      setSubmitting(false);
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
              Opíš zvuk, náladu a nástroje. Generovanie beží na tvojom GPU a
              výsledok ostáva lokálne.
            </p>
          </div>
          <div className="hidden rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-[var(--muted)] sm:block">
            {hasActive ? "● GPU pracuje" : "○ Pripravené"}
          </div>
        </header>

        <section className="panel mb-10 grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.4fr_.6fr]">
          <form onSubmit={submit}>
            <label htmlFor="prompt" className="label">
              Prompt
            </label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Temný synthwave, pulzujúci analógový bas, filmové bicie, nočná jazda mestom…"
              minLength={3}
              maxLength={2000}
              required
            />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
              <label className="toggle-row">
                <input
                  type="checkbox"
                  checked={instrumental}
                  onChange={(event) => setInstrumental(event.target.checked)}
                />
                <span>Inštrumentálna skladba</span>
              </label>
              <button
                type="submit"
                disabled={submitting || prompt.trim().length < 3}
              >
                {submitting ? "Zaraďujem…" : "Vygenerovať skladbu"}
              </button>
            </div>
            {error && <p className="mt-4 text-sm text-rose-300">{error}</p>}
          </form>
          <aside className="rounded-2xl border border-white/8 bg-black/15 p-5">
            <div className="label">Tip pre lepší výsledok</div>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              Kombinuj žáner, tempo, náladu, nástroje a produkčný štýl.
              Napríklad: „warm lo-fi hip-hop, 82 BPM, dusty drums, Rhodes piano,
              vinyl texture“.
            </p>
          </aside>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2>Tvoje skladby</h2>
            <span className="text-sm text-[var(--muted)]">
              {tracks.length} položiek
            </span>
          </div>
          {tracks.length === 0 ? (
            <div className="empty">
              Zatiaľ tu nič nie je. Prvá skladba začína dobrým promptom.
            </div>
          ) : (
            <div className="grid gap-4">
              {tracks.map((track, index) => (
                <TrackCard key={track.id} track={track} index={index} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function TrackCard({ track, index }: { track: TrackView; index: number }) {
  const complete = track.status === "COMPLETED";
  return (
    <article className="track-card">
      <div className="track-number">{String(index + 1).padStart(2, "0")}</div>
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className={`status status-${track.status.toLowerCase()}`}>
            {labels[track.status] ?? track.status}
          </span>
          {track.instrumental && <span className="chip">INSTRUMENTAL</span>}
          <time className="text-xs text-[var(--muted)]">
            {new Intl.DateTimeFormat("sk-SK", {
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
              Stiahnuť MP3
            </a>
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
