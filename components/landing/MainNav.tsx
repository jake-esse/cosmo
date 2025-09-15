import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "./icons";

export function MainNav() {
  return (
    <nav className="w-full h-[148px] relative">
      {/* Logo positioned absolutely */}
      <Image
        src="/images/ampel-logo.svg"
        alt="Ampel"
        width={32}
        height={31}
        className="absolute left-0 top-[27px] h-[31px] w-8"
      />
      
      {/* Ampel text positioned absolutely */}
      <span className="absolute left-[27px] top-11 -translate-y-1/2 font-sans font-medium text-[30px] text-black tracking-[-1.5px]">
        Ampel
      </span>
      
      {/* Sign Up button - green background */}
      <Link
        href="/signup"
        className="absolute right-0 top-5 flex items-center gap-0.5 px-[22px] py-3.5 bg-[#485C11] rounded-[1000px] text-white hover:bg-[#485C11]/90 transition-colors"
      >
        <span className="font-sans font-bold text-[14px] tracking-[-0.35px]">Sign Up</span>
        <ArrowUpRight className="w-[7px] h-[6px]" />
      </Link>
    </nav>
  );
}
