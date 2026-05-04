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
    icon: "search",
    title: "Smarter supplier matching",
    copy: "Get better supplier recommendations based on your sourcing needs, product categories, and location.",
  },
  {
    icon: "rfq",
    title: "Expanded RFQ access",
    copy: "Send more RFQs and reach more suppliers when your team needs faster quotation options.",
  },
  {
    icon: "compare",
    title: "Faster quote comparison",
    copy: "Compare supplier responses more easily so your team can choose with confidence.",
  },
];

const comparisonRows = [
  {
    feature: "Supplier matching",
    free: "Standard matches",
    premium: "Smarter recommendations",
  },
  {
    feature: "RFQ access",
    free: "Limited monthly access",
    premium: "Expanded RFQ capacity",
  },
  {
    feature: "Quote comparison",
    free: "Basic review",
    premium: "Faster comparison tools",
  },
  {
    feature: "Saved suppliers",
    free: "Basic saved list",
    premium: "Organized supplier shortlist",
  },
  {
    feature: "Support response",
    free: "Standard queue",
    premium: "Priority support",
  },
];

const premiumFeatures = [
  "Smarter supplier recommendations",
  "Expanded RFQ request capacity",
  "Faster quote comparison tools",
  "Organized supplier shortlists",
  "Priority buyer support",
];

const freeFeatures = [
  "Basic supplier discovery",
  "Standard supplier matching",
  "Limited RFQ request access",
  "Basic saved suppliers",
];

function CurrentPlanPill() {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 shadow-sm">
      <span className="h-2 w-2 rounded-full bg-emerald-500" />
      <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        Current Plan
      </span>
      <span className="h-4 w-px bg-slate-200" />
      <span className="text-[14px] font-bold text-[#1E3A5F]">Free Buyer</span>
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
        Upgrade your buyer plan
      </h1>
      <p className="mt-1.5 max-w-2xl text-[17px] leading-6 text-slate-500">
        Source faster with smarter supplier matches, expanded RFQ access, and
        tools that help your team compare quotes with confidence.
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
        {premium ? "Premium Plan" : "Free Plan"}
      </p>

      <h2 className="mt-1.5 text-[22px] font-extrabold tracking-tight text-[#1E3A5F]">
        {premium ? "For active buyers" : "For basic sourcing"}
      </h2>

      <div className="mt-4 flex items-end gap-1.5">
        <span className="text-[38px] font-black leading-none tracking-tight text-[#1E3A5F]">
          {premium ? "₱999" : "₱0"}
        </span>
        <span className="mb-1 text-[14px] font-semibold text-slate-400">/ month</span>
      </div>

      <p className="mt-3 text-[14px] leading-6 text-slate-500">
        {premium
          ? "Unlock better supplier matches, more RFQ capacity, and faster quote comparison."
          : "Use standard supplier discovery and basic sourcing tools."}
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
        {premium ? "Upgrade Now" : "Current Plan"}
      </button>

      {premium && (
        <p className="mt-2.5 text-center text-[12px] text-slate-400">
          No commitment required · Cancel anytime
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
          Buyer Premium
        </div>

        <h2 className="max-w-xl text-[30px] font-extrabold leading-[1.1] tracking-tight md:text-[38px]">
          Find better suppliers in less time.
        </h2>

        <p className="mt-3 max-w-sm text-[15px] leading-6 text-white/80">
          Premium helps buyers source faster with better matches, expanded RFQs,
          and quicker quote review.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
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
            Free vs Premium
          </h2>
          <p className="mt-0.5 text-[14px] text-slate-500">
            Compare buyer sourcing features before upgrading.
          </p>
        </div>

        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(115deg,#ffa726_0%,#f57c00_50%,#bf360c_100%)] px-4 py-2.5 text-[14px] font-bold text-white shadow-[0_4px_14px_rgba(255,122,0,0.3)] transition hover:brightness-105"
        >
          Upgrade Now
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
                Free
              </th>
              <th className="px-6 py-3 text-[13px] font-semibold uppercase tracking-wide text-[#FF7A00]">
                Premium
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
            Ready to source faster?
          </p>
          <h2 className="mt-2 text-[24px] font-extrabold leading-tight tracking-tight text-white md:text-[28px]">
            Give your team better tools for finding and comparing suppliers.
          </h2>
          <p className="mt-2 text-[14px] leading-6 text-white/60">
            Upgrade to Premium to improve supplier matching, expand RFQ access,
            and make quote decisions faster.
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-start gap-2 md:items-end">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(115deg,#ffa726_0%,#f57c00_50%,#bf360c_100%)] px-6 py-3 text-[15px] font-bold text-white shadow-[0_4px_18px_rgba(255,122,0,0.4)] transition hover:brightness-105 active:scale-[0.98]"
          >
            Upgrade Now
            <Icon name="arrow" className="h-4 w-4" />
          </button>
          <p className="text-[12px] text-white/40">No commitment · Cancel anytime</p>
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