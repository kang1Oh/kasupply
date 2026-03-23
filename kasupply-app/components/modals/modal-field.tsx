type ModalFieldProps = {
  label: string;
  children: React.ReactNode;
};

export function ModalField({ label, children }: ModalFieldProps) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}
