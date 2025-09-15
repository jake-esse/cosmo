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
    <div className="relative w-full h-full bg-white">
      {/* Page Name Header */}
      <div className="absolute left-[28px] top-[26px] flex items-center">
        <span className={`font-brand text-[20px] leading-[22px] font-semibold text-slate-900 ${titleClassName}`}>
          {pageName}
        </span>
      </div>

      {/* Main Window Container */}
      <div className={`absolute left-[5px] top-[62px] right-[11px] bottom-[11px] bg-white rounded-[30px] border border-slate-100 shadow-[0px_4px_6px_0px_rgba(0,0,0,0.09)] overflow-y-auto ${className}`}>
        {children}
      </div>
    </div>
  )
}