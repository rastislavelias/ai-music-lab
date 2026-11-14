export type AceTaskResult = {
  file: string;
  status?: number;
  lrc_text?: string;
};

type ApiEnvelope<T> = {
  data: T;
  code: number;
  error: string | null;
};

type QueryItem = {
  task_id: string;
  status: 0 | 1 | 2;
  result?: string;
  error?: string;
};

export type AceSubmitInput = {
  prompt: string;
  lyrics: string;
  instrumental: boolean;
  seed: number;
  bpm?: number | null;
  keyScale?: string;
  timeSignature?: string;
  audioDuration?: number | null;
  inferenceSteps?: number;
  vocalLanguage: string;
  referenceAudioPath?: string;
};

export class AceStepClient {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey?: string,
  ) {}

  async health(): Promise<void> {
    await this.request<ApiEnvelope<unknown>>("/health", {
      signal: AbortSignal.timeout(10_000),
    });
  }

  async submit(input: AceSubmitInput): Promise<string> {
    const response = await this.request<ApiEnvelope<{ task_id: string }>>(
      "/release_task",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: input.prompt,
          lyrics: input.instrumental ? "[inst]" : input.lyrics,
          thinking: true,
          audio_format: "flac",
          batch_size: 1,
          use_random_seed: false,
          seed: input.seed,
          bpm: input.bpm ?? null,
          key_scale: input.keyScale ?? "",
          time_signature: input.timeSignature ?? "4/4",
          audio_duration: input.audioDuration ?? null,
          inference_steps: input.inferenceSteps ?? 8,
          vocal_language: input.vocalLanguage,
          reference_audio_path: input.referenceAudioPath ?? null,
        }),
      },
    );
    if (!response.data?.task_id)
      throw new Error("ACE-Step did not return a task_id.");
    return response.data.task_id;
  }

  async query(taskId: string): Promise<QueryItem> {
    const response = await this.request<ApiEnvelope<QueryItem[]>>(
      "/query_result",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id_list: [taskId] }),
      },
    );
    const item = response.data?.find(
      (candidate) => candidate.task_id === taskId,
    );
    if (!item) throw new Error("ACE-Step did not return the task status.");
    return item;
  }

  parseFirstAudio(result: string | undefined): AceTaskResult {
    if (!result)
      throw new Error("ACE-Step completed the task without a result.");
    const parsed: unknown = JSON.parse(result);
    if (!Array.isArray(parsed))
      throw new Error("ACE-Step returned an invalid result.");
    const audio = parsed.find(
      (value): value is AceTaskResult =>
        typeof value === "object" &&
        value !== null &&
        typeof (value as { file?: unknown }).file === "string",
    );
    if (!audio)
      throw new Error("The ACE-Step result does not contain an audio file.");
    return audio;
  }

  async download(file: string): Promise<Response> {
    const url = new URL(file, `${this.baseUrl}/`);
    if (url.origin !== new URL(this.baseUrl).origin) {
      throw new Error(
        "ACE-Step returned an audio URL from an unexpected server.",
      );
    }
    const response = await fetch(url, {
      headers: this.authHeaders(),
      signal: AbortSignal.timeout(120_000),
    });
    if (!response.ok || !response.body)
      throw new Error(`Audio download failed (HTTP ${response.status}).`);
    return response;
  }

  private async request<T>(pathname: string, init: RequestInit): Promise<T> {
    const response = await fetch(new URL(pathname, `${this.baseUrl}/`), {
      ...init,
      headers: { ...this.authHeaders(), ...init.headers },
    });
    const body = (await response.json().catch(() => null)) as T | null;
    if (!response.ok) {
      const failure = body as { detail?: unknown; error?: unknown } | null;
      const reason =
        typeof failure?.detail === "string"
          ? failure.detail
          : typeof failure?.error === "string"
            ? failure.error
            : null;
      throw new Error(
        `ACE-Step API failed (HTTP ${response.status})${reason ? `: ${reason}` : "."}`,
      );
    }
    const envelope = body as ApiEnvelope<unknown> | null;
    if (!envelope || envelope.code !== 200 || envelope.error) {
      throw new Error(
        envelope?.error || "ACE-Step API returned an invalid response.",
      );
    }
    return body as T;
  }

  private authHeaders(): Record<string, string> {
    return this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {};
  }
}
