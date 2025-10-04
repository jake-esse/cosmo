/**
 * Page: Public Offering
 * Purpose: Public-facing offering page without authentication requirements
 * Based on /apps/ampel but without posting capabilities
 */

"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { OverviewTab } from "./components/OverviewTab"
import { EducationTab } from "./components/EducationTab"
import { DiscussionTab } from "./components/DiscussionTab"
import { FloatingNav } from "@/components/landing/FloatingNav"
import { MobileNav } from "@/components/landing/MobileNav"
import { MainNav } from "@/components/landing/MainNav"
import Link from "next/link"

function OfferingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState("overview")

  useEffect(() => {
    const tab = searchParams.get("tab")
    if (tab && ["overview", "education", "discussion"].includes(tab)) {
      setActiveTab(tab)
    }
  }, [searchParams])

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    router.push(`/offering?tab=${tab}`)
  }

  const scrollToOfferingDetails = () => {
    const offeringSection = document.getElementById('offering-details')
    if (offeringSection) {
      offeringSection.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "education", label: "Education" },
    { id: "discussion", label: "Discussion" }
  ]

  return (
    <div className="bg-white min-h-screen">
      {/* Mobile Navigation (visible on mobile only) */}
      <MobileNav />

      {/* Floating Navigation */}
      <FloatingNav />

      {/* Main Container */}
      <div className="relative flex flex-col items-center px-4 md:px-10 pb-5">
        {/* Main Navigation */}
        <div className="w-full max-w-[1200px] mx-auto">
          <MainNav />
        </div>

        {/* Hero Section with modified text */}
        <header className="w-full max-w-[1200px] mx-auto min-h-[720px] md:h-[738px] relative overflow-clip px-4 md:px-0 pt-[120px] md:pt-0">
          {/* Main Headline */}
          <div className="absolute left-1/2 -translate-x-1/2 top-[120px] md:top-[51px] w-full md:w-[1200px] text-center px-4 md:px-0">
            <h1 className="font-brand font-normal text-[60px] md:text-8xl lg:text-[160px] leading-[0.9] tracking-[-1.8px] md:tracking-[-8px] text-black">
              Your AI Company.
            </h1>
          </div>

          {/* Modified Subheadline with scroll button */}
          <div className="absolute left-1/2 -translate-x-1/2 top-[250px] md:top-56 w-full md:w-[1060px] text-center px-4 md:px-0">
            <button
              onClick={scrollToOfferingDetails}
              className="font-sans font-normal text-lg sm:text-xl md:text-[30px] leading-[1.4] tracking-[-0.15px] text-[#6F6F6F] hover:text-[#485C11] transition-colors flex items-center gap-2 mx-auto"
            >
              <svg
                className="w-4 h-4 md:w-6 md:h-6 text-[#485C11]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
              Learn more about Ampel&apos;s equity program.
            </button>
          </div>

          {/* Hero Image with Overlay */}
          <div className="absolute left-0 md:left-0 right-0 md:right-auto top-[390px] md:top-[345px] w-full md:w-[1200px] h-[310px] md:h-[362px] rounded-[20px] md:rounded-[30px] overflow-hidden mx-auto">
            {/* Background Image */}
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: "url('/images/hero-landscape.webp')" }}
            />

            {/* 50% Text Overlay */}
            <div className="absolute left-1/2 -translate-x-1/2 top-[50px] md:top-[89px] z-10">
              <p className="font-brand font-normal text-6xl sm:text-7xl md:text-8xl lg:text-[160px] leading-[0.85] tracking-[-4px] md:tracking-[-8px] text-white text-center whitespace-nowrap">
                50%
              </p>
            </div>

            {/* Bottom Text Overlay */}
            <div className="absolute left-1/2 -translate-x-1/2 top-[160px] md:top-[243px] w-full md:w-[1060px] z-10 px-4 md:px-0">
              <p className="font-sans font-normal text-[18px] md:text-[30px] leading-[1.4] tracking-[-0.15px] text-white text-center">
                Of Ampel&apos;s equity at launch has been allocated to user rewards.
              </p>
            </div>
          </div>
        </header>

        {/* Main Content Section */}
        <main className="w-full flex flex-col items-center">
          {/* Abundance Style Section for Current Offering Content */}
          <div className="w-full max-w-[1200px] mx-auto pb-[30px]" id="offering-details">
            <section className="flex flex-col gap-[50px] pt-20 pb-[30px] border-t-[0.5px] border-[#E9E9E9] relative">
              {/* Regulation Badge - responsive positioning */}
              <span className="self-start md:absolute md:top-20 md:right-0 px-5 py-2 bg-[#DFECC6] text-black rounded-[1000px] font-sans text-[12px] font-semibold">
                Regulation Crowdfunding Offering
              </span>

              {/* Header Text */}
              <div className="flex flex-col gap-[40px] md:gap-[50px] pr-0 md:pr-[400px]">
                <h2 className="font-mono font-normal text-[12px] tracking-[-0.12px] text-[#485C11]">
                  Offering Details
                </h2>
                <p className="font-brand font-normal text-[40px] md:text-[60px] leading-[0.9] tracking-[-1.2px] md:tracking-[-1.8px] text-black">
                  AI Demands a New Kind of Company.
                </p>
                <p className="font-sans font-normal text-[15px] leading-[1.4] tracking-[-0.075px] text-[#6F6F6F]">
                  Ampel offers the only true way to make sure that AI benefits all of humanity. Using regulation crowdfunding, Ampel offers equity to users simply in return for engaging -- signing up, referring friends, subscribing. This aligns our company permanently with the interests of our users. We aim to turn Ampel into a platform allowing any and all companies -- big and small -- to engage their users and customers by offering equity rewards. We envision an economy driven to maximize the financial value that AI is capable of producing because doing so benefits all of humanity.
                </p>
              </div>

              {/* Get Your Shares button in bottom left */}
              <Link
                href="/signup"
                className="px-[22px] py-3.5 bg-[#DFECC6] rounded-[1000px] hover:bg-[#DFECC6]/80 transition-colors inline-block self-start"
              >
                <span className="font-sans font-bold text-[14px] tracking-[-0.35px] text-black">
                  Get Your Shares
                </span>
              </Link>
            </section>
          </div>

          {/* Tab Navigation - Left aligned, no border */}
          <div className="w-full max-w-[1200px] mx-auto bg-white sticky top-0 z-10">
            <nav className="flex space-x-6 md:space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`py-3 px-1 border-b-2 font-sans font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? "border-[#485C11] text-slate-900"
                      : "border-transparent text-slate-500 hover:text-slate-700 hover:border-[#DFECC6]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="w-full max-w-[1200px] mx-auto py-8">
            {activeTab === "overview" && (
              <OverviewTab isPublic={true} />
            )}
            {activeTab === "education" && (
              <EducationTab isPublic={true} />
            )}
            {activeTab === "discussion" && (
              <DiscussionTab isPublic={true} />
            )}
          </div>
        </main>

        {/* Regulatory Footer */}
        <div className="w-full max-w-[1200px] mx-auto py-12 mt-8 border-t border-slate-200">
          <div className="space-y-4 text-xs text-slate-500 leading-relaxed">
            <p className="font-medium text-slate-600">
              Startups are speculative, can be illiquid, and involve a high degree of risk, including the possible loss of your entire investment.
            </p>

            <p>
              This website, which we refer to as the &quot;Site,&quot; is used by two different companies: Loupt Portal LLC and Loupt Offerings LLC.
            </p>

            <p>
              Loupt Offerings LLC offers investments under Rule 506(c) issued by the Securities and Exchange Commission (SEC). These investments are offered to accredited investors only.
            </p>

            <p>
              Loupt Portal LLC is a &quot;funding portal&quot; as defined in section 3(a)(80) of the Securities Exchange Act of 1934. Here, you can review investment opportunities of companies offering securities under section 4(a)(6) of the Securities Act of 1933, also known as Regulation Crowdfunding or Reg CF. These investments are offered to everyone, not just to accredited investors.
            </p>

            <p>
              By using this Site, you are subject to our Terms of Use and our Privacy Policy. Please read these carefully before using the Site.
            </p>

            <p>
              Although our website offers investors the opportunity to invest in a variety of companies, we do not make recommendations regarding the appropriateness of a particular investment opportunity for any particular investor. We are not investment advisers. Investors must make their own investment decisions, either alone or with their personal advisors.
            </p>

            <p>
              You should view all of the investment opportunities on our website as risky. You should consider investing only if you can afford to lose your entire investment.
            </p>

            <p>
              We provide financial projections for some of the investment opportunities listed on the Site. All such financial projections are only estimates based on current conditions and current assumptions. The actual result of any investment is likely to be different than the original projection, often by a large amount.
            </p>

            <p>
              Neither the Securities and Exchange Commission nor any state agency has reviewed the investment opportunities listed on the Site.
            </p>

            <p>
              Thank you for using the Site. If you have questions, please contact us at <a href="mailto:contact@investloupt.com" className="text-slate-600 hover:text-slate-700 underline">contact@investloupt.com</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function OfferingPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OfferingContent />
    </Suspense>
  )
}