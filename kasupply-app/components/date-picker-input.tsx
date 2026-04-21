"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type DatePickerInputProps = {
  id: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  className?: string;
  placeholder?: string;
};

type PickerInputElement = HTMLInputElement & {
  showPicker?: () => void;
};

function getTodayDateString() {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60 * 1000);
  return localDate.toISOString().slice(0, 10);
}

export function DatePickerInput({
  id,
  name,
  defaultValue,
  required,
  className,
  placeholder,
}: DatePickerInputProps) {
  const inputRef = useRef<PickerInputElement | null>(null);
  const minDate = useMemo(() => getTodayDateString(), []);
  const [value, setValue] = useState(defaultValue ?? "");
  const [showDateInput, setShowDateInput] = useState(!placeholder || Boolean(defaultValue));

  useEffect(() => {
    setValue(defaultValue ?? "");
    setShowDateInput(!placeholder || Boolean(defaultValue));
  }, [defaultValue, placeholder]);

  const inputClassName =
    className ??
    "h-[46px] w-full rounded-[10px] border border-[#d7dee8] bg-white px-4 pr-12 text-[14px] text-[#223654] outline-none transition focus:border-[#223654]";

  function openPicker() {
    const input = inputRef.current;

    if (!input) {
      return;
    }

    if (!showDateInput) {
      setShowDateInput(true);

      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.showPicker?.();
      });

      return;
    }

    input.showPicker?.();
    input.focus();
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        id={id}
        name={name}
        type={showDateInput ? "date" : "text"}
        min={minDate}
        value={value}
        placeholder={showDateInput ? undefined : placeholder}
        required={required}
        className={inputClassName}
        onFocus={() => {
          if (!showDateInput) {
            setShowDateInput(true);
          }
        }}
        onBlur={() => {
          if (!value && placeholder) {
            setShowDateInput(false);
          }
        }}
        onChange={(event) => {
          setValue(event.target.value);
        }}
      />

      <button
        type="button"
        onClick={openPicker}
        className="absolute inset-y-0 right-0 inline-flex w-12 items-center justify-center rounded-r-[10px] text-[#6f7c90] transition hover:text-[#223654]"
        aria-label={`Choose ${name}`}
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
          <path
            d="M5.75 3.5v2.25M14.25 3.5v2.25M3.5 7.25h13M5.5 16.5h9a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-9a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
