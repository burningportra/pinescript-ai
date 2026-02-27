import { NextRequest, NextResponse } from "next/server";

const CLAUDE_TOKEN_URL = "https://console.anthropic.com/v1/oauth/token";
const DEFAULT_CLIENT_ID = "9d1c250a-e61b-44d9-88ed-5944d1962f5e";
const REDIRECT_URI = "https://console.anthropic.com/oauth/code/callback";

export async function POST(request: NextRequest): Promise<NextResponse> {
  let code: string;
  try {
    const body = await request.json();
    code = body.code;
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const codeVerifier = request.cookies.get("pkce_verifier")?.value;
  const oauthState = request.cookies.get("oauth_state")?.value;

  if (!code || !codeVerifier || !oauthState) {
    return NextResponse.json(
      { error: "missing_params", detail: !code ? "no code" : "no verifier/state (cookie expired?)" },
      { status: 400 }
    );
  }

  // Clean up code in case it has URL fragments (e.g. code#state)
  const cleanedCode = code.split("#")[0]?.split("&")[0] ?? code;

  const clientId = process.env.ANTHROPIC_OAUTH_CLIENT_ID ?? DEFAULT_CLIENT_ID;

  let tokenResponse: Response;
  try {
    tokenResponse = await fetch(CLAUDE_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: "https://claude.ai/",
        Origin: "https://claude.ai",
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: clientId,
        code: cleanedCode,
        redirect_uri: REDIRECT_URI,
        code_verifier: codeVerifier,
        state: oauthState,
      }),
    });
  } catch {
    return NextResponse.json({ error: "network_error" }, { status: 502 });
  }

  if (!tokenResponse.ok) {
    let errorBody: Record<string, unknown> = {};
    try {
      errorBody = await tokenResponse.json();
    } catch {
      // ignore parse errors
    }
    console.error("[oauth exchange] token error:", tokenResponse.status, errorBody);
    return NextResponse.json(
      { error: typeof errorBody?.error === "string" ? errorBody.error : "token_exchange_failed", detail: errorBody },
      { status: 400 }
    );
  }

  let accessToken: string;
  try {
    const body = await tokenResponse.json();
    accessToken = body.access_token;
    if (typeof accessToken !== "string" || !accessToken) {
      throw new Error("missing access_token");
    }
  } catch {
    return NextResponse.json({ error: "invalid_token_response" }, { status: 400 });
  }

  const response = NextResponse.json({ accessToken });
  response.cookies.set("pkce_verifier", "", { maxAge: 0, path: "/" });
  response.cookies.set("oauth_state", "", { maxAge: 0, path: "/" });
  return response;
}
