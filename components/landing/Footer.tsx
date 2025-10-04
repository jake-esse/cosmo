"use client";

import Image from "next/image";
import Link from "next/link";

export function Footer() {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <footer className="w-full max-w-[1200px] mx-auto pt-[40px] md:pt-10 pb-5 border-t border-[#E9E9E9]" id="developers">
      <div className="flex flex-col gap-[80px] md:gap-20">
        {/* Links */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between h-auto md:h-10 gap-[27px] md:gap-0">
          <div className="flex flex-col md:flex-row md:items-center gap-[27px]">
            <button
              onClick={() => scrollToSection("offering")}
              className="font-sans font-bold text-[14px] tracking-[-0.35px] text-black hover:text-[#485C11] transition-colors"
            >
              Offering
            </button>
            <button
              onClick={() => scrollToSection("developers")}
              className="font-sans font-bold text-[14px] tracking-[-0.35px] text-black hover:text-[#485C11] transition-colors"
            >
              Developers
            </button>
            <Link
              href="/login"
              className="font-sans font-bold text-[14px] tracking-[-0.35px] text-black hover:text-[#485C11] transition-colors"
            >
              Log In
            </Link>
            <Link
              href="/compliance-portal"
              className="font-sans font-bold text-[14px] tracking-[-0.35px] text-[#485C11]/60 hover:text-[#485C11] transition-colors"
            >
              Compliance
            </Link>
          </div>
        </div>

        {/* Credits */}
        <div className="flex flex-col md:flex-row md:items-end gap-[40px] md:gap-10">
          <Image
            src="/images/ampel-logo.svg"
            alt="Ampel"
            width={50}
            height={49}
            className="h-[49px] w-[50px] md:h-[49px] md:w-[50px]"
          />
          <div className="flex-1 flex items-center gap-4 font-mono font-normal text-[12px] tracking-[-0.12px] text-[#485C11]">
            <span>© Ampel.</span>
            <span>2025</span>
          </div>
          <span className="font-mono font-normal text-[12px] tracking-[-0.12px] text-[#485C11]">
            All Rights Reserved
          </span>
        </div>
      </div>
    </footer>
  );
}
