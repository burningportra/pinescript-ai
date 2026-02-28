"use client";

import { useMemo } from "react";
import { Check, X, GitCompareArrows } from "lucide-react";

interface DiffViewProps {
  originalCode: string;
  correctedCode: string;
  onAccept: () => void;
  onReject: () => void;
}

interface DiffLine {
  type: "add" | "remove" | "unchanged";
  content: string;
  oldLineNum?: number;
  newLineNum?: number;
}

function computeDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");
  const m = oldLines.length;
  const n = newLines.length;

  // LCS dynamic programming table
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0)
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        oldLines[i - 1] === newLines[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  // Backtrack to build diff
  const result: DiffLine[] = [];
  let i = m;
  let j = n;
  let oldNum = m;
  let newNum = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      result.unshift({
        type: "unchanged",
        content: oldLines[i - 1],
        oldLineNum: oldNum--,
        newLineNum: newNum--,
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({
        type: "add",
        content: newLines[j - 1],
        newLineNum: newNum--,
      });
      j--;
    } else {
      result.unshift({
        type: "remove",
        content: oldLines[i - 1],
        oldLineNum: oldNum--,
      });
      i--;
    }
  }

  // Fix line numbers (they were computed in reverse)
  let oNum = 1;
  let nNum = 1;
  for (const line of result) {
    if (line.type === "unchanged") {
      line.oldLineNum = oNum++;
      line.newLineNum = nNum++;
    } else if (line.type === "remove") {
      line.oldLineNum = oNum++;
    } else {
      line.newLineNum = nNum++;
    }
  }

  return result;
}

export default function DiffView({
  originalCode,
  correctedCode,
  onAccept,
  onReject,
}: DiffViewProps) {
  const diffLines = useMemo(
    () => computeDiff(originalCode, correctedCode),
    [originalCode, correctedCode]
  );

  const addCount = diffLines.filter((l) => l.type === "add").length;
  const removeCount = diffLines.filter((l) => l.type === "remove").length;

  return (
    <div className="border-b border-border bg-surface">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2 text-xs">
          <GitCompareArrows size={14} className="text-primary" />
          <span className="font-medium text-text">Auto-correction diff</span>
          <span className="text-emerald-400">+{addCount}</span>
          <span className="text-red-400">-{removeCount}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onReject}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs text-text-dim hover:text-accent-error hover:bg-accent-error/10 transition-colors"
          >
            <X size={12} />
            Reject
          </button>
          <button
            onClick={onAccept}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            <Check size={12} />
            Accept
          </button>
        </div>
      </div>

      {/* Diff lines */}
      <div className="max-h-64 overflow-y-auto font-mono text-xs">
        {diffLines.map((line, idx) => (
          <div
            key={idx}
            className={`flex ${
              line.type === "add"
                ? "bg-emerald-500/8 text-emerald-300"
                : line.type === "remove"
                  ? "bg-red-500/8 text-red-300"
                  : "text-text-dim"
            }`}
          >
            {/* Line numbers */}
            <span className="w-10 shrink-0 text-right pr-2 py-px text-text-muted select-none border-r border-border">
              {line.oldLineNum ?? ""}
            </span>
            <span className="w-10 shrink-0 text-right pr-2 py-px text-text-muted select-none border-r border-border">
              {line.newLineNum ?? ""}
            </span>
            {/* Indicator */}
            <span className="w-5 shrink-0 text-center py-px select-none">
              {line.type === "add" ? "+" : line.type === "remove" ? "-" : " "}
            </span>
            {/* Content */}
            <span className="flex-1 py-px pr-3 whitespace-pre overflow-x-auto">
              {line.content}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
