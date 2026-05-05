import { notFound } from "next/navigation";
import { QrDebugTool } from "@/components/qr-debug-tool";

function qrDebugEnabled() {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.ENABLE_QR_DEBUG_TOOL === "true"
  );
}

export default function QrDebugPage() {
  if (!qrDebugEnabled()) {
    notFound();
  }

  return (
    <div className="min-h-svh bg-[#f7f8fb] px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <QrDebugTool />
      </div>
    </div>
  );
}
