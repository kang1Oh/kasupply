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
    title: "Stable search exposure",
    copy: "Both plans keep supplier discovery tied to real product and business match, while Pro gives you room to scale listings without hitting platform caps.",
  },
  {
    icon: "zap",
    title: "More room to sell",
    copy: "Pro removes monthly acceptance limits so your team can keep taking quotations and purchase orders as demand grows.",
  },
  {
    icon: "shield",
    title: "Smoother checkout options",
    copy: "Unlock more payment options for customers who need flexibility beyond cash on delivery when closing deals.",
  },
];

const comparisonRows = [
  {
    feature: "Verification",
    free: "Free verification",
    premium: "Free verification",
  },
  {
    feature: "Buyer search exposure",
    free: "Equal match-based exposure",
    premium: "Equal match-based exposure",
  },
  {
    feature: "Product listing slots",
    free: "30 listings",
    premium: "Unlimited listings",
  },
  {
    feature: "Quotations accepted",
    free: "30 per month",
    premium: "Unlimited",
  },
  {
    feature: "Purchase orders accepted",
    free: "30 per month",
    premium: "Unlimited",
  },
  {
    feature: "Payment options",
    free: "Cash on delivery only",
    premium: "More payment options",
  },
];

const premiumFeatures = [
  "Free verification",
  "Equal exposure in search based on actual product and business match",
  "Unlimited product listing slots",
  "Unlimited quotations to accept",
  "Unlimited purchase orders to accept",
  "Integrate more payment options for customers",
];

const freeFeatures = [
  "Free for the first 3 months",
  "Free verification",
  "Equal exposure in search based on actual product and business match",
  "30 product listing slots",
  "30 quotations accepted per month",
  "30 purchase orders accepted per month",
  "Cash on delivery only",
];

function CurrentPlanPill() {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 shadow-sm">
      <span className="h-2 w-2 rounded-full bg-emerald-500" />
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        Current Plan
      </span>
      <span className="h-4 w-px bg-slate-200" />
      <span className="text-sm font-bold text-[#1E3A5F]">Standard</span>
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
        <h1 className="text-[28px] font-bold leading-tight tracking-[-0.03em] text-[#1E3A5F] md:text-[32px]">
          Choose the supplier plan that matches your selling volume
        </h1>

        <p className="mt-1.5 max-w-3xl text-[18px] leading-6 text-slate-600">
          Standard gives suppliers a strong starting package, while Pro is built
          for businesses ready to list more products, accept more deals, and
          offer more convenient ways for buyers to pay.
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
        {premium ? "Pro Plan" : "Standard Plan"}
      </p>

      <h2 className="mt-1 text-[22px] font-bold tracking-tight text-[#1E3A5F]">
        {premium ? "For growth-focused suppliers" : "For building your presence"}
      </h2>

      <div className="mt-3 flex items-end gap-2">
        <span className="text-[34px] font-black tracking-tight text-[#1E3A5F]">
          {premium ? "PHP 3,000" : "PHP 1,500"}
        </span>
        <span className="mb-1 text-sm font-semibold text-slate-500">
          / year
        </span>
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-600">
        {premium
          ? "Pro is for suppliers who want to keep winning orders without product, quotation, or purchase order limits slowing the team down."
          : "Standard gives you a paid yearly base plan with a free first 3 months and enough room to start selling seriously on the platform."}
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
        {premium ? "Upgrade to Pro" : "Current Plan"}
      </button>

      {!premium ? (
        <p className="mt-2.5 text-center text-[12px] text-slate-400">
          First 3 months included before annual billing starts
        </p>
      ) : (
        <p className="mt-2.5 text-center text-[12px] text-slate-400">
          Best for suppliers managing higher order volume
        </p>
      )}
    </div>
  );
}

function PlanComparisonHero() {
  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <div className="rounded-[28px] bg-[#1E3A5F] p-7 text-white shadow-sm md:p-8">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-amber-100">
          <Icon name="sparkles" className="h-4 w-4" />
          Supplier Pro
        </div>

        <h2 className="max-w-xl text-[32px] font-bold leading-[1.08] tracking-tight md:text-[42px]">
          More capacity for suppliers ready to close more business.
        </h2>

        <p className="mt-4 max-w-2xl text-base leading-7 text-white/75">
          Pro keeps discovery fair through actual business match, then removes
          the operational limits that can get in the way as your catalog and
          order volume expand.
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
            Standard vs Pro
          </h2>
          <p className="mt-0.4 text-[16px] text-slate-600">
            Compare what changes when your supplier account needs more capacity.
          </p>
        </div>

        <button
          type="button"
          className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#1E3A5F] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#244D7C]"
        >
          Upgrade to Pro
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
                Standard
              </th>
              <th className="px-6 py-3.5 text-sm font-semibold text-amber-700">
                Pro
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
            Ready to scale supply?
          </p>

          <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-[#1E3A5F]">
            Upgrade to Pro when more buyers start saying yes.
          </h2>

          <p className="mt-1.5 text-md leading-6 text-slate-600">
            Keep free verification and equal match-based search exposure, then
            add unlimited listings, unlimited accepted deals, and more payment
            flexibility when your operations are ready for higher volume.
          </p>
        </div>

        <button
          type="button"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#FF7A00] px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:brightness-105"
        >
          Upgrade to Pro
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
