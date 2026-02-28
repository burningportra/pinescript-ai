"use client";

import { useState, useEffect, useCallback } from "react";

export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

const THEME_KEY = "theme-preference";

function resolveTheme(pref: ThemePreference): ResolvedTheme {
  if (pref === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return pref;
}

export function useTheme() {
  const [preference, setPreference] = useState<ThemePreference>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("dark");

  const applyTheme = useCallback((pref: ThemePreference) => {
    const resolved = resolveTheme(pref);
    document.documentElement.setAttribute("data-theme", resolved);
    setResolvedTheme(resolved);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(THEME_KEY) as ThemePreference | null;
    const pref = stored || "system";
    setPreference(pref);
    applyTheme(pref);
  }, [applyTheme]);

  useEffect(() => {
    if (preference !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [preference, applyTheme]);

  const setTheme = useCallback(
    (pref: ThemePreference) => {
      setPreference(pref);
      localStorage.setItem(THEME_KEY, pref);
      applyTheme(pref);
    },
    [applyTheme]
  );

  return { preference, resolvedTheme, setTheme };
}
