import { describe, it, expect } from "vitest";
import { generateCodeVerifier, generateCodeChallenge, generateState } from "../pkce";

// RFC 7636 test vector
// Input verifier: "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"
// Expected challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
describe("generateCodeChallenge", () => {
  it("produces correct S256 challenge for RFC 7636 test vector", async () => {
    const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
    const challenge = await generateCodeChallenge(verifier);
    expect(challenge).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  });
});

describe("generateCodeVerifier", () => {
  it("returns a base64url string of 43 characters (32 bytes)", () => {
    const verifier = generateCodeVerifier();
    expect(verifier).toMatch(/^[A-Za-z0-9\-_]+$/);
    // 32 bytes base64url-encoded = 43 chars (no padding)
    expect(verifier.length).toBe(43);
  });

  it("generates unique values", () => {
    const a = generateCodeVerifier();
    const b = generateCodeVerifier();
    expect(a).not.toBe(b);
  });
});

describe("generateState", () => {
  it("returns a base64url string of 22 characters (16 bytes)", () => {
    const state = generateState();
    expect(state).toMatch(/^[A-Za-z0-9\-_]+$/);
    // 16 bytes base64url-encoded = 22 chars (no padding)
    expect(state.length).toBe(22);
  });

  it("generates unique values", () => {
    const a = generateState();
    const b = generateState();
    expect(a).not.toBe(b);
  });
});
