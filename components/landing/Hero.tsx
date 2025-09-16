export function Hero() {
  return (
    <header className="w-full max-w-[1200px] mx-auto min-h-[500px] md:h-[738px] relative overflow-clip px-4 md:px-0">
      {/* Main Headline - Responsive */}
      <div className="absolute left-1/2 -translate-x-1/2 top-[30px] md:top-[51px] w-full md:w-[1200px] text-center">
        <h1 className="font-brand font-normal text-5xl sm:text-6xl md:text-8xl lg:text-[160px] leading-[0.85] tracking-[-2px] md:tracking-[-8px] text-black">
          Your AI Company.
        </h1>
      </div>

      {/* Subheadline - Responsive */}
      <div className="absolute left-1/2 -translate-x-1/2 top-32 md:top-56 w-full md:w-[1060px] text-center px-4 md:px-0">
        <p className="font-sans font-normal text-lg sm:text-xl md:text-[30px] leading-[1.4] tracking-[-0.15px] text-[#6F6F6F]">
          Abundance only matters if it&apos;s shared.
        </p>
      </div>

      {/* Hero Image with Overlay - Responsive */}
      <div className="absolute left-0 md:left-0 right-0 md:right-auto top-[200px] md:top-[345px] w-full md:w-[1200px] h-[250px] md:h-[362px] rounded-[20px] md:rounded-[30px] overflow-hidden mx-auto">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/images/hero-landscape.png')" }}
        />
        
        {/* 50% Text Overlay - Responsive */}
        <div className="absolute left-1/2 -translate-x-1/2 top-[50px] md:top-[89px] z-10">
          <p className="font-brand font-normal text-6xl sm:text-7xl md:text-8xl lg:text-[160px] leading-[0.85] tracking-[-4px] md:tracking-[-8px] text-white text-center whitespace-nowrap">
            50%
          </p>
        </div>
        
        {/* Bottom Text Overlay - Responsive */}
        <div className="absolute left-1/2 -translate-x-1/2 top-[140px] md:top-[243px] w-full md:w-[1060px] z-10 px-4 md:px-0">
          <p className="font-sans font-normal text-base sm:text-lg md:text-[30px] leading-[1.4] tracking-[-0.15px] text-white text-center">
            Of Ampel&apos;s equity at launch has been allocated to user rewards.
          </p>
        </div>
      </div>
    </header>
  );
}
