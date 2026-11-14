import { describe, expect, it } from "vitest";
import { buildEstimatedLrc } from "./media";

describe("buildEstimatedLrc", () => {
  it("creates ordered timestamps for visible lyric lines", () => {
    const result = buildEstimatedLrc(
      "[Verse]\nFirst lyric line\nSecond lyric line\n\n[Outro]\n(fading)",
      60,
    );
    expect(result).toMatch(/^\[00:05\.00\]First lyric line/m);
    expect(result).toContain("Second lyric line");
    expect(result).not.toContain("[Verse]");
    expect(result).not.toContain("fading");
  });

  it("returns no cues for an instrumental marker", () => {
    expect(buildEstimatedLrc("[Instrumental]", 90)).toBe("");
  });
});
