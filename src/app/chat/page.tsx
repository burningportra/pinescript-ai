"use client";

import { useEffect, useState, useCallback } from "react";
import { Code2, TrendingUp, Lightbulb, MessageSquare, FileCode2 } from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import MessageList from "@/components/chat/MessageList";
import ChatInput from "@/components/chat/ChatInput";
import OnboardingGate from "@/components/chat/OnboardingGate";
import { useChat } from "@/hooks/useChat";
import { STORAGE_KEY, type PineVersion, type SavedChat } from "@/lib/types";
import dynamic from "next/dynamic";

const EditorPanel = dynamic(() => import("@/components/editor/EditorPanel"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-background border-l border-border">
      <div className="text-text-muted text-sm">Loading editor...</div>
    </div>
  ),
});

const ACTION_BUTTONS = [
  {
    icon: TrendingUp,
    label: "Browse Examples",
    prompt: "What are the most popular and effective TradingView indicators right now? Give me a brief overview and let me pick one to generate.",
  },
  {
    icon: Lightbulb,
    label: "Brainstorm",
    prompt: "Help me brainstorm PineScript indicator ideas. I'm interested in combining multiple signals for better entry/exit detection. What creative approaches can we take?",
  },
];

type MobileTab = "chat" | "editor";

export default function ChatPage() {
  const [hasSettings, setHasSettings] = useState<boolean | null>(null);
  const [pineVersion, setPineVersion] = useState<PineVersion>("v6");
  const [mobileTab, setMobileTab] = useState<MobileTab>("chat");

  const {
    messages,
    currentCode,
    codeTitle,
    isStreaming,
    streamStatus,
    error,
    validationResults,
    correctedCode,
    sendMessage,
    fixCode,
    loadChat,
    clearChat,
    clearCode,
    updateCode,
  } = useChat();

  const hasCode = currentCode.length > 0;

  // Auto-switch to editor tab on mobile when code is generated
  useEffect(() => {
    if (hasCode && messages.length > 0) {
      setMobileTab("editor");
    }
  }, [hasCode, messages.length]);

  const handleLoadScript = useCallback((code: string, title: string) => {
    updateCode(code);
  }, [updateCode]);

  const handleLoadChat = useCallback((chat: SavedChat) => {
    loadChat(chat);
  }, [loadChat]);

  const handleNewChat = useCallback(() => {
    clearChat();
    setMobileTab("chat");
  }, [clearChat]);

  const checkSettings = useCallback(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      setHasSettings(false);
      return;
    }
    try {
      const settings = JSON.parse(stored);
      if (!settings.apiKey && !settings.oauthToken && settings.provider !== "ollama") {
        setHasSettings(false);
        return;
      }
      setPineVersion(settings.pineVersion || "v6");
      setHasSettings(true);
    } catch {
      setHasSettings(false);
    }
  }, []);

  useEffect(() => {
    checkSettings();
  }, [checkSettings]);

  // Loading
  if (hasSettings === null) return null;

  const hasMessages = messages.length > 0;

  return (
    <div className="flex min-h-screen">
      <Sidebar
        onLoadScript={handleLoadScript}
        onLoadChat={handleLoadChat}
        onNewChat={handleNewChat}
      />
      <main className="md:ml-[56px] flex-1 flex flex-col md:flex-row">
        {/* Mobile tab bar — only shown when code exists */}
        {hasCode && (
          <div className="flex md:hidden border-b border-border bg-surface sticky top-0 z-30">
            <button
              onClick={() => setMobileTab("chat")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                mobileTab === "chat"
                  ? "text-text border-b-2 border-white"
                  : "text-text-dim"
              }`}
            >
              <MessageSquare size={16} />
              Chat
            </button>
            <button
              onClick={() => setMobileTab("editor")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                mobileTab === "editor"
                  ? "text-text border-b-2 border-white"
                  : "text-text-dim"
              }`}
            >
              <FileCode2 size={16} />
              Editor
            </button>
          </div>
        )}

        {/* Chat panel */}
        <div
          className={`flex flex-col transition-all duration-500 ease-in-out ${
            hasCode
              ? `md:w-[55%] ${mobileTab === "chat" ? "flex" : "hidden md:flex"}`
              : "w-full"
          } ${hasCode && mobileTab === "chat" ? "min-h-screen md:min-h-0" : ""}`}
        >
          {/* Onboarding gate — no settings yet */}
          {!hasSettings ? (
            <OnboardingGate onComplete={checkSettings} />
          ) : !hasMessages ? (
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center px-4 md:px-6 pt-14 md:pt-0">
              <div className="max-w-lg w-full text-center">
                <Code2 size={48} className="text-text-dim mx-auto mb-5" />
                <h1 className="text-xl font-semibold text-text mb-2">
                  PineScript AI
                </h1>
                <p className="text-text-secondary text-[13px] mb-8">
                  Describe an indicator or strategy to generate PineScript code
                </p>

                {/* Action buttons */}
                <div className="flex flex-col sm:flex-row gap-2 justify-center mb-8">
                  {ACTION_BUTTONS.map((btn) => (
                    <button
                      key={btn.label}
                      disabled={isStreaming}
                      onClick={() => sendMessage(btn.prompt)}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-surface text-text-dim hover:border-border-subtle hover:text-text-secondary text-sm transition-colors"
                    >
                      <btn.icon size={16} />
                      {btn.label}
                    </button>
                  ))}
                </div>

                <ChatInput onSend={sendMessage} disabled={isStreaming} />
              </div>
            </div>
          ) : (
            <>
              {/* Messages — add top padding on mobile for hamburger button */}
              <div className="pt-12 md:pt-0">
                <MessageList messages={messages} streamStatus={streamStatus} />
              </div>

              {/* Error */}
              {error && (
                <div className="px-4 pb-2">
                  <div className="bg-accent-error/10 border border-accent-error/20 rounded-lg px-4 py-2.5 text-sm text-accent-error">
                    {error}
                  </div>
                </div>
              )}

              {/* Input */}
              <ChatInput
                onSend={sendMessage}
                disabled={isStreaming}
                placeholder={hasCode ? "Ask for modifications..." : undefined}
              />
            </>
          )}
        </div>

        {/* Editor panel */}
        {hasCode && (
          <div
            className={`md:w-[45%] h-screen sticky top-0 ${
              mobileTab === "editor" ? "block" : "hidden md:block"
            }`}
          >
            <EditorPanel
              code={currentCode}
              title={codeTitle}
              pineVersion={pineVersion}
              onCodeChange={updateCode}
              onClear={() => {
                clearCode();
                setMobileTab("chat");
              }}
              validationResults={validationResults}
              correctedCode={correctedCode}
              streamStatus={streamStatus}
              onFix={fixCode}
            />
          </div>
        )}
      </main>
    </div>
  );
}
