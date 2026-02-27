import { NextResponse } from "next/server";
import { generateCodeVerifier, generateCodeChallenge, generateState } from "@/lib/auth/pkce";

// NOTE: This uses the same internal OAuth endpoint as the Claude Code CLI.
// Anthropic does not publish a public OAuth API. This is unofficial.
// See: https://github.com/anthropics/claude-code (Claude Code PKCE flow)
const CLAUDE_OAUTH_URL = "https://claude.ai/oauth/authorize";

// Claude Code's public client ID (default fallback). Override via ANTHROPIC_OAUTH_CLIENT_ID.
const DEFAULT_CLIENT_ID = "9d1c250a-e61b-48f7-b079-c8e9dcb4c6b2";

export async function GET() {
  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  const state = generateState();

  const clientId = process.env.ANTHROPIC_OAUTH_CLIENT_ID ?? DEFAULT_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const redirectUri = `${appUrl}/api/auth/anthropic/callback`;

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "claude_code:billing openai:* anthropic:*",
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
