import { NextResponse } from "next/server";
import { generateCodeVerifier, generateCodeChallenge } from "@/lib/auth/pkce";
import { randomBytes } from "node:crypto";

const CLAUDE_OAUTH_URL = "https://claude.ai/oauth/authorize";
const DEFAULT_CLIENT_ID = "9d1c250a-e61b-44d9-88ed-5944d1962f5e";
const REDIRECT_URI = "https://console.anthropic.com/oauth/code/callback";

export async function GET() {
  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  // Match craft's state format: 32 random bytes as hex (64 chars)
  const state = randomBytes(32).toString("hex");

  const clientId = process.env.ANTHROPIC_OAUTH_CLIENT_ID ?? DEFAULT_CLIENT_ID;

  const params = new URLSearchParams({
    code: "true",
    client_id: clientId,
    response_type: "code",
    redirect_uri: REDIRECT_URI,
    scope: "org:create_api_key user:profile user:inference",
    code_challenge: challenge,
    code_challenge_method: "S256",
    state,
  });

  const response = NextResponse.redirect(`${CLAUDE_OAUTH_URL}?${params}`);

  const cookieOpts = {
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: 600,
    path: "/",
  };

  response.cookies.set("pkce_verifier", verifier, cookieOpts);
  response.cookies.set("oauth_state", state, cookieOpts);

  return response;
}
