import { describe, expect, it } from "vitest";
import { cleanSpokenText } from "@/lib/agent/transcript-text";

describe("cleanSpokenText", () => {
  it("returns empty string for blank or punctuation-only input", () => {
    expect(cleanSpokenText("")).toBe("");
    expect(cleanSpokenText(null)).toBe("");
    expect(cleanSpokenText("  . , ")).toBe("");
  });

  it("fixes spacing around punctuation", () => {
    expect(cleanSpokenText("Wakad , 3 BHK")).toBe("Wakad, 3 BHK");
    expect(cleanSpokenText("haan,theek hai")).toBe("haan, theek hai");
  });

  it("keeps decimal budget figures intact", () => {
    expect(cleanSpokenText("budget 1.25 crore")).toBe("budget 1.25 crore");
  });

  it("gives the Devanagari danda breathing room", () => {
    expect(cleanSpokenText("मुझे 3 BHK चाहिए।पुणे में")).toBe("मुझे 3 BHK चाहिए। पुणे में");
  });

  it("preserves intentional line breaks and collapses blank runs", () => {
    expect(cleanSpokenText("line one\n\n\n\nline two")).toBe("line one\n\nline two");
  });
});
