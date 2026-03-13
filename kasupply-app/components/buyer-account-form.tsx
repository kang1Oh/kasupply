"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateBuyerAccount } from "@/app/buyer/account/actions";

type BuyerAccountFormProps = {
  user: {
    name: string;
    email: string;
    phone: string | null;
  };
  businessProfile: {
    business_name: string;
    business_type: string;
    contact_name: string | null;
    contact_number: string | null;
    business_location: string;
    city: string;
    province: string;
    region: string;
    about: string | null;
  };
  documentId: number | null;
  documentVisibility: boolean;
};

export function BuyerAccountForm({
  user,
  businessProfile,
  documentId,
  documentVisibility,
}: BuyerAccountFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  return (
    <form
      className="space-y-6"
      action={(formData) => {
        setError("");

        startTransition(async () => {
          try {
            await updateBuyerAccount(formData);
            router.push("/buyer/account");
            router.refresh();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong.");
          }
        });
      }}
    >
        <input
            type="hidden"
            name="document_id"
            value={documentId ?? ""}
        />
      <section className="rounded-xl border bg-black p-5 shadow-sm space-y-4">
        <div>
          <h2 className="text-lg font-semibold">User Information</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Full Name
            </label>
            <input
              id="name"
              name="name"
              defaultValue={user.name}
              required
              className="w-full rounded-md border px-3 py-2"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              defaultValue={user.email}
              disabled
              className="w-full rounded-md border bg-black px-3 py-2"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label htmlFor="phone" className="text-sm font-medium">
              Phone Number
            </label>
            <input
              id="phone"
              name="phone"
              defaultValue={user.phone || ""}
              className="w-full rounded-md border px-3 py-2"
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border bg-black p-5 shadow-sm space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Business Profile</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="business_name" className="text-sm font-medium">
              Business Name
            </label>
            <input
              id="business_name"
              name="business_name"
              defaultValue={businessProfile.business_name}
              required
              className="w-full rounded-md border px-3 py-2"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="business_type" className="text-sm font-medium">
              Business Type
            </label>
            <input
              id="business_type"
              name="business_type"
              defaultValue={businessProfile.business_type}
              required
              className="w-full rounded-md border px-3 py-2"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="contact_name" className="text-sm font-medium">
              Contact Name
            </label>
            <input
              id="contact_name"
              name="contact_name"
              defaultValue={businessProfile.contact_name || ""}
              required
              className="w-full rounded-md border px-3 py-2"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="contact_number" className="text-sm font-medium">
              Contact Number
            </label>
            <input
              id="contact_number"
              name="contact_number"
              defaultValue={businessProfile.contact_number || ""}
              className="w-full rounded-md border px-3 py-2"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label htmlFor="business_location" className="text-sm font-medium">
              Business Location
            </label>
            <input
              id="business_location"
              name="business_location"
              defaultValue={businessProfile.business_location}
              required
              className="w-full rounded-md border px-3 py-2"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="city" className="text-sm font-medium">
              City
            </label>
            <input
              id="city"
              name="city"
              defaultValue={businessProfile.city}
              required
              className="w-full rounded-md border px-3 py-2"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="province" className="text-sm font-medium">
              Province
            </label>
            <input
              id="province"
              name="province"
              defaultValue={businessProfile.province}
              required
              className="w-full rounded-md border px-3 py-2"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label htmlFor="region" className="text-sm font-medium">
              Region
            </label>
            <input
              id="region"
              name="region"
              defaultValue={businessProfile.region}
              required
              className="w-full rounded-md border px-3 py-2"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="about" className="text-sm font-medium">
            About
          </label>
          <textarea
            id="about"
            name="about"
            defaultValue={businessProfile.about || ""}
            rows={4}
            className="w-full rounded-md border px-3 py-2"
          />
        </div>
      </section>

      <section className="rounded-xl border bg-black p-5 shadow-sm space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Document Visibility</h2>
          <p className="text-sm text-muted-foreground">
            Choose whether your uploaded certificate can be visible to others later in profile-related views.
          </p>
        </div>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            name="is_visible_to_others"
            defaultChecked={documentVisibility}
          />
          <span className="text-sm">Make certificate visible to others</span>
        </label>
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {isPending ? "Saving..." : "Save Changes"}
        </button>

        <Link href="/buyer/account" className="rounded-md border px-4 py-2">
          Cancel
        </Link>
      </div>
    </form>
  );
}