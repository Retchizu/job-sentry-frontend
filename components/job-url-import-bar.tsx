"use client";

import { useMemo, useState } from "react";

import type { JobPostFormState } from "@/lib/job-post-form";
import {
  detectJobImportSource,
  type JobImportSource,
  importApiPathForSource,
  sourceLabel,
} from "@/lib/job-url-import";
import { cn } from "@/lib/utils";

const inputClass = (isDarkMode: boolean) =>
  cn(
    "min-w-0 flex-1 rounded-lg px-5 py-[19px] text-base focus:outline-none",
    isDarkMode
      ? "border border-white/40 bg-[#040016] text-white placeholder:text-[#8d8d8d]"
      : "border border-black/20 bg-white text-black placeholder:text-[#8d8d8d]",
  );

type LiveHint =
  | { kind: "empty" }
  | { kind: "ok"; source: JobImportSource }
  | { kind: "no"; message: string };

function liveImportHint(url: string): LiveHint {
  const t = url.trim();
  if (!t) return { kind: "empty" };
  const r = detectJobImportSource(t);
  if ("source" in r) return { kind: "ok", source: r.source };
  if (t.length < 8) return { kind: "empty" };
  if (r.error === "That URL is not valid.") return { kind: "empty" };
  return { kind: "no", message: r.error };
}

export function JobUrlImportBar({
  isDarkMode,
  onImported,
}: {
  isDarkMode: boolean;
  onImported: (patch: Partial<JobPostFormState>) => void;
}) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hint = useMemo(() => liveImportHint(url), [url]);

  const handleImport = async () => {
    setError(null);
    const r = detectJobImportSource(url);
    if ("error" in r) {
      setError(r.error);
      return;
    }
    setLoading(true);
    const endpoint = importApiPathForSource(r.source);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: r.requestUrl }),
      });
      const data: unknown = await res.json().catch(() => null);
      const ok = typeof data === "object" && data !== null && "ok" in data && (data as { ok: boolean }).ok === true;
      if (!ok || typeof data !== "object" || data === null || !("fields" in data)) {
        const msg =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof (data as { error: unknown }).error === "string"
            ? (data as { error: string }).error
            : "Import failed.";
        setError(msg);
        return;
      }
      const fields = (data as { fields: Partial<JobPostFormState> }).fields;
      console.log(`[import-job-url] source=${r.source} endpoint=${endpoint}`, data);
      onImported(fields);
    } catch {
      setError("Network error while importing.");
    } finally {
      setLoading(false);
    }
  };

  const muted = isDarkMode ? "text-[#bdb9d1]" : "text-[#767676]";
  const accent = isDarkMode ? "text-[#a89cff]" : "text-[#5a3dd4]";

  return (
    <div className="space-y-3">
      <p className="text-base font-semibold">Import from a job link</p>
      <p className={`text-sm ${muted}`}>
        Paste a job post URL. The site is chosen from the domain: OnlineJobs.ph (
        <span className="whitespace-nowrap">/jobseekers/job/…</span>) or LinkedIn public jobs (
        <span className="whitespace-nowrap">/jobs/view/&lt;id&gt;/</span>). LinkedIn sometimes blocks automated fetches
        — if that happens, copy the text in manually. You can edit the fields after import.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <input
          type="url"
          inputMode="url"
          placeholder="https://www.onlinejobs.ph/jobseekers/job/…  or  https://www.linkedin.com/jobs/view/…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={loading}
          className={inputClass(isDarkMode)}
          autoComplete="off"
        />
        <button
          type="button"
          disabled={loading}
          onClick={handleImport}
          className={cn(
            "shrink-0 rounded-lg px-6 py-[19px] text-base font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-50",
            isDarkMode ? "bg-white text-[#6c4bff]" : "bg-[#6c4bff] text-white",
          )}
        >
          {loading ? "Importing…" : "Import"}
        </button>
      </div>
      {hint.kind === "ok" ? (
        <p className={`text-sm font-medium ${accent}`}>Detected: {sourceLabel(hint.source)}</p>
      ) : null}
      {hint.kind === "no" ? <p className="text-sm text-amber-600 dark:text-amber-400/90">{hint.message}</p> : null}
      {error != null ? <p className="text-sm text-red-500">{error}</p> : null}
    </div>
  );
}
