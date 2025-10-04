import Link from "next/link";

const steps = [
  "To create an account, you will have to verify your identity.",
  "Next, you will be asked to review some educational materials.",
  "After reviewing the materials, you will agree to receive the shares.",
  "The shares you receive live in your Ampel account.",
];

export function HowItWorks() {
  return (
    <section className="w-full max-w-[1200px] mx-auto pb-[80px] md:pb-[120px] flex flex-col md:flex-row gap-5">
      {/* Left side - Text and List */}
      <div className="flex-1 flex flex-col gap-[40px] md:gap-10 pt-[80px] md:pt-[60px] pb-[80px] md:pb-20 border-t border-[#E9E9E9]">
        {/* Title */}
        <div className="flex flex-col gap-[40px] md:gap-10 pr-0 md:pr-20">
          <h2 className="font-brand font-normal text-[60px] leading-[0.9] tracking-[-1.8px] text-black">
            How It Works
          </h2>
          <p className="font-sans font-normal text-[15px] leading-[1.4] tracking-[-0.075px] text-[#6F6F6F]">
            Ampel rewards users for simple engagement. All you have to do is sign up, and review some information.
          </p>
        </div>

        {/* Numbered List */}
        <div className="flex flex-col">
          {steps.map((step, index) => (
            <section
              key={index}
              aria-label={`Area value prop ${index + 1} of 4`}
              className="flex gap-[30px] py-[20px] md:py-5 pr-0 md:pr-20 border-t border-[#E9E9E9]"
            >
              <span className="font-sans font-bold text-[15px] leading-[1.4] tracking-[-0.075px] text-[#6F6F6F]">
                0{index + 1}
              </span>
              <p className="flex-1 font-sans font-normal text-[15px] leading-[1.4] tracking-[-0.075px] text-black">
                {step}
              </p>
            </section>
          ))}
        </div>

        {/* CTA Button - Light green */}
        <Link
          href="/signup"
          className="self-start px-[22px] py-3.5 bg-[#DFECC6] rounded-[1000px] hover:bg-[#DFECC6]/80 transition-colors"
        >
          <span className="font-sans font-bold text-[14px] tracking-[-0.35px] text-black">
            Get Started
          </span>
        </Link>
      </div>

      {/* Right side - Green Feature Card */}
      <div className="flex-1 relative h-[400px] md:h-[711px] max-w-full md:max-w-[590px]">
        <div className="absolute inset-0 bg-[#485C11] rounded-[30px] flex items-center justify-center px-[35px]">
          <p className="font-brand font-normal text-[60px] leading-[0.9] tracking-[-1.8px] text-white text-center max-w-[521px]">
            AI is changing the world. We&apos;re making sure it benefits everyone.
          </p>
        </div>
      </div>
    </section>
  );
}
