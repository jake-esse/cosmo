"use client";

import Link from "next/link";

export function FloatingNav() {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="hidden md:block fixed top-4 left-1/2 -translate-x-1/2 z-50">
      <nav className="flex items-center gap-[27px] px-6 py-5 bg-white/40 backdrop-blur-[15px] rounded-[100px]">
        <Link
          href="/offering"
          className="font-sans font-bold text-[14px] tracking-[-0.35px] text-black hover:text-[#485C11] transition-colors"
        >
          Offering
        </Link>
        <Link
          href="/developers"
          className="font-sans font-bold text-[14px] tracking-[-0.35px] text-black hover:text-[#485C11] transition-colors"
        >
          Developers
        </Link>
        <Link
          href="/login"
          className="font-sans font-bold text-[14px] tracking-[-0.35px] text-black hover:text-[#485C11] transition-colors"
        >
          Log In
        </Link>
      </nav>
    </div>
  );
}
