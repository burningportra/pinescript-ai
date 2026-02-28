"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { EditorView, keymap, lineNumbers } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { bracketMatching, foldGutter } from "@codemirror/language";
import { Copy, Check, Save, Download, Trash2, History, ChevronDown, Library, X } from "lucide-react";
import { pineScriptLanguage } from "./pine-language";
import { pineTheme, pineHighlight } from "./codemirror-theme";
import ValidationPanel from "./ValidationPanel";
import type { PineVersion, ValidationResult, StreamStatus, ScriptVersion } from "@/lib/types";
import { SCRIPTS_KEY } from "@/lib/types";

interface EditorPanelProps {
  code: string;
  title: string;
  pineVersion: PineVersion;
  onCodeChange: (code: string) => void;
  onClear: () => void;
  validationResults?: ValidationResult[];
  correctedCode?: string | null;
  streamStatus?: StreamStatus;
  onFix?: () => void;
  versions?: ScriptVersion[];
  onRestoreVersion?: (code: string, version: number) => void;
  libraryFile?: { name: string; code: string } | null;
  onAttachLibrary?: (code: string, name: string) => void;
  onDetachLibrary?: () => void;
}

export default function EditorPanel({
  code,
  title,
  pineVersion,
  onCodeChange,
  onClear,
  validationResults = [],
  correctedCode = null,
  streamStatus,
  onFix,
  versions = [],
  onRestoreVersion,
  libraryFile = null,
  onAttachLibrary,
  onDetachLibrary,
}: EditorPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showVersionDropdown, setShowVersionDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);

  const onCodeChangeRef = useRef(onCodeChange);
  onCodeChangeRef.current = onCodeChange;

  const formatRelativeTime = useCallback((timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return "just now";
    if (minutes === 1) return "1 min ago";
    if (minutes < 60) return `${minutes} min ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours === 1) return "1 hour ago";
    if (hours < 24) return `${hours} hours ago`;
    
    const days = Math.floor(hours / 24);
    if (days === 1) return "1 day ago";
    return `${days} days ago`;
  }, []);

  const handleVersionClick = useCallback((version: ScriptVersion) => {
    onRestoreVersion?.(version.code, version.version);
    setShowVersionDropdown(false);
  }, [onRestoreVersion]);

  const handleLibraryFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onAttachLibrary) return;

    const reader = new FileReader();
    reader.onload = () => {
      const code = reader.result as string;
      onAttachLibrary(code, file.name);
    };
    reader.readAsText(file);
    
    // Reset input value to allow re-selecting the same file
    if (libraryInputRef.current) {
      libraryInputRef.current.value = '';
    }
  }, [onAttachLibrary]);

  const openLibraryDialog = useCallback(() => {
    libraryInputRef.current?.click();
  }, []);

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
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    const filename = (title || "script").replace(/[^a-z0-9_-]/gi, "_").toLowerCase() + ".pine";
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, [code, title]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowVersionDropdown(false);
      }
    };

    if (showVersionDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showVersionDropdown]);

  return (
    <div className="h-full flex flex-col bg-background border-l border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-surface">
        <div className="flex items-center gap-2.5">
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-elevated text-text-secondary border border-border">
            Pine {pineVersion}
          </span>
          <span className="text-sm text-text font-medium truncate max-w-[200px]">
            {title || "Generated Script"}
          </span>
          
          {/* Version dropdown */}
          {versions.length > 0 && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowVersionDropdown(!showVersionDropdown)}
                className="flex items-center gap-1 px-2 py-1 text-xs text-text-secondary hover:text-text hover:bg-surface-elevated rounded-md transition-colors"
                title="Version history"
              >
                <History size={12} />
                <span>v{versions.length}</span>
                <ChevronDown size={12} />
              </button>
              
              {showVersionDropdown && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-surface border border-border rounded-lg shadow-lg z-50">
                  <div className="py-1 max-h-64 overflow-y-auto">
                    {[...versions].reverse().map((version, idx) => (
                      <button
                        key={version.version}
                        onClick={() => handleVersionClick(version)}
                        className="w-full px-3 py-2 text-left hover:bg-surface-elevated transition-colors flex items-center justify-between"
                      >
                        <div className="flex flex-col">
                          <span className="text-xs text-text">v{version.version}</span>
                          <span className="text-[10px] text-text-muted">
                            {formatRelativeTime(version.timestamp)}
                          </span>
                        </div>
                        {idx === 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                            current
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Library attachment */}
          <div className="flex items-center gap-2">
            {libraryFile ? (
              <div className="flex items-center gap-1 bg-background border border-border rounded-md px-2 py-1 text-xs text-text-secondary">
                <Library size={12} />
                <span>lib: {libraryFile.name}</span>
                <button
                  onClick={onDetachLibrary}
                  className="text-text-dim hover:text-text-secondary transition-colors"
                  title="Detach library"
                >
                  <X size={10} />
                </button>
              </div>
            ) : (
              <button
                onClick={openLibraryDialog}
                className="w-8 h-8 flex items-center justify-center rounded-md text-text-dim hover:text-text-secondary hover:bg-surface-elevated transition-colors"
                title="Attach library file"
              >
                <Library size={14} />
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
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
            title="Clear editor"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* CodeMirror container */}
      <div ref={containerRef} className="flex-1 overflow-auto" />

      {/* Hidden library file input */}
      <input
        ref={libraryInputRef}
        type="file"
        accept=".pine,.txt"
        onChange={handleLibraryFileSelect}
        className="hidden"
      />

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
