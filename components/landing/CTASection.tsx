import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "./icons";

export function CTASection() {
  return (
    <>
      {/* Hero Image */}
      <div className="w-full max-w-[1200px] mx-auto pb-[40px] md:pb-10">
        <div className="relative w-full aspect-[1120/620] rounded-[30px] overflow-hidden">
          <Image
            src="/images/mountain-path.webp"
            alt="Image showing a winding path going up a mountain"
            fill
            className="object-cover"
            priority
          />
        </div>
      </div>

      {/* CTA Content */}
      <section className="w-full max-w-[1200px] mx-auto px-4 md:px-[300px] py-[80px] md:py-[120px] border-t-[0.5px] border-[#E9E9E9]">
        <div className="flex flex-col items-center gap-[40px] md:gap-10">
          <h2 className="font-brand font-normal text-[60px] leading-[0.9] tracking-[-1.8px] text-black text-center">
            Join the Movement
          </h2>
          <p className="font-sans font-normal text-[15px] leading-[1.4] tracking-[-0.075px] text-[#6F6F6F] text-center">
            Create your account to get started.
          </p>
          <Link
            href="/signup"
            className="w-full md:w-auto flex items-center justify-center gap-0.5 px-[22px] py-3.5 bg-[#485C11] rounded-[1000px] text-white hover:bg-[#485C11]/90 transition-colors"
          >
            <span className="font-sans font-bold text-[14px] tracking-[-0.35px]">Sign Up</span>
            <ArrowUpRight className="w-[7px] h-[6px]" />
          </Link>
        </div>
      </section>
    </>
  );
}
