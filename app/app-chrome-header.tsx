"use client";

import Image from "next/image";
import Link from "next/link";

export type AppChromeTab = "main" | "improvement";

export function AppChromeHeader({
  isDarkMode,
  onToggleDarkMode,
  activeTab,
}: {
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  activeTab: AppChromeTab;
}) {
  const navLinkBase =
    "relative pb-1 text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6c4bff]/40 focus-visible:ring-offset-2 rounded-sm";
  const activeNav =
    `${navLinkBase} text-[#6c4bff] after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-[#6c4bff]`;
  const inactiveNav = isDarkMode
    ? `${navLinkBase} text-zinc-400 hover:text-zinc-200`
    : `${navLinkBase} text-zinc-500 hover:text-zinc-900`;

  return (
    <header
      className={`w-full overflow-hidden px-[60px] py-[19px] ${isDarkMode ? "bg-[#040016]" : "bg-white"}`}
    >
      <div className="mx-auto flex w-full max-w-[1320px] items-center justify-between">
        <Link href="/" className="flex items-center gap-5">
          <Image
            alt="Job Sentry shield icon"
            src={
              isDarkMode
                ? "/images/job-sentry-shield-dark.svg"
                : "/images/job-sentry-shield-light.svg"
            }
            width={40}
            height={40}
            className="h-10 w-10"
            unoptimized
          />
          <p className={`text-2xl font-semibold ${isDarkMode ? "text-white" : "text-black"}`}>
            Job Sentry
          </p>
        </Link>

        <div className="flex items-center gap-10">
          <nav
            className="flex items-center gap-8"
            aria-label="Primary"
          >
            <Link
              href="/"
              className={activeTab === "main" ? activeNav : inactiveNav}
              aria-current={activeTab === "main" ? "page" : undefined}
            >
              Main
            </Link>
            <Link
              href="/improvement"
              className={activeTab === "improvement" ? activeNav : inactiveNav}
              aria-current={activeTab === "improvement" ? "page" : undefined}
            >
              Improvement
            </Link>
          </nav>
          <button
            type="button"
            aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            onClick={onToggleDarkMode}
            className="h-[30px] w-[30px]"
          >
            <Image
              alt="Theme toggle icon"
              src={
                isDarkMode
                  ? "/images/theme-toggle-dark-ui.svg"
                  : "/images/theme-toggle-light-ui.svg"
              }
              width={30}
              height={30}
              className={`h-[30px] w-[30px] transform transition-all duration-300 ease-in-out ${isDarkMode ? "rotate-180 scale-110" : "rotate-0 scale-100"}`}
              unoptimized
            />
          </button>
        </div>
      </div>
    </header>
  );
}
