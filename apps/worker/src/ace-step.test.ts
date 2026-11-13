import { describe, expect, it } from "vitest";
import { AceStepClient } from "./ace-step";

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
    expect(() => client.parseFirstAudio("[]")).toThrow("audio súbor");
  });
});
