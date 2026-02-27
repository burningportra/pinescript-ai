"use client";

import { useState, useEffect } from "react";
import { Eye, EyeOff, CheckCircle, ExternalLink, Loader2 } from "lucide-react";
import {
  type Provider,
  DEFAULT_SETTINGS,
  PROVIDER_MODELS,
  STORAGE_KEY,
} from "@/lib/types";

interface OnboardingGateProps {
  onComplete: () => void;
}

export default function OnboardingGate({ onComplete }: OnboardingGateProps) {
  const [provider, setProvider] = useState<Provider>("anthropic");
  const [apiKey, setApiKey] = useState("");
  const [ollamaUrl, setOllamaUrl] = useState("http://localhost:11434");
  const [model, setModel] = useState(PROVIDER_MODELS.anthropic[0]);
  const [showKey, setShowKey] = useState(false);
  const [oauthToken, setOauthToken] = useState("");
  const [oauthStep, setOauthStep] = useState<"idle" | "waiting" | "exchanging">("idle");
  const [oauthCode, setOauthCode] = useState("");
  const [oauthError, setOauthError] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.oauthToken) setOauthToken(parsed.oauthToken);
        if (parsed.provider) setProvider(parsed.provider);
        if (parsed.apiKey) setApiKey(parsed.apiKey);
        if (parsed.ollamaUrl) setOllamaUrl(parsed.ollamaUrl);
        if (parsed.model) setModel(parsed.model);
      } catch {
        // ignore
      }
    }
  }, []);

  function selectProvider(p: Provider) {
    setProvider(p);
    setModel(PROVIDER_MODELS[p].length > 0 ? PROVIDER_MODELS[p][0] : "");
  }

  function disconnectOAuth() {
    setOauthToken("");
    setOauthStep("idle");
    setOauthCode("");
    setOauthError("");
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
        setOauthError(data.error || "Token exchange failed");
        setOauthStep("waiting");
        return;
      }
      setOauthToken(data.accessToken);
      setOauthStep("idle");
      setOauthCode("");
    } catch {
      setOauthError("Exchange failed. Try again.");
      setOauthStep("waiting");
    }
  }

  function save() {
    const settings = {
      ...DEFAULT_SETTINGS,
      provider,
      apiKey: provider === "ollama" ? "" : apiKey,
      ollamaUrl: provider === "ollama" ? ollamaUrl : DEFAULT_SETTINGS.ollamaUrl,
      model,
      ...(provider === "anthropic" && oauthToken ? { oauthToken } : {}),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    onComplete();
  }

  const canSave =
    provider === "ollama"
      ? ollamaUrl.length > 0 && model.length > 0
      : provider === "anthropic"
        ? (apiKey.length > 0 || !!oauthToken) && model.length > 0
        : apiKey.length > 0 && model.length > 0;

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-md">
        <h1 className="text-xl font-semibold text-text mb-1">Get started</h1>
        <p className="text-text-dim text-sm mb-8">
          Connect an AI provider to start generating PineScript.
        </p>

        {/* Provider */}
        <div className="mb-5">
          <label className="block text-xs font-medium text-text-secondary mb-2">
            Provider
          </label>
          <div className="flex gap-2">
            {(["anthropic", "openai", "google", "ollama"] as Provider[]).map((p) => (
              <button
                key={p}
                onClick={() => selectProvider(p)}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                  provider === p
                    ? "border-border-subtle bg-surface-elevated text-white"
                    : "border-border bg-surface text-text-dim hover:border-border-subtle hover:text-text-secondary"
                }`}
              >
                {p === "anthropic" ? "Anthropic" : p === "openai" ? "OpenAI" : p === "google" ? "Google" : "Ollama"}
              </button>
            ))}
          </div>
        </div>

        {/* API Key / Ollama URL */}
        <div className="mb-5">
          <label className="block text-xs font-medium text-text-secondary mb-2">
            {provider === "ollama" ? "Ollama URL" : "API Key"}
          </label>
          {provider === "ollama" ? (
            <input
              type="text"
              value={ollamaUrl}
              onChange={(e) => setOllamaUrl(e.target.value)}
              placeholder="http://localhost:11434"
              className="w-full px-3 py-2.5 bg-surface border border-border rounded-lg text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-border-subtle transition-colors font-mono"
            />
          ) : provider === "anthropic" && oauthToken ? (
            <div className="px-3 py-2.5 bg-surface border border-border rounded-lg text-xs text-text-muted">
              Not needed — using Claude OAuth
            </div>
          ) : (
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={provider === "anthropic" ? "sk-ant-..." : provider === "google" ? "AIza..." : "sk-..."}
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

        {/* OAuth — Anthropic only */}
        {provider === "anthropic" && (
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-medium text-text-secondary">
                Or connect with Claude
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30">
                Experimental
              </span>
            </div>
            {oauthError && (
              <p className="text-xs text-accent-error mb-2">{oauthError}</p>
            )}
            {oauthToken ? (
              <div className="flex items-center gap-2.5">
                <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-accent-success/10 border border-accent-success/20 text-accent-success text-xs font-medium">
                  <CheckCircle size={12} />
                  Claude connected
                </span>
                <button
                  onClick={disconnectOAuth}
                  className="text-xs text-text-muted hover:text-text-secondary transition-colors"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                <a
                  href="/api/auth/anthropic"
                  target="_blank"
                  rel="noopener"
                  onClick={onOAuthLinkClick}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border border-border bg-surface text-text-dim hover:text-text-secondary hover:border-border-subtle transition-colors"
                >
                  <ExternalLink size={12} />
                  Authorize with Claude
                </a>
                {oauthStep !== "idle" && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={oauthCode}
                      onChange={(e) => setOauthCode(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && exchangeOAuthCode()}
                      placeholder="Paste authorization code"
                      className="flex-1 px-3 py-2 bg-surface border border-border rounded-lg text-xs text-text placeholder:text-text-muted focus:outline-none focus:border-border-subtle transition-colors font-mono"
                      disabled={oauthStep === "exchanging"}
                      autoFocus
                    />
                    <button
                      onClick={exchangeOAuthCode}
                      disabled={!oauthCode.trim() || oauthStep === "exchanging"}
                      className="px-3 py-2 rounded-lg text-xs font-medium bg-white text-background hover:bg-text-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                    >
                      {oauthStep === "exchanging" && (
                        <Loader2 size={12} className="animate-spin" />
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
        <div className="mb-8">
          <label className="block text-xs font-medium text-text-secondary mb-2">
            Model
          </label>
          {provider === "ollama" ? (
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="codellama, deepseek-coder, etc."
              className="w-full px-3 py-2.5 bg-surface border border-border rounded-lg text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-border-subtle transition-colors"
            />
          ) : (
            <div className="flex gap-2">
              {PROVIDER_MODELS[provider].map((m) => (
                <button
                  key={m}
                  onClick={() => setModel(m)}
                  className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium border transition-colors ${
                    model === m
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

        <button
          onClick={save}
          disabled={!canSave}
          className="w-full py-2.5 rounded-lg text-sm font-medium bg-white text-background hover:bg-text-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Save &amp; Start
        </button>

        <p className="text-[11px] text-text-muted text-center mt-4">
          Your key is stored locally and never sent to our servers.
        </p>
      </div>
    </div>
  );
}
