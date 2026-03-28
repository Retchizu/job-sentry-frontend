/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import { AppChromeHeader } from "@/app/app-chrome-header";
import type { ImprovementWarningFlag, PredictRateType } from "@/lib/api/types";

const FLAG_OPTIONS: { id: ImprovementWarningFlag; label: string }[] = [
  { id: "typographical_errors", label: "Typographical errors" },
  { id: "excessive_punctuation", label: "Excessive punctuation" },
  { id: "poor_grammar", label: "Poor grammar" },
  { id: "other_suspicious_patterns", label: "Other suspicious patterns" },
];

const RATE_TYPE_OPTIONS: { value: PredictRateType; label: string }[] = [
  { value: "hourly", label: "Hourly" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

type FormState = {
  jobTitle: string;
  jobDescription: string;
  skillsDescription: string;
  companyProfile: string;
  amountMin: string;
  amountMax: string;
  currency: string;
  rateType: string;
};

const INITIAL_FORM: FormState = {
  jobTitle: "",
  jobDescription: "",
  skillsDescription: "",
  companyProfile: "",
  amountMin: "",
  amountMax: "",
  currency: "",
  rateType: "",
};

function SendIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
    </svg>
  );
}

export default function ImprovementPage() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [flags, setFlags] = useState<Record<ImprovementWarningFlag, boolean>>({
    typographical_errors: false,
    excessive_punctuation: false,
    poor_grammar: false,
    other_suspicious_patterns: false,
  });
  /** `false` = not a scam, `true` = scam */
  const [labeledScam, setLabeledScam] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [previewJson, setPreviewJson] = useState<string | null>(null);

  /** All four job-detail fields must be filled before validate is enabled. */
  const hasAllPrimaryFields =
    form.jobTitle.trim().length > 0 &&
    form.jobDescription.trim().length > 0 &&
    form.skillsDescription.trim().length > 0 &&
    form.companyProfile.trim().length > 0;

  const compAny =
    form.amountMin.trim().length > 0 ||
    form.amountMax.trim().length > 0 ||
    form.currency.trim().length > 0 ||
    form.rateType.trim().length > 0;

  const compAll =
    form.amountMin.trim().length > 0 &&
    form.amountMax.trim().length > 0 &&
    form.currency.trim().length > 0 &&
    form.rateType.trim().length > 0;

  const handleValidateAndPreview = () => {
    setValidationError(null);
    setPreviewJson(null);

    if (!hasAllPrimaryFields) {
      setValidationError(
        "Fill in job title, job description, skills description, and company profile.",
      );
      return;
    }

    if (compAny && !compAll) {
      setValidationError(
        "If you enter any compensation detail, fill amount min, amount max, currency, and rate type.",
      );
      return;
    }

    if (compAll) {
      const parsedMin = Number(form.amountMin);
      const parsedMax = Number(form.amountMax);
      if (!Number.isFinite(parsedMin) || !Number.isFinite(parsedMax)) {
        setValidationError("Amount min and amount max must be valid numbers.");
        return;
      }
    }

    const warning_flags = FLAG_OPTIONS.filter((o) => flags[o.id]).map((o) => o.id);

    const previewPayload: Record<string, unknown> = {
      title: form.jobTitle.trim(),
      description: form.jobDescription.trim(),
      skills: form.skillsDescription.trim(),
      company: form.companyProfile.trim(),
      flags: warning_flags,
      scamLabel: labeledScam ? 1 : 0,
      timestamp: new Date().toISOString(),
    };

    if (compAll) {
      previewPayload.amountMin = Number(form.amountMin);
      previewPayload.amountMax = Number(form.amountMax);
      previewPayload.currency = form.currency.trim();
      previewPayload.rateType = form.rateType;
    }

    setPreviewJson(JSON.stringify(previewPayload, null, 2));
  };

  const cardClass = isDarkMode
    ? "rounded-lg border border-[#767676]/70 bg-[#05001b] p-7 shadow-[0_0_4px_0_rgba(0,0,0,0.25)]"
    : "rounded-lg border border-[#e5e7eb] bg-white p-7 shadow-sm";

  const fieldShell = isDarkMode
    ? "mt-3 w-full rounded-lg border border-white/40 bg-[#040016] px-5 py-[19px] text-base text-white placeholder:text-[#8d8d8d] focus:outline-none focus:ring-2 focus:ring-[#6c4bff]/40"
    : "mt-3 w-full rounded-md border border-[#e5e7eb] bg-white px-5 py-[19px] text-base text-black placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#6c4bff]/30";

  const muted = isDarkMode ? "text-[#bdb9d1]" : "text-[#767676]";
  const labelClass = isDarkMode ? "text-base font-semibold text-white" : "text-base font-semibold text-gray-900";

  return (
    <div
      className={`min-h-dvh w-full pb-16 ${isDarkMode ? "bg-[#040016] text-white" : "bg-[#f9fafb] text-black"}`}
    >
      <div className="flex w-full flex-col items-center gap-8">
        <AppChromeHeader
          activeTab="improvement"
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setIsDarkMode((v) => !v)}
        />

        <div className="w-full max-w-[1180px] px-6 lg:px-10">
          <header className="mb-10 text-center font-[family-name:var(--font-geist-mono)]">
            <h1 className="text-4xl font-semibold tracking-tight">Model Improvement Feedback</h1>
            <p className={`mx-auto mt-5 max-w-[640px] font-sans text-base ${muted}`}>
              Help train our AI. Use the same job post fields, plus warning flags and a scam label.
              Submit validates locally and shows a JSON preview only.
            </p>
          </header>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)] lg:items-start">
            <div className="flex flex-col gap-6 font-sans">
              <section className={cardClass}>
                <h2 className="mb-5 font-[family-name:var(--font-geist-mono)] text-2xl font-semibold">
                  Job Details
                </h2>
                <div className="space-y-5">
                  <div>
                    <p className={labelClass}>Job title</p>
                    <input
                      className={fieldShell}
                      placeholder="e.g. Software Engineer"
                      value={form.jobTitle}
                      onChange={(e) => setForm((p) => ({ ...p, jobTitle: e.target.value }))}
                    />
                  </div>
                  <div>
                    <p className={labelClass}>Job Description</p>
                    <textarea
                      className={`${fieldShell} h-[200px] resize-y`}
                      placeholder="Paste the main body of the job description here..."
                      value={form.jobDescription}
                      onChange={(e) => setForm((p) => ({ ...p, jobDescription: e.target.value }))}
                    />
                  </div>
                  <div>
                    <p className={labelClass}>Skills Description</p>
                    <textarea
                      className={`${fieldShell} h-[140px] resize-y`}
                      placeholder="Required skills, qualifications, or experience..."
                      value={form.skillsDescription}
                      onChange={(e) => setForm((p) => ({ ...p, skillsDescription: e.target.value }))}
                    />
                  </div>
                  <div>
                    <p className={labelClass}>Company Profile</p>
                    <textarea
                      className={`${fieldShell} h-[140px] resize-y`}
                      placeholder="e.g. Industry, company size, culture, or mission..."
                      value={form.companyProfile}
                      onChange={(e) => setForm((p) => ({ ...p, companyProfile: e.target.value }))}
                    />
                  </div>
                </div>
              </section>

              <section className={cardClass}>
                <div className="mb-5 flex flex-wrap items-baseline gap-2">
                  <h2 className="font-[family-name:var(--font-geist-mono)] text-2xl font-semibold">
                    Compensation
                  </h2>
                  <span className={`text-base ${muted}`}>(Optional)</span>
                </div>
                <div
                  className={`flex items-start gap-4 rounded-lg px-5 py-4 ${isDarkMode ? "bg-[#1b1537]" : "bg-[#f6f4ff]"}`}
                >
                  <img
                    alt=""
                    src={
                      isDarkMode
                        ? "https://www.figma.com/api/mcp/asset/faa55795-2d84-4ce7-8582-89a03867cc34"
                        : "https://www.figma.com/api/mcp/asset/22b8f41d-ce9e-4058-9da7-c5fa02ce2051"
                    }
                    className="mt-0.5 h-5 w-5 shrink-0"
                  />
                  <p className="text-sm leading-relaxed">
                    If you enter any amount, currency, or type, it&apos;s recommended to fill all
                    compensation fields for a more accurate analysis.
                  </p>
                </div>
                <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <p className={labelClass}>Amount Min</p>
                    <input
                      type="number"
                      className={fieldShell}
                      placeholder="0"
                      value={form.amountMin}
                      onChange={(e) => setForm((p) => ({ ...p, amountMin: e.target.value }))}
                    />
                  </div>
                  <div>
                    <p className={labelClass}>Amount Max</p>
                    <input
                      type="number"
                      className={fieldShell}
                      placeholder="0"
                      value={form.amountMax}
                      onChange={(e) => setForm((p) => ({ ...p, amountMax: e.target.value }))}
                    />
                  </div>
                  <div>
                    <p className={labelClass}>Currency</p>
                    <input
                      className={fieldShell}
                      placeholder="USD"
                      value={form.currency}
                      onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))}
                    />
                  </div>
                  <div>
                    <p className={labelClass}>Rate Type</p>
                    <select
                      className={`${fieldShell} cursor-pointer appearance-none bg-[length:1rem] bg-[right_1rem_center] bg-no-repeat pr-10`}
                      style={{
                        backgroundImage: isDarkMode
                          ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23a8a3c4'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`
                          : `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
                      }}
                      value={form.rateType}
                      onChange={(e) => setForm((p) => ({ ...p, rateType: e.target.value }))}
                    >
                      <option value="">Select</option>
                      {RATE_TYPE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>

              <section className={cardClass}>
                <h2 className="font-[family-name:var(--font-geist-mono)] text-2xl font-semibold">
                  Warning Flags
                </h2>
                <p className={`mt-2 text-sm ${muted}`}>Select any indicators present in the job post.</p>
                <ul className="mt-5 space-y-4">
                  {FLAG_OPTIONS.map((opt) => (
                    <li key={opt.id}>
                      <button
                        type="button"
                        onClick={() => setFlags((prev) => ({ ...prev, [opt.id]: !prev[opt.id] }))}
                        className="flex w-full items-center gap-3 rounded-lg text-left transition-colors hover:opacity-90"
                      >
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                            flags[opt.id]
                              ? "border-[#6c4bff] bg-[#6c4bff]"
                              : isDarkMode
                                ? "border-white/50"
                                : "border-[#d1d5db]"
                          }`}
                          aria-hidden
                        >
                          {flags[opt.id] ? (
                            <span className="block h-2 w-2 rounded-full bg-white" />
                          ) : null}
                        </span>
                        <span className={labelClass}>{opt.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>

              <section className={cardClass}>
                <h2 className="font-[family-name:var(--font-geist-mono)] text-2xl font-semibold">
                  Scam Label
                </h2>
                <div className="mt-6 flex flex-wrap gap-8">
                  <label className="flex cursor-pointer items-center gap-3">
                    <input
                      type="radio"
                      name="scam-label"
                      className="sr-only"
                      checked={!labeledScam}
                      onChange={() => setLabeledScam(false)}
                    />
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                        !labeledScam ? "border-[#6c4bff]" : isDarkMode ? "border-white/50" : "border-[#d1d5db]"
                      }`}
                    >
                      {!labeledScam ? (
                        <span className="block h-2.5 w-2.5 rounded-full bg-[#6c4bff]" />
                      ) : null}
                    </span>
                    <span className={labelClass}>Not a scam</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-3">
                    <input
                      type="radio"
                      name="scam-label"
                      className="sr-only"
                      checked={labeledScam}
                      onChange={() => setLabeledScam(true)}
                    />
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                        labeledScam ? "border-[#6c4bff]" : isDarkMode ? "border-white/50" : "border-[#d1d5db]"
                      }`}
                    >
                      {labeledScam ? (
                        <span className="block h-2.5 w-2.5 rounded-full bg-[#6c4bff]" />
                      ) : null}
                    </span>
                    <span className={labelClass}>Scam</span>
                  </label>
                </div>
              </section>

              <button
                type="button"
                onClick={handleValidateAndPreview}
                disabled={!hasAllPrimaryFields}
                className={`flex w-full items-center justify-center gap-2 rounded-lg p-5 text-xl font-semibold shadow-[0_0_4px_0_rgba(0,0,0,0.25)] disabled:cursor-not-allowed disabled:opacity-40 ${
                  isDarkMode ? "bg-white text-[#6c4bff]" : "bg-[#6c4bff] text-white"
                }`}
              >
                <SendIcon className="h-5 w-5" />
                Validate &amp; Preview Feedback
              </button>
              {validationError ? (
                <p className={`text-sm ${isDarkMode ? "text-[#ff9b9b]" : "text-[#b00020]"}`}>
                  {validationError}
                </p>
              ) : null}
            </div>

            <aside className={`${cardClass} lg:sticky lg:top-6`}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="font-[family-name:var(--font-geist-mono)] text-xl font-semibold">
                  Feedback Preview
                </h2>
                <span
                  className={`rounded px-2 py-0.5 font-mono text-xs font-medium ${
                    isDarkMode ? "bg-white/10 text-[#c4b5ff]" : "bg-[#f3f4f6] text-[#374151]"
                  }`}
                >
                  JSON
                </span>
              </div>

              {previewJson ? (
                <pre
                  className={`max-h-[min(70vh,560px)] overflow-auto rounded-md p-4 text-left text-xs leading-relaxed md:text-sm ${
                    isDarkMode ? "bg-[#0d0820] text-[#e5e7eb]" : "bg-[#f3f4f6] text-[#111827]"
                  }`}
                >
                  {previewJson}
                </pre>
              ) : (
                <div
                  className={`flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-md px-6 py-12 text-center ${
                    isDarkMode ? "bg-[#0d0820]/80" : "bg-[#f3f4f6]"
                  }`}
                >
                  <div
                    className={`flex h-16 w-16 items-center justify-center rounded-full ${isDarkMode ? "bg-[#2a1f57]" : "bg-[#ede9ff]"}`}
                  >
                    <img
                      alt=""
                      src={
                        isDarkMode
                          ? "https://www.figma.com/api/mcp/asset/faa55795-2d84-4ce7-8582-89a03867cc34"
                          : "https://www.figma.com/api/mcp/asset/22b8f41d-ce9e-4058-9da7-c5fa02ce2051"
                      }
                      className="h-8 w-8"
                    />
                  </div>
                  <p className={`max-w-[260px] font-sans text-sm ${muted}`}>
                    After a valid submit, the assembled{" "}
                    <code className="font-mono text-[0.85em] text-[#6c4bff]">ImprovementFeedbackRequest</code> JSON
                    will appear here.
                  </p>
                </div>
              )}
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
