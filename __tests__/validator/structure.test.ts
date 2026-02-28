import { describe, it, expect } from "vitest";
import { checkStructure } from "@/lib/validator/rules/structure";

describe("checkStructure", () => {
  it("returns empty-script error for empty input", () => {
    const results = checkStructure("");
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      rule: "empty-script",
      status: "error",
    });
  });

  it("returns empty-script error for whitespace-only input", () => {
    const results = checkStructure("   \n  \n  ");
    expect(results).toHaveLength(1);
    expect(results[0].rule).toBe("empty-script");
  });

  it("reports missing version annotation", () => {
    const code = `indicator("My Script")
plot(close)`;
    const results = checkStructure(code);
    const missing = results.find((r) => r.rule === "missing-version");
    expect(missing).toBeDefined();
    expect(missing!.status).toBe("error");
    expect(missing!.line).toBe(1);
  });

  it("passes with valid version annotation", () => {
    const code = `//@version=6
indicator("My Script")
plot(close)`;
    const results = checkStructure(code);
    const missing = results.find((r) => r.rule === "missing-version");
    expect(missing).toBeUndefined();
  });

  it("reports missing indicator/strategy/library declaration", () => {
    const code = `//@version=6
plot(close)`;
    const results = checkStructure(code);
    const missing = results.find((r) => r.rule === "missing-declaration");
    expect(missing).toBeDefined();
    expect(missing!.status).toBe("error");
  });

  it("passes with indicator declaration", () => {
    const code = `//@version=6
indicator("My Script")
plot(close)`;
    const results = checkStructure(code);
    const missing = results.find((r) => r.rule === "missing-declaration");
    expect(missing).toBeUndefined();
  });

  it("passes with strategy declaration", () => {
    const code = `//@version=6
strategy("My Strategy")
plot(close)`;
    const results = checkStructure(code);
    const missing = results.find((r) => r.rule === "missing-declaration");
    expect(missing).toBeUndefined();
  });

  it("passes with library declaration", () => {
    const code = `//@version=6
library("My Library")
export f() => 1`;
    const results = checkStructure(code);
    const missing = results.find((r) => r.rule === "missing-declaration");
    expect(missing).toBeUndefined();
  });

  it("reports dual indicator + strategy declaration", () => {
    const code = `//@version=6
indicator("My Script")
strategy("My Strategy")
plot(close)`;
    const results = checkStructure(code);
    const dual = results.find((r) => r.rule === "dual-declaration");
    expect(dual).toBeDefined();
    expect(dual!.status).toBe("error");
  });

  it("detects unbalanced parentheses", () => {
    const code = `//@version=6
indicator("My Script")
plot(close`;
    const results = checkStructure(code);
    const unbalanced = results.find((r) => r.rule === "unbalanced-parens");
    expect(unbalanced).toBeDefined();
    expect(unbalanced!.status).toBe("error");
    expect(unbalanced!.message).toContain("2 opening");
    expect(unbalanced!.message).toContain("1 closing");
  });

  it("detects unbalanced brackets", () => {
    const code = `//@version=6
indicator("My Script")
a = array.new_float(0)
b = a[0`;
    const results = checkStructure(code);
    const unbalanced = results.find((r) => r.rule === "unbalanced-brackets");
    expect(unbalanced).toBeDefined();
    expect(unbalanced!.status).toBe("error");
  });

  it("detects unbalanced string quotes", () => {
    const code = `//@version=6
indicator("My Script")
label.new(bar_index, close, "unclosed)`;
    const results = checkStructure(code);
    const unbalanced = results.find((r) => r.rule === "unbalanced-string");
    expect(unbalanced).toBeDefined();
    expect(unbalanced!.status).toBe("error");
    expect(unbalanced!.line).toBe(3);
  });

  it("skips comment lines for string quote checks", () => {
    const code = `//@version=6
indicator("My Script")
// This "comment has odd quotes
plot(close)`;
    const results = checkStructure(code);
    const unbalanced = results.find((r) => r.rule === "unbalanced-string");
    expect(unbalanced).toBeUndefined();
  });

  it("returns pass for a fully valid script", () => {
    const code = `//@version=6
indicator("My Script")
plot(close)`;
    const results = checkStructure(code);
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      rule: "structure",
      status: "pass",
      message: "Script structure is valid",
    });
  });
});
