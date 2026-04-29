import Image from "next/image";
import Link from "next/link";

const footerGroups = [
  {
    title: "PLATFORM",
    links: [
      { href: "/buyer/search", label: "Browse Suppliers" },
      { href: "/buyer/sourcing-board", label: "Sourcing Board" },
      { href: "/buyer/rfqs", label: "My RFQs" },
    ],
  },
  {
    title: "COMPANY",
    links: [
      { href: "/buyer", label: "About" },
      { href: "/buyer", label: "Contact" },
      { href: "/buyer", label: "Help center" },
    ],
  },
  {
    title: "LEGAL",
    links: [
      { href: "/buyer", label: "Terms Of Service" },
      { href: "/buyer", label: "Privacy Policy" },
    ],
  },
];

export function BuyerFooter() {
  return (
    <footer className="mt-auto bg-[#243f68] text-white">
      <div className="px-8 py-8">
        <div className="flex w-full items-start justify-between gap-12">
          <div className="max-w-[380px]">
            <div className="flex items-center gap-3">
              <Image
                src="/images/kasupply-logo.svg"
                alt="KaSupply logo"
                width={38}
                height={38}
                className="h-10 w-10 rounded-lg border border-white/70 bg-white p-[3px]"
              />
              <div className="text-[20px] font-semibold leading-none">
                KaSupply
              </div>
            </div>

            <p className="mt-3 text-[15px] font-normal leading-6 text-[#BCCBE0]">
              Connecting MSMEs with verified local suppliers across the Davao
              Region.
            </p>
          </div>

          <div className="grid gap-12 sm:grid-cols-3">
            {footerGroups.map((group) => (
              <div key={group.title}>
                <h2 className="text-[14px] font-semibold leading-none text-[#8299B9]">
                  {group.title}
                </h2>

                <div className="mt-3 flex flex-col gap-1.5">
                  {group.links.map((link) => (
                    <Link
                      key={link.label}
                      href={link.href}
                      className="text-[15px] font-normal leading-6 text-[#BCCBE0] transition hover:text-white"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 border-t border-[#56709a]/80" />

        <div className="flex w-full items-center justify-between pt-4 text-[14px] font-normal leading-6 text-[#b4c2d8]">
          <span>© 2026 KaSupply. All Rights Reserved.</span>
          <span>Davao Region, Philippines</span>
        </div>
      </div>
    </footer>
  );
}