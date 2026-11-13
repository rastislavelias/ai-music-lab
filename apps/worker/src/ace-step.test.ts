import { afterEach, describe, expect, it, vi } from "vitest";
import { AceStepClient } from "./ace-step";

afterEach(() => vi.restoreAllMocks());

describe("AceStepClient submission", () => {
  it("sends user lyrics for a vocal track", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: { task_id: "task-1" },
          code: 200,
          error: null,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const client = new AceStepClient("http://acestep:8001");

    await expect(
      client.submit("warm deep house", "[Verse]\nRise slowly", false),
    ).resolves.toBe("task-1");

    const request = fetchMock.mock.calls[0]?.[1];
    expect(JSON.parse(String(request?.body))).toMatchObject({
      prompt: "warm deep house",
      lyrics: "[Verse]\nRise slowly",
    });
  });

  it("uses the instrumental marker instead of lyrics", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: { task_id: "task-2" },
          code: 200,
          error: null,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const client = new AceStepClient("http://acestep:8001");

    await client.submit("warm deep house", "ignored words", true);

    const request = fetchMock.mock.calls[0]?.[1];
    expect(JSON.parse(String(request?.body)).lyrics).toBe("[inst]");
  });
});

describe("AceStepClient result parsing", () => {
  const client = new AceStepClient("http://acestep:8001");

  it("extracts the first audio URL from the documented JSON string", () => {
    expect(
      client.parseFirstAudio(
        '[{"file":"/v1/audio?path=%2Fapp%2Foutput%2Fsong.mp3","status":1}]',
      ),
    ).toEqual({
      file: "/v1/audio?path=%2Fapp%2Foutput%2Fsong.mp3",
      status: 1,
    });
  });

  it("rejects results without an audio file", () => {
    expect(() => client.parseFirstAudio("[]")).toThrow("audio file");
  });
});
