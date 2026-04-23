"use client";

import { useEffect, useState } from "react";
import { AppChromeHeader } from "@/app/app-chrome-header";
import { saveImprovementFeedback } from "@/app/improvement/actions";
import { JobPostField } from "@/components/job-post-field";
import { JobUrlImportBar } from "@/components/job-url-import-bar";
import type { ImprovementWarningFlag, ReviewerRiskLabel } from "@/lib/api/types";
import {
  buildSinglePost,
  hasJobPostText,
  INITIAL_JOB_POST_FORM_STATE,
  RATE_TYPE_SELECT_OPTIONS,
  type JobPostFormState,
} from "@/lib/job-post-form";
import { useAppDarkMode } from "@/lib/use-app-dark-mode";

const WARNING_FLAG_OPTIONS: { id: ImprovementWarningFlag; label: string }[] = [
  { id: "typographical_errors", label: "Typographical errors" },
  { id: "excessive_punctuation", label: "Excessive punctuation" },
  { id: "poor_grammar", label: "Poor grammar" },
  { id: "other_suspicious_patterns", label: "Other suspicious patterns" },
];

const RISK_LABEL_OPTIONS: { value: ReviewerRiskLabel; label: string }[] = [
  { value: "legit", label: "Legit" },
  { value: "warning", label: "Warning" },
  { value: "fraud", label: "Fraud" },
];

export default function ImprovementPage() {
  const isDarkMode = useAppDarkMode();
  const [form, setForm] = useState<JobPostFormState>(INITIAL_JOB_POST_FORM_STATE);
  const [flags, setFlags] = useState<Record<ImprovementWarningFlag, boolean>>({
    typographical_errors: false,
    excessive_punctuation: false,
    poor_grammar: false,
    other_suspicious_patterns: false,
  });
  const [otherSuspiciousNote, setOtherSuspiciousNote] = useState("");
  const [labeledRisk, setLabeledRisk] = useState<ReviewerRiskLabel>("legit");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const jobPostFilled = hasJobPostText(form);

  useEffect(() => {
    if (!flags.other_suspicious_patterns) {
      setOtherSuspiciousNote("");
    }
  }, [flags.other_suspicious_patterns]);

  const toggleFlag = (id: ImprovementWarningFlag) => {
    setFlags((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSubmit = async () => {
    if (isSubmitting || !jobPostFilled) return;

    setIsSubmitting(true);
    setMessage(null);
    setError(null);

    const post = buildSinglePost(form);
    const warning_flags = (Object.keys(flags) as ImprovementWarningFlag[]).filter((k) => flags[k]);

    try {
      const result = await saveImprovementFeedback({
        post,
        warning_flags,
        warnings: otherSuspiciousNote,
        labeled_risk: labeledRisk,
      });
      if (result.ok) {
        setMessage(`Saved job posting (id ${result.jobPostingId}).`);
        setForm(INITIAL_JOB_POST_FORM_STATE);
        setFlags({
          typographical_errors: false,
          excessive_punctuation: false,
          poor_grammar: false,
          other_suspicious_patterns: false,
        });
        setLabeledRisk("legit");
      } else {
        setError(result.message);
      }
    } catch {
      setError("Something went wrong while saving.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const muted = isDarkMode ? "text-[#bdb9d1]" : "text-[#767676]";
  const card = isDarkMode ? "border border-[#767676]/70 bg-[#05001b]" : "bg-white";
  const cardClass = `w-full rounded-lg p-7 shadow-[0_0_4px_0_rgba(0,0,0,0.25)] ${card}`;
  const labelClass = isDarkMode ? "text-base text-white" : "text-base text-black";
  const radioDotClass =
    "block h-2.5 w-2.5 rounded-full bg-[#6c4bff] motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in motion-safe:duration-200";

  return (
    <div
      className={`w-full pb-[60px] ${isDarkMode ? "bg-[#040016] text-white" : "bg-white text-black"}`}
      style={{ fontFamily: "'IBM Plex Mono', monospace" }}
    >
      <div className="flex w-full flex-col items-center gap-5">
        <AppChromeHeader activeTab="improvement" isDarkMode={isDarkMode} />

        <main className="flex w-full max-w-[874px] flex-col items-end gap-10">
          <section className="w-full text-center">
            <h1 className="text-4xl font-semibold">Improvement feedback</h1>
            <p className={`mt-5 text-base ${muted}`}>
              Submit a job post with labels to help tune detection. Your entry is stored as a structured job posting
              row.
            </p>
          </section>

          <section className={cardClass}>
            <div className="space-y-5">
              <JobUrlImportBar
                isDarkMode={isDarkMode}
                onImported={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
              />
              <JobPostField
                label="Job title"
                placeholder="e.g. Software Engineer"
                isDarkMode={isDarkMode}
                value={form.jobTitle}
                onChange={(v) => setForm((p) => ({ ...p, jobTitle: v }))}
              />
              <JobPostField
                label="Job Description"
                placeholder="Paste the main body of the job description here..."
                textarea
                heightClass="h-[200px]"
                isDarkMode={isDarkMode}
                value={form.jobDescription}
                onChange={(v) => setForm((p) => ({ ...p, jobDescription: v }))}
              />
              <JobPostField
                label="Skills Description"
                placeholder="Required skills, qualifications, or experience..."
                textarea
                heightClass="h-[140px]"
                isDarkMode={isDarkMode}
                value={form.skillsDescription}
                onChange={(v) => setForm((p) => ({ ...p, skillsDescription: v }))}
              />
              <JobPostField
                label="Company Profile"
                placeholder="e.g. Industry, company size, culture, or mission..."
                textarea
                heightClass="h-[140px]"
                isDarkMode={isDarkMode}
                value={form.companyProfile}
                onChange={(v) => setForm((p) => ({ ...p, companyProfile: v }))}
              />
            </div>
          </section>

          <section className={cardClass}>
            <h2 className="text-2xl font-semibold">Compensation</h2>
            <p className={`mt-2 text-sm ${muted}`}>(Optional — same rules as the main checker.)</p>
            <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
              <JobPostField
                label="Amount Min"
                placeholder="0"
                isDarkMode={isDarkMode}
                value={form.amountMin}
                onChange={(v) => setForm((p) => ({ ...p, amountMin: v }))}
              />
              <JobPostField
                label="Amount Max"
                placeholder="0"
                isDarkMode={isDarkMode}
                value={form.amountMax}
                onChange={(v) => setForm((p) => ({ ...p, amountMax: v }))}
              />
            </div>
            <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
              <JobPostField
                label="Currency"
                placeholder="USD"
                isDarkMode={isDarkMode}
                value={form.currency}
                onChange={(v) => setForm((p) => ({ ...p, currency: v }))}
              />
              <JobPostField
                label="Rate Type"
                placeholder="Select"
                isDarkMode={isDarkMode}
                value={form.rateType}
                onChange={(v) => setForm((p) => ({ ...p, rateType: v }))}
                selectOptions={RATE_TYPE_SELECT_OPTIONS}
              />
            </div>
          </section>

          <section className={cardClass}>
            <h2 className="text-2xl font-semibold">Red Flags</h2>
            <div className="mt-5 space-y-3">
              {WARNING_FLAG_OPTIONS.map(({ id, label }) => (
                <label key={id} className="flex cursor-pointer items-center gap-3 text-base">
                  <input
                    type="checkbox"
                    checked={flags[id]}
                    onChange={() => toggleFlag(id)}
                    className="size-4 accent-[#6c4bff]"
                  />
                  {label}
                </label>
              ))}
              {flags.other_suspicious_patterns ? (
                <div className="pt-2 pl-7">
                  <JobPostField
                    label="Why?"
                    placeholder="Describe what looked suspicious…"
                    textarea
                    heightClass="h-[100px]"
                    isDarkMode={isDarkMode}
                    value={otherSuspiciousNote}
                    onChange={setOtherSuspiciousNote}
                  />
                </div>
              ) : null}
            </div>
          </section>

          <section className={cardClass}>
            <h2 className="font-[family-name:var(--font-geist-mono)] text-2xl font-semibold">Risk label</h2>
            <p className={`mt-1 text-sm ${muted}`}>Your overall risk tier for this posting (legit, warning, or fraud).</p>
            <fieldset className="mt-6 border-0 p-0 min-w-0">
              <legend className="sr-only">Risk label for this posting</legend>
              <div className="flex flex-wrap gap-8">
                {RISK_LABEL_OPTIONS.map(({ value, label }) => (
                  <label key={value} className="flex cursor-pointer items-center gap-3">
                    <input
                      type="radio"
                      name="risk-label"
                      className="sr-only"
                      checked={labeledRisk === value}
                      onChange={() => setLabeledRisk(value)}
                    />
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-200 ${
                        labeledRisk === value ? "border-[#6c4bff]" : isDarkMode ? "border-white/50" : "border-[#d1d5db]"
                      }`}
                    >
                      {labeledRisk === value ? <span className={radioDotClass} /> : null}
                    </span>
                    <span className={labelClass}>{label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </section>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !jobPostFilled}
            className={`flex items-center gap-2 rounded-lg p-5 text-2xl font-semibold shadow-[0_0_4px_0_rgba(0,0,0,0.25)] disabled:cursor-not-allowed disabled:opacity-40 ${isDarkMode ? "bg-white text-[#6c4bff]" : "bg-[#6c4bff] text-white"}`}
          >
            {isSubmitting ? "Saving…" : "Submit feedback"}
          </button>

          {message && (
            <p className={`w-full text-sm ${isDarkMode ? "text-[#7dffb3]" : "text-[#00b20c]"}`}>{message}</p>
          )}
          {error && (
            <p className={`w-full text-sm ${isDarkMode ? "text-[#ff9b9b]" : "text-[#b00020]"}`}>{error}</p>
          )}
        </main>
      </div>
    </div>
  );
}
