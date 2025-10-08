'use client'

import React from 'react'
import { ExternalLink } from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

interface SearchSource {
  sourceType: 'url' | 'x' | 'news' | 'rss';
  title?: string;
  url?: string;
  snippet?: string;
}

interface CitationListProps {
  sources: SearchSource[]
}

export function CitationList({ sources }: CitationListProps) {
  if (!sources || sources.length === 0) {
    return null
  }

  return (
    <div className="mt-4">
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="sources" className="border-slate-200">
          <AccordionTrigger className="text-sm font-semibold text-slate-700 hover:text-slate-900 hover:no-underline py-3">
            Sources
          </AccordionTrigger>
          <AccordionContent>
            <div className="flex flex-col gap-2 pt-2">
              {sources.map((source, index) => (
                <a
                  key={index}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-2 p-2 rounded-xl hover:bg-slate-50 transition-colors border border-slate-200"
                >
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-mono">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    {source.title && (
                      <div className="text-sm font-medium text-slate-900 group-hover:text-green-500 transition-colors line-clamp-1">
                        {source.title}
                      </div>
                    )}
                    {source.url && (
                      <div className="text-xs text-slate-500 truncate">
                        {new URL(source.url).hostname}
                      </div>
                    )}
                    {source.snippet && (
                      <div className="text-xs text-slate-600 line-clamp-2 mt-1">
                        {source.snippet}
                      </div>
                    )}
                  </div>
                  <ExternalLink className="flex-shrink-0 w-4 h-4 text-slate-400 group-hover:text-green-500 transition-colors mt-1" />
                </a>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}
