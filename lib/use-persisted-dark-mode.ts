"use client";

import { startTransition, useCallback, useEffect, useState } from "react";

const THEME_STORAGE_KEY = "job-sentry-ui-theme";

function readStoredIsDark(): boolean {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === "dark";
  } catch {
    return false;
  }
}

function writeStoredIsDark(isDark: boolean) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, isDark ? "dark" : "light");
  } catch {
    // ignore quota / private mode
  }
}

export function usePersistedDarkMode(): [boolean, () => void] {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    startTransition(() => {
      setIsDarkMode(readStoredIsDark());
    });
    const onStorage = (e: StorageEvent) => {
      if (e.key === THEME_STORAGE_KEY && e.newValue != null) {
        startTransition(() => {
          setIsDarkMode(e.newValue === "dark");
        });
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode((prev) => {
      const next = !prev;
      writeStoredIsDark(next);
      return next;
    });
  }, []);

  return [isDarkMode, toggleDarkMode];
}
