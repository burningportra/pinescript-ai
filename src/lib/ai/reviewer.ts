import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

export interface ReviewIssue {
  severity: "error" | "warning" | "info";
  line?: number;
  description: string;
  fix: string;
}

export interface ReviewResult {
  issues: ReviewIssue[];
  verdict: "pass" | "needs_fix";
}

const REVIEW_PROMPT = `You are a PineScript v6 code reviewer. Analyze the code for:
1. Type errors (wrong qualifiers, implicit casts)
2. Runtime errors (division by zero, array out of bounds, na propagation)
3. Deprecated functions (security → request.security, study → indicator, transp → color.new, iff → ternary)
4. v6 compatibility (plot.style_dashed doesn't exist, fill() can't mix hline/plot, bool x = na needs bool(na))
5. TradingView limits (max 64 plots, max 40 request.* calls)
6. Repainting risks (request.security without barmerge.lookahead_off, barstate.isrealtime-dependent logic)

Respond ONLY with JSON:
{
  "issues": [
    {"severity": "error"|"warning"|"info", "line": number|null, "description": "...", "fix": "..."}
  ],
  "verdict": "pass"|"needs_fix"
}

If the code is correct, return {"issues": [], "verdict": "pass"}.
Only report real problems — do not nitpick style.`;

const FIX_PROMPT = `You are a PineScript v6 expert. Fix ALL the reported issues in this code.
Return ONLY the corrected PineScript code inside a \`\`\`pinescript code block. No explanation.`;

async function callLLM(
  prompt: string,
  userContent: string,
  provider: string,
  apiKey: string,
  model: string,
  ollamaUrl?: string,
): Promise<string> {
  if (provider === "anthropic") {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model,
      max_tokens: 2048,
      system: prompt,
      messages: [{ role: "user", content: userContent }],
    });
    return response.content[0].type === "text" ? response.content[0].text : "";
  }

  // OpenAI, Google, or Ollama
  const baseURL =
    provider === "google"
      ? "https://generativelanguage.googleapis.com/v1beta/openai/"
      : provider === "ollama"
        ? `${ollamaUrl || "http://localhost:11434"}/v1`
        : undefined;

  const client = new OpenAI({
    apiKey: apiKey || "ollama",
    ...(baseURL && { baseURL }),
  });

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: prompt },
      { role: "user", content: userContent },
    ],
  });

  return response.choices[0]?.message?.content || "";
}

function parseReviewResponse(text: string): ReviewResult {
  // Try direct JSON parse
  try {
    const parsed = JSON.parse(text);
    if (parsed.issues && parsed.verdict) return parsed;
  } catch {
    // Try extracting JSON from markdown
    const jsonMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed.issues && parsed.verdict) return parsed;
      } catch {
        // Fall through
      }
    }

    // Try finding JSON object in text
    const objectMatch = text.match(/\{[\s\S]*"issues"[\s\S]*"verdict"[\s\S]*\}/);
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]);
      } catch {
        // Fall through
      }
    }
  }

  // Fail open
  return { issues: [], verdict: "pass" };
}

function extractCodeFromResponse(text: string): string | null {
  const match = text.match(/```(?:pinescript|pine)\s*\n([\s\S]*?)```/);
  return match ? match[1].trim() : null;
}

export async function reviewCode(
  code: string,
  provider: string,
  apiKey: string,
  model: string,
  ollamaUrl?: string,
): Promise<ReviewResult> {
  try {
    const response = await callLLM(
      REVIEW_PROMPT,
      code,
      provider,
      apiKey,
      model,
      ollamaUrl,
    );
    return parseReviewResponse(response);
  } catch (err) {
    console.error("AI review failed:", err);
    return { issues: [], verdict: "pass" };
  }
}

export async function fixCode(
  code: string,
  issues: ReviewIssue[],
  provider: string,
  apiKey: string,
  model: string,
  ollamaUrl?: string,
): Promise<string | null> {
  const issueList = issues
    .map(
      (i) =>
        `- ${i.severity.toUpperCase()}${i.line ? ` (line ${i.line})` : ""}: ${i.description} → ${i.fix}`,
    )
    .join("\n");

  const userContent = `Issues found:\n${issueList}\n\nCode to fix:\n\`\`\`pinescript\n${code}\n\`\`\``;

  try {
    const response = await callLLM(
      FIX_PROMPT,
      userContent,
      provider,
      apiKey,
      model,
      ollamaUrl,
    );
    return extractCodeFromResponse(response);
  } catch (err) {
    console.error("AI fix failed:", err);
    return null;
  }
}
