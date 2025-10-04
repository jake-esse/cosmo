import Link from "next/link";

export function Hero() {
  return (
    <header className="w-full max-w-[1200px] mx-auto min-h-[500px] md:h-[738px] relative overflow-clip px-4 md:px-0 pt-[120px] md:pt-0">
      {/* Main Headline - Responsive */}
      <div className="absolute left-1/2 -translate-x-1/2 top-[120px] md:top-[51px] w-full md:w-[1200px] text-center px-4 md:px-0">
        <h1 className="font-brand font-normal text-[60px] md:text-8xl lg:text-[160px] leading-[0.9] tracking-[-1.8px] md:tracking-[-8px] text-black">
          Your AI Company.
        </h1>
      </div>

      {/* Subheadline with Chat button - Responsive */}
      <div className="absolute left-1/2 -translate-x-1/2 top-[220px] md:top-[248px] w-full md:w-[1060px] px-4 md:px-0 flex flex-col md:flex-row items-center justify-center gap-4">
        <p className="font-sans font-normal text-[15px] md:text-[30px] leading-[1.4] tracking-[-0.075px] md:tracking-[-0.15px] text-[#6F6F6F] text-center md:text-left">
          Abundance only matters if it&apos;s shared.
        </p>
        <Link
          href="/signup"
          className="px-[22px] py-3.5 bg-[#DFECC6] rounded-[1000px] hover:bg-[#DFECC6]/80 transition-colors whitespace-nowrap"
        >
          <span className="font-sans font-bold text-[14px] tracking-[-0.35px] text-black">
            Chat with Ampel
          </span>
        </Link>
      </div>

      {/* Hero Image with Overlay - Responsive */}
      <div className="absolute left-0 md:left-0 right-0 md:right-auto top-[320px] md:top-[345px] w-full md:w-[1200px] h-[280px] md:h-[362px] rounded-[20px] md:rounded-[30px] overflow-hidden mx-auto">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/images/hero-landscape.webp')" }}
        />
        
        {/* 50% Text Overlay - Responsive */}
        <div className="absolute left-1/2 -translate-x-1/2 top-[60px] md:top-[89px] z-10">
          <p className="font-brand font-normal text-[80px] md:text-8xl lg:text-[160px] leading-[0.9] tracking-[-3.2px] md:tracking-[-8px] text-white text-center whitespace-nowrap">
            50%
          </p>
        </div>

        {/* Bottom Text Overlay - Responsive */}
        <div className="absolute left-1/2 -translate-x-1/2 top-[160px] md:top-[243px] w-full md:w-[1060px] z-10 px-4 md:px-0">
          <p className="font-sans font-normal text-[15px] md:text-[30px] leading-[1.4] tracking-[-0.075px] md:tracking-[-0.15px] text-white text-center">
            Of Ampel&apos;s equity at launch has been allocated to user rewards.
          </p>
        </div>
      </div>
    </header>
  );
}
