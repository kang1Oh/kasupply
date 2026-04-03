import Image from "next/image";

export function CheckMarkModalIcon({
  size = 50,
}: {
  size?: number;
}) {
  return (
    <Image
      src="/icons/check-mark.svg"
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className="block"
    />
  );
}
