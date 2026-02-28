"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { EditorView, keymap, lineNumbers } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import {
  defaultKeymap,
  history,
  historyKeymap,
  undo,
  redo,
} from "@codemirror/commands";
import { bracketMatching, foldGutter } from "@codemirror/language";
import {
  Copy,
  Check,
  Save,
  Download,
  Trash2,
  Undo2,
  Redo2,
  Code2,
  Plus,
} from "lucide-react";
import { pineScriptLanguage } from "./pine-language";
import { pineTheme, pineHighlight } from "./codemirror-theme";
import ValidationPanel from "./ValidationPanel";
import TabBar from "./TabBar";
import DiffView from "./DiffView";
import type {
  PineVersion,
  ValidationResult,
  StreamStatus,
  EditorTab,
  CodeSnippet,
} from "@/lib/types";
import { SCRIPTS_KEY, SNIPPETS_KEY } from "@/lib/types";

interface EditorPanelProps {
  code: string;
  title: string;
  pineVersion: PineVersion;
  onCodeChange: (code: string) => void;
  onClear: () => void;
  validationResults?: ValidationResult[];
  correctedCode?: string | null;
  preCorrectCode?: string | null;
  streamStatus?: StreamStatus;
  onFix?: () => void;
  // Tab management
  tabs: EditorTab[];
  activeTabId: string | null;
  onTabSelect: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onTabReorder: (tabIds: string[]) => void;
  // Correction handling
  onAcceptCorrection?: () => void;
  onRejectCorrection?: () => void;
}

const DEFAULT_SNIPPETS: CodeSnippet[] = [
  {
    id: "input-block",
    title: "Input Block",
    code: `// Input parameters
length = input.int(14, "Length", minval=1)
source = input.source(close, "Source")
mult = input.float(2.0, "Multiplier", minval=0.1, step=0.1)`,
    createdAt: 0,
  },
  {
    id: "plot-config",
    title: "Plot Configuration",
    code: `// Plot
plot(result, "Result", color=color.new(color.blue, 0), linewidth=2)
hline(0, "Zero", color=color.gray, linestyle=hline.style_dashed)`,
    createdAt: 0,
  },
  {
    id: "strategy-entry",
    title: "Strategy Entry/Exit",
    code: `// Strategy entry/exit
if longCondition
    strategy.entry("Long", strategy.long)
if shortCondition
    strategy.entry("Short", strategy.short)
if exitCondition
    strategy.close_all()`,
    createdAt: 0,
  },
];

export default function EditorPanel({
  code,
  title,
  pineVersion,
  onCodeChange,
  onClear,
  validationResults = [],
  correctedCode = null,
  preCorrectCode = null,
  streamStatus,
  onFix,
  tabs,
  activeTabId,
  onTabSelect,
  onTabClose,
  onTabReorder,
  onAcceptCorrection,
  onRejectCorrection,
}: EditorPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showSnippets, setShowSnippets] = useState(false);
  const [snippets, setSnippets] = useState<CodeSnippet[]>([]);
  const snippetRef = useRef<HTMLDivElement>(null);

  // Store EditorState per tab for history persistence
  const statesRef = useRef<Map<string, EditorState>>(new Map());
  const prevTabIdRef = useRef<string | null>(null);

  const onCodeChangeRef = useRef(onCodeChange);
  onCodeChangeRef.current = onCodeChange;

  // Load user snippets from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SNIPPETS_KEY);
      if (stored) {
        setSnippets(JSON.parse(stored));
      }
    } catch {
      // Ignore
    }
  }, []);

  // Close snippets dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (snippetRef.current && !snippetRef.current.contains(e.target as Node)) {
        setShowSnippets(false);
      }
    }
    if (showSnippets) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showSnippets]);

  // Initialize CodeMirror
  useEffect(() => {
    if (!containerRef.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onCodeChangeRef.current(update.state.doc.toString());
      }
    });

    const state = EditorState.create({
      doc: code,
      extensions: [
        lineNumbers(),
        history(),
        bracketMatching(),
        foldGutter(),
        pineScriptLanguage,
        pineTheme,
        pineHighlight,
        keymap.of([...defaultKeymap, ...historyKeymap]),
        updateListener,
        EditorView.lineWrapping,
      ],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      // Save state before destroying
      if (activeTabId && viewRef.current) {
        statesRef.current.set(activeTabId, viewRef.current.state);
      }
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle tab switching — save/restore EditorState for undo/redo persistence
  useEffect(() => {
    const view = viewRef.current;
    if (!view || !activeTabId) return;

    const prevId = prevTabIdRef.current;
    if (prevId && prevId !== activeTabId) {
      // Save the outgoing tab's state (preserves undo history)
      statesRef.current.set(prevId, view.state);

      // Restore the incoming tab's state if we have one
      const savedState = statesRef.current.get(activeTabId);
      if (savedState) {
        view.setState(savedState);
        prevTabIdRef.current = activeTabId;
        return; // Don't also run the code sync below
      }
    }

    prevTabIdRef.current = activeTabId;
  }, [activeTabId]);

  // Sync code from props to editor (for external changes like AI generation)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const currentDoc = view.state.doc.toString();
    if (currentDoc !== code) {
      view.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: code },
      });
    }
  }, [code]);

  const handleUndo = useCallback(() => {
    if (viewRef.current) undo(viewRef.current);
  }, []);

  const handleRedo = useCallback(() => {
    if (viewRef.current) redo(viewRef.current);
  }, []);

  const copyCode = useCallback(() => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  const saveScript = useCallback(() => {
    const scripts = JSON.parse(localStorage.getItem(SCRIPTS_KEY) || "[]");
    scripts.unshift({
      id: Date.now().toString(),
      title: title || "Untitled Script",
      code,
      timestamp: Date.now(),
    });
    localStorage.setItem(SCRIPTS_KEY, JSON.stringify(scripts));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [code, title]);

  const downloadScript = useCallback(() => {
    const filename =
      (title || "script").replace(/[^a-z0-9_-]/gi, "_").toLowerCase() + ".pine";
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, [code, title]);

  const saveAsSnippet = useCallback(() => {
    if (!code.trim()) return;
    const snippet: CodeSnippet = {
      id: Date.now().toString(),
      title: title || "Untitled Snippet",
      code,
      createdAt: Date.now(),
    };
    const updated = [snippet, ...snippets];
    setSnippets(updated);
    localStorage.setItem(SNIPPETS_KEY, JSON.stringify(updated));
    setShowSnippets(false);
  }, [code, title, snippets]);

  const insertSnippet = useCallback(
    (snippetCode: string) => {
      const view = viewRef.current;
      if (view) {
        const cursor = view.state.selection.main.head;
        view.dispatch({
          changes: { from: cursor, insert: snippetCode },
        });
      }
      setShowSnippets(false);
    },
    []
  );

  const deleteSnippet = useCallback(
    (snippetId: string) => {
      const updated = snippets.filter((s) => s.id !== snippetId);
      setSnippets(updated);
      localStorage.setItem(SNIPPETS_KEY, JSON.stringify(updated));
    },
    [snippets]
  );

  const handleNewTab = useCallback(() => {
    onCodeChange("");
  }, [onCodeChange]);

  const showDiff = correctedCode && preCorrectCode && correctedCode !== preCorrectCode;

  return (
    <div className="h-full flex flex-col bg-background border-l border-border">
      {/* Tab bar */}
      <TabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onTabSelect={onTabSelect}
        onTabClose={onTabClose}
        onTabReorder={onTabReorder}
        onNewTab={handleNewTab}
      />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-surface">
        <div className="flex items-center gap-2.5">
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-elevated text-text-secondary border border-border">
            Pine {pineVersion}
          </span>
          <span className="text-sm text-text font-medium truncate max-w-[200px]">
            {title || "Generated Script"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {/* Undo */}
          <button
            onClick={handleUndo}
            className="w-8 h-8 flex items-center justify-center rounded-md text-text-dim hover:text-text-secondary hover:bg-surface-elevated transition-colors"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={15} />
          </button>
          {/* Redo */}
          <button
            onClick={handleRedo}
            className="w-8 h-8 flex items-center justify-center rounded-md text-text-dim hover:text-text-secondary hover:bg-surface-elevated transition-colors"
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 size={15} />
          </button>

          <div className="w-px h-4 bg-border mx-0.5" />

          {/* Snippets dropdown */}
          <div className="relative" ref={snippetRef}>
            <button
              onClick={() => setShowSnippets(!showSnippets)}
              className="w-8 h-8 flex items-center justify-center rounded-md text-text-dim hover:text-text-secondary hover:bg-surface-elevated transition-colors"
              title="Code snippets"
            >
              <Code2 size={15} />
            </button>
            {showSnippets && (
              <div className="absolute right-0 top-full mt-1 w-64 bg-surface border border-border rounded-lg shadow-xl z-20 overflow-hidden">
                <div className="px-3 py-2 border-b border-border flex items-center justify-between">
                  <span className="text-xs font-medium text-text">Snippets</span>
                  <button
                    onClick={saveAsSnippet}
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                  >
                    <Plus size={10} />
                    Save current
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {/* Default snippets */}
                  {DEFAULT_SNIPPETS.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => insertSnippet(s.code)}
                      className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:bg-surface-elevated hover:text-text transition-colors border-b border-border/50 last:border-0"
                    >
                      <span className="font-medium">{s.title}</span>
                      <span className="block text-text-dim mt-0.5 truncate font-mono text-[10px]">
                        {s.code.split("\n")[0]}
                      </span>
                    </button>
                  ))}
                  {/* User snippets */}
                  {snippets.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center border-b border-border/50 last:border-0 hover:bg-surface-elevated transition-colors"
                    >
                      <button
                        onClick={() => insertSnippet(s.code)}
                        className="flex-1 text-left px-3 py-2 text-xs text-text-secondary hover:text-text"
                      >
                        <span className="font-medium">{s.title}</span>
                        <span className="block text-text-dim mt-0.5 truncate font-mono text-[10px]">
                          {s.code.split("\n")[0]}
                        </span>
                      </button>
                      <button
                        onClick={() => deleteSnippet(s.id)}
                        className="shrink-0 mr-2 w-5 h-5 flex items-center justify-center rounded text-text-dim hover:text-accent-error transition-colors"
                        title="Delete snippet"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  ))}
                  {snippets.length === 0 && (
                    <div className="px-3 py-2 text-xs text-text-dim border-t border-border/50">
                      No saved snippets yet
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="w-px h-4 bg-border mx-0.5" />

          <button
            onClick={copyCode}
            className="w-8 h-8 flex items-center justify-center rounded-md text-text-dim hover:text-text-secondary hover:bg-surface-elevated transition-colors"
            title="Copy code"
          >
            {copied ? (
              <Check size={15} className="text-accent-success" />
            ) : (
              <Copy size={15} />
            )}
          </button>
          <button
            onClick={saveScript}
            className="w-8 h-8 flex items-center justify-center rounded-md text-text-dim hover:text-text-secondary hover:bg-surface-elevated transition-colors"
            title="Save script"
          >
            {saved ? (
              <Check size={15} className="text-accent-success" />
            ) : (
              <Save size={15} />
            )}
          </button>
          <button
            onClick={downloadScript}
            className="w-8 h-8 flex items-center justify-center rounded-md text-text-dim hover:text-text-secondary hover:bg-surface-elevated transition-colors"
            title="Download .pine file"
          >
            <Download size={15} />
          </button>
          <button
            onClick={onClear}
            className="w-8 h-8 flex items-center justify-center rounded-md text-text-dim hover:text-accent-error hover:bg-accent-error/10 transition-colors"
            title="Close tab"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Diff view for auto-corrections */}
      {showDiff && onAcceptCorrection && onRejectCorrection && (
        <DiffView
          originalCode={preCorrectCode}
          correctedCode={correctedCode}
          onAccept={onAcceptCorrection}
          onReject={onRejectCorrection}
        />
      )}

      {/* CodeMirror container */}
      <div ref={containerRef} className="flex-1 overflow-auto" />

      {/* Validation panel */}
      <ValidationPanel
        results={validationResults}
        correctedCode={correctedCode}
        streamStatus={streamStatus}
        onFix={onFix}
      />
    </div>
  );
}
