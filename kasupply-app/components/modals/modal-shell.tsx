"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type ModalShellProps = {
  title?: string;
  description?: string;
  children: React.ReactNode;
  closeHref?: string;
  closeLabel?: string;
  maxWidthClassName?: string;
  panelClassName?: string;
  panelOverflowClassName?: string;
  overlayClassName?: string;
  contentClassName?: string;
  headerActions?: React.ReactNode;
};

export function ModalShell({
  title,
  description,
  children,
  closeHref,
  closeLabel = "Close",
  maxWidthClassName = "max-w-3xl",
  panelClassName = "rounded-2xl bg-white p-6 shadow-2xl",
  panelOverflowClassName = "overflow-y-auto",
  overlayClassName = "bg-black/50 p-4",
  contentClassName,
  headerActions,
}: ModalShellProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center overflow-hidden overscroll-none ${overlayClassName}`}
    >
      <div
        className={`max-h-[90vh] w-full ${panelOverflowClassName} ${maxWidthClassName} ${panelClassName}`}
      >
        {title || description || closeHref || headerActions ? (
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              {title ? <h2 className="text-xl font-semibold text-slate-950">{title}</h2> : null}
              {description ? (
                <p className="mt-1 text-sm text-slate-500">{description}</p>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              {headerActions}
              {closeHref ? (
                <Link
                  href={closeHref}
                  className="rounded border border-slate-200 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                >
                  {closeLabel}
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className={contentClassName}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}
