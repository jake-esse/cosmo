"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/components/ui/accordion"
import { completeEducationAcknowledgment, trackSectionRead, getEducationProgress } from "./actions"
import { AlertCircle, BookOpen, Shield, TrendingDown, Building2, AlertTriangle } from "lucide-react"

interface EducationSection {
  id: string
  title: string
  icon: React.ReactNode
  content: string
}

const educationSections: EducationSection[] = [
  {
    id: "how_it_works",
    title: "How It Works",
    icon: <BookOpen className="w-5 h-5" />,
    content: `Earn non-voting common stock shares through platform use. No money required.

• Sign-up: 100 shares
• Referrals: 50 shares
• Daily activity: Variable shares

These are real securities that cannot be sold or transferred. You're receiving actual ownership in Ampel, but these shares come with significant restrictions and risks.`
  },
  {
    id: "risks",
    title: "Investment Risks",
    icon: <AlertCircle className="w-5 h-5" />,
    content: `Important risks to understand:

• Shares may become worthless
• Ampel is pre-revenue and may fail
• You can never sell these shares
• Your ownership will be diluted over time

Most startups fail. There is a high likelihood that your shares will never have any value. You should not expect any financial return from these shares.`
  },
  {
    id: "restrictions",
    title: "Transfer Restrictions",
    icon: <Shield className="w-5 h-5" />,
    content: `These shares are restricted securities under SEC regulations.

• You cannot sell or transfer them
• No market exists for these shares
• They are not listed on any exchange
• Even after the 1-year holding period, there may be no buyers

These restrictions are permanent. The shares are designed to align long-term incentives, not to provide liquidity.`
  },
  {
    id: "security_type",
    title: "Security Type",
    icon: <TrendingDown className="w-5 h-5" />,
    content: `You are receiving non-voting common stock:

• NO voting rights - you have no say in company decisions
• Last priority in liquidation - you're paid after all creditors and preferred shareholders
• Most junior security type - the riskiest form of equity
• Subject to dilution - your percentage ownership will decrease as more shares are issued

This is the same class of shares held by founders, but without voting rights.`
  },
  {
    id: "company_overview",
    title: "Company Overview",
    icon: <Building2 className="w-5 h-5" />,
    content: `Ampel is an early-stage AI platform startup:

• Industry: AI/Software
• Stage: Pre-revenue
• Employees: 2
• Founded: 2024
• Business model: Unproven

We are attempting to build a new model for AI app distribution with shared ownership. This is experimental and may not work.`
  },
  {
    id: "company_risks",
    title: "Company-Specific Risks",
    icon: <AlertTriangle className="w-5 h-5" />,
    content: `Specific risks related to Ampel:

• No revenue - we have not generated any income
• Unproven model - our business model is experimental
• Small team - only 2 employees, key person risk
• Regulatory uncertainty - securities regulations may impact our model
• Competition - large tech companies could easily replicate our approach
• Technology risk - dependent on third-party AI providers

Any of these factors could cause the company to fail.`
  }
]

export default function OnboardingPage() {
  const router = useRouter()
  const [openSections, setOpenSections] = useState<string[]>([])
  const [readSections, setReadSections] = useState<string[]>([])
  const [acknowledged, setAcknowledged] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sectionTimers, setSectionTimers] = useState<Record<string, number>>({})
  const [totalTimeSpent, setTotalTimeSpent] = useState(0)

  // Load existing progress on mount
  useEffect(() => {
    async function loadProgress() {
      const progress = await getEducationProgress()
      if (progress) {
        setReadSections(progress.sections_read || [])
        setTotalTimeSpent(progress.time_spent_seconds || 0)
      }
    }
    loadProgress()
  }, [])

  // Track time spent in sections
  useEffect(() => {
    const interval = setInterval(() => {
      if (openSections.length > 0) {
        setSectionTimers(prev => {
          const updated = { ...prev }
          openSections.forEach(sectionId => {
            updated[sectionId] = (updated[sectionId] || 0) + 1
          })
          return updated
        })
        setTotalTimeSpent(prev => prev + 1)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [openSections])

  const handleSectionChange = async (value: string[]) => {
    const previouslyOpen = openSections
    const newlyOpened = value.filter(v => !previouslyOpen.includes(v))

    // Track sections that were just closed
    for (const sectionId of previouslyOpen) {
      if (!value.includes(sectionId) && !readSections.includes(sectionId)) {
        const timeSpent = sectionTimers[sectionId] || 0
        if (timeSpent >= 3) { // Require at least 3 seconds to count as read
          setReadSections(prev => [...prev, sectionId])
          await trackSectionRead(sectionId, timeSpent)
        }
      }
    }

    // Mark newly opened sections
    for (const sectionId of newlyOpened) {
      if (!sectionTimers[sectionId]) {
        setSectionTimers(prev => ({ ...prev, [sectionId]: 0 }))
      }
    }

    setOpenSections(value)
  }

  const allSectionsRead = educationSections.every(section =>
    readSections.includes(section.id) || openSections.includes(section.id)
  )

  const handleSubmit = async () => {
    if (!acknowledged || !allSectionsRead) return

    setIsSubmitting(true)
    setError(null)

    try {
      // Track any still-open sections as read
      for (const sectionId of openSections) {
        if (!readSections.includes(sectionId)) {
          const timeSpent = sectionTimers[sectionId] || 0
          await trackSectionRead(sectionId, timeSpent)
        }
      }

      // Complete the acknowledgment
      await completeEducationAcknowledgment(
        [...readSections, ...openSections],
        totalTimeSpent
      )

      // Redirect will happen automatically via the server action
    } catch (err) {
      console.error('Submission error:', err)
      setError(err instanceof Error ? err.message : 'Failed to complete onboarding')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Important Information About Your Shares
          </h1>
          <p className="text-lg text-slate-600">
            Please read all sections carefully to understand what you're receiving
          </p>
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-500">
            <BookOpen className="w-4 h-4" />
            <span>
              {readSections.length + openSections.filter(id => !readSections.includes(id)).length} of {educationSections.length} sections read
            </span>
          </div>
        </div>

        {/* Educational Sections */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <Accordion
            type="multiple"
            value={openSections}
            onValueChange={handleSectionChange}
            className="space-y-4"
          >
            {educationSections.map((section) => {
              const isRead = readSections.includes(section.id)
              const isOpen = openSections.includes(section.id)
              const timeSpent = sectionTimers[section.id] || 0

              return (
                <AccordionItem
                  key={section.id}
                  value={section.id}
                  className="border rounded-lg overflow-hidden"
                >
                  <AccordionTrigger className="px-6 py-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3 text-left w-full">
                      <div className={`${isRead ? 'text-green-600' : 'text-slate-400'}`}>
                        {section.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-slate-900">
                          {section.title}
                        </h3>
                        {(isRead || (isOpen && timeSpent >= 3)) && (
                          <span className="text-xs text-green-600 mt-1">✓ Read</span>
                        )}
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 py-4 bg-slate-50">
                    <div className="prose prose-slate max-w-none">
                      <p className="whitespace-pre-line text-slate-700 leading-relaxed">
                        {section.content}
                      </p>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>
        </div>

        {/* Acknowledgment Section */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">
            Acknowledgment
          </h2>

          {!allSectionsRead && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-amber-800 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Please read all sections before proceeding
              </p>
            </div>
          )}

          <div className="space-y-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                disabled={!allSectionsRead}
                className="mt-1 h-5 w-5 rounded border-slate-300 text-green-600 focus:ring-green-500 disabled:opacity-50"
              />
              <span className={`text-slate-700 ${!allSectionsRead ? 'opacity-50' : ''}`}>
                I acknowledge that I have read and understood all the information provided about the equity shares,
                including the risks, restrictions, and the nature of the securities being offered. I understand that
                these shares may become worthless and that I cannot sell or transfer them.
              </span>
            </label>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={!acknowledged || !allSectionsRead || isSubmitting}
            className={`mt-6 w-full px-6 py-3 rounded-lg font-medium transition-all ${
              acknowledged && allSectionsRead && !isSubmitting
                ? 'bg-green-600 text-white hover:bg-green-700 shadow-md hover:shadow-lg transform hover:-translate-y-0.5'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? 'Processing...' : 'I Understand and Accept'}
          </button>

          <p className="mt-4 text-xs text-slate-500 text-center">
            By continuing, you agree to Ampel's Terms of Service and acknowledge receipt of our Risk Disclosures.
          </p>
        </div>
      </div>
    </div>
  )
}