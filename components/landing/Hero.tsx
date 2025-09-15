export function Hero() {
  return (
    <header className="w-full max-w-[1200px] mx-auto h-[738px] relative overflow-clip">
      {/* Main Headline - Crimson Text, 160px, black */}
      <div className="absolute left-1/2 -translate-x-1/2 top-[51px] w-[1200px] text-center">
        <h1 className="font-brand font-normal text-[160px] leading-[0.85] tracking-[-8px] text-black">
          Your AI Company.
        </h1>
      </div>

      {/* Subheadline - DM Sans, 30px, gray */}
      <div className="absolute left-1/2 -translate-x-1/2 top-56 w-[1060px] text-center">
        <p className="font-sans font-normal text-[30px] leading-[1.4] tracking-[-0.15px] text-[#6F6F6F]">
          Abundance only matters if it&apos;s shared.
        </p>
      </div>

      {/* Hero Image with Overlay */}
      <div className="absolute left-0 top-[345px] w-[1200px] h-[362px] rounded-[30px] overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/images/hero-landscape.png')" }}
        />
        
        {/* 50% Text Overlay - Crimson Text, 160px, white */}
        <div className="absolute left-1/2 -translate-x-1/2 top-[89px] z-10">
          <p className="font-brand font-normal text-[160px] leading-[0.85] tracking-[-8px] text-white text-center whitespace-nowrap">
            50%
          </p>
        </div>
        
        {/* Bottom Text Overlay - DM Sans, 30px, white */}
        <div className="absolute left-1/2 -translate-x-1/2 top-[243px] w-[1060px] z-10">
          <p className="font-sans font-normal text-[30px] leading-[1.4] tracking-[-0.15px] text-white text-center">
            Of Ampel&apos;s equity at launch has been allocated to user rewards.
          </p>
        </div>
      </div>
    </header>
  );
}
