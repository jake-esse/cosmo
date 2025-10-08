/**
 * Component: OverviewTab
 * Purpose: Display offering overview, incentives, stats, and company info
 * Regulatory Requirement: Clear presentation of offering terms and company details
 * State: Manages accordion sections
 */

import { useState, useEffect } from "react"

export function OverviewTab() {
  const [daysRemaining, setDaysRemaining] = useState(0)
  const [openSections, setOpenSections] = useState<string[]>(['details', 'incentives', 'stats'])
  
  useEffect(() => {
    // Calculate days remaining
    const deadline = new Date('2025-12-31')
    const today = new Date()
    const diffTime = Math.abs(deadline.getTime() - today.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    setDaysRemaining(diffDays)
  }, [])
  
  const toggleSection = (sectionId: string) => {
    setOpenSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    )
  }
  
  const riskFactors = [
    "We have no revenue and may never achieve profitability",
    "This is a highly competitive market with established players like OpenAI, Google, and Microsoft",
    "Regulatory uncertainty around token/equity hybrid models could impact our business model",
    "We are dependent on third-party AI providers (Anthropic, OpenAI) for core functionality",
    "Single founder risk - the company relies heavily on one individual",
    "No operating history as a platform - we are pre-launch",
    "Technology risk - AI capabilities and costs are rapidly changing",
    "User adoption is uncertain and may not meet projections"
  ]
  
  const sections = [
    {
      id: 'details',
      title: 'Details',
      content: (
        <div className="font-sans text-body-md text-slate-700">
          <p>
            <strong>SEC 4(a)(6) Offering</strong> • Intermediary: Netcapital • Target: $0 • Maximum: $5,000,000 • Deadline: Dec 31, 2025
          </p>
        </div>
      )
    },
    {
      id: 'incentives',
      title: 'Equity Rewards',
      content: (
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-[#DFECC6]/30 rounded-[20px] border border-[#DFECC6]/50 p-6">
            <div className="mb-3">
              <p className="font-sans font-semibold text-slate-900">Sign Up Bonus</p>
              <p className="font-brand text-2xl text-slate-900 mt-1">100 Shares</p>
            </div>
            <p className="font-sans text-body-sm text-slate-600">
              Create your account and verify your email to receive your initial equity grant
            </p>
          </div>
          
          <div className="bg-[#DFECC6]/30 rounded-[20px] border border-[#DFECC6]/50 p-6">
            <div className="mb-3">
              <p className="font-sans font-semibold text-slate-900">Referral Rewards</p>
              <p className="font-brand text-2xl text-slate-900 mt-1">50 Shares</p>
            </div>
            <p className="font-sans text-body-sm text-slate-600">
              Earn shares for each friend who signs up using your referral link
            </p>
          </div>
          
          <div className="bg-[#DFECC6]/30 rounded-[20px] border border-[#DFECC6]/50 p-6">
            <div className="mb-3">
              <p className="font-sans font-semibold text-slate-900">Being Referred</p>
              <p className="font-brand text-2xl text-slate-900 mt-1">25 Shares</p>
            </div>
            <p className="font-sans text-body-sm text-slate-600">
              Extra bonus when you sign up using a friend&apos;s referral link
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'stats',
      title: 'Statistics',
      content: (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-[20px] border border-[#B0C4C9]/40 p-6 text-center">
            <p className="font-brand text-2xl text-slate-900">120,000</p>
            <p className="font-sans text-label-sm text-slate-600">Shares Distributed</p>
          </div>
          
          <div className="bg-white rounded-[20px] border border-[#B0C4C9]/40 p-6 text-center">
            <p className="font-brand text-2xl text-slate-900">1,200</p>
            <p className="font-sans text-label-sm text-slate-600">Shareholders</p>
          </div>
          
          <div className="bg-white rounded-[20px] border border-[#B0C4C9]/40 p-6 text-center">
            <p className="font-brand text-2xl text-slate-900">{daysRemaining}</p>
            <p className="font-sans text-label-sm text-slate-600">Days Remaining</p>
          </div>
          
          <div className="bg-white rounded-[20px] border border-[#B0C4C9]/40 p-6 text-center">
            <p className="font-brand text-2xl text-slate-900">$0</p>
            <p className="font-sans text-label-sm text-slate-600">Investment Required</p>
          </div>
        </div>
      )
    },
    {
      id: 'terms',
      title: 'Terms',
      content: (
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-600 mb-1">Security Type</p>
            <p className="font-medium text-slate-900">Non-voting Common Stock</p>
          </div>
          <div>
            <p className="text-slate-600 mb-1">Par Value</p>
            <p className="font-medium text-slate-900">$0.00001 per share</p>
          </div>
          <div>
            <p className="text-slate-600 mb-1">Minimum Investment</p>
            <p className="font-medium text-slate-900">$0 (Engagement-based)</p>
          </div>
          <div>
            <p className="text-slate-600 mb-1">Holding Period</p>
            <p className="font-medium text-slate-900">1 Year (SEC Rule)</p>
          </div>
        </div>
      )
    },
    {
      id: 'business',
      title: 'Business',
      content: (
        <div className="space-y-3 text-slate-700">
          <p>
            <strong>Mission:</strong> Building the app store for AI applications where users earn equity through engagement.
          </p>
          <p>
            <strong>Vision:</strong> Create a user-owned ecosystem that aligns incentives between users, developers, and the platform.
          </p>
          <p>
            <strong>Business Model:</strong> Platform fees from AI app developers, premium subscriptions, and transaction fees. 
            Users earn equity through participation rather than cash investment.
          </p>
          <p>
            <strong>Stage:</strong> Pre-revenue, pre-launch startup developing MVP.
          </p>
        </div>
      )
    },
    {
      id: 'financials',
      title: 'Financials',
      content: (
        <div>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-slate-600 mb-1">Status</p>
              <p className="font-semibold text-slate-900">Pre-revenue startup</p>
            </div>
            <div>
              <p className="text-sm text-slate-600 mb-1">Cash on Hand</p>
              <p className="font-semibold text-slate-900">$0</p>
            </div>
            <div>
              <p className="text-sm text-slate-600 mb-1">Monthly Revenue</p>
              <p className="font-semibold text-slate-900">$0</p>
            </div>
            <div>
              <p className="text-sm text-slate-600 mb-1">Monthly Expenses</p>
              <p className="font-semibold text-slate-900">$0</p>
            </div>
            <div>
              <p className="text-sm text-slate-600 mb-1">Total Debt</p>
              <p className="font-semibold text-slate-900">$0</p>
            </div>
            <div>
              <p className="text-sm text-slate-600 mb-1">Employees</p>
              <p className="font-semibold text-slate-900">1 (Founder)</p>
            </div>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-700">
              <strong>Note:</strong> The company is currently bootstrapped with no external funding. 
              All development work is being done by the founder.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'ownership',
      title: 'Ownership',
      content: (
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
            <span className="text-slate-700">Founder (James Esse)</span>
            <span className="font-semibold text-slate-900">100%</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
            <span className="text-slate-700">Outside Investors</span>
            <span className="font-semibold text-slate-900">0%</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
            <span className="text-slate-700">User Equity Pool (Reserved)</span>
            <span className="font-semibold text-slate-900">TBD</span>
          </div>
          <p className="text-sm text-slate-600 mt-3">
            The user equity pool will be allocated from founder shares as users join the platform.
          </p>
        </div>
      )
    },
    {
      id: 'risks',
      title: 'Risks',
      content: (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="font-semibold text-red-900 mb-3">
            Investment in Ampel involves significant risks including:
          </p>
          <ul className="space-y-2">
            {riskFactors.map((risk, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-red-600 mt-1">•</span>
                <span className="text-sm text-red-800">{risk}</span>
              </li>
            ))}
          </ul>
        </div>
      )
    },
    {
      id: 'management',
      title: 'Team',
      content: (
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <h4 className="font-semibold text-slate-900">James Esse</h4>
            <p className="text-slate-600 mb-2">Founder & CEO</p>
            <p className="text-sm text-slate-700 mb-3">
              Serial entrepreneur with experience in technology startups. 
              Previously founded and exited two companies in the tech sector.
            </p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-600">Annual Compensation</p>
                <p className="font-semibold text-slate-900">$0</p>
              </div>
              <div>
                <p className="text-slate-600">Equity Ownership</p>
                <p className="font-semibold text-slate-900">100%</p>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ]
  
  return (
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
  )
}