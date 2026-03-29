"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

/** Resolved light/dark for Job Sentry pages (matches previous usePersistedDarkMode behavior after mount). */
export function useAppDarkMode(): boolean {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setMounted(true);
    });
  }, []);

  if (!mounted) {
    return false;
  }

  return resolvedTheme === "dark";
}
