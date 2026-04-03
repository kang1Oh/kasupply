import Image from "next/image";

export function TrashCanModalIcon({
  size = 50,
}: {
  size?: number;
}) {
  return (
    <Image
      src="/icons/trash-can.svg"
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className="block"
    />
  );
}
