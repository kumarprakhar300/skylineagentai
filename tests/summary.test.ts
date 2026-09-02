import { describe, expect, it } from "vitest";
import { parseSummary, summaryScoreLine } from "@/lib/agent/summary";
import { normalizeLanguage, sttLanguageCode, isSpokenLanguage } from "@/lib/agent/language";

describe("parseSummary", () => {
  it("parses labelled sections", () => {
    const parsed = parseSummary(
      ["Customer profile: Prakhar, Pune", "Requirement: 3 BHK in Wakad", "Timeline: immediate"].join("\n"),
    );
    expect(parsed["Requirement"]).toBe("3 BHK in Wakad");
    expect(parsed["Timeline"]).toBe("immediate");
  });

  it("appends continuation lines to the current section", () => {
    const parsed = parseSummary("Next action: call back\ntomorrow at 6pm");
    expect(parsed["Next action"]).toBe("call back\ntomorrow at 6pm");
  });

  it("ignores unknown labels", () => {
    expect(parseSummary("Random label: value")).toEqual({});
  });

  it("formats the score line with a capitalised band", () => {
    expect(summaryScoreLine({ score: 82, band: "hot", reasons: [] })).toBe("Lead score: 82/100 — Hot");
  });
});

describe("language helpers", () => {
  it("falls back to auto for unknown values", () => {
    expect(normalizeLanguage("klingon")).toBe("auto");
    expect(normalizeLanguage("hindi")).toBe("hindi");
    expect(isSpokenLanguage("hinglish")).toBe(true);
  });

  it("only sets an STT language code for single-language modes", () => {
    expect(sttLanguageCode("english")).toBe("en");
    expect(sttLanguageCode("hindi")).toBe("hi");
    expect(sttLanguageCode("hinglish")).toBeNull();
    expect(sttLanguageCode("auto")).toBeNull();
  });
});
