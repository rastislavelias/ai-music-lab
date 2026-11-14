export type ImageResult = {
  file_name: string;
  mime_type: string;
  model: string;
  seed: number;
  width: number;
  height: number;
};

export class ImageServiceClient {
  constructor(
    private readonly baseUrl: string,
    private readonly timeoutMs: number,
  ) {}

  async generate(input: {
    prompt: string;
    fileName: string;
    seed: number;
  }): Promise<ImageResult> {
    const response = await fetch(new URL("/generate", `${this.baseUrl}/`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: input.prompt,
        file_name: input.fileName,
        seed: input.seed,
        width: 1024,
        height: 576,
      }),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    const body = (await response.json().catch(() => null)) as
      | ImageResult
      | { detail?: string; error?: string }
      | null;
    if (!response.ok) {
      throw new Error(
        (body && "detail" in body && body.detail) ||
          `Image service failed (HTTP ${response.status}).`,
      );
    }
    if (body && "error" in body && body.error) {
      throw new Error(body.error);
    }
    if (!body || !("file_name" in body)) {
      throw new Error("Image service returned an invalid response.");
    }
    return body;
  }
}
