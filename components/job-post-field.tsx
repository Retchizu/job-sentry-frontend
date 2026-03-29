"use client";

export function JobPostField({
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
