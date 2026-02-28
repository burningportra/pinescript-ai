import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock LLM SDKs and AI reviewer before importing the route
vi.mock("@anthropic-ai/sdk", () => ({ default: vi.fn() }));
vi.mock("openai", () => ({ default: vi.fn() }));
vi.mock("@/lib/ai/reviewer", () => ({
  reviewCode: vi.fn(),
  fixCode: vi.fn(),
}));

import { POST } from "@/app/api/fix/route";

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/fix", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function validSettings(overrides: Record<string, unknown> = {}) {
  return {
    provider: "anthropic",
    apiKey: "sk-test-key",
    model: "claude-sonnet-4-6",
    ...overrides,
  };
}

function validErrors() {
  return [
    {
      rule: "deprecated-study",
      status: "error",
      message: "study() is deprecated in v6",
      line: 2,
      suggestion: "Use indicator() instead",
    },
  ];
}

describe("POST /api/fix", () => {
  it("returns 400 for invalid JSON body", async () => {
    const req = new NextRequest("http://localhost:3000/api/fix", {
      method: "POST",
      body: "not valid json",
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toBe("Invalid request body");
  });

  it("returns 400 for missing code", async () => {
    const res = await POST(
      makeRequest({
        errors: validErrors(),
        settings: validSettings(),
      }),
    );
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toBe("Missing required fields");
  });

  it("returns 400 for missing errors", async () => {
    const res = await POST(
      makeRequest({
        code: `//@version=6\nindicator("Test")\nplot(close)`,
        settings: validSettings(),
      }),
    );
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toBe("Missing required fields");
  });

  it("returns 400 for empty errors array", async () => {
    const res = await POST(
      makeRequest({
        code: `//@version=6\nindicator("Test")\nplot(close)`,
        errors: [],
        settings: validSettings(),
      }),
    );
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toBe("Missing required fields");
  });

  it("returns 400 for missing settings", async () => {
    const res = await POST(
      makeRequest({
        code: `//@version=6\nindicator("Test")\nplot(close)`,
        errors: validErrors(),
      }),
    );
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toBe("Missing required fields");
  });

  it("returns 401 for missing API key with non-ollama provider", async () => {
    const res = await POST(
      makeRequest({
        code: `//@version=6\nindicator("Test")\nplot(close)`,
        errors: validErrors(),
        settings: validSettings({ apiKey: "", oauthToken: "" }),
      }),
    );
    expect(res.status).toBe(401);

    const data = await res.json();
    expect(data.error).toBe("API key is required");
  });
});
