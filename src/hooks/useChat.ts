"use client";

import { useReducer, useCallback, useRef, useEffect } from "react";
import type {
  ChatState,
  Message,
  StreamStatus,
  Settings,
  ValidationResult,
  SavedChat,
  EditorTab,
} from "@/lib/types";
import { CHATS_KEY, TABS_KEY } from "@/lib/types";

// Actions
type Action =
  | { type: "ADD_MESSAGE"; message: Message }
  | { type: "UPDATE_ASSISTANT"; content: string }
  | { type: "SET_CODE"; code: string; title: string; newTab?: boolean }
  | { type: "SET_STREAM_STATUS"; status: StreamStatus }
  | { type: "SET_ERROR"; error: string }
  | { type: "SET_VALIDATION"; results: ValidationResult[]; correctedCode: string | null }
  | { type: "CLEAR_ERROR" }
  | { type: "LOAD_CHAT"; messages: Message[]; currentCode: string; codeTitle: string }
  | { type: "RESET" }
  | { type: "CLOSE_TAB"; tabId: string }
  | { type: "SET_ACTIVE_TAB"; tabId: string }
  | { type: "REORDER_TABS"; tabIds: string[] }
  | { type: "LOAD_TABS"; tabs: EditorTab[]; activeTabId: string | null }
  | { type: "ACCEPT_CORRECTION" }
  | { type: "REJECT_CORRECTION" };

const initialState: ChatState = {
  messages: [],
  currentCode: "",
  codeTitle: "",
  isStreaming: false,
  streamStatus: "idle",
  error: null,
  validationResults: [],
  correctedCode: null,
  tabs: [],
  activeTabId: null,
  preCorrectCode: null,
};

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function reducer(state: ChatState, action: Action): ChatState {
  switch (action.type) {
    case "ADD_MESSAGE":
      return { ...state, messages: [...state.messages, action.message], error: null };
    case "UPDATE_ASSISTANT": {
      const msgs = [...state.messages];
      const last = msgs[msgs.length - 1];
      if (last?.role === "assistant") {
        msgs[msgs.length - 1] = { ...last, content: action.content };
      }
      return { ...state, messages: msgs };
    }
    case "SET_CODE": {
      let tabs = [...state.tabs];
      let activeTabId = state.activeTabId;

      if (action.newTab || tabs.length === 0) {
        // Create new tab
        const id = generateId();
        tabs = [...tabs, {
          id,
          title: action.title || "Untitled Script",
          code: action.code,
          createdAt: Date.now(),
        }];
        activeTabId = id;
        // Max 10 tabs
        if (tabs.length > 10) {
          tabs = tabs.slice(-10);
          if (!tabs.find(t => t.id === activeTabId)) {
            activeTabId = tabs[tabs.length - 1]?.id || null;
          }
        }
      } else if (activeTabId) {
        // Update active tab
        tabs = tabs.map(t =>
          t.id === activeTabId
            ? { ...t, code: action.code, title: action.title || t.title }
            : t
        );
      }

      return {
        ...state,
        currentCode: action.code,
        codeTitle: action.title,
        tabs,
        activeTabId,
      };
    }
    case "SET_STREAM_STATUS":
      return {
        ...state,
        streamStatus: action.status,
        isStreaming: action.status !== "idle" && action.status !== "error",
      };
    case "SET_ERROR":
      return { ...state, error: action.error, isStreaming: false, streamStatus: "error" };
    case "SET_VALIDATION":
      return {
        ...state,
        validationResults: action.results,
        correctedCode: action.correctedCode,
        preCorrectCode: action.correctedCode ? state.currentCode : null,
      };
    case "CLEAR_ERROR":
      return { ...state, error: null, streamStatus: "idle" };
    case "LOAD_CHAT": {
      let tabs = [...state.tabs];
      let activeTabId = state.activeTabId;

      if (action.currentCode) {
        const id = generateId();
        tabs = [...tabs, {
          id,
          title: action.codeTitle || "Loaded Script",
          code: action.currentCode,
          createdAt: Date.now(),
        }];
        activeTabId = id;
        if (tabs.length > 10) tabs = tabs.slice(-10);
      }

      return {
        ...initialState,
        messages: action.messages,
        currentCode: action.currentCode,
        codeTitle: action.codeTitle,
        tabs,
        activeTabId,
      };
    }
    case "RESET":
      return initialState;
    case "CLOSE_TAB": {
      const tabs = state.tabs.filter(t => t.id !== action.tabId);
      let activeTabId = state.activeTabId;
      let currentCode = state.currentCode;
      let codeTitle = state.codeTitle;

      if (activeTabId === action.tabId) {
        const idx = state.tabs.findIndex(t => t.id === action.tabId);
        const next = tabs[idx] || tabs[idx - 1] || null;
        activeTabId = next?.id || null;
        currentCode = next?.code || "";
        codeTitle = next?.title || "";
      }

      return {
        ...state,
        tabs,
        activeTabId,
        currentCode,
        codeTitle,
        validationResults: [],
        correctedCode: null,
        preCorrectCode: null,
      };
    }
    case "SET_ACTIVE_TAB": {
      const tab = state.tabs.find(t => t.id === action.tabId);
      if (!tab) return state;
      return {
        ...state,
        activeTabId: action.tabId,
        currentCode: tab.code,
        codeTitle: tab.title,
        validationResults: [],
        correctedCode: null,
        preCorrectCode: null,
      };
    }
    case "REORDER_TABS": {
      const tabMap = new Map(state.tabs.map(t => [t.id, t]));
      const reordered = action.tabIds.map(id => tabMap.get(id)).filter(Boolean) as EditorTab[];
      return { ...state, tabs: reordered };
    }
    case "LOAD_TABS": {
      const activeTab = action.tabs.find(t => t.id === action.activeTabId) || action.tabs[0];
      return {
        ...state,
        tabs: action.tabs,
        activeTabId: activeTab?.id || null,
        currentCode: activeTab?.code || state.currentCode,
        codeTitle: activeTab?.title || state.codeTitle,
      };
    }
    case "ACCEPT_CORRECTION": {
      if (!state.correctedCode) return state;
      const code = state.correctedCode;
      const titleMatch = code.match(/(?:indicator|strategy)\s*\(\s*["']([^"']+)["']/);
      const title = titleMatch ? titleMatch[1] : state.codeTitle;

      const tabs = state.tabs.map(t =>
        t.id === state.activeTabId ? { ...t, code, title } : t
      );

      return {
        ...state,
        currentCode: code,
        codeTitle: title,
        correctedCode: null,
        preCorrectCode: null,
        tabs,
      };
    }
    case "REJECT_CORRECTION":
      return {
        ...state,
        correctedCode: null,
        preCorrectCode: null,
      };
    default:
      return state;
  }
}

// Extract code from streaming content incrementally
function extractPineCode(content: string): { code: string; title: string } | null {
  // Look for ```pinescript or ```pine blocks
  const match = content.match(/```(?:pinescript|pine)\s*\n([\s\S]*?)(?:```|$)/);
  if (!match) return null;

  const code = match[1].trimEnd();
  if (!code) return null;

  // Try to extract title from indicator/strategy declaration
  const titleMatch = code.match(/(?:indicator|strategy)\s*\(\s*["']([^"']+)["']/);
  const title = titleMatch ? titleMatch[1] : "Generated Script";

  return { code, title };
}

export function useChat() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const abortRef = useRef<AbortController | null>(null);
  const chatIdRef = useRef(generateId());

  // Load persisted tabs on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(TABS_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        if (data.tabs?.length > 0) {
          dispatch({
            type: "LOAD_TABS",
            tabs: data.tabs,
            activeTabId: data.activeTabId,
          });
        }
      }
    } catch {
      // Ignore invalid stored data
    }
  }, []);

  // Persist tabs to localStorage
  useEffect(() => {
    if (state.tabs.length > 0) {
      localStorage.setItem(TABS_KEY, JSON.stringify({
        tabs: state.tabs,
        activeTabId: state.activeTabId,
      }));
    } else {
      localStorage.removeItem(TABS_KEY);
    }
  }, [state.tabs, state.activeTabId]);

  // Auto-save chat to localStorage when not streaming and messages exist
  useEffect(() => {
    if (state.isStreaming || state.messages.length === 0) return;

    const chats: SavedChat[] = JSON.parse(localStorage.getItem(CHATS_KEY) || "[]");
    const firstUserMsg = state.messages.find((m) => m.role === "user");
    const title = firstUserMsg?.content.slice(0, 60) || "New Chat";

    const chatData: SavedChat = {
      id: chatIdRef.current,
      title,
      messages: state.messages,
      currentCode: state.currentCode,
      codeTitle: state.codeTitle,
      timestamp: Date.now(),
    };

    const existing = chats.findIndex((c) => c.id === chatIdRef.current);
    if (existing >= 0) {
      chats[existing] = chatData;
    } else {
      chats.unshift(chatData);
    }

    // Keep max 50 chats
    if (chats.length > 50) chats.length = 50;

    localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
  }, [state.messages, state.isStreaming, state.currentCode, state.codeTitle]);

  const sendMessage = useCallback(async (content: string) => {
    // Load settings from localStorage
    const stored = localStorage.getItem("pinescript-ai-settings");
    if (!stored) return;

    let settings: Settings;
    try {
      settings = JSON.parse(stored);
    } catch {
      dispatch({ type: "SET_ERROR", error: "Invalid settings. Please reconfigure." });
      return;
    }

    // Abort any existing stream
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    // Add user message
    const userMsg: Message = {
      id: generateId(),
      role: "user",
      content,
      timestamp: Date.now(),
    };
    dispatch({ type: "ADD_MESSAGE", message: userMsg });

    // Add empty assistant message
    const assistantMsg: Message = {
      id: generateId(),
      role: "assistant",
      content: "",
      timestamp: Date.now(),
    };
    dispatch({ type: "ADD_MESSAGE", message: assistantMsg });
    dispatch({ type: "SET_STREAM_STATUS", status: "connecting" });
    // Clear previous validation when starting new generation
    dispatch({ type: "SET_VALIDATION", results: [], correctedCode: null });

    try {
      const allMessages = [...state.messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: allMessages,
          settings: {
            provider: settings.provider,
            apiKey: settings.apiKey,
            model: settings.model,
            ollamaUrl: settings.ollamaUrl,
            transpilerEnabled: settings.transpilerEnabled,
            oauthToken: settings.oauthToken,
          },
          pineVersion: settings.pineVersion,
          currentCode: state.currentCode || undefined,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: `Error ${res.status}` }));
        dispatch({ type: "SET_ERROR", error: data.error || `Request failed: ${res.status}` });
        return;
      }

      if (!res.body) {
        dispatch({ type: "SET_ERROR", error: "No response stream received." });
        return;
      }

      dispatch({ type: "SET_STREAM_STATUS", status: "generating" });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      let codeDetected = false;
      let tabCreated = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.error) {
              dispatch({ type: "SET_ERROR", error: parsed.error });
              return;
            }

            // Handle status events from post-generation pipeline
            if (parsed.status) {
              dispatch({ type: "SET_STREAM_STATUS", status: parsed.status as StreamStatus });
              continue;
            }

            // Handle validation results (don't auto-apply corrections — show diff instead)
            if (parsed.validation) {
              dispatch({
                type: "SET_VALIDATION",
                results: parsed.validation,
                correctedCode: parsed.correctedCode || null,
              });
              continue;
            }

            if (parsed.text) {
              fullContent += parsed.text;
              dispatch({ type: "UPDATE_ASSISTANT", content: fullContent });

              // Incremental code extraction
              if (!codeDetected && fullContent.includes("```pine")) {
                dispatch({ type: "SET_STREAM_STATUS", status: "streaming" });
                codeDetected = true;
              }

              if (codeDetected) {
                const extracted = extractPineCode(fullContent);
                if (extracted) {
                  dispatch({
                    type: "SET_CODE",
                    code: extracted.code,
                    title: extracted.title,
                    newTab: !tabCreated,
                  });
                  if (!tabCreated) tabCreated = true;
                }
              }
            }
          } catch {
            // Skip malformed SSE data
          }
        }
      }

      dispatch({ type: "SET_STREAM_STATUS", status: "idle" });
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      dispatch({
        type: "SET_ERROR",
        error: "Connection lost. Please try again.",
      });
    }
  }, [state.messages, state.currentCode, state.codeTitle]);

  const fixCode = useCallback(async () => {
    const stored = localStorage.getItem("pinescript-ai-settings");
    if (!stored || !state.currentCode) return;

    let settings: Settings;
    try {
      settings = JSON.parse(stored);
    } catch {
      return;
    }

    const errors = state.validationResults.filter(
      (r) => r.status === "error" || r.status === "warn",
    );
    if (errors.length === 0) return;

    dispatch({ type: "SET_STREAM_STATUS", status: "correcting" });

    try {
      const res = await fetch("/api/fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: state.currentCode,
          errors,
          settings: {
            provider: settings.provider,
            apiKey: settings.apiKey,
            model: settings.model,
            ollamaUrl: settings.ollamaUrl,
            transpilerEnabled: settings.transpilerEnabled,
            oauthToken: settings.oauthToken,
          },
          pineVersion: settings.pineVersion,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Fix failed" }));
        dispatch({ type: "SET_ERROR", error: data.error });
        return;
      }

      const { fixedCode: fixed, validation } = await res.json();

      // Don't auto-apply — store for diff view
      dispatch({
        type: "SET_VALIDATION",
        results: validation || [],
        correctedCode: fixed || null,
      });
      dispatch({ type: "SET_STREAM_STATUS", status: "idle" });
    } catch {
      dispatch({
        type: "SET_ERROR",
        error: "Fix request failed. Please try again.",
      });
    }
  }, [state.currentCode, state.validationResults, state.codeTitle]);

  const loadChat = useCallback((chat: SavedChat) => {
    abortRef.current?.abort();
    chatIdRef.current = chat.id;
    dispatch({
      type: "LOAD_CHAT",
      messages: chat.messages,
      currentCode: chat.currentCode,
      codeTitle: chat.codeTitle,
    });
  }, []);

  const clearChat = useCallback(() => {
    abortRef.current?.abort();
    chatIdRef.current = generateId();
    dispatch({ type: "RESET" });
  }, []);

  const clearCode = useCallback(() => {
    if (state.activeTabId) {
      dispatch({ type: "CLOSE_TAB", tabId: state.activeTabId });
    } else {
      dispatch({ type: "SET_CODE", code: "", title: "" });
      dispatch({ type: "SET_VALIDATION", results: [], correctedCode: null });
    }
  }, [state.activeTabId]);

  const updateCode = useCallback((code: string) => {
    dispatch({ type: "SET_CODE", code, title: state.codeTitle });
  }, [state.codeTitle]);

  const closeTab = useCallback((tabId: string) => {
    dispatch({ type: "CLOSE_TAB", tabId });
  }, []);

  const setActiveTab = useCallback((tabId: string) => {
    dispatch({ type: "SET_ACTIVE_TAB", tabId });
  }, []);

  const reorderTabs = useCallback((tabIds: string[]) => {
    dispatch({ type: "REORDER_TABS", tabIds });
  }, []);

  const acceptCorrection = useCallback(() => {
    dispatch({ type: "ACCEPT_CORRECTION" });
  }, []);

  const rejectCorrection = useCallback(() => {
    dispatch({ type: "REJECT_CORRECTION" });
  }, []);

  return {
    ...state,
    sendMessage,
    fixCode,
    loadChat,
    clearChat,
    clearCode,
    updateCode,
    closeTab,
    setActiveTab,
    reorderTabs,
    acceptCorrection,
    rejectCorrection,
  };
}
