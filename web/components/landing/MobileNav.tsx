"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "./icons";

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setIsOpen(false);
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/40 backdrop-blur-[15px] shadow-[0px_2px_4px_0px_rgba(0,0,0,0.05)] rounded-bl-[20px] rounded-br-[20px] md:hidden">
      {/* Top Nav Bar */}
      <div className="flex items-start justify-between px-5 pt-5 pb-5">
        {/* Logo */}
        <Link href="/" className="flex items-center hover:opacity-90 transition-opacity">
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

        {/* Hamburger Menu Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-6 h-6 flex flex-col justify-center items-center gap-[5px]"
          aria-label={isOpen ? "Close menu" : "Open menu"}
        >
          <span className={`w-6 h-0.5 bg-black transition-all ${isOpen ? 'rotate-45 translate-y-[7px]' : ''}`} />
          <span className={`w-6 h-0.5 bg-black transition-all ${isOpen ? 'opacity-0' : ''}`} />
          <span className={`w-6 h-0.5 bg-black transition-all ${isOpen ? '-rotate-45 -translate-y-[7px]' : ''}`} />
        </button>
      </div>

      {/* Dropdown Menu */}
      <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-[500px]' : 'max-h-0'}`}>
        <div className="flex flex-col gap-[50px] px-5 pt-2 pb-8">
          {/* Menu Items */}
          <div className="flex flex-col">
            <Link
              href="/offering"
              className="border-t border-[#E9E9E9] py-[30px] font-sans font-bold text-[14px] tracking-[-0.35px] text-black"
              onClick={() => setIsOpen(false)}
            >
              Offering
            </Link>
            <button
              onClick={() => scrollToSection("developers")}
              className="border-t border-[#E9E9E9] py-[30px] font-sans font-bold text-[14px] tracking-[-0.35px] text-black text-left"
            >
              Developers
            </button>
            <Link
              href="/login"
              className="border-t border-[#E9E9E9] py-[30px] font-sans font-bold text-[14px] tracking-[-0.35px] text-black"
              onClick={() => setIsOpen(false)}
            >
              Log In
            </Link>
          </div>

          {/* CTA Button */}
          <Link
            href="/signup"
            className="flex items-center justify-center gap-0.5 px-[22px] py-3.5 bg-[#485C11] rounded-[1000px] text-white hover:bg-[#485C11]/90 transition-colors"
            onClick={() => setIsOpen(false)}
          >
            <span className="font-sans font-bold text-[14px] tracking-[-0.35px]">Sign Up</span>
            <ArrowUpRight className="w-[7px] h-[6px]" />
          </Link>
        </div>
      </div>
    </nav>
  );
}
