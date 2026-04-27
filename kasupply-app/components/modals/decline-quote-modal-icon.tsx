"use client";

type DeclineQuoteModalIconProps = {
  size?: number;
};

export function DeclineQuoteModalIcon({
  size = 42,
}: DeclineQuoteModalIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className="text-[#243F68]"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="8.6"
        stroke="currentColor"
        strokeWidth="1.55"
        opacity="0.78"
      />
      <path
        d="M9 9 15 15M15 9l-6 6"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
