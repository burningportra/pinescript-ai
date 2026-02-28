import { describe, it, expect } from "vitest";
import { checkV6Specific } from "@/lib/validator/rules/v6-specific";

describe("checkV6Specific", () => {
  it("returns empty array for v5", () => {
    const code = `bool flag = na
int count = na`;
    const results = checkV6Specific(code, "v5");
    expect(results).toHaveLength(0);
  });

  it("catches bool x = na (needs bool(na))", () => {
    const code = `bool flag = na`;
    const results = checkV6Specific(code, "v6");
    const match = results.find((r) => r.rule === "bool-na-cast");
    expect(match).toBeDefined();
    expect(match!.status).toBe("error");
    expect(match!.line).toBe(1);
    expect(match!.suggestion).toContain("bool(na)");
  });

  it("passes bool x = bool(na)", () => {
    const code = `bool flag = bool(na)`;
    const results = checkV6Specific(code, "v6");
    const match = results.find((r) => r.rule === "bool-na-cast");
    expect(match).toBeUndefined();
  });

  it("catches int x = na (warns)", () => {
    const code = `int count = na`;
    const results = checkV6Specific(code, "v6");
    const match = results.find((r) => r.rule === "int-na-cast");
    expect(match).toBeDefined();
    expect(match!.status).toBe("warn");
    expect(match!.line).toBe(1);
  });

  it("catches fill() mixing hline and plot references", () => {
    const code = `h1 = hline(70)
p1 = plot(close)
fill(h1, p1, color=color.red)`;
    const results = checkV6Specific(code, "v6");
    const match = results.find((r) => r.rule === "fill-mixed-types");
    expect(match).toBeDefined();
    expect(match!.status).toBe("error");
    expect(match!.line).toBe(3);
  });

  it("passes fill() with same types", () => {
    const code = `p1 = plot(close)
p2 = plot(open)
fill(p1, p2, color=color.red)`;
    const results = checkV6Specific(code, "v6");
    const match = results.find((r) => r.rule === "fill-mixed-types");
    expect(match).toBeUndefined();
  });

  it("catches input.int() with def= instead of defval=", () => {
    const code = `len = input.int(def=14, title="Length")`;
    const results = checkV6Specific(code, "v6");
    const match = results.find((r) => r.rule === "input-def-param");
    expect(match).toBeDefined();
    expect(match!.status).toBe("error");
    expect(match!.line).toBe(1);
    expect(match!.suggestion).toContain("defval");
  });

  it("passes input.int() with defval=", () => {
    const code = `len = input.int(defval=14, title="Length")`;
    const results = checkV6Specific(code, "v6");
    const match = results.find((r) => r.rule === "input-def-param");
    expect(match).toBeUndefined();
  });
});
