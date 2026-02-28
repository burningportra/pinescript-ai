import { describe, it, expect } from "vitest";
import { checkLimits } from "@/lib/validator/rules/limits";

describe("checkLimits", () => {
  it("returns empty array when there are no plots", () => {
    const code = `//@version=6
indicator("My Script")
x = close`;
    const results = checkLimits(code);
    expect(results).toHaveLength(0);
  });

  it("does not error for 64 or fewer plots", () => {
    const plots = Array.from({ length: 64 }, (_, i) => `plot(close + ${i})`).join("\n");
    const results = checkLimits(plots);
    const error = results.find((r) => r.rule === "plot-limit-exceeded");
    expect(error).toBeUndefined();
  });

  it("returns error for more than 64 plots", () => {
    const plots = Array.from({ length: 65 }, (_, i) => `plot(close + ${i})`).join("\n");
    const results = checkLimits(plots);
    const error = results.find((r) => r.rule === "plot-limit-exceeded");
    expect(error).toBeDefined();
    expect(error!.status).toBe("error");
    expect(error!.message).toContain("65");
  });

  it("returns warning for 50-64 plots", () => {
    const plots = Array.from({ length: 55 }, (_, i) => `plot(close + ${i})`).join("\n");
    const results = checkLimits(plots);
    const warning = results.find((r) => r.rule === "plot-limit-warning");
    expect(warning).toBeDefined();
    expect(warning!.status).toBe("warn");
    expect(warning!.message).toContain("55");
  });

  it("returns empty array when there are no request calls", () => {
    const code = `//@version=6
indicator("My Script")
plot(close)`;
    const results = checkLimits(code);
    const requestResults = results.filter((r) => r.rule.startsWith("request-limit"));
    expect(requestResults).toHaveLength(0);
  });

  it("returns error for more than 40 request calls", () => {
    const requests = Array.from(
      { length: 41 },
      (_, i) => `val${i} = request.security(syminfo.tickerid, "D", close)`,
    ).join("\n");
    const results = checkLimits(requests);
    const error = results.find((r) => r.rule === "request-limit-exceeded");
    expect(error).toBeDefined();
    expect(error!.status).toBe("error");
    expect(error!.message).toContain("41");
  });

  it("returns warning for 30-40 request calls", () => {
    const requests = Array.from(
      { length: 35 },
      (_, i) => `val${i} = request.security(syminfo.tickerid, "D", close)`,
    ).join("\n");
    const results = checkLimits(requests);
    const warning = results.find((r) => r.rule === "request-limit-warning");
    expect(warning).toBeDefined();
    expect(warning!.status).toBe("warn");
    expect(warning!.message).toContain("35");
  });

  it("returns size warning for scripts over 50K characters", () => {
    const code = "a".repeat(51000);
    const results = checkLimits(code);
    const warning = results.find((r) => r.rule === "script-size-warning");
    expect(warning).toBeDefined();
    expect(warning!.status).toBe("warn");
    expect(warning!.message).toContain("51K");
  });
});
