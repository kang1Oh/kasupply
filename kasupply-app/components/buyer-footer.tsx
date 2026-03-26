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
    <footer className="mt-auto border-t border-[#3a557f] bg-[#243f68] text-white">
      <div className="flex w-full flex-col gap-7 px-6 py-5 sm:px-7 lg:flex-row lg:justify-between lg:px-8">
        <div className="max-w-[265px]">
          <div className="flex items-center gap-2">
            <Image
              src="/images/kasupply-logo.svg"
              alt="KaSupply logo"
              width={22}
              height={22}
              className="h-[22px] w-[22px] rounded-[4px] bg-white p-[3px]"
            />
            <div className="text-[15px] font-semibold">KaSupply</div>
          </div>

          <p className="mt-3 text-[12px] leading-5 text-[#d3ddec]">
            Connecting MSMEs with verified local suppliers across the Davao Region.
          </p>
        </div>

        <div className="grid gap-7 sm:grid-cols-3">
          {footerGroups.map((group) => (
            <div key={group.title}>
              <h2 className="text-[10px] font-semibold tracking-[0.16em] text-[#b4c2d8]">
                {group.title}
              </h2>
              <div className="mt-2.5 flex flex-col gap-1.5">
                {group.links.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="text-[12px] text-[#e7eef8] transition hover:text-white"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex w-full items-center justify-between border-t border-[#56709a] px-6 py-3 text-[11px] text-[#b4c2d8] sm:px-7 lg:px-8">
        <span>© 2026 KaSupply. All Rights Reserved.</span>
        <span>Davao Region, Philippines</span>
      </div>
    </footer>
  );
}
