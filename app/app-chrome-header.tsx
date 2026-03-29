"use client";

import Image from "next/image";
import Link from "next/link";
import { ThemeTogglerButton } from "@/components/animate-ui/components/buttons/theme-toggler";

export type AppChromeTab = "main" | "improvement";

export function AppChromeHeader({
  isDarkMode,
  activeTab,
}: {
  isDarkMode: boolean;
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
          <ThemeTogglerButton
            variant="ghost"
            size="sm"
            modes={["light", "dark"]}
            className="focus-visible:ring-[#6c4bff]/40"
          />
        </div>
      </div>
    </header>
  );
}
