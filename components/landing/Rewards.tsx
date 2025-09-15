import Link from "next/link";

interface RewardCard {
  amount: string;
  title: string;
  description: string;
}

const rewards: RewardCard[] = [
  {
    amount: "100",
    title: "Signing Up",
    description: "Receive 100 shares of equity in return for simply signing up.",
  },
  {
    amount: "50",
    title: "Referring Friends",
    description: "Receive 50 shares for every friend you refer to Ampel.",
  },
  {
    amount: "25",
    title: "Being Referred",
    description: "Receive 25 shares when you are referred to Ampel by a friend.",
  },
  {
    amount: "200",
    title: "Subscribing",
    description: "Receive 200 shares a month for subscribing to Ampel's pro tier.",
  },
];

export function Rewards() {
  return (
    <section className="w-full max-w-[1200px] mx-auto pb-[120px]">
      <div className="flex flex-col gap-20 pt-20 border-t border-[#E9E9E9]">
        {/* Section Header */}
        <div className="flex items-center justify-between">
          <h2 className="font-brand font-normal text-[60px] leading-[0.9] tracking-[-1.8px] text-black">
            Current Rewards
          </h2>
          <Link
            href="/signup"
            className="px-[22px] py-3.5 bg-[#DFECC6] rounded-[1000px] hover:bg-[#DFECC6]/80 transition-colors"
          >
            <span className="font-sans font-bold text-[14px] tracking-[-0.35px] text-black">
              Get Your Shares
            </span>
          </Link>
        </div>

        {/* Rewards Grid */}
        <div className="flex gap-5">
          {rewards.map((reward, index) => (
            <section
              key={index}
              aria-label={`Step ${index + 1} of 4`}
              className="flex-1 min-w-60 flex flex-col gap-[60px] pt-[60px] pb-5 pr-[30px] border-t border-[#E9E9E9]"
            >
              <p className="font-sans font-normal text-[80px] leading-[1] tracking-[-3.2px] text-[#929292]">
                {reward.amount}
              </p>
              <div className="flex flex-col gap-5">
                <h3 className="font-brand font-normal text-[18px] leading-none tracking-[-0.54px] text-black">
                  {reward.title}
                </h3>
                <p className="font-sans font-normal text-[15px] leading-[1.4] tracking-[-0.075px] text-[#6F6F6F]">
                  {reward.description}
                </p>
              </div>
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}
