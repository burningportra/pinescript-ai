import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { searchRAG } from "@/lib/rag";
import { validatePineScript } from "@/lib/validator";
import { reviewCode, fixCode } from "@/lib/ai/reviewer";

interface ChatRequestBody {
  messages: { role: "user" | "assistant"; content: string }[];
  settings: {
    provider: "anthropic" | "openai" | "google" | "ollama";
    apiKey: string;
    model: string;
    ollamaUrl?: string;
    transpilerEnabled?: boolean;
    oauthToken?: string;
  };
  pineVersion?: "v5" | "v6";
  currentCode?: string;
  libraryCode?: string;
  libraryFilename?: string;
  test?: boolean;
}

function buildSystemPrompt(pineVersion: string, currentCode?: string, ragContext?: string, libraryCode?: string, libraryFilename?: string): string {
  const version = pineVersion === "v5" ? "5" : "6";

  let prompt = `You are PineScript AI, an expert TradingView Pine Script developer. You generate production-ready Pine Script v${version} code.

## Response Format
Always put the complete code block FIRST, then explanation after. Use \`\`\`pinescript fenced code blocks.

## Pine Script v${version} Rules
- Use //@version=${version} as the first line
${version === "6" ? `- Use indicator() NOT study() — study() is deprecated
- Use color.new() NOT transp parameter — transp is deprecated
- Use ternary operator (condition ? a : b) NOT iff() — iff() is deprecated
- plot.style_dashed DOES NOT EXIST — use plot.style_line with linewidth
- fill() cannot mix hline and plot references — both must be the same type
- input.int() and input.float() use defval, NOT def
- method keyword for defining methods on types
- Type system: int, float, bool, string, color with series/simple/const qualifiers` : `- Use study() or indicator() for indicators
- Use strategy() for strategies
- transp parameter is available but color.new() is preferred`}

## Best Practices
- Always include descriptive indicator/strategy titles
- Use input() functions for configurable parameters
- Add proper default values for all inputs
- Include meaningful plot colors and styles
- Handle edge cases (na values, first bars)
- Add comments for complex logic sections
- Use var for variables that persist across bars
- Prefer built-in ta.* functions over manual calculations`;

  if (ragContext) {
    prompt += `\n\n${ragContext}`;
  }

  if (currentCode) {
    prompt += `

## Current Code Context
The user has the following code in their editor. When they ask for modifications, update THIS code rather than creating from scratch:

\`\`\`pinescript
${currentCode}
\`\`\``;
  }

  if (libraryCode && libraryFilename) {
    prompt += `

## Library File Context
The strategy imports from \`${libraryFilename}\`.
When modifying the strategy, maintain all import references:

\`\`\`pinescript
${libraryCode}
\`\`\``;
  }

  return prompt;
}

function buildRAGContext(query: string): string {
  const results = searchRAG(query);
  if (results.length === 0) return "";

  const refs = results.filter((r) => r.type === "reference");
  const docs = results.filter((r) => r.type === "documentation");
  const examples = results.filter((r) => r.type === "example");

  let context = `## PINESCRIPT v6 REFERENCE CONTEXT
(Use these exact signatures — do NOT invent functions or parameters.)`;

  if (refs.length > 0) {
    context += `\n\n--- FUNCTION SIGNATURES ---\n${refs.map((r) => r.content).join("\n\n")}`;
  }

  if (docs.length > 0) {
    context += `\n\n--- DOCUMENTATION ---\n${docs.map((r) => r.content).join("\n\n")}`;
  }

  if (examples.length > 0) {
    context += `\n\n--- EXAMPLE CODE ---\n${examples.map((r) => r.content).join("\n\n")}`;
  }

  return context;
}

function extractCodeFromContent(content: string): string | null {
  const match = content.match(/```(?:pinescript|pine)\s*\n([\s\S]*?)```/);
  return match ? match[1].trim() : null;
}

async function streamAnthropic(
  messages: ChatRequestBody["messages"],
  systemPrompt: string,
  apiKey: string,
  model: string,
  signal: AbortSignal,
  oauthToken?: string,
) {
  const client = oauthToken
    ? new Anthropic({
        authToken: oauthToken,
        defaultHeaders: { "anthropic-beta": "oauth-2025-04-20" },
      })
    : new Anthropic({ apiKey });

  const stream = client.messages.stream(
    {
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    },
    { signal },
  );

  return stream;
}

async function streamOpenAI(
  messages: ChatRequestBody["messages"],
  systemPrompt: string,
  apiKey: string,
  model: string,
  baseURL: string | undefined,
  signal: AbortSignal,
) {
  const client = new OpenAI({
    apiKey: apiKey || "ollama",
    ...(baseURL && { baseURL }),
  });

  const stream = await client.chat.completions.create(
    {
      model,
      stream: true,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
    },
    { signal },
  );

  return stream;
}

export async function POST(req: NextRequest) {
  let body: ChatRequestBody;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { messages, settings, pineVersion = "v6", currentCode, libraryCode, libraryFilename, test } = body;

  if (!messages?.length || !settings) {
    return Response.json({ error: "Missing messages or settings" }, { status: 400 });
  }

  const { provider, apiKey, model, ollamaUrl, oauthToken } = settings;

  const hasAuth = provider === "ollama" || !!apiKey || !!oauthToken;
  if (!hasAuth) {
    return Response.json({ error: "API key or OAuth token is required" }, { status: 401 });
  }

  if (!model) {
    return Response.json({ error: "Model is required" }, { status: 400 });
  }

  // Test mode
  if (test) {
    try {
      if (provider === "anthropic") {
        const client = oauthToken
          ? new Anthropic({
              authToken: oauthToken,
              defaultHeaders: { "anthropic-beta": "oauth-2025-04-20" },
            })
          : new Anthropic({ apiKey });
        await client.messages.create({
          model,
          max_tokens: 10,
          messages: [{ role: "user", content: "Hi" }],
        });
      } else if (provider === "openai") {
        const client = new OpenAI({ apiKey });
        await client.chat.completions.create({
          model,
          max_tokens: 10,
          messages: [{ role: "user", content: "Hi" }],
        });
      } else if (provider === "google") {
        const client = new OpenAI({
          apiKey,
          baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
        });
        await client.chat.completions.create({
          model,
          max_tokens: 10,
          messages: [{ role: "user", content: "Hi" }],
        });
      } else if (provider === "ollama") {
        const client = new OpenAI({
          apiKey: "ollama",
          baseURL: `${ollamaUrl || "http://localhost:11434"}/v1`,
        });
        await client.chat.completions.create({
          model,
          max_tokens: 10,
          messages: [{ role: "user", content: "Hi" }],
        });
      }
      return Response.json({ ok: true });
    } catch (err) {
      const msg = (err as Error).message || "Connection failed";
      const status = msg.includes("401") ? 401 : msg.includes("404") ? 404 : 500;
      return Response.json({ error: msg }, { status });
    }
  }

  // Build RAG context from the last user message
  const lastUserMessage = messages[messages.length - 1]?.content || "";
  const ragContext = buildRAGContext(lastUserMessage);
  const systemPrompt = buildSystemPrompt(pineVersion, currentCode, ragContext, libraryCode, libraryFilename);

  const encoder = new TextEncoder();
  const signal = req.signal;

  const stream = new ReadableStream({
    async start(controller) {
      let fullContent = "";

      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        // Phase 1: Stream the generation
        if (provider === "anthropic") {
          const anthropicStream = await streamAnthropic(messages, systemPrompt, apiKey, model, signal, oauthToken);

          for await (const event of anthropicStream) {
            if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              fullContent += event.delta.text;
              send({ text: event.delta.text });
            }
          }
        } else {
          const baseURL =
            provider === "google"
              ? "https://generativelanguage.googleapis.com/v1beta/openai/"
              : provider === "ollama"
                ? `${ollamaUrl || "http://localhost:11434"}/v1`
                : undefined;
          const openaiStream = await streamOpenAI(messages, systemPrompt, apiKey, model, baseURL, signal);

          for await (const chunk of openaiStream) {
            const text = chunk.choices[0]?.delta?.content;
            if (text) {
              fullContent += text;
              send({ text });
            }
          }
        }

        // Phase 2: Post-generation validation pipeline
        const generatedCode = extractCodeFromContent(fullContent);
        if (generatedCode) {
          const version = pineVersion === "v5" ? "v5" : "v6";

          // Step 1: Static validation
          send({ status: "validating" });
          const staticResults = validatePineScript(generatedCode, version);

          // Step 1.5: Transpiler validation (if enabled)
          let transpilerResults: typeof staticResults = [];
          if (settings.transpilerEnabled) {
            send({ status: "transpiling" });
            const { transpileValidate } = await import("@/lib/transpiler");
            transpilerResults = transpileValidate(generatedCode);
          }

          const allStaticResults = [...staticResults, ...transpilerResults];
          const hasStaticErrors = allStaticResults.some((r) => r.status === "error");

          if (!hasStaticErrors) {
            // Step 2: AI review (only if static passes)
            send({ status: "reviewing" });
            try {
              const reviewResult = await reviewCode(
                generatedCode,
                provider,
                apiKey,
                model,
                ollamaUrl,
                oauthToken,
              );

              if (reviewResult.verdict === "needs_fix" && reviewResult.issues.length > 0) {
                // Step 3: Auto-fix
                send({ status: "correcting" });
                const fixedCode = await fixCode(
                  generatedCode,
                  reviewResult.issues,
                  provider,
                  apiKey,
                  model,
                  ollamaUrl,
                  oauthToken,
                );

                if (fixedCode) {
                  // Re-validate fixed code (static only, no more LLM calls)
                  const fixedResults = validatePineScript(fixedCode, version);

                  // Merge review issues as validation results
                  const allResults = [
                    ...fixedResults,
                    ...reviewResult.issues.map((issue) => ({
                      rule: "ai-review",
                      status: "warn" as const,
                      message: `${issue.description} (auto-corrected)`,
                      line: issue.line,
                      suggestion: issue.fix,
                    })),
                  ];

                  send({ validation: allResults, correctedCode: fixedCode });
                } else {
                  // Fix failed — report issues without correction
                  const allResults = [
                    ...allStaticResults,
                    ...reviewResult.issues.map((issue) => ({
                      rule: "ai-review",
                      status: (issue.severity === "error" ? "error" : "warn") as "error" | "warn",
                      message: issue.description,
                      line: issue.line,
                      suggestion: issue.fix,
                    })),
                  ];
                  send({ validation: allResults });
                }
              } else {
                // Review passed
                send({ validation: allStaticResults });
              }
            } catch {
              // AI review failed — just send static results (fail open)
              send({ validation: allStaticResults });
            }
          } else {
            // Static validation found errors — skip AI review, report immediately
            send({ validation: allStaticResults });
          }
        }

        send({ text: "" }); // flush
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          controller.close();
          return;
        }
        send({ error: (err as Error).message });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
