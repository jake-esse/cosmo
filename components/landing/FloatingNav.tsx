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
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
      <nav className="flex items-center gap-[27px] px-6 py-5 bg-white/40 backdrop-blur-[15px] rounded-[100px]">
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
      </nav>
    </div>
  );
}
