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

export default function ChatInput({ onSend, onUpload, uploadContext, onDismissUpload, disabled, placeholder }: ChatInputProps) {
  const [value, setValue] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, []);

  useEffect(() => {
    resize();
  }, [value, resize]);

  function handleSubmit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    
    // Prefix message with file context if upload is active
    const message = uploadContext 
      ? `[File: ${uploadContext.filename}]\n${trimmed}`
      : trimmed;
    
    onSend(message);
    setValue("");
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !onUpload) return;

    const reader = new FileReader();
    reader.onload = () => {
      const code = reader.result as string;
      onUpload(code, file.name);
    };
    reader.readAsText(file);
    
    // Reset input value to allow re-selecting the same file
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (!file || !onUpload) return;
    
    // Check file type
    if (!file.name.endsWith('.pine') && !file.name.endsWith('.txt')) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const code = reader.result as string;
      onUpload(code, file.name);
    };
    reader.readAsText(file);
  }

  function openFileDialog() {
    fileInputRef.current?.click();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  const dynamicPlaceholder = uploadContext 
    ? `What would you like to do with ${uploadContext.filename}?`
    : placeholder || "Describe the PineScript indicator you want...";

  return (
    <div className="px-4 pb-4">
      <div 
        className={`bg-surface border rounded-2xl p-2 flex flex-col gap-2 focus-within:border-border-subtle transition-colors ${
          isDragging ? 'border-primary/50' : 'border-border'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* File badge */}
        {uploadContext && (
          <div className="flex items-center gap-2 px-2 py-1">
            <div className="flex items-center gap-1 bg-background border border-border rounded-md px-2 py-1 text-xs text-text-secondary">
              <span>{uploadContext.filename}</span>
              <button
                onClick={onDismissUpload}
                className="text-text-dim hover:text-text-secondary transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          </div>
        )}
        
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={dynamicPlaceholder}
            disabled={disabled}
            rows={1}
            className="flex-1 bg-transparent text-sm text-text placeholder:text-text-muted resize-none focus:outline-none min-h-[36px] py-2 pl-2 leading-snug"
          />

          {/* Paperclip button */}
          <button
            onClick={openFileDialog}
            disabled={disabled}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-transparent text-text-dim hover:text-text-secondary hover:bg-surface transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
          >
            <Paperclip size={16} />
          </button>

          <button
            onClick={handleSubmit}
            disabled={!value.trim() || disabled}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white text-background hover:bg-text-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
          >
            <ArrowUp size={18} />
          </button>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pine,.txt"
        onChange={handleFileSelect}
        className="hidden"
      />

      <p className="text-[11px] text-text-muted text-center mt-2">
        AI-generated code may contain errors. Always backtest.
      </p>
    </div>
  );
}
