/**
 * Component: PageLayout
 * Purpose: Consistent page layout wrapper for all dashboard pages
 * Provides the standard page name header and content container
 */

import { ReactNode } from "react"

interface PageLayoutProps {
  pageName: string
  children: ReactNode
  className?: string
  titleClassName?: string
}

export function PageLayout({ pageName, children, className = "", titleClassName = "" }: PageLayoutProps) {
  return (
    <div className="relative w-full h-full bg-white overflow-hidden">
      {/* Page Name Header - Hidden on mobile since we have a header */}
      <div className="hidden md:block absolute left-[28px] top-[26px] z-10">
        <span className={`font-brand text-[20px] leading-[22px] font-semibold text-slate-900 ${titleClassName}`}>
          {pageName}
        </span>
      </div>

      {/* Main Window Container - Mobile responsive, properly contained on desktop */}
      <div className={`absolute inset-0 md:inset-[5px_11px_11px_5px] md:top-[62px] bg-white md:rounded-[30px] md:border md:border-slate-100 md:shadow-[0px_4px_6px_0px_rgba(0,0,0,0.09)] overflow-y-auto ${className}`}>
        {children}
      </div>
    </div>
  )
}