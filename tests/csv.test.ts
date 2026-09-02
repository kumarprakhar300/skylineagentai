import { describe, expect, it } from "vitest";
import { toCsv } from "@/lib/csv";

describe("toCsv", () => {
  it("quotes every cell and separates rows with CRLF", () => {
    expect(toCsv(["a", "b"], [[1, 2]])).toBe('"a","b"\r\n"1","2"');
  });

  it("escapes double quotes", () => {
    expect(toCsv(["a"], [['say "hi"']])).toBe('"a"\r\n"say ""hi"""');
  });

  it("preserves line breaks as quoted CRLF inside a cell", () => {
    expect(toCsv(["a"], [["one\ntwo"]])).toBe('"a"\r\n"one\r\ntwo"');
  });

  it("neutralises formula injection", () => {
    expect(toCsv(["a"], [["=1+1"]])).toBe('"a"\r\n"\'=1+1"');
  });

  it("renders empty values and arrays predictably", () => {
    expect(toCsv(["a", "b"], [[null, ["x", "y"]]])).toBe('"a","b"\r\n"","x | y"');
  });
});
