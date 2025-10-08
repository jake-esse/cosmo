/**
 * Component: EducationTab
 * Purpose: Educational materials about the offering
 * Regulatory Requirement: SEC investor education requirements
 * State: Manages accordion sections and completion checkbox
 */

import { useState, useEffect } from "react"

export function EducationTab() {
  const [openSections, setOpenSections] = useState<string[]>(['how'])
  const [hasReviewed, setHasReviewed] = useState(false)
  
  useEffect(() => {
    const reviewed = localStorage.getItem('ampel_education_reviewed') === 'true'
    setHasReviewed(reviewed)
  }, [])
  
  const toggleSection = (sectionId: string) => {
    setOpenSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    )
  }
  
  const handleReviewedChange = (checked: boolean) => {
    setHasReviewed(checked)
    localStorage.setItem('ampel_education_reviewed', checked.toString())
  }
  
  const handleSubmit = () => {
    if (hasReviewed) {
      alert('Thank you for reviewing the educational materials. You may now proceed to claim your shares.')
    }
  }
  
  const sections = [
    {
      id: 'how',
      title: 'How Equity Incentives Work',
      content: (
        <div className="space-y-3 text-slate-800">
          <p><strong>Sign-up Bonus (100 shares):</strong> When you create an account and verify your email, you&apos;ll receive 100 shares of Ampel common stock automatically.</p>
          <p><strong>Referral Rewards (50 shares):</strong> Share your unique referral link with friends. When they sign up and verify, both you and your friend earn equity.</p>
          <p><strong>Future Rewards:</strong> As we launch AI apps on the platform, you&apos;ll earn additional shares for using apps, providing feedback, and contributing to the community.</p>
          <p className="text-sm text-slate-600 italic">Note: All shares are subject to a 1-year holding period per SEC regulations.</p>
        </div>
      )
    },
    {
      id: 'risks',
      title: 'Understanding the Risks',
      content: (
        <div className="space-y-3 text-slate-800">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="font-semibold text-red-900 mb-2">Investment risks include but are not limited to:</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-red-800">
              <li>Ampel is pre-revenue and may never achieve profitability</li>
              <li>Your shares may become worthless</li>
              <li>There is no guarantee of future liquidity or trading markets</li>
              <li>Startup investments are highly risky and speculative</li>
              <li>You may lose your entire investment</li>
            </ul>
          </div>
          <p className="text-sm">This is a high-risk investment. Only participate if you can afford to lose your entire investment.</p>
        </div>
      )
    },
    {
      id: 'resale',
      title: 'Resale Restrictions',
      content: (
        <div className="space-y-3 text-slate-800">
          <p><strong>1-Year Holding Period:</strong> Per SEC Rule 501(d), you cannot sell or transfer your shares for 12 months from the date of acquisition.</p>
          <p><strong>No Current Market:</strong> There is currently no public market for Ampel shares, and one may never develop.</p>
          <p><strong>Future Liquidity Plans:</strong> We plan to explore secondary market options after the holding period, but cannot guarantee any liquidity opportunities.</p>
          <p><strong>Transfer Restrictions:</strong> Even after the holding period, transfers may be subject to additional restrictions and company approval.</p>
        </div>
      )
    },
    {
      id: 'security',
      title: 'Your Security Type',
      content: (
        <div className="space-y-3 text-slate-800">
          <p><strong>Security:</strong> Non-voting Common Stock</p>
          <p><strong>Par Value:</strong> $0.00001 per share</p>
          <p><strong>Voting Rights:</strong> None - these are non-voting shares</p>
          <p><strong>Dividend Rights:</strong> Pro-rata participation if dividends are declared</p>
          <p><strong>Liquidation Rights:</strong> Pro-rata participation after preferred stockholders</p>
          <div className="mt-4 p-3 bg-[#DFECC6]/30 rounded-[20px]">
            <a href="#" className="text-[#3985AB] hover:text-[#3985AB]/80 font-medium">
              Download Stock Purchase Agreement (PDF)
            </a>
          </div>
        </div>
      )
    }
  ]
  
  return (
    <div className="space-y-4">
      {/* Important Notice - Moved to top */}
      <div className="bg-[#DFECC6]/30 border border-[#DFECC6]/50 rounded-[20px] p-6">
        <div>
          <p className="font-sans font-semibold text-slate-900 mb-1">Important Notice</p>
          <p className="font-sans text-body-sm text-slate-700">
            Please read all educational materials carefully before participating in this offering. 
            This is a speculative investment with significant risks. Consult with your financial 
            advisor if you have questions.
          </p>
        </div>
      </div>
      
      {/* Confirmation Checkbox - Emphasized with dark background */}
      <div className="bg-[#485C11] text-white rounded-[30px] p-8">
        <div className="space-y-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={hasReviewed}
              onChange={(e) => handleReviewedChange(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-[#DFECC6]/40 bg-white/10 text-[#DFECC6] focus:ring-[#DFECC6]"
            />
            <span className="font-sans text-body-sm text-[#DFECC6]/90">
              I have reviewed and understand all educational materials, including the risks, 
              restrictions, and terms of this equity incentive program.
            </span>
          </label>
          <button
            onClick={handleSubmit}
            disabled={!hasReviewed}
            className={`w-full px-6 py-3 rounded-[1000px] font-sans font-semibold transition-all ${
              hasReviewed 
                ? 'bg-[#DFECC6] text-[#485C11] hover:bg-[#DFECC6]/90' 
                : 'bg-white/20 text-white/40 cursor-not-allowed'
            }`}
          >
            Submit
          </button>
        </div>
      </div>
      
      {/* Educational Sections */}
      <div className="space-y-3">
        {sections.map((section) => (
          <div key={section.id} className="bg-white rounded-[20px] border border-[#B0C4C9]/40 p-6">
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full flex items-center justify-between text-left"
            >
              <h3 className="font-brand text-lg text-slate-900">{section.title}</h3>
              <span className={`text-slate-400 transition-transform ${
                openSections.includes(section.id) ? 'rotate-180' : ''
              }`}>
                ▼
              </span>
            </button>
            {openSections.includes(section.id) && (
              <div className="mt-4 pt-4 border-t border-[#B0C4C9]/20">
                {section.content}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}