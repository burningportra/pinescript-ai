export type Provider = "anthropic" | "openai" | "google" | "ollama";

export type AnthropicAuthMethod = "api_key" | "oauth";

export type PineVersion = "v5" | "v6";

export interface Settings {
  provider: Provider;
  apiKey: string;
  model: string;
  ollamaUrl: string;
  pineVersion: PineVersion;
  transpilerEnabled?: boolean;
  oauthToken?: string;
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
  | "transpiling"
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
  libraryFile: { name: string; code: string } | null;
}

export const DEFAULT_SETTINGS: Settings = {
  provider: "anthropic",
  apiKey: "",
  model: "claude-sonnet-4-6",
  ollamaUrl: "http://localhost:11434",
  pineVersion: "v6",
  transpilerEnabled: false,
};

export const PROVIDER_MODELS: Record<Provider, string[]> = {
  anthropic: ["claude-sonnet-4-6", "claude-opus-4-6"],
  openai: ["gpt-4.1", "gpt-4.1-mini", "o3"],
  google: ["gemini-2.5-pro", "gemini-2.5-flash"],
  ollama: [],
};

export const STORAGE_KEY = "pinescript-ai-settings";
export const SCRIPTS_KEY = "pinescript-ai-scripts";
export const CHATS_KEY = "pinescript-ai-chats";

export interface SavedScript {
  id: string;
  title: string;
  code: string;
  timestamp: number;
}

export interface SavedChat {
  id: string;
  title: string;
  messages: Message[];
  currentCode: string;
  codeTitle: string;
  timestamp: number;
}

export interface ScriptVersion {
  version: number; // 1, 2, 3...
  code: string;
  timestamp: number;
  messageId?: string; // assistant message that produced this version
}

export interface ScriptSession {
  id: string;
  title: string; // from indicator/strategy() declaration
  originalFilename: string;
  currentCode: string;
  versions: ScriptVersion[];
  libraryFile?: { name: string; code: string };
  chatId: string; // linked SavedChat id
  createdAt: number;
  updatedAt: number;
}

export const SESSIONS_KEY = "pinescript-ai-sessions";

export interface ReviewIssue {
  severity: "error" | "warning" | "info";
  line?: number;
  description: string;
  fix: string;
}
