import Link from "next/link";
import {
  Bell,
  ClipboardCheck,
  FileText,
  MessageSquare,
  PackageCheck,
  Sparkles,
} from "lucide-react";
import {
  getSupplierNotificationsPageData,
  type SupplierNotificationCategory,
} from "@/lib/supplier/notifications";

const categoryIconMap: Record<SupplierNotificationCategory, typeof Bell> = {
  message: MessageSquare,
  direct_rfq: FileText,
  quotation_reply: ClipboardCheck,
  board_match: Sparkles,
  receipt_received: FileText,
  order_completed: PackageCheck,
};

const categoryColorMap: Record<
  SupplierNotificationCategory,
  {
    iconWrap: string;
    icon: string;
    pill: string;
  }
> = {
  message: {
    iconWrap: "bg-[#EEF4FF]",
    icon: "text-[#2E68F4]",
    pill: "bg-[#E9F1FF] text-[#2E68F4]",
  },
  direct_rfq: {
    iconWrap: "bg-[#FFF4E8]",
    icon: "text-[#F08A24]",
    pill: "bg-[#FFF2E2] text-[#D97706]",
  },
  quotation_reply: {
    iconWrap: "bg-[#FFF1F0]",
    icon: "text-[#E15A4F]",
    pill: "bg-[#FFF0ED] text-[#D14A3F]",
  },
  board_match: {
    iconWrap: "bg-[#FFFBEA]",
    icon: "text-[#D4A017]",
    pill: "bg-[#FFF7D9] text-[#B98900]",
  },
  receipt_received: {
    iconWrap: "bg-[#EEF8F1]",
    icon: "text-[#2F8C57]",
    pill: "bg-[#E8F7ED] text-[#2F8C57]",
  },
  order_completed: {
    iconWrap: "bg-[#EEF8F1]",
    icon: "text-[#1F7A47]",
    pill: "bg-[#E7F7EC] text-[#1F7A47]",
  },
};

export default async function SupplierNotificationsPage() {
  const data = await getSupplierNotificationsPageData();

  return (
    <main className="-m-6 min-h-screen bg-[#F7F9FC]">
      <section className="border-b border-[#E8EDF4] bg-white">
        <div className="flex items-center justify-between px-[18px] py-[15px]">
          <div className="flex items-center gap-2 text-[14px] text-[#A4ACBA]">
            <span className="font-normal">KaSupply</span>
            <span className="text-[#CBD2DE]">/</span>
            <span className="font-medium text-[#1E3A5F]">Notifications</span>
          </div>
        </div>
      </section>

      <section className="border-b border-[#E5EBF3] bg-white">
        <div className="px-[24px] py-[24px] md:px-[32px]">
          <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-[#223654]">
            {data.greeting}
            <span className="ml-[6px]">👋</span>
          </h1>
          <p className="mt-[6px] text-[15px] text-[#94A3B8]">{data.dateLabel}</p>

          {data.items.length > 0 ? (
            <div className="mt-[18px] flex flex-wrap gap-[12px]">
              <div className="rounded-full border border-[#E2E8F0] bg-[#FFF4F0] px-[14px] py-[8px] text-[13px] font-medium text-[#D14A3F]">
                {data.actionableCount} new notification
                {data.actionableCount === 1 ? "" : "s"}
              </div>
              <div className="rounded-full border border-[#E2E8F0] bg-[#FFFBE8] px-[14px] py-[8px] text-[13px] font-medium text-[#B98900]">
                {data.boardMatchCount} new board match
                {data.boardMatchCount === 1 ? "" : "es"}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <div className="px-[24px] py-[24px] md:px-[32px]">
        {data.items.length === 0 ? (
          <section className="rounded-[24px] border border-dashed border-[#D8E2EE] bg-white px-[28px] py-[36px] shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
            <h2 className="text-[18px] font-semibold text-[#223654]">Notifications</h2>
            <p className="mt-[10px] text-[15px] text-[#7C8798]">
              You have no new notifications.
            </p>
          </section>
        ) : (
          <section className="space-y-[16px]">
            {data.items.map((item) => {
              const Icon = categoryIconMap[item.category];
              const styles = categoryColorMap[item.category];

              return (
                <Link
                  key={item.id}
                  href={item.targetHref}
                  className="block rounded-[24px] border border-[#E5EBF3] bg-white px-[20px] py-[20px] shadow-[0_10px_30px_rgba(15,23,42,0.04)] transition hover:border-[#D6E0EC] hover:bg-[#FBFDFF]"
                >
                  <div className="flex items-start gap-[14px]">
                    <div
                      className={`flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[14px] ${styles.iconWrap}`}
                    >
                      <Icon className={`h-[20px] w-[20px] ${styles.icon}`} strokeWidth={1.9} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-[10px]">
                        <span
                          className={`inline-flex items-center rounded-full px-[10px] py-[4px] text-[11px] font-semibold uppercase tracking-[0.04em] ${styles.pill}`}
                        >
                          {item.categoryLabel}
                        </span>
                        <span className="text-[12px] font-medium text-[#9AA4B2]">
                          {item.timeLabel}
                        </span>
                      </div>

                      <h2 className="mt-[10px] text-[18px] font-semibold text-[#304668]">
                        {item.title}
                      </h2>
                      <p className="mt-[6px] max-w-[880px] text-[14px] leading-[1.7] text-[#66758A]">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}
