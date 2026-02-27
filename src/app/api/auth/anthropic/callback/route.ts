import { NextRequest, NextResponse } from "next/server";

// NOTE: This uses the same internal OAuth token endpoint as the Claude Code CLI.
// Anthropic does not publish a public OAuth API. This is unofficial.
// See: https://github.com/anthropics/claude-code (Claude Code PKCE flow)
const CLAUDE_TOKEN_URL = "https://claude.ai/oauth/token";

const DEFAULT_CLIENT_ID = "9d1c250a-e61b-48f7-b079-c8e9dcb4c6b2";

function errorRedirect(message: string): NextResponse {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return NextResponse.redirect(
    `${appUrl}/settings?oauth=error&message=${encodeURIComponent(message)}`
  );
}

function clearPkceCookies(response: NextResponse): void {
  response.cookies.set("pkce_verifier", "", { maxAge: 0, path: "/" });
  response.cookies.set("oauth_state", "", { maxAge: 0, path: "/" });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const storedState = request.cookies.get("oauth_state")?.value;
  const codeVerifier = request.cookies.get("pkce_verifier")?.value;

  // CSRF guard: validate state param against stored cookie
  if (!state || !storedState || state !== storedState) {
    const response = errorRedirect("state_mismatch");
    clearPkceCookies(response);
    return response;
  }

  if (!code || !codeVerifier) {
    const response = errorRedirect("missing_params");
    clearPkceCookies(response);
    return response;
  }

  const clientId = process.env.ANTHROPIC_OAUTH_CLIENT_ID ?? DEFAULT_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const redirectUri = `${appUrl}/api/auth/anthropic/callback`;

  let tokenResponse: Response;
  try {
    tokenResponse = await fetch(CLAUDE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        code_verifier: codeVerifier,
        redirect_uri: redirectUri,
        client_id: clientId,
      }),
    });
  } catch {
    const response = errorRedirect("network_error");
    clearPkceCookies(response);
    return response;
  }

  if (!tokenResponse.ok) {
    let message = "token_exchange_failed";
    try {
      const body = await tokenResponse.json();
      if (typeof body?.error === "string") {
        message = body.error;
      }
    } catch {
      // ignore parse errors
    }
    const response = errorRedirect(message);
    clearPkceCookies(response);
    return response;
  }

  let accessToken: string;
  try {
    const body = await tokenResponse.json();
    accessToken = body.access_token;
    if (typeof accessToken !== "string" || !accessToken) {
      throw new Error("missing access_token");
    }
  } catch {
    const response = errorRedirect("invalid_token_response");
    clearPkceCookies(response);
    return response;
  }

  const successResponse = NextResponse.redirect(
    `${appUrl}/settings?oauth=success`
  );

  clearPkceCookies(successResponse);

  // Non-HttpOnly so the settings page JS can read and store the token, then clear it.
  // 30-second TTL — just long enough for the redirect to complete.
  successResponse.cookies.set("anthropic_oauth_pending_token", accessToken, {
    httpOnly: false,
    sameSite: "lax",
    maxAge: 30,
    path: "/",
  });

  return successResponse;
}
