/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import { predictScam } from "@/lib/api";
import type { ApiError, PredictPost, PredictRateType, PredictResponse } from "@/lib/api";

type FormState = {
  jobTitle: string;
  jobDescription: string;
  skillsDescription: string;
  companyProfile: string;
  fullText: string;
  amountMin: string;
  amountMax: string;
  currency: string;
  rateType: string;
};

const INITIAL_FORM_STATE: FormState = {
  jobTitle: "",
  jobDescription: "",
  skillsDescription: "",
  companyProfile: "",
  fullText: "",
  amountMin: "",
  amountMax: "",
  currency: "",
  rateType: "",
};

function toOptionalValue(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function buildSinglePost(form: FormState): PredictPost {
  const post: PredictPost = {};
  const text = toOptionalValue(form.fullText);
  const job_title = toOptionalValue(form.jobTitle);
  const job_desc = toOptionalValue(form.jobDescription);
  const skills_desc = toOptionalValue(form.skillsDescription);
  const company_profile = toOptionalValue(form.companyProfile);

  if (text) post.text = text;
  if (job_title) post.job_title = job_title;
  if (job_desc) post.job_desc = job_desc;
  if (skills_desc) post.skills_desc = skills_desc;
  if (company_profile) post.company_profile = company_profile;

  const amountMin = toOptionalValue(form.amountMin);
  const amountMax = toOptionalValue(form.amountMax);
  const currency = toOptionalValue(form.currency);
  const rateType = toOptionalValue(form.rateType);

  if (amountMin && amountMax && currency && rateType) {
    const parsedMin = Number(amountMin);
    const parsedMax = Number(amountMax);
    if (Number.isFinite(parsedMin) && Number.isFinite(parsedMax)) {
      post.rate = {
        amount_min: parsedMin,
        amount_max: parsedMax,
        currency,
        type: rateType.toLowerCase() as PredictRateType,
      };
    }
  }

  return post;
}

export default function Home() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [form, setForm] = useState<FormState>(INITIAL_FORM_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [predictionResult, setPredictionResult] = useState<PredictResponse | null>(null);

  const handleAnalyze = async () => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setPredictionResult(null);

    try {
      const payload = { posts: [buildSinglePost(form)] };
      const result = await predictScam(payload);
      setPredictionResult(result);
    } catch (error) {
      const apiError = error as ApiError;
      setSubmitError(apiError.message || "Unable to analyze the job post right now.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`w-full pb-[60px] ${isDarkMode ? "bg-[#040016] text-white" : "bg-white text-black"}`}
      style={{ fontFamily: "'IBM Plex Mono', monospace" }}
    >
      <div className="flex w-full flex-col items-center gap-5">
        <header
          className={`w-full overflow-hidden px-[60px] py-[19px] ${isDarkMode ? "bg-[#040016]" : "bg-white"}`}
        >
          <div className="mx-auto flex w-full max-w-[1320px] items-center justify-between">
            <div className="flex items-center gap-5">
              <img
                alt="Job Sentry shield icon"
                src={
                  isDarkMode
                    ? "https://www.figma.com/api/mcp/asset/ac1f2210-b1f1-41e3-a4b8-e45cfdb3d56a"
                    : "https://www.figma.com/api/mcp/asset/b99933e6-5755-44db-ad74-8b44dfe2bc04"
                }
                className="h-10 w-10"
              />
              <p className="text-2xl font-semibold">Job Sentry</p>
            </div>

            <div className="flex items-center gap-10">
              <div
                className={`flex items-center gap-2 rounded-lg p-2.5 ${isDarkMode ? "bg-[#241d42]" : "bg-[#f5f5f5]"}`}
              >
                <div className="rounded-lg bg-white px-5 py-2.5 text-base font-semibold text-[#6c4bff] shadow-[0_0_4px_0_rgba(0,0,0,0.25)]">
                  Main
                </div>
                <div className="rounded-lg px-5 py-2.5 text-base font-semibold text-[#8d8d8d] shadow-[0_0_4px_0_rgba(0,0,0,0.25)]">
                  Improvement
                </div>
              </div>
              <button
                type="button"
                aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
                onClick={() => setIsDarkMode((prev) => !prev)}
                className="h-[30px] w-[30px]"
              >
                <img
                  alt="Theme toggle icon"
                  src={
                    isDarkMode
                      ? "https://www.figma.com/api/mcp/asset/86a91552-16c6-4963-a6bf-0dd3a7ffe751"
                      : "https://www.figma.com/api/mcp/asset/66d1fa19-8566-4153-923f-5cc79483ebf1"
                  }
                  className={`h-[30px] w-[30px] transform transition-all duration-300 ease-in-out ${isDarkMode ? "rotate-180 scale-110" : "rotate-0 scale-100"}`}
                />
              </button>
            </div>
          </div>
        </header>

        <main className="flex w-full max-w-[874px] flex-col items-end gap-10">
          <section className="w-full text-center">
            <h1 className="text-4xl font-semibold">Job Post Scam Check</h1>
            <p className={`mt-5 text-base ${isDarkMode ? "text-white" : "text-[#767676]"}`}>
              Enter job post details below. Our AI model will analyze the text
              for common scam patterns, suspicious language, and inconsistent
              compensation.
            </p>
          </section>

          <section
            className={`w-full rounded-lg p-7 shadow-[0_0_4px_0_rgba(0,0,0,0.25)] ${isDarkMode ? "border border-[#767676]/70 bg-[#05001b]" : "bg-white"}`}
          >
            <div className="space-y-5">
              <Field
                label="Job title"
                placeholder="e.g. Software Engineer"
                isDarkMode={isDarkMode}
                value={form.jobTitle}
                onChange={(value) => setForm((prev) => ({ ...prev, jobTitle: value }))}
              />
              <Field
                label="Job Description"
                placeholder="Paste the main body of the job description here..."
                textarea
                heightClass="h-[200px]"
                isDarkMode={isDarkMode}
                value={form.jobDescription}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, jobDescription: value }))
                }
              />
              <Field
                label="Skills Description"
                placeholder="Required skills, qualifications, or experience..."
                textarea
                heightClass="h-[140px]"
                isDarkMode={isDarkMode}
                value={form.skillsDescription}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, skillsDescription: value }))
                }
              />
              <Field
                label="Company Profile"
                placeholder="Required skills, qualifications, or experience..."
                textarea
                heightClass="h-[140px]"
                isDarkMode={isDarkMode}
                value={form.companyProfile}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, companyProfile: value }))
                }
              />
              <div>
                <p className="text-base font-semibold">Full Job Post Text (Optional)</p>
                <p className={`mt-3 text-sm ${isDarkMode ? "text-white" : "text-[#767676]"}`}>
                  Paste the entire raw text here if you prefer not to split it
                  into fields above.
                </p>
                <textarea
                  placeholder="Paste full text here..."
                  value={form.fullText}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, fullText: event.target.value }))
                  }
                  className={`mt-3 h-[200px] w-full rounded-lg px-5 py-[19px] text-base placeholder:text-[#8d8d8d] focus:outline-none ${isDarkMode ? "border border-white/40 bg-[#231d42]" : "border border-black/20 bg-[#f5f5f5]"}`}
                />
              </div>
            </div>
          </section>

          <section
            className={`w-full rounded-lg p-7 shadow-[0_0_4px_0_rgba(0,0,0,0.25)] ${isDarkMode ? "border border-[#767676]/70 bg-[#05001b]" : "bg-white"}`}
          >
            <div className="flex items-center gap-5">
              <h2 className="text-2xl font-semibold">Compensation</h2>
              <p className="text-base text-[#8d8d8d]">(Optional)</p>
            </div>

            <div
              className={`mt-5 flex items-start gap-5 rounded-lg px-5 py-4 ${isDarkMode ? "bg-[#1b1537]" : "bg-[#f6f4ff]"}`}
            >
              <img
                alt="Information icon"
                src={
                  isDarkMode
                    ? "https://www.figma.com/api/mcp/asset/faa55795-2d84-4ce7-8582-89a03867cc34"
                    : "https://www.figma.com/api/mcp/asset/22b8f41d-ce9e-4058-9da7-c5fa02ce2051"
                }
                className="mt-0.5 h-5 w-5"
              />
              <p className="text-sm">
                If you enter any amount, currency, or type, it&apos;s recommended
                to fill all compensation fields for a more accurate analysis.
              </p>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
              <Field
                label="Amount Min"
                placeholder="0"
                isDarkMode={isDarkMode}
                value={form.amountMin}
                onChange={(value) => setForm((prev) => ({ ...prev, amountMin: value }))}
              />
              <Field
                label="Amount Max"
                placeholder="0"
                isDarkMode={isDarkMode}
                value={form.amountMax}
                onChange={(value) => setForm((prev) => ({ ...prev, amountMax: value }))}
              />
            </div>

            <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
              <Field
                label="Currency"
                placeholder="USD"
                isDarkMode={isDarkMode}
                value={form.currency}
                onChange={(value) => setForm((prev) => ({ ...prev, currency: value }))}
              />
              <Field
                label="Rate Type"
                placeholder="Select"
                isDarkMode={isDarkMode}
                value={form.rateType}
                onChange={(value) => setForm((prev) => ({ ...prev, rateType: value }))}
              />
            </div>
          </section>

          <button
            type="button"
            onClick={handleAnalyze}
            disabled={isSubmitting}
            className={`flex items-center gap-2 rounded-lg p-5 text-2xl font-semibold shadow-[0_0_4px_0_rgba(0,0,0,0.25)] ${isDarkMode ? "bg-white text-[#6c4bff]" : "bg-[#6c4bff] text-white"}`}
          >
            <img
              alt="Search icon"
              src={
                isDarkMode
                  ? "https://www.figma.com/api/mcp/asset/76bbc96a-cb05-445b-9abf-b469c6a69719"
                  : "https://www.figma.com/api/mcp/asset/38e98020-aaf9-400b-a7ae-1ba91bacb27b"
              }
              className="h-5 w-5"
            />
            {isSubmitting ? "Analyzing..." : "Validate & Analyze"}
          </button>
          {submitError && (
            <p className={`w-full text-sm ${isDarkMode ? "text-[#ff9b9b]" : "text-[#b00020]"}`}>
              {submitError}
            </p>
          )}
          {predictionResult && (
            <p className={`w-full text-sm ${isDarkMode ? "text-[#8d8d8d]" : "text-[#4b4b4b]"}`}>
              Analysis complete.
            </p>
          )}
        </main>
      </div>
    </div>
  );
}

function Field({
  label,
  placeholder,
  textarea = false,
  heightClass,
  isDarkMode = false,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  textarea?: boolean;
  heightClass?: string;
  isDarkMode?: boolean;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <p className="text-base font-semibold">{label}</p>
      {textarea ? (
        <textarea
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`mt-3 w-full rounded-lg px-5 py-[19px] text-base placeholder:text-[#8d8d8d] focus:outline-none ${heightClass ?? "h-[140px]"} ${isDarkMode ? "border border-white/40 bg-[#040016]" : "border border-black/20 bg-white"}`}
        />
      ) : (
        <input
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`mt-3 w-full rounded-lg px-5 py-[19px] text-base placeholder:text-[#8d8d8d] focus:outline-none ${isDarkMode ? "border border-white/40 bg-[#040016]" : "border border-black/20 bg-white"}`}
        />
      )}
    </div>
  );
}
