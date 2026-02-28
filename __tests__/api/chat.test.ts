import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock LLM SDKs before importing the route
vi.mock("@anthropic-ai/sdk", () => ({ default: vi.fn() }));
vi.mock("openai", () => ({ default: vi.fn() }));
vi.mock("@/lib/rag", () => ({ searchRAG: vi.fn(() => []) }));
vi.mock("@/lib/ai/reviewer", () => ({
  reviewCode: vi.fn(),
  fixCode: vi.fn(),
}));

import { POST } from "@/app/api/chat/route";

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/chat", {
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

describe("POST /api/chat", () => {
  it("returns 400 for invalid JSON body", async () => {
    const req = new NextRequest("http://localhost:3000/api/chat", {
      method: "POST",
      body: "not valid json",
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toBe("Invalid request body");
  });

  it("returns 400 for missing messages", async () => {
    const res = await POST(
      makeRequest({
        messages: [],
        settings: validSettings(),
      }),
    );
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toBe("Missing messages or settings");
  });

  it("returns 400 for missing settings", async () => {
    const res = await POST(
      makeRequest({
        messages: [{ role: "user", content: "Hello" }],
      }),
    );
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toBe("Missing messages or settings");
  });

  it("returns 401 for missing API key with non-ollama provider", async () => {
    const res = await POST(
      makeRequest({
        messages: [{ role: "user", content: "Hello" }],
        settings: validSettings({ provider: "anthropic", apiKey: "", oauthToken: "" }),
      }),
    );
    expect(res.status).toBe(401);

    const data = await res.json();
    expect(data.error).toBe("API key or OAuth token is required");
  });

  it("returns 400 for missing model", async () => {
    const res = await POST(
      makeRequest({
        messages: [{ role: "user", content: "Hello" }],
        settings: validSettings({ model: "" }),
      }),
    );
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toBe("Model is required");
  });

  it("ollama provider does not require API key", async () => {
    const res = await POST(
      makeRequest({
        messages: [{ role: "user", content: "Hello" }],
        settings: validSettings({
          provider: "ollama",
          apiKey: "",
          model: "llama3",
          ollamaUrl: "http://localhost:11434",
        }),
      }),
    );

    // Should not be a 401 — it passes auth check.
    // It will either stream (200) or fail later on LLM call, but not 401.
    expect(res.status).not.toBe(401);
  });
});
