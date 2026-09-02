import { describe, expect, it } from "vitest";
import { scoreLead, scoreLine } from "@/lib/agent/score";
import { buildSignalBreakdown } from "@/lib/score-breakdown";

const fullLead = {
  intent: "buy",
  location: "Wakad, Pune",
  property_type: "apartment",
  configuration: "3 BHK",
  budget: "85 lakh",
  purpose: "self use",
  timeline: "immediate",
  name: "Prakhar",
  phone: "9999999999",
};

describe("scoreLead", () => {
  it("scores a fully qualified, urgent lead as hot", () => {
    const result = scoreLead(fullLead, [
      { role: "user", content: "Mujhe site visit karna hai" },
      { role: "assistant", content: "Sure" },
      { role: "user", content: "3 BHK chahiye" },
      { role: "assistant", content: "Noted" },
      { role: "user", content: "Budget 85 lakh" },
      { role: "assistant", content: "Great" },
      { role: "user", content: "Kab aa sakte hain?" },
      { role: "assistant", content: "Kal" },
      { role: "user", content: "Theek hai" },
      { role: "assistant", content: "Done" },
      { role: "user", content: "Haan" },
    ]);
    expect(result.band).toBe("hot");
    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.reasons).toContain("Timeline is immediate");
  });

  it("scores an empty, disinterested call as cold", () => {
    const result = scoreLead({}, [{ role: "user", content: "not interested, mat call karo" }]);
    expect(result.band).toBe("cold");
    expect(result.score).toBe(0);
  });

  it("keeps the score inside 0-100", () => {
    for (const lead of [{}, fullLead]) {
      const { score } = scoreLead(lead, []);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });

  it("renders a human readable score line", () => {
    const result = scoreLead(fullLead, []);
    expect(scoreLine(result)).toMatch(/Lead score: \d+\/100/);
  });

  it("breaks stored reasons down into per-signal points", () => {
    const result = scoreLead(fullLead, [{ role: "user", content: "site visit" }]);
    const breakdown = buildSignalBreakdown(result.reasons);
    expect(breakdown.length).toBeGreaterThan(0);
    expect(breakdown.some((row) => row.signal === "Timeline" && row.points === 20)).toBe(true);
  });
});
