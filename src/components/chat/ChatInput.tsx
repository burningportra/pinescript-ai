"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { ArrowUp, Paperclip, X } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  onUpload?: (code: string, filename: string) => void;
  uploadContext?: { filename: string } | null;
  onDismissUpload?: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function ChatInput({
  onSend,
  onUpload,
  uploadContext,
  onDismissUpload,
  disabled,
  placeholder,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, []);

  useEffect(() => {
    resize();
  }, [value, resize]);

  const dynamicPlaceholder = uploadContext
    ? `What would you like to do with ${uploadContext.filename}?`
    : placeholder || "Describe the PineScript indicator you want...";

  function handleSubmit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;

    const message = uploadContext
      ? `[File: ${uploadContext.filename}]\n${trimmed}`
      : trimmed;

    onSend(message);
    setValue("");
    if (uploadContext && onDismissUpload) {
      onDismissUpload();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function processFile(file: File) {
    if (!onUpload) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "pine" && ext !== "txt") return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const code = e.target?.result as string;
      if (code) {
        onUpload(code, file.name);
      }
    };
    reader.readAsText(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    // Reset input value so re-uploading the same file works
    e.target.value = "";
  }

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (dragCounterRef.current === 1) {
      setIsDragging(true);
    }
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  return (
    <div className="px-4 pb-4">
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`bg-surface border rounded-2xl p-2 flex flex-col gap-2 focus-within:border-border-subtle transition-colors ${
          isDragging ? "border-primary/50" : "border-border"
        }`}
      >
        {/* File badge */}
        {uploadContext && (
          <div className="flex items-center gap-1 px-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium">
              {uploadContext.filename}
              <button
                type="button"
                onClick={onDismissUpload}
                className="hover:text-primary/70 transition-colors"
              >
                <X size={12} />
              </button>
            </span>
          </div>
        )}

        <div className="flex items-end gap-2">
          {/* Paperclip button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="w-9 h-9 flex items-center justify-center rounded-full text-text-muted hover:text-text-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
          >
            <Paperclip size={18} />
          </button>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pine,.txt"
            onChange={handleFileChange}
            className="hidden"
          />

          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={dynamicPlaceholder}
            disabled={disabled}
            rows={1}
            className="flex-1 bg-transparent text-sm text-text placeholder:text-text-muted resize-none focus:outline-none min-h-[36px] py-2 leading-snug"
          />

          <button
            onClick={handleSubmit}
            disabled={!value.trim() || disabled}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white text-background hover:bg-text-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
          >
            <ArrowUp size={18} />
          </button>
        </div>
      </div>
      <p className="text-[11px] text-text-muted text-center mt-2">
        AI-generated code may contain errors. Always backtest.
      </p>
    </div>
  );
}
