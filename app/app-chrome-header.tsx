"use client";

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
  const activeClass =
    "rounded-lg bg-white px-5 py-2.5 text-base font-semibold text-[#6c4bff] shadow-[0_0_4px_0_rgba(0,0,0,0.25)]";
  const inactiveClass =
    "rounded-lg px-5 py-2.5 text-base font-semibold text-[#8d8d8d] shadow-[0_0_4px_0_rgba(0,0,0,0.25)]";

  return (
    <header
      className={`w-full overflow-hidden px-[60px] py-[19px] ${isDarkMode ? "bg-[#040016]" : "bg-white"}`}
    >
      <div className="mx-auto flex w-full max-w-[1320px] items-center justify-between">
        <Link href="/" className="flex items-center gap-5">
          <img
            alt="Job Sentry shield icon"
            src={
              isDarkMode
                ? "https://www.figma.com/api/mcp/asset/ac1f2210-b1f1-41e3-a4b8-e45cfdb3d56a"
                : "https://www.figma.com/api/mcp/asset/b99933e6-5755-44db-ad74-8b44dfe2bc04"
            }
            className="h-10 w-10"
          />
          <p className={`text-2xl font-semibold ${isDarkMode ? "text-white" : "text-black"}`}>
            Job Sentry
          </p>
        </Link>

        <div className="flex items-center gap-10">
          <div
            className={`flex items-center gap-2 rounded-lg p-2.5 ${isDarkMode ? "bg-[#241d42]" : "bg-[#f5f5f5]"}`}
          >
            <Link href="/" className={activeTab === "main" ? activeClass : inactiveClass}>
              Main
            </Link>
            <Link href="/improvement" className={activeTab === "improvement" ? activeClass : inactiveClass}>
              Improvement
            </Link>
          </div>
          <button
            type="button"
            aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            onClick={onToggleDarkMode}
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
  );
}
