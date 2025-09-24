import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "./icons";

export function MainNav() {
  return (
    <nav className="w-full h-[148px] relative">
      {/* Logo and Ampel text as clickable link - aligned with Sign Up button */}
      <Link href="/" className="absolute left-0 top-[30px] flex items-center hover:opacity-90 transition-opacity">
        <Image
          src="/images/ampel-logo.svg"
          alt="Ampel"
          width={32}
          height={31}
          className="h-[31px] w-8"
        />
        <span className="font-sans font-medium text-[30px] text-black tracking-[-1.5px] leading-[31px] mt-[2px] -ml-[5px]" style={{ transform: 'translateY(0.5px)' }}>
          Ampel
        </span>
      </Link>

      {/* Sign Up button - green background */}
      <Link
        href="/signup"
        className="absolute right-0 top-[30px] flex items-center gap-0.5 px-[22px] py-3.5 bg-[#485C11] rounded-[1000px] text-white hover:bg-[#485C11]/90 transition-colors"
      >
        <span className="font-sans font-bold text-[14px] tracking-[-0.35px]">Sign Up</span>
        <ArrowUpRight className="w-[7px] h-[6px]" />
      </Link>
    </nav>
  );
}
