"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, CheckCircle, XCircle, ExternalLink } from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import {
  type Settings,
  type Provider,
  type PineVersion,
  DEFAULT_SETTINGS,
  PROVIDER_MODELS,
  STORAGE_KEY,
} from "@/lib/types";

type TestStatus = "idle" | "testing" | "success" | "error";

function SettingsContent() {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [showKey, setShowKey] = useState(false);
  const [testStatus, setTestStatus] = useState<TestStatus>("idle");
  const [testMessage, setTestMessage] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [oauthStep, setOauthStep] = useState<
    "idle" | "waiting" | "exchanging"
  >("idle");
  const [oauthCode, setOauthCode] = useState("");
  const [oauthError, setOauthError] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    try {
      const parsed = stored ? JSON.parse(stored) : {};
      setSettings({ ...DEFAULT_SETTINGS, ...parsed });
    } catch {
      // ignore
    }
    setLoaded(true);
  }, []);

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "provider") {
        const p = value as Provider;
        const models = PROVIDER_MODELS[p];
        next.model = models.length > 0 ? models[0] : "";
      }
      return next;
    });
    setTestStatus("idle");
  }

  function disconnect() {
    setSettings((prev) => {
      const next = { ...prev };
      delete next.oauthToken;
      return next;
    });
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        delete parsed.oauthToken;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      } catch {
        // ignore
      }
    }
    setOauthStep("idle");
    setOauthCode("");
    setOauthError("");
    setTestStatus("idle");
  }

  function onOAuthLinkClick() {
    setOauthError("");
    setOauthStep("waiting");
  }

  async function exchangeOAuthCode() {
    if (!oauthCode.trim()) return;
    setOauthStep("exchanging");
    setOauthError("");
    try {
      const res = await fetch("/api/auth/anthropic/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: oauthCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        const detail = data.detail ? JSON.stringify(data.detail) : "";
        setOauthError(`${data.error || "Token exchange failed"}${detail ? ` — ${detail}` : ""}`);
        setOauthStep("waiting");
        return;
      }
      setSettings((prev) => ({ ...prev, oauthToken: data.accessToken }));
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"),
          oauthToken: data.accessToken,
        })
      );
      setOauthStep("idle");
      setOauthCode("");
    } catch {
      setOauthError("Exchange failed. Try again.");
      setOauthStep("waiting");
    }
  }

  async function testConnection() {
    setTestStatus("testing");
    setTestMessage("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "Say hi" }],
          settings: {
            provider: settings.provider,
            apiKey: settings.apiKey,
            model: settings.model,
            ollamaUrl: settings.ollamaUrl,
            oauthToken: settings.oauthToken,
          },
          test: true,
        }),
      });

      if (res.ok) {
        setTestStatus("success");
        setTestMessage("Connection successful!");
      } else {
        const data = await res.json().catch(() => ({ error: res.statusText }));
        setTestStatus("error");
        setTestMessage(data.error || `Error: ${res.status}`);
      }
    } catch {
      setTestStatus("error");
      setTestMessage("Failed to connect. Check your settings.");
    }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    router.push("/chat");
  }

  const canSave =
    settings.provider === "ollama"
      ? settings.ollamaUrl.length > 0 && settings.model.length > 0
      : settings.provider === "anthropic"
        ? (settings.apiKey.length > 0 || !!settings.oauthToken) &&
          settings.model.length > 0
        : settings.apiKey.length > 0 && settings.model.length > 0;

  if (!loaded) return null;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="md:ml-[56px] flex-1 flex items-center justify-center p-4 pt-16 md:p-6">
        <div className="w-full max-w-lg">
          <h1 className="text-2xl font-semibold text-text mb-1">Settings</h1>
          <p className="text-text-dim text-sm mb-8">
            Configure your AI provider and PineScript preferences.
          </p>

          {/* OAuth Error Banner */}
          {oauthError && (
            <div className="mb-6 px-4 py-3 rounded-lg text-sm border bg-accent-error/10 border-accent-error/20 text-accent-error">
              {oauthError}
            </div>
          )}

          {/* Provider */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-text mb-2">
              AI Provider
            </label>
            <div className="flex gap-2">
              {(["anthropic", "openai", "google", "ollama"] as Provider[]).map(
                (p) => (
                  <button
                    key={p}
                    onClick={() => update("provider", p)}
                    className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium border transition-colors ${
                      settings.provider === p
                        ? "border-border-subtle bg-surface-elevated text-white"
                        : "border-border bg-surface text-text-dim hover:border-border-subtle hover:text-text-secondary"
                    }`}
                  >
                    {p === "anthropic"
                      ? "Anthropic"
                      : p === "openai"
                        ? "OpenAI"
                        : p === "google"
                          ? "Google"
                          : "Ollama"}
                  </button>
                )
              )}
            </div>
          </div>

          {/* API Key or Ollama URL */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-text mb-2">
              {settings.provider === "ollama" ? "Ollama URL" : "API Key"}
            </label>
            {settings.provider === "ollama" ? (
              <input
                type="text"
                value={settings.ollamaUrl}
                onChange={(e) => update("ollamaUrl", e.target.value)}
                placeholder="http://localhost:11434"
                className="w-full px-3 py-2.5 bg-surface border border-border rounded-lg text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-border-subtle transition-colors font-mono"
              />
            ) : settings.provider === "anthropic" && settings.oauthToken ? (
              <div className="px-3 py-2.5 bg-surface border border-border rounded-lg text-sm text-text-muted">
                Not needed — using Claude OAuth
              </div>
            ) : (
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  value={settings.apiKey}
                  onChange={(e) => update("apiKey", e.target.value)}
                  placeholder={
                    settings.provider === "anthropic"
                      ? "sk-ant-..."
                      : settings.provider === "google"
                        ? "AIza..."
                        : "sk-..."
                  }
                  className="w-full px-3 py-2.5 pr-10 bg-surface border border-border rounded-lg text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-border-subtle transition-colors font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                >
                  {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            )}
          </div>

          {/* OAuth Section - Anthropic only */}
          {settings.provider === "anthropic" && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <label className="block text-sm font-medium text-text">
                  Claude OAuth
                </label>
                <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  Experimental
                </span>
              </div>
              <p className="text-xs text-text-dim mb-3">
                Sign in with your Claude account. After authorizing, copy the
                code and paste it below.
              </p>
              {settings.oauthToken ? (
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-accent-success/10 border border-accent-success/20 text-accent-success text-sm font-medium">
                    <CheckCircle size={14} />
                    Connected
                  </span>
                  <button
                    onClick={disconnect}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium border border-border bg-surface text-text-dim hover:text-text-secondary hover:border-border-subtle transition-colors"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <a
                    href="/api/auth/anthropic"
                    target="_blank"
                    rel="noopener"
                    onClick={onOAuthLinkClick}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-border bg-surface text-text-dim hover:text-text-secondary hover:border-border-subtle transition-colors"
                  >
                    <ExternalLink size={14} />
                    Authorize with Claude
                  </a>
                  {oauthStep !== "idle" && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={oauthCode}
                        onChange={(e) => setOauthCode(e.target.value)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && exchangeOAuthCode()
                        }
                        placeholder="Paste authorization code"
                        className="flex-1 px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-border-subtle transition-colors font-mono"
                        disabled={oauthStep === "exchanging"}
                        autoFocus
                      />
                      <button
                        onClick={exchangeOAuthCode}
                        disabled={
                          !oauthCode.trim() || oauthStep === "exchanging"
                        }
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-white text-background hover:bg-text-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {oauthStep === "exchanging" && (
                          <Loader2 size={14} className="animate-spin" />
                        )}
                        Connect
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Model */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-text mb-2">
              Model
            </label>
            {settings.provider === "ollama" ? (
              <input
                type="text"
                value={settings.model}
                onChange={(e) => update("model", e.target.value)}
                placeholder="codellama, deepseek-coder, etc."
                className="w-full px-3 py-2.5 bg-surface border border-border rounded-lg text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-border-subtle transition-colors"
              />
            ) : (
              <div className="flex gap-2">
                {PROVIDER_MODELS[settings.provider].map((m) => (
                  <button
                    key={m}
                    onClick={() => update("model", m)}
                    className={`flex-1 py-2.5 px-2 rounded-lg text-xs font-medium border transition-colors ${
                      settings.model === m
                        ? "border-border-subtle bg-surface-elevated text-white"
                        : "border-border bg-surface text-text-dim hover:border-border-subtle hover:text-text-secondary"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* PineScript Version */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-text mb-2">
              PineScript Version
            </label>
            <div className="flex gap-2">
              {(["v5", "v6"] as PineVersion[]).map((v) => (
                <button
                  key={v}
                  onClick={() => update("pineVersion", v)}
                  className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium border transition-colors ${
                    settings.pineVersion === v
                      ? "border-border-subtle bg-surface-elevated text-white"
                      : "border-border bg-surface text-text-dim hover:border-border-subtle hover:text-text-secondary"
                  }`}
                >
                  {v.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Transpiler Validation */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-text mb-2">
              Transpiler Validation
            </label>
            <button
              onClick={() =>
                update("transpilerEnabled", !settings.transpilerEnabled)
              }
              className={`w-full py-2.5 px-3 rounded-lg text-sm text-left border transition-colors ${
                settings.transpilerEnabled
                  ? "border-border-subtle bg-surface-elevated text-white"
                  : "border-border bg-surface text-text-dim hover:border-border-subtle"
              }`}
            >
              <span className="font-medium">
                {settings.transpilerEnabled ? "Enabled" : "Disabled"}
              </span>
              <span className="block text-xs text-text-dim mt-0.5">
                Experimental — uses pine-transpiler to catch syntax errors via
                AST parsing
              </span>
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={testConnection}
              disabled={!canSave || testStatus === "testing"}
              className="px-4 py-2.5 rounded-lg text-sm font-medium border border-border bg-surface text-text-dim hover:text-text-secondary hover:border-border-subtle transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {testStatus === "testing" && (
                <Loader2 size={14} className="animate-spin" />
              )}
              {testStatus === "success" && (
                <CheckCircle size={14} className="text-accent-success" />
              )}
              {testStatus === "error" && (
                <XCircle size={14} className="text-accent-error" />
              )}
              Test Connection
            </button>
            <button
              onClick={save}
              disabled={!canSave}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-white text-background hover:bg-text-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Save &amp; Continue &rarr;
            </button>
          </div>

          {/* Test result message */}
          {testMessage && (
            <p
              className={`mt-3 text-xs ${testStatus === "success" ? "text-accent-success" : "text-accent-error"}`}
            >
              {testMessage}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

export default function SettingsPage() {
  return <SettingsContent />;
}
