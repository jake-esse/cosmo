/**
 * Page: Ampel Offering
 * Purpose: Main offering page combining all components
 * Regulatory Requirement: Complete Regulation CF offering presentation
 * State: Manages active tab and modal state
 */

"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { PageLayout } from "@/components/layout/PageLayout"
import { OverviewTab } from "./components/OverviewTab"
import { EducationTab } from "./components/EducationTab"
import { DiscussionTab } from "./components/DiscussionTab"
import { VerificationModal } from "./components/VerificationModal"

export default function AmpelOfferingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState("overview")
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false)
  
  useEffect(() => {
    const tab = searchParams.get("tab")
    if (tab && ["overview", "education", "discussion"].includes(tab)) {
      setActiveTab(tab)
    }
  }, [searchParams])
  
  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    router.push(`/apps/ampel?tab=${tab}`)
  }
  
  const handleClaimShares = () => {
    setIsVerificationModalOpen(true)
  }
  
  const handleVerificationComplete = () => {
    setIsVerificationModalOpen(false)
    // In production, this would trigger the actual share distribution
    alert("Congratulations! Your shares have been claimed. You'll receive an email confirmation shortly.")
  }
  
  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "education", label: "Education" },
    { id: "discussion", label: "Discussion" }
  ]
  
  return (
    <>
      <PageLayout pageName="Ampel Offering" titleClassName="tracking-[-0.3px]">
        <div className="h-full flex flex-col">
          {/* Fixed Header Section - Company Info and Tabs */}
          <div className="flex-shrink-0">
            {/* Company Info */}
            <div className="px-8 py-6 border-b border-[#B0C4C9]/40">
              <div className="max-w-6xl mx-auto flex items-center justify-between">
                <div>
                  <h1 className="font-brand text-2xl text-slate-900">Ampel</h1>
                  <p className="font-sans text-body-md text-slate-600">AI App Store Platform</p>
                </div>
                <span className="px-5 py-2 bg-[#DFECC6] text-[#485C11] rounded-[1000px] font-sans text-label-md font-semibold">
                  Regulation Crowdfunding Offering
                </span>
              </div>
            </div>
            
            {/* Tab Navigation - Sticky */}
            <div className="px-8 border-b border-[#B0C4C9]/40 bg-white">
              <div className="max-w-6xl mx-auto">
                <nav className="-mb-px flex space-x-6 md:space-x-8">
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
            </div>
          </div>
          
          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto">
            {/* Hero Section - Dark with light text in bounded box */}
            <div className="px-8 py-8">
              <div className="max-w-6xl mx-auto">
                <div className="bg-[#485C11] rounded-[30px] p-8 md:p-12">
                  <h2 className="font-brand text-3xl md:text-4xl text-white mb-4">
                    Own a Piece of the AI Revolution
                  </h2>
                  <p className="font-sans text-lg text-[#DFECC6]/90 mb-6 max-w-2xl leading-relaxed">
                    Ampel is the first app store where users earn equity just by participating. 
                    No investment required - earn shares through engagement.
                  </p>
                  <button
                    onClick={handleClaimShares}
                    className="px-6 py-3 bg-[#DFECC6] text-[#485C11] rounded-[1000px] font-sans font-semibold hover:bg-[#DFECC6]/90 transition-all shadow-sm"
                  >
                    Claim Your Shares
                  </button>
                </div>
              </div>
            </div>
            
            {/* Tab Content */}
            <div className="max-w-6xl mx-auto px-8 py-6">
              {activeTab === "overview" && (
                <OverviewTab />
              )}
              {activeTab === "education" && (
                <EducationTab />
              )}
              {activeTab === "discussion" && (
                <DiscussionTab />
              )}
            </div>

            {/* Regulatory Footer */}
            <div className="max-w-6xl mx-auto px-8 py-12 mt-8 border-t border-slate-200">
              <div className="space-y-4 text-xs text-slate-500 leading-relaxed">
                <p className="font-medium text-slate-600">
                  Startups are speculative, can be illiquid, and involve a high degree of risk, including the possible loss of your entire investment.
                </p>

                <p>
                  This website, which we refer to as the "Site," is used by two different companies: Loupt Portal LLC and Loupt Offerings LLC.
                </p>

                <p>
                  Loupt Offerings LLC offers investments under Rule 506(c) issued by the Securities and Exchange Commission (SEC). These investments are offered to accredited investors only.
                </p>

                <p>
                  Loupt Portal LLC is a "funding portal" as defined in section 3(a)(80) of the Securities Exchange Act of 1934. Here, you can review investment opportunities of companies offering securities under section 4(a)(6) of the Securities Act of 1933, also known as Regulation Crowdfunding or Reg CF. These investments are offered to everyone, not just to accredited investors.
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
      </PageLayout>
      
      {/* Verification Modal */}
      <VerificationModal
        isOpen={isVerificationModalOpen}
        onClose={() => setIsVerificationModalOpen(false)}
        onConfirm={handleVerificationComplete}
      />
    </>
  )
}