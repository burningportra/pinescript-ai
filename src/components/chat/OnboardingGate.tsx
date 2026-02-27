"use client";

import { useState, useEffect } from "react";
import { Eye, EyeOff, CheckCircle } from "lucide-react";
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

  useEffect(() => {
    // Consume anthropic_oauth_pending_token cookie if present
    const cookieName = "anthropic_oauth_pending_token";
    const oauthCookie = document.cookie
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${cookieName}=`));

    let token = "";
    if (oauthCookie) {
      token = decodeURIComponent(oauthCookie.slice(cookieName.length + 1));
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    }

    // Also load any previously saved oauthToken from localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (!token && parsed.oauthToken) token = parsed.oauthToken;
        if (parsed.provider) setProvider(parsed.provider);
        if (parsed.apiKey) setApiKey(parsed.apiKey);
        if (parsed.ollamaUrl) setOllamaUrl(parsed.ollamaUrl);
        if (parsed.model) setModel(parsed.model);
      } catch {
        // ignore
      }
    }

    if (token) setOauthToken(token);
  }, []);

  function selectProvider(p: Provider) {
    setProvider(p);
    setModel(PROVIDER_MODELS[p].length > 0 ? PROVIDER_MODELS[p][0] : "");
  }

  function disconnectOAuth() {
    setOauthToken("");
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
              <a
                href="/api/auth/anthropic"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border border-border bg-surface text-text-dim hover:text-text-secondary hover:border-border-subtle transition-colors"
              >
                Connect with Claude
              </a>
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
