export default function LoadingBuyerAccountPage() {
  return (
    <main className="min-h-screen bg-[#fafbfd] px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-5xl rounded-[18px] border border-[#edf1f7] bg-white p-8 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
        <div className="animate-pulse space-y-5">
          <div className="mb-6 space-y-2">
            <div className="h-9 w-72 rounded-md bg-[#e8edf4]" />
            <div className="h-4 w-80 rounded-md bg-[#f3f6fa]" />
          </div>

          <div className="h-5 w-full rounded-md bg-[#f3f6fa]" />
          <div className="h-[520px] rounded-[14px] bg-[#fafbfd]" />
        </div>
      </div>
    </main>
  );
}
