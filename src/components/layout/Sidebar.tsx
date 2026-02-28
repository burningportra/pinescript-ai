"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Terminal,
  Plus,
  FileCode2,
  Clock,
  Settings,
  Trash2,
  Menu,
  X,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import type { SavedScript, SavedChat } from "@/lib/types";
import { SCRIPTS_KEY, CHATS_KEY } from "@/lib/types";
import { useTheme, type ThemePreference } from "@/hooks/useTheme";

type PanelType = "scripts" | "history" | null;

interface SidebarProps {
  onLoadScript?: (code: string, title: string) => void;
  onLoadChat?: (chat: SavedChat) => void;
  onNewChat?: () => void;
}

function Tooltip({
  text,
  children,
}: {
  text: string;
  children: React.ReactNode;
}) {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-surface-elevated border border-border-subtle rounded-md text-xs text-text whitespace-nowrap z-50 pointer-events-none">
          {text}
        </div>
      )}
    </div>
  );
}

function SidebarButton({
  icon: Icon,
  tooltip,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  tooltip: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <Tooltip text={tooltip}>
      <button
        onClick={onClick}
        className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${
          active
            ? "bg-surface-elevated text-white"
            : "text-text-dim hover:text-text-secondary"
        }`}
      >
        <Icon size={20} />
      </button>
    </Tooltip>
  );
}

function SlidePanel({
  title,
  open,
  onClose,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [open, onClose]);

  return (
    <div
      ref={panelRef}
      className={`fixed left-0 md:left-[56px] top-0 h-full w-72 bg-surface border-r border-border z-40 transition-transform duration-300 ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h2 className="text-sm font-medium text-text">{title}</h2>
        <button
          onClick={onClose}
          className="text-text-dim hover:text-text-secondary text-lg leading-none"
        >
          &times;
        </button>
      </div>
      <div className="p-3 overflow-y-auto" style={{ height: "calc(100% - 53px)" }}>
        {children}
      </div>
    </div>
  );
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const themeOrder: ThemePreference[] = ["system", "light", "dark"];
const themeIcons = { system: Monitor, light: Sun, dark: Moon };
const themeLabels = { system: "System", light: "Light", dark: "Dark" };

export default function Sidebar({ onLoadScript, onLoadChat, onNewChat }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [panel, setPanel] = useState<PanelType>(null);
  const [scripts, setScripts] = useState<SavedScript[]>([]);
  const [chats, setChats] = useState<SavedChat[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { preference, setTheme } = useTheme();

  function cycleTheme() {
    const idx = themeOrder.indexOf(preference);
    setTheme(themeOrder[(idx + 1) % themeOrder.length]);
  }

  // Load data when panels open
  useEffect(() => {
    if (panel === "scripts") {
      try {
        setScripts(JSON.parse(localStorage.getItem(SCRIPTS_KEY) || "[]"));
      } catch {
        setScripts([]);
      }
    } else if (panel === "history") {
      try {
        setChats(JSON.parse(localStorage.getItem(CHATS_KEY) || "[]"));
      } catch {
        setChats([]);
      }
    }
  }, [panel]);

  function togglePanel(p: PanelType) {
    setPanel((prev) => (prev === p ? null : p));
  }

  function deleteScript(id: string) {
    const updated = scripts.filter((s) => s.id !== id);
    setScripts(updated);
    localStorage.setItem(SCRIPTS_KEY, JSON.stringify(updated));
  }

  function deleteChat(id: string) {
    const updated = chats.filter((c) => c.id !== id);
    setChats(updated);
    localStorage.setItem(CHATS_KEY, JSON.stringify(updated));
  }

  function closeMobile() {
    setMobileOpen(false);
    setPanel(null);
  }

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-3 left-3 z-50 w-10 h-10 flex md:hidden items-center justify-center rounded-lg bg-surface border border-border text-text-dim hover:text-text-secondary transition-colors"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={closeMobile}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full w-[56px] bg-surface border-r border-border flex flex-col items-center py-4 z-50 transition-transform duration-300 md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Mobile close button */}
        <button
          onClick={closeMobile}
          className="w-10 h-10 flex md:hidden items-center justify-center rounded-lg text-text-dim hover:text-text-secondary mb-2"
          aria-label="Close menu"
        >
          <X size={20} />
        </button>

        {/* Logo */}
        <button
          onClick={() => {
            router.push("/");
            closeMobile();
          }}
          className="w-10 h-10 flex items-center justify-center mb-6"
        >
          <Terminal size={20} className="text-white" />
        </button>

        {/* Nav */}
        <div className="flex flex-col gap-1.5">
          <SidebarButton
            icon={Plus}
            tooltip="New Chat"
            onClick={() => {
              setPanel(null);
              if (onNewChat) {
                onNewChat();
              } else {
                router.push("/chat");
                if (pathname === "/chat") window.location.reload();
              }
              closeMobile();
            }}
          />
          <SidebarButton
            icon={FileCode2}
            tooltip="Saved Scripts"
            active={panel === "scripts"}
            onClick={() => togglePanel("scripts")}
          />
          <SidebarButton
            icon={Clock}
            tooltip="Chat History"
            active={panel === "history"}
            onClick={() => togglePanel("history")}
          />
        </div>

        {/* Spacer + Theme toggle + Settings at bottom */}
        <div className="mt-auto flex flex-col gap-1.5">
          <SidebarButton
            icon={themeIcons[preference]}
            tooltip={`Theme: ${themeLabels[preference]}`}
            onClick={cycleTheme}
          />
          <SidebarButton
            icon={Settings}
            tooltip="Settings"
            active={pathname === "/settings"}
            onClick={() => {
              setPanel(null);
              router.push("/settings");
              closeMobile();
            }}
          />
        </div>
      </aside>

      {/* Saved Scripts Panel */}
      <SlidePanel
        title="Saved Scripts"
        open={panel === "scripts"}
        onClose={() => setPanel(null)}
      >
        {scripts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-text-muted text-sm text-center">
            <FileCode2 size={32} className="mb-3 opacity-50" />
            <p>No saved scripts yet.</p>
            <p className="text-xs mt-1">Save scripts from the editor to see them here.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {scripts.map((script) => (
              <div
                key={script.id}
                className="group flex items-start gap-2 px-3 py-2.5 rounded-lg hover:bg-surface-elevated transition-colors cursor-pointer"
                onClick={() => {
                  onLoadScript?.(script.code, script.title);
                  setPanel(null);
                  closeMobile();
                }}
              >
                <FileCode2 size={14} className="text-text-dim mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text truncate">{script.title}</p>
                  <p className="text-xs text-text-muted">{formatTime(script.timestamp)}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteScript(script.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded text-text-muted hover:text-accent-error transition-all"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </SlidePanel>

      {/* Chat History Panel */}
      <SlidePanel
        title="Chat History"
        open={panel === "history"}
        onClose={() => setPanel(null)}
      >
        {chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-text-muted text-sm text-center">
            <Clock size={32} className="mb-3 opacity-50" />
            <p>No chat history yet.</p>
            <p className="text-xs mt-1">Your conversations will appear here.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {chats.map((chat) => (
              <div
                key={chat.id}
                className="group flex items-start gap-2 px-3 py-2.5 rounded-lg hover:bg-surface-elevated transition-colors cursor-pointer"
                onClick={() => {
                  onLoadChat?.(chat);
                  setPanel(null);
                  closeMobile();
                }}
              >
                <Clock size={14} className="text-text-dim mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text truncate">{chat.title}</p>
                  <p className="text-xs text-text-muted">
                    {chat.messages.length} messages · {formatTime(chat.timestamp)}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteChat(chat.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded text-text-muted hover:text-accent-error transition-all"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </SlidePanel>
    </>
  );
}
