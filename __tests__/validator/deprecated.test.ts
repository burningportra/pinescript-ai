import { describe, it, expect } from "vitest";
import { checkDeprecated } from "@/lib/validator/rules/deprecated";

describe("checkDeprecated", () => {
  it("returns empty array for v5 (skips all checks)", () => {
    const code = `study("My Script")
security(syminfo.tickerid, "D", close)`;
    const results = checkDeprecated(code, "v5");
    expect(results).toHaveLength(0);
  });

  it("catches study()", () => {
    const code = `study("My Script")`;
    const results = checkDeprecated(code, "v6");
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      rule: "deprecated-study",
      status: "error",
      suggestion: "Use indicator() instead",
    });
  });

  it("catches bare security() but NOT request.security()", () => {
    const code = `val = security(syminfo.tickerid, "D", close)
val2 = request.security(syminfo.tickerid, "D", close)`;
    const results = checkDeprecated(code, "v6");
    const securityResults = results.filter(
      (r) => r.rule === "deprecated-security",
    );
    expect(securityResults).toHaveLength(1);
    expect(securityResults[0].line).toBe(1);
  });

  it("catches transp=", () => {
    const code = `plot(close, color=color.red, transp=50)`;
    const results = checkDeprecated(code, "v6");
    const match = results.find((r) => r.rule === "deprecated-transp");
    expect(match).toBeDefined();
    expect(match!.status).toBe("error");
    expect(match!.suggestion).toContain("color.new");
  });

  it("catches iff()", () => {
    const code = `val = iff(condition, 1, 0)`;
    const results = checkDeprecated(code, "v6");
    const match = results.find((r) => r.rule === "deprecated-iff");
    expect(match).toBeDefined();
    expect(match!.status).toBe("error");
  });

  it("catches plot.style_dashed", () => {
    const code = `plot(close, style=plot.style_dashed)`;
    const results = checkDeprecated(code, "v6");
    const match = results.find((r) => r.rule === "nonexistent-style-dashed");
    expect(match).toBeDefined();
    expect(match!.status).toBe("error");
  });

  it("catches input.integer(), input.resolution(), input.symbol()", () => {
    const code = `len = input.integer(14)
tf = input.resolution("D")
sym = input.symbol("AAPL")`;
    const results = checkDeprecated(code, "v6");
    const inputResults = results.filter(
      (r) => r.rule === "deprecated-input-type",
    );
    expect(inputResults).toHaveLength(3);
  });

  it("catches bare tostring() but NOT str.tostring()", () => {
    const code = `a = tostring(123)
b = str.tostring(456)`;
    const results = checkDeprecated(code, "v6");
    const match = results.filter((r) => r.rule === "deprecated-tostring");
    expect(match).toHaveLength(1);
    expect(match[0].line).toBe(1);
  });

  it("catches bare tonumber() but NOT str.tonumber()", () => {
    const code = `a = tonumber("123")
b = str.tonumber("456")`;
    const results = checkDeprecated(code, "v6");
    const match = results.filter((r) => r.rule === "deprecated-tonumber");
    expect(match).toHaveLength(1);
    expect(match[0].line).toBe(1);
  });

  it("skips comment lines", () => {
    const code = `// study("old code")
// security(syminfo.tickerid, "D", close)`;
    const results = checkDeprecated(code, "v6");
    expect(results).toHaveLength(0);
  });

  it("returns correct line numbers", () => {
    const code = `indicator("My Script")
val = security(syminfo.tickerid, "D", close)
x = iff(cond, 1, 0)`;
    const results = checkDeprecated(code, "v6");
    const securityResult = results.find(
      (r) => r.rule === "deprecated-security",
    );
    const iffResult = results.find((r) => r.rule === "deprecated-iff");
    expect(securityResult!.line).toBe(2);
    expect(iffResult!.line).toBe(3);
  });
});
