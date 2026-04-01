import { BuyerSourcingRequestForm } from "@/components/buyer-sourcing-request-form";
import { createSourcingRequest, getSourcingRequestFormData } from "./actions";
import Link from "next/link";

export default async function NewSourcingRequestPage() {
  const { categories, defaultDeliveryLocation } = await getSourcingRequestFormData();

  return (
    <main className="mx-auto max-w-[1120px] space-y-6 px-6 py-8">
      <nav className="flex flex-wrap items-center gap-2 text-[13px] text-[#a0abbb]">
        <Link href="/buyer/sourcing-board" className="transition hover:text-[#223654]">
          Sourcing Board
        </Link>
        <span>&gt;</span>
        <span className="text-[#6c7a8e]">New Request</span>
      </nav>

      <div>
        <h1 className="text-[34px] font-semibold tracking-tight text-[#223654]">
          Post a Sourcing Request
        </h1>
        <p className="mt-1 text-[16px] text-[#97a3b5]">
          Fill in what you need and suppliers will respond with a quote.
        </p>
      </div>

      <BuyerSourcingRequestForm
        categories={categories}
        defaultDeliveryLocation={defaultDeliveryLocation}
        action={createSourcingRequest}
      />
    </main>
  );
}
