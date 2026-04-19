"use client";

import { ChevronDown } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/animate-ui/primitives/radix/dropdown-menu";
import { cn } from "@/lib/utils";

const fieldInputClass = (isDarkMode: boolean) =>
  `mt-3 w-full rounded-lg px-5 py-[19px] text-base focus:outline-none ${
    isDarkMode
      ? "border border-white/40 bg-[#040016] text-white"
      : "border border-black/20 bg-white text-black"
  }`;

export function JobPostField({
  label,
  placeholder,
  textarea = false,
  heightClass,
  isDarkMode = false,
  value,
  onChange,
  selectOptions,
}: {
  label: string;
  placeholder: string;
  textarea?: boolean;
  heightClass?: string;
  isDarkMode?: boolean;
  value: string;
  onChange: (value: string) => void;
  /** When set, renders an Animate UI Radix dropdown instead of a text input. */
  selectOptions?: readonly { value: string; label: string }[];
}) {
  const menuSurface = isDarkMode
    ? "border-white/20 bg-[#040016] text-white"
    : "border-black/15 bg-white text-black";

  const selectedLabel =
    value === ""
      ? null
      : (selectOptions?.find((o) => o.value === value)?.label ?? null);

  return (
    <div>
      <p className="text-base font-semibold">{label}</p>
      {textarea ? (
        <textarea
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`placeholder:text-[#8d8d8d] ${fieldInputClass(isDarkMode)} ${heightClass ?? "h-[140px]"}`}
        />
      ) : selectOptions ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            type="button"
            className={cn(
              "flex cursor-pointer items-center justify-between gap-2 text-left",
              fieldInputClass(isDarkMode),
            )}
            aria-label={label}
            aria-haspopup="menu"
          >
            <span className={selectedLabel == null ? "text-[#8d8d8d]" : undefined}>
              {selectedLabel ?? placeholder}
            </span>
            <ChevronDown className="size-4 shrink-0 opacity-60" aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            sideOffset={6}
            className={cn(
              "z-50 min-w-[var(--radix-dropdown-menu-trigger-width)] overflow-hidden rounded-lg border p-1 shadow-lg",
              menuSurface,
            )}
          >
            <DropdownMenuGroup>
              <DropdownMenuItem
                onSelect={() => onChange("")}
                textValue={placeholder}
                className={cn(
                  "cursor-pointer rounded-md px-3 py-2 text-sm outline-none data-[highlighted]:bg-black/5",
                  isDarkMode && "data-[highlighted]:bg-white/10",
                )}
              >
                <span className="text-[#8d8d8d]">{placeholder}</span>
              </DropdownMenuItem>
              {selectOptions.map((opt) => (
                <DropdownMenuItem
                  key={opt.value}
                  onSelect={() => onChange(opt.value)}
                  textValue={opt.label}
                  className={cn(
                    "cursor-pointer rounded-md px-3 py-2 text-sm outline-none data-[highlighted]:bg-black/5",
                    isDarkMode && "data-[highlighted]:bg-white/10",
                  )}
                >
                  <span>{opt.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <input
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`placeholder:text-[#8d8d8d] ${fieldInputClass(isDarkMode)}`}
        />
      )}
    </div>
  );
}
