import Image from "next/image";
import Link from "next/link";

const footerGroups = [
  {
    title: "PLATFORM",
    links: [
      { href: "/buyer/search", label: "Browse Suppliers" },
      { href: "/buyer/sourcing-board", label: "Sourcing Board" },
      { href: "/buyer/rfqs/new", label: "Post an RFQ" },
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
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-7 px-3 py-5 sm:px-4 lg:flex-row lg:justify-between lg:px-5">
        <div className="max-w-[265px]">
          <div className="flex items-center gap-2">
            <Image
              src="/images/kasupply-logo.svg"
              alt="KaSupply logo"
              width={22}
              height={22}
              className="h-[22px] w-[22px] rounded-[4px] bg-white p-[3px]"
            />
            <div className="text-[14px] font-semibold">KaSupply</div>
          </div>

          <p className="mt-3 text-[11px] leading-5 text-[#d3ddec]">
            Connecting MSMEs with verified local suppliers across the Davao Region.
          </p>

          <p className="mt-5 text-[10px] text-[#b4c2d8]">
            © 2026 KaSupply. All Rights Reserved.
          </p>
        </div>

        <div className="grid gap-7 sm:grid-cols-3">
          {footerGroups.map((group) => (
            <div key={group.title}>
              <h2 className="text-[9px] font-semibold tracking-[0.16em] text-[#b4c2d8]">
                {group.title}
              </h2>
              <div className="mt-2.5 flex flex-col gap-1.5">
                {group.links.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="text-[11px] text-[#e7eef8] transition hover:text-white"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-[1180px] justify-end border-t border-[#56709a] px-3 py-3 text-[10px] text-[#b4c2d8] sm:px-4 lg:px-5">
        Davao Region, Philippines
      </div>
    </footer>
  );
}
