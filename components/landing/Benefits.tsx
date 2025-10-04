interface BenefitCard {
  title: string;
  description: string;
}

const benefits: BenefitCard[] = [
  {
    title: "Why we're sharing ownership",
    description: "AI is changing the world faster than anyone expected. Equity rewards make sure that the growth benefits everyone and keeps us accountable.",
  },
  {
    title: "Every AI company should",
    description: "AI has made software development easier than ever, but user acquisition is still as expensive. Equity rewards drive cost-effective user engagement.",
  },
  {
    title: "How do we do it?",
    description: "Regulation crowdfunding allows us to offer equity to users, regardless of income or financial status, in return for the value you create.",
  },
  {
    title: "About more than money",
    description: "We see user equity ownership as a catalyst for more meaningful relationships between technology companies and their users.",
  },
];

export function Benefits() {
  return (
    <div className="w-full max-w-[1200px] mx-auto pb-[80px] md:pb-[120px]" id="offering">
      <section className="flex flex-col gap-[50px] pt-[80px] md:pt-20 pb-[60px] border-t-[0.5px] border-[#E9E9E9]">
        {/* Header Text */}
        <div className="flex flex-col gap-[30px] md:gap-[50px] pr-0 md:pr-[400px]">
          <h2 className="font-mono font-normal text-[12px] tracking-[-0.12px] text-[#485C11]">
            Abundance
          </h2>
          <p className="font-brand font-normal text-[60px] leading-[0.9] tracking-[-1.8px] text-black">
            A new kind of company.
          </p>
          <p className="font-sans font-normal text-[15px] leading-[1.4] tracking-[-0.075px] text-[#6F6F6F]">
            We see user and customer ownership as an important aspect of the coming AI economy.
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="flex flex-col md:flex-row md:flex-wrap gap-5 pt-[40px] md:pt-10">
          {benefits.map((benefit, index) => (
            <section
              key={index}
              aria-label={`Area product benefit ${index + 1} of 4`}
              className="flex-1 min-w-[265px] flex flex-col gap-5 md:gap-6 py-[40px] md:py-10 pr-0 md:pr-5 border-t border-[#E9E9E9]"
            >
              <div className="flex flex-col gap-5">
                <h3 className="font-brand font-normal text-[18px] leading-none tracking-[-0.54px] text-black">
                  {benefit.title}
                </h3>
                <p className="font-sans font-normal text-[15px] leading-[1.4] tracking-[-0.075px] text-[#6F6F6F]">
                  {benefit.description}
                </p>
              </div>
            </section>
          ))}
        </div>
      </section>
    </div>
  );
}
