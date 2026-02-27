import { NextRequest } from "next/server";
import { fixCode } from "@/lib/ai/reviewer";
import { validatePineScript } from "@/lib/validator";
import type { ValidationResult } from "@/lib/types";

interface FixRequestBody {
  code: string;
  errors: ValidationResult[];
  settings: {
    provider: string;
    apiKey: string;
    model: string;
    ollamaUrl?: string;
    transpilerEnabled?: boolean;
  };
  pineVersion: "v5" | "v6";
}

export async function POST(req: NextRequest) {
  let body: FixRequestBody;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { code, errors, settings, pineVersion = "v6" } = body;

  if (!code || !errors?.length || !settings) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { provider, apiKey, model, ollamaUrl } = settings;

  if (provider !== "ollama" && !apiKey) {
    return Response.json({ error: "API key is required" }, { status: 401 });
  }

  // Convert ValidationResult[] to ReviewIssue[] for fixCode
  const issues = errors.map((e) => ({
    severity: (e.status === "error" ? "error" : "warning") as "error" | "warning" | "info",
    line: e.line,
    description: e.message,
    fix: e.suggestion || "",
  }));

  try {
    const fixedCode = await fixCode(code, issues, provider, apiKey, model, ollamaUrl);

    if (!fixedCode) {
      return Response.json({ error: "Failed to generate fix" }, { status: 500 });
    }

    // Re-validate the fixed code statically
    const version = pineVersion === "v5" ? "v5" : "v6";
    const staticValidation = validatePineScript(fixedCode, version);

    // Transpiler re-validation (if enabled)
    let transpilerResults: ValidationResult[] = [];
    if (settings.transpilerEnabled) {
      const { transpileValidate } = await import("@/lib/transpiler");
      transpilerResults = transpileValidate(fixedCode);
    }

    const validation = [...staticValidation, ...transpilerResults];

    return Response.json({ fixedCode, validation });
  } catch (err) {
    return Response.json(
      { error: (err as Error).message || "Fix failed" },
      { status: 500 },
    );
  }
}
