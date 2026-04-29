import { RoleSelectionForm } from "./role-selection-form";

export default function Page() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-white px-6 py-8">
      <div className="w-full max-w-[860px] text-center">
       <h1 className="text-[23px] font-semibold leading-none text-[#294773] lg:text-[29px]">
        How will you use KaSupply?
      </h1>
      <p className="mt-1 text-[15px] text-[#8b92a0] lg:text-[22px]">
        Select the option that best describes you
      </p>
        <RoleSelectionForm disabled={false} />
      </div>
    </div>
  );
}
