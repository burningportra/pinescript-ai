import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/validate/route";

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/validate", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/validate", () => {
  it("returns 400 for invalid JSON body", async () => {
    const req = new NextRequest("http://localhost:3000/api/validate", {
      method: "POST",
      body: "not json",
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toBe("Invalid request body");
  });

  it("returns 400 for missing code field", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toBe("Missing code");
  });

  it("returns validation results for valid PineScript code", async () => {
    const code = `//@version=6
indicator("Test Script")
plot(close)`;

    const res = await POST(makeRequest({ code }));
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.results).toBeDefined();
    expect(Array.isArray(data.results)).toBe(true);
  });

  it("defaults to v6 when version not specified", async () => {
    const code = `//@version=6
indicator("Test Script")
a = iff(close > open, 1, 0)`;

    const res = await POST(makeRequest({ code }));
    expect(res.status).toBe(200);

    const data = await res.json();
    // iff() is deprecated in v6, so the validator should flag it
    const deprecated = data.results.find(
      (r: { rule: string }) => r.rule === "deprecated-iff",
    );
    expect(deprecated).toBeDefined();
  });

  it("passes v5 version through correctly", async () => {
    const code = `//@version=5
study("Test Script")
plot(close)`;

    const res = await POST(makeRequest({ code, version: "v5" }));
    expect(res.status).toBe(200);

    const data = await res.json();
    // study() is valid in v5, so no deprecated-study error
    const deprecated = data.results.find(
      (r: { rule: string }) => r.rule === "deprecated-study",
    );
    expect(deprecated).toBeUndefined();
  });

  it("returns structure errors for invalid code", async () => {
    const code = `plot(close`;

    const res = await POST(makeRequest({ code }));
    expect(res.status).toBe(200);

    const data = await res.json();
    // Missing version, missing declaration, unbalanced parens
    const errors = data.results.filter(
      (r: { status: string }) => r.status === "error",
    );
    expect(errors.length).toBeGreaterThan(0);

    const rules = errors.map((e: { rule: string }) => e.rule);
    expect(rules).toContain("missing-version");
    expect(rules).toContain("missing-declaration");
    expect(rules).toContain("unbalanced-parens");
  });
});
