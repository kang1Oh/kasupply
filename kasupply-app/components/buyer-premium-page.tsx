"use client";

import React from "react";

type IconProps = {
  name: string;
  className?: string;
};

function Icon({ name, className = "h-5 w-5" }: IconProps) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  const icons: Record<string, React.ReactNode> = {
    crown: (
      <svg {...common}>
        <path d="m3 8 4 4 5-7 5 7 4-4v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
        <path d="M3 18h18" />
      </svg>
    ),
    check: (
      <svg {...common}>
        <circle cx="12" cy="12" r="10" />
        <path d="m9 12 2 2 4-5" />
      </svg>
    ),
    sparkles: (
      <svg {...common}>
        <path d="M12 3 13.7 8.3 19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7Z" />
        <path d="M19 16v4" />
        <path d="M21 18h-4" />
      </svg>
    ),
    search: (
      <svg {...common}>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
    ),
    rfq: (
      <svg {...common}>
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
        <path d="M14 3v5h5" />
        <path d="M9 13h6" />
        <path d="M9 17h4" />
      </svg>
    ),
    compare: (
      <svg {...common}>
        <path d="M7 7h10" />
        <path d="M7 12h10" />
        <path d="M7 17h7" />
        <path d="M4 7h.01" />
        <path d="M4 12h.01" />
        <path d="M4 17h.01" />
      </svg>
    ),
    users: (
      <svg {...common}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
        <circle cx="9.5" cy="7" r="4" />
        <path d="M20 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    shield: (
      <svg {...common}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
        <path d="m9 12 2 2 4-5" />
      </svg>
    ),
    arrow: (
      <svg {...common}>
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </svg>
    ),
  };

  return icons[name] || icons.check;
}

type PlanCardProps = {
  type: "free" | "premium";
};

const premiumHighlights = [
  {
    icon: "rfq",
    title: "Bigger sourcing reach",
    copy: "Send sourcing board RFQs to more suppliers at once so you can gather options faster on active buying cycles.",
  },
  {
    icon: "compare",
    title: "Less friction per request",
    copy: "Pro removes monthly caps and unlocks multi-item RFQs, which makes larger or repeat sourcing tasks easier to manage.",
  },
  {
    icon: "search",
    title: "Better buyer momentum",
    copy: "Keep verification, smart search, and purchasing workflows moving without worrying about hitting basic plan limits.",
  },
];

const comparisonRows = [
  {
    feature: "Verification",
    free: "Free verification",
    premium: "Free verification",
  },
  {
    feature: "Smart search",
    free: "Included",
    premium: "Included",
  },
  {
    feature: "Sourcing board reach",
    free: "Up to 5 suppliers per RFQ",
    premium: "Up to 10 suppliers per RFQ",
  },
  {
    feature: "Monthly RFQs",
    free: "10 RFQs per month",
    premium: "Unlimited RFQs",
  },
  {
    feature: "Monthly purchase orders",
    free: "10 purchase orders per month",
    premium: "Unlimited purchase orders",
  },
  {
    feature: "RFQ item support",
    free: "One item per RFQ",
    premium: "Multi-item RFQs",
  },
];

const premiumFeatures = [
  "Free verification",
  "Access to smart search",
  "Sourcing board RFQs to up to 10 suppliers",
  "Unlimited RFQs per month",
  "Unlimited purchase orders per month",
  "Multi-item RFQs for larger sourcing requests",
];

const freeFeatures = [
  "Free verification",
  "Access to smart search",
  "Sourcing board RFQs to up to 5 suppliers",
  "10 RFQs per month",
  "10 purchase orders per month",
  "One item per RFQ",
];

function CurrentPlanPill() {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 shadow-sm">
      <span className="h-2 w-2 rounded-full bg-emerald-500" />
      <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        Current Plan
      </span>
      <span className="h-4 w-px bg-slate-200" />
      <span className="text-[14px] font-bold text-[#1E3A5F]">Standard</span>
    </div>
  );
}

function PageHeader() {
  return (
    <header className="mb-6">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[14px] font-medium text-slate-400">
          Buyer Portal / Premium
        </p>
        <CurrentPlanPill />
      </div>

      <h1 className="text-[30px] font-extrabold leading-tight tracking-[-0.03em] text-[#1E3A5F] md:text-[36px]">
        Choose the buyer plan that fits your sourcing pace
      </h1>
      <p className="mt-1.5 max-w-2xl text-[17px] leading-6 text-slate-500">
        Standard keeps the essentials free, while Pro is built for buyers who
        send more RFQs, manage more purchase orders, and need room for
        multi-item requests.
      </p>
    </header>
  );
}

function PlanCard({ type }: PlanCardProps) {
  const premium = type === "premium";
  const features = premium ? premiumFeatures : freeFeatures;

  return (
    <div
      className={`relative flex h-full flex-col rounded-[24px] border bg-white p-6 ${
        premium
          ? "border-[#FF7A00] shadow-[0_0_0_4px_rgba(255,122,0,0.08)]"
          : "border-slate-200 shadow-sm"
      }`}
    >
      {premium && (
        <div className="absolute right-5 top-5 rounded-full bg-[#FF7A00] px-3 py-1 text-[12px] font-bold tracking-wide text-white">
          Recommended
        </div>
      )}

      <div
        className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${
          premium ? "bg-orange-100 text-[#FF7A00]" : "bg-slate-100 text-slate-400"
        }`}
      >
        <Icon name={premium ? "crown" : "users"} className="h-5 w-5" />
      </div>

      <p className="text-[13px] font-bold uppercase tracking-widest text-slate-400">
        {premium ? "Pro Plan" : "Standard Plan"}
      </p>

      <h2 className="mt-1.5 text-[22px] font-extrabold tracking-tight text-[#1E3A5F]">
        {premium ? "For scaling buyer teams" : "For steady sourcing needs"}
      </h2>

      <div className="mt-4 flex items-end gap-1.5">
        <span className="text-[38px] font-black leading-none tracking-tight text-[#1E3A5F]">
          {premium ? "PHP 1,000" : "PHP 0"}
        </span>
        <span className="mb-1 text-[14px] font-semibold text-slate-400">
          {premium ? "/ year" : "/ forever"}
        </span>
      </div>

      <p className="mt-3 text-[14px] leading-6 text-slate-500">
        {premium
          ? "Pro is designed for buyers who need higher sending limits, wider outreach, and more flexibility inside each RFQ."
          : "Standard gives you the core buyer tools for free, including verification, smart search, and essential RFQ and PO access."}
      </p>

      <div className="my-5 h-px bg-slate-100" />

      <div className="flex-1 space-y-2.5">
        {features.map((item) => (
          <div key={item} className="flex items-start gap-3">
            <Icon
              name="check"
              className={`mt-0.5 h-4 w-4 shrink-0 ${
                premium ? "text-[#FF7A00]" : "text-slate-300"
              }`}
            />
            <span className="text-[14px] font-medium leading-5 text-slate-600">
              {item}
            </span>
          </div>
        ))}
      </div>

      <button
        type="button"
        disabled={!premium}
        className={`mt-6 w-full rounded-xl px-5 py-3 text-[15px] font-bold transition-all ${
          premium
            ? "bg-[linear-gradient(115deg,#ffa726_0%,#f57c00_50%,#bf360c_100%)] text-white shadow-[0_4px_14px_rgba(255,122,0,0.35)] hover:brightness-105 active:scale-[0.98]"
            : "cursor-default border border-slate-200 bg-slate-50 text-slate-400"
        }`}
      >
        {premium ? "Upgrade to Pro" : "Current Plan"}
      </button>

      {premium && (
        <p className="mt-2.5 text-center text-[12px] text-slate-400">
          Best for repeat buyers and growing procurement teams
        </p>
      )}
    </div>
  );
}

function PlanComparisonHero() {
  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <div className="rounded-[24px] bg-[linear-gradient(115deg,#ffa726_0%,#f57c00_50%,#bf360c_100%)] p-6 text-white shadow-[0_8px_24px_rgba(255,122,0,0.25)] md:p-7">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/20 px-3.5 py-1.5 text-[13px] font-bold tracking-wide text-white">
          <Icon name="sparkles" className="h-3.5 w-3.5" />
          Buyer Pro
        </div>

        <h2 className="max-w-xl text-[30px] font-extrabold leading-[1.1] tracking-tight md:text-[38px]">
          More sending power for serious sourcing.
        </h2>

        <p className="mt-3 max-w-sm text-[15px] leading-6 text-white/80">
          Pro keeps the buyer experience simple while opening up higher RFQ
          volume, more supplier reach, and multi-item requests.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-1">
          {premiumHighlights.map((item) => (
            <div key={item.title} className="rounded-2xl bg-white/15 p-4">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-white">
                <Icon name={item.icon} className="h-4 w-4" />
              </div>
              <h3 className="text-[14px] font-bold leading-5">{item.title}</h3>
              <p className="mt-1 text-[13px] leading-5 text-white/70">{item.copy}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <PlanCard type="free" />
        <PlanCard type="premium" />
      </div>
    </section>
  );
}

function ComparisonTable() {
  return (
    <section className="rounded-[24px] border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-2 border-b border-slate-100 px-6 py-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-[20px] font-extrabold tracking-tight text-[#1E3A5F]">
            Standard vs Pro
          </h2>
          <p className="mt-0.5 text-[14px] text-slate-500">
            Compare the buyer features and monthly limits at a glance.
          </p>
        </div>

        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(115deg,#ffa726_0%,#f57c00_50%,#bf360c_100%)] px-4 py-2.5 text-[14px] font-bold text-white shadow-[0_4px_14px_rgba(255,122,0,0.3)] transition hover:brightness-105"
        >
          Upgrade to Pro
          <Icon name="arrow" className="h-4 w-4" />
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-slate-50 text-left">
              <th className="px-6 py-3 text-[13px] font-semibold uppercase tracking-wide text-slate-400">
                Feature
              </th>
              <th className="px-6 py-3 text-[13px] font-semibold uppercase tracking-wide text-slate-400">
                Standard
              </th>
              <th className="px-6 py-3 text-[13px] font-semibold uppercase tracking-wide text-[#FF7A00]">
                Pro
              </th>
            </tr>
          </thead>

          <tbody>
            {comparisonRows.map((row, i) => (
              <tr
                key={row.feature}
                className={`border-t border-slate-100 ${i % 2 === 0 ? "" : "bg-slate-50/50"}`}
              >
                <td className="px-6 py-3.5 text-[14px] font-semibold text-slate-800">
                  {row.feature}
                </td>
                <td className="px-6 py-3.5 text-[14px] text-slate-400">
                  {row.free}
                </td>
                <td className="px-6 py-3.5 text-[14px] font-semibold text-[#1E3A5F]">
                  <span className="inline-flex items-center gap-2">
                    <Icon name="check" className="h-4 w-4 text-[#FF7A00]" />
                    {row.premium}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function BottomCTA() {
  return (
    <section className="relative overflow-hidden rounded-[24px] bg-[#1E3A5F] p-6 shadow-sm md:p-8">
      <div className="pointer-events-none absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(ellipse_at_top_right,rgba(255,167,38,0.15),transparent_70%)]" />

      <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="max-w-[600px]">
          <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-orange-300">
            Ready to move beyond the basics?
          </p>
          <h2 className="mt-2 text-[24px] font-extrabold leading-tight tracking-tight text-white md:text-[28px]">
            Upgrade to Pro when your sourcing volume starts to grow.
          </h2>
          <p className="mt-2 text-[14px] leading-6 text-white/60">
            Keep free verification and smart search, then add unlimited RFQs,
            unlimited purchase orders, and multi-item requests when your team
            needs more room.
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-start gap-2 md:items-end">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(115deg,#ffa726_0%,#f57c00_50%,#bf360c_100%)] px-6 py-3 text-[15px] font-bold text-white shadow-[0_4px_18px_rgba(255,122,0,0.4)] transition hover:brightness-105 active:scale-[0.98]"
          >
            Upgrade to Pro
            <Icon name="arrow" className="h-4 w-4" />
          </button>
          <p className="text-[12px] text-white/40">PHP 1,000 billed annually</p>
        </div>
      </div>
    </section>
  );
}

export default function BuyerPremiumPage() {
  return (
    <main className="min-h-full flex-1 overflow-auto bg-white">
      <div className="mx-auto max-w-7xl px-6 pb-8 pt-5 md:px-8 md:pb-10 md:pt-6">
        <PageHeader />

        <div className="space-y-5">
          <PlanComparisonHero />
          <ComparisonTable />
          <BottomCTA />
        </div>
      </div>
    </main>
  );
}
