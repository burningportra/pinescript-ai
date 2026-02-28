"use client";

import { useRef, useState, useCallback } from "react";
import { X, Plus, AlertTriangle } from "lucide-react";
import type { EditorTab } from "@/lib/types";

interface TabBarProps {
  tabs: EditorTab[];
  activeTabId: string | null;
  onTabSelect: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onTabReorder: (tabIds: string[]) => void;
  onNewTab: () => void;
}

const MAX_TABS = 10;

export default function TabBar({
  tabs,
  activeTabId,
  onTabSelect,
  onTabClose,
  onTabReorder,
  onNewTab,
}: TabBarProps) {
  const [dragTabId, setDragTabId] = useState<string | null>(null);
  const [dragOverTabId, setDragOverTabId] = useState<string | null>(null);
  const [showMaxWarning, setShowMaxWarning] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleDragStart = useCallback((e: React.DragEvent, tabId: string) => {
    setDragTabId(tabId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", tabId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, tabId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverTabId(tabId);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetTabId: string) => {
    e.preventDefault();
    setDragTabId(null);
    setDragOverTabId(null);

    const sourceTabId = e.dataTransfer.getData("text/plain");
    if (!sourceTabId || sourceTabId === targetTabId) return;

    const tabIds = tabs.map(t => t.id);
    const sourceIdx = tabIds.indexOf(sourceTabId);
    const targetIdx = tabIds.indexOf(targetTabId);
    if (sourceIdx === -1 || targetIdx === -1) return;

    tabIds.splice(sourceIdx, 1);
    tabIds.splice(targetIdx, 0, sourceTabId);
    onTabReorder(tabIds);
  }, [tabs, onTabReorder]);

  const handleDragEnd = useCallback(() => {
    setDragTabId(null);
    setDragOverTabId(null);
  }, []);

  const handleNewTab = useCallback(() => {
    if (tabs.length >= MAX_TABS) {
      setShowMaxWarning(true);
      setTimeout(() => setShowMaxWarning(false), 3000);
      return;
    }
    onNewTab();
  }, [tabs.length, onNewTab]);

  if (tabs.length === 0) return null;

  return (
    <div className="relative border-b border-border bg-background">
      <div
        ref={scrollRef}
        className="flex items-center overflow-x-auto scrollbar-none"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const isDragging = tab.id === dragTabId;
          const isDragOver = tab.id === dragOverTabId;

          return (
            <div
              key={tab.id}
              draggable
              onDragStart={(e) => handleDragStart(e, tab.id)}
              onDragOver={(e) => handleDragOver(e, tab.id)}
              onDrop={(e) => handleDrop(e, tab.id)}
              onDragEnd={handleDragEnd}
              onClick={() => onTabSelect(tab.id)}
              className={`group flex items-center gap-1.5 px-3 py-1.5 text-xs cursor-pointer border-r border-border select-none shrink-0 transition-colors ${
                isActive
                  ? "bg-surface text-text border-b-2 border-b-primary"
                  : "bg-background text-text-dim hover:text-text-secondary hover:bg-surface/50"
              } ${isDragging ? "opacity-40" : ""} ${
                isDragOver ? "border-l-2 border-l-primary" : ""
              }`}
            >
              <span className="truncate max-w-[120px]" title={tab.title}>
                {tab.title || "Untitled"}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTabClose(tab.id);
                }}
                className="shrink-0 w-4 h-4 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-surface-elevated transition-all"
                title="Close tab"
              >
                <X size={10} />
              </button>
            </div>
          );
        })}

        {/* New tab button */}
        <button
          onClick={handleNewTab}
          className="shrink-0 w-7 h-7 flex items-center justify-center text-text-dim hover:text-text-secondary hover:bg-surface/50 transition-colors"
          title={tabs.length >= MAX_TABS ? `Max ${MAX_TABS} tabs` : "New tab"}
        >
          <Plus size={12} />
        </button>
      </div>

      {/* Max tabs warning */}
      {showMaxWarning && (
        <div className="absolute top-full left-0 right-0 z-10 flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border-b border-amber-500/20 text-xs text-amber-400">
          <AlertTriangle size={12} />
          Maximum {MAX_TABS} tabs reached. Close a tab to open a new one.
        </div>
      )}
    </div>
  );
}
