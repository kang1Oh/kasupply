export default function Loading() {
  return (
    <div className="min-h-svh bg-[#fafbfd] p-6 md:p-10">
      <div className="mx-auto max-w-2xl rounded-[18px] border border-[#edf1f7] bg-white p-6 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
        <div className="animate-pulse space-y-5">
          <div className="mb-6 space-y-2">
            <div className="h-6 w-56 animate-pulse rounded bg-[#e8edf4]" />
            <div className="h-4 w-80 max-w-full animate-pulse rounded bg-[#f3f6fa]" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-40 animate-pulse rounded-xl border border-[#e4e9f1] bg-[#f3f6fa]"
              />
            ))}
          </div>

          <div className="flex justify-end pt-4">
            <div className="h-10 w-32 rounded-lg bg-[#e8edf4]" />
          </div>
        </div>
      </div>
    </div>
  );
}