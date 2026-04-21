import { BuyerSourcingRequestForm } from "@/components/buyer-sourcing-request-form";
import { createSourcingRequest, getSourcingRequestFormData } from "./actions";
import Link from "next/link";

export default async function NewSourcingRequestPage() {
  const { categories, units, defaultDeliveryLocation } = await getSourcingRequestFormData();

  return (
    <main className="mx-auto max-w-[1120px] px-6 py-8">
      <nav className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-[#b4bcc8]">
        <Link href="/buyer/sourcing-board" className="transition hover:text-[#223654]">
          Sourcing Board
        </Link>
        <span className="text-[#c7ced8]">&gt;</span>
        <span className="text-[#8f9bac]">New Request</span>
      </nav>

      <div className="mt-3">
        <h1 className="text-[31px] font-semibold tracking-[-0.03em] text-[#223654]">
          Post a Sourcing Request
        </h1>
        <p className="mt-[4px] text-[14px] text-[#a3adbb]">
          Fill in what you need and suppliers will respond with a quote.
        </p>
      </div>

      <div className="mt-5">
        <BuyerSourcingRequestForm
          categories={categories}
          units={units}
          defaultDeliveryLocation={defaultDeliveryLocation}
          action={createSourcingRequest}
        />
      </div>
    </main>
  );
}
