import { BuyerSourcingRequestForm } from "@/components/buyer-sourcing-request-form";
import { createSourcingRequest, getSourcingRequestFormData } from "./actions";
import Link from "next/link";

export default async function NewSourcingRequestPage() {
  const { categories, units, defaultDeliveryLocation } = await getSourcingRequestFormData();

  return (
    <main className="w-full pb-[18px] pt-1">
      <nav className="flex flex-wrap items-center gap-2 text-[14px] font-normal text-[#bcc2cb]">
        <Link href="/buyer/sourcing-board" className="transition hover:text-[#223654]">
          Sourcing Board
        </Link>
        <span>&gt;</span>
        <span className="text-[#6A717F]">New Request</span>
      </nav>

      <div className="mt-[14px]">
        <h1 className="text-[23px] font-semibold tracking-[-0.04em] text-[#455060]">
          Post a Sourcing Request
        </h1>
        <p className="mt-[3px] text-[15px] font-normal leading-none text-[#c1c6cf]">
          Fill in what you need and suppliers will respond with a quote.
        </p>
      </div>

      <div className="mt-[18px]">
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
