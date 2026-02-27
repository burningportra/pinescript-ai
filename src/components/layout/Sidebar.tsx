"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Terminal,
  Plus,
  FileCode2,
  Clock,
  Settings,
} from "lucide-react";

type PanelType = "scripts" | "history" | null;

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
      className={`fixed left-[56px] top-0 h-full w-72 bg-surface border-r border-border z-40 transition-transform duration-300 ${
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
      <div className="p-4">{children}</div>
    </div>
  );
}

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [panel, setPanel] = useState<PanelType>(null);

  function togglePanel(p: PanelType) {
    setPanel((prev) => (prev === p ? null : p));
  }

  return (
    <>
      <aside className="fixed left-0 top-0 h-full w-[56px] bg-surface border-r border-border flex flex-col items-center py-4 z-50">
        {/* Logo */}
        <button
          onClick={() => router.push("/")}
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
              router.push("/chat");
              if (pathname === "/chat") window.location.reload();
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

        {/* Spacer + Settings at bottom */}
        <div className="mt-auto">
          <SidebarButton
            icon={Settings}
            tooltip="Settings"
            active={pathname === "/settings"}
            onClick={() => {
              setPanel(null);
              router.push("/settings");
            }}
          />
        </div>
      </aside>

      {/* Slide-out panels */}
      <SlidePanel
        title="Saved Scripts"
        open={panel === "scripts"}
        onClose={() => setPanel(null)}
      >
        <div className="flex flex-col items-center justify-center h-40 text-text-muted text-sm text-center">
          <FileCode2 size={32} className="mb-3 opacity-50" />
          <p>No saved scripts yet.</p>
          <p className="text-xs mt-1">Generated scripts will appear here.</p>
        </div>
      </SlidePanel>

      <SlidePanel
        title="Chat History"
        open={panel === "history"}
        onClose={() => setPanel(null)}
      >
        <div className="flex flex-col items-center justify-center h-40 text-text-muted text-sm text-center">
          <Clock size={32} className="mb-3 opacity-50" />
          <p>No chat history yet.</p>
          <p className="text-xs mt-1">Past conversations will appear here.</p>
        </div>
      </SlidePanel>
    </>
  );
}
