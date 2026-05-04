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
    zap: (
      <svg {...common}>
        <path d="M13 2 4 14h7l-1 8 10-14h-7Z" />
      </svg>
    ),
    search: (
      <svg {...common}>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
    ),
    shield: (
      <svg {...common}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
        <path d="m9 12 2 2 4-5" />
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
    title: "Priority discovery",
    copy: "Your profile appears more prominently when buyers search and compare suppliers.",
  },
  {
    icon: "zap",
    title: "More quoting chances",
    copy: "Access more RFQs so your team can respond to more purchasing opportunities.",
  },
  {
    icon: "shield",
    title: "Stronger trust signal",
    copy: "A Premium badge helps buyers quickly identify serious and active suppliers.",
  },
];

const comparisonRows = [
  {
    feature: "Supplier profile badge",
    free: "Standard",
    premium: "Premium badge",
  },
  {
    feature: "Buyer search placement",
    free: "Standard ranking",
    premium: "Priority placement",
  },
  {
    feature: "RFQ response access",
    free: "Limited",
    premium: "Expanded monthly access",
  },
  {
    feature: "Profile visibility",
    free: "Basic listing",
    premium: "Boosted listing",
  },
  {
    feature: "Support response",
    free: "Standard queue",
    premium: "Priority queue",
  },
];

const premiumFeatures = [
  "Priority buyer search placement",
  "Expanded RFQ response access",
  "Premium supplier badge",
  "Boosted supplier profile visibility",
  "Priority support queue",
];

const freeFeatures = [
  "Basic supplier profile",
  "Standard buyer search ranking",
  "Limited RFQ response access",
  "Standard support",
];

function CurrentPlanPill() {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 shadow-sm">
      <span className="h-2 w-2 rounded-full bg-emerald-500" />

      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        Current Plan
      </span>

      <span className="h-4 w-px bg-slate-200" />

      <span className="text-sm font-bold text-[#1E3A5F]">Free Supplier</span>
    </div>
  );
}

function PageHeader() {
  return (
    <header className="mb-5">
      <div className="mb-2 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[15px] font-medium text-slate-500">
          Supplier Portal / Premium
        </p>

        <CurrentPlanPill />
      </div>

      <div>
        <h1 className="text-[28 px] font-bold leading-tight tracking-[-0.03em] text-[#1E3A5F] md:text-[32px]">
          Upgrade your supplier plan
        </h1>

        <p className="mt-1.5 max-w-3xl text-[18px] leading-6 text-slate-600">
          Give buyers more reasons to notice, trust, and contact your business
          on KaSupply.
        </p>
      </div>
    </header>
  );
}

function PlanCard({ type }: PlanCardProps) {
  const premium = type === "premium";
  const features = premium ? premiumFeatures : freeFeatures;

  return (
    <div
      className={`relative flex h-full flex-col rounded-[28px] border bg-white p-6 shadow-sm ${
        premium ? "border-[#FFB454] ring-4 ring-amber-100" : "border-slate-200"
      }`}
    >
      {premium ? (
        <div className="absolute right-5 top-5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
          Recommended
        </div>
      ) : null}

      <div
        className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${
          premium
            ? "bg-amber-100 text-amber-700"
            : "bg-slate-100 text-slate-500"
        }`}
      >
        <Icon name={premium ? "crown" : "users"} className="h-6 w-6" />
      </div>

      <p className="text-sm font-semibold text-slate-500">
        {premium ? "Premium Plan" : "Free Plan"}
      </p>

      <h2 className="mt-1 text-[22px] font-bold tracking-tight text-[#1E3A5F]">
        {premium ? "For active suppliers" : "For getting started"}
      </h2>

      <div className="mt-3 flex items-end gap-2">
        <span className="text-[34px] font-black tracking-tight text-[#1E3A5F]">
          {premium ? "₱999" : "₱0"}
        </span>
        <span className="mb-1 text-sm font-semibold text-slate-500">
          / month
        </span>
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-600">
        {premium
          ? "Unlock better placement, more RFQ access, and a stronger trust signal for buyers."
          : "Keep a basic supplier profile and access standard platform features."}
      </p>

      <div className="mt-5 flex-1 space-y-3">
        {features.map((item) => (
          <div key={item} className="flex items-start gap-3">
            <Icon
              name="check"
              className={`mt-0.5 h-5 w-5 shrink-0 ${
                premium ? "text-[#2B6C4A]" : "text-slate-400"
              }`}
            />
            <span className="text-sm font-medium leading-5 text-slate-700">
              {item}
            </span>
          </div>
        ))}
      </div>

      <button
        type="button"
        disabled={!premium}
        className={`mt-6 w-full rounded-2xl px-5 py-3 text-sm font-bold transition ${
          premium
            ? "bg-[#FF7A00] text-white shadow-lg hover:brightness-105"
            : "cursor-default border border-slate-200 bg-slate-50 text-slate-500"
        }`}
      >
        {premium ? "Upgrade Now" : "Current Plan"}
      </button>
    </div>
  );
}

function PlanComparisonHero() {
  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <div className="rounded-[28px] bg-[#1E3A5F] p-7 text-white shadow-sm md:p-8">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-amber-100">
          <Icon name="sparkles" className="h-4 w-4" />
          Premium upgrade
        </div>

        <h2 className="max-w-xl text-[32px] font-bold leading-[1.08] tracking-tight md:text-[42px]">
          Turn your supplier profile into a stronger sales channel.
        </h2>

        <p className="mt-4 max-w-2xl text-base leading-7 text-white/75">
          Premium makes the value clear: better visibility, more quoting
          opportunities, and stronger buyer confidence.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
          {premiumHighlights.map((item) => (
            <div key={item.title} className="rounded-2xl bg-white/10 p-4">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-amber-100">
                <Icon name={item.icon} className="h-5 w-5" />
              </div>

              <h3 className="text-sm font-bold">{item.title}</h3>

              <p className="mt-1 text-sm leading-6 text-white/70">
                {item.copy}
              </p>
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
    <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#1E3A5F]">
            Free vs Premium
          </h2>
          <p className="mt-0.4 text-[16px] text-slate-600">
            A clear side-by-side comparison makes the upgrade easier to
            understand.
          </p>
        </div>

        <button
          type="button"
          className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#1E3A5F] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#244D7C]"
        >
          Upgrade Now
          <Icon name="arrow" className="h-4 w-4" />
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-slate-50 text-left">
              <th className="px-6 py-3.5 text-sm font-semibold text-slate-500">
                Feature
              </th>
              <th className="px-6 py-3.5 text-sm font-semibold text-slate-500">
                Free
              </th>
              <th className="px-6 py-3.5 text-sm font-semibold text-amber-700">
                Premium
              </th>
            </tr>
          </thead>

          <tbody>
            {comparisonRows.map((row) => (
              <tr key={row.feature} className="border-t border-slate-100">
                <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                  {row.feature}
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {row.free}
                </td>
                <td className="px-6 py-4 text-sm font-semibold text-[#1E3A5F]">
                  <span className="inline-flex items-center gap-2">
                    <Icon name="check" className="h-4 w-4 text-[#2B6C4A]" />
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
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-wide text-amber-700">
            Ready to grow?
          </p>

          <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-[#1E3A5F]">
            Help more buyers discover and trust your supplier profile.
          </h2>

          <p className="mt-1.5 text-md leading-6 text-slate-600">
            Upgrade to Premium to improve your visibility, access more RFQ
            opportunities, and make your supplier profile stand out to buyers.
          </p>
        </div>

        <button
          type="button"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#FF7A00] px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:brightness-105"
        >
          Upgrade Now
          <Icon name="arrow" className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}

export default function SupplierPremiumPage() {
  return (
    <main className="min-h-full flex-1 overflow-auto bg-[#F5F8FC]">
      <div className="mx-auto max-w-7xl px-6 pb-6 pt-4 md:px-8 md:pb-8 md:pt-4">
        <PageHeader />

        <div className="space-y-6">
          <PlanComparisonHero />
          <ComparisonTable />
          <BottomCTA />
        </div>
      </div>
    </main>
  );
}