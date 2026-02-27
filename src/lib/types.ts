export type Provider = "anthropic" | "openai" | "ollama";

export type PineVersion = "v5" | "v6";

export interface Settings {
  provider: Provider;
  apiKey: string;
  model: string;
  ollamaUrl: string;
  pineVersion: PineVersion;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export type StreamStatus =
  | "idle"
  | "connecting"
  | "generating"
  | "streaming"
  | "validating"
  | "reviewing"
  | "correcting"
  | "error";

export interface ValidationResult {
  rule: string;
  status: "pass" | "warn" | "error";
  message: string;
  line?: number;
  suggestion?: string;
}

export interface ChatState {
  messages: Message[];
  currentCode: string;
  codeTitle: string;
  isStreaming: boolean;
  streamStatus: StreamStatus;
  error: string | null;
  validationResults: ValidationResult[];
  correctedCode: string | null;
}

export const DEFAULT_SETTINGS: Settings = {
  provider: "anthropic",
  apiKey: "",
  model: "claude-sonnet-4-20250514",
  ollamaUrl: "http://localhost:11434",
  pineVersion: "v6",
};

export const PROVIDER_MODELS: Record<Provider, string[]> = {
  anthropic: ["claude-sonnet-4-20250514", "claude-opus-4-5-20250414"],
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4.1"],
  ollama: [],
};

export const STORAGE_KEY = "pinescript-ai-settings";

export interface ReviewIssue {
  severity: "error" | "warning" | "info";
  line?: number;
  description: string;
  fix: string;
}
