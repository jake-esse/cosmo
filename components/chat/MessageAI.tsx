'use client'

import React, { useState, memo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Copy, RefreshCw, Check, Leaf, Globe } from 'lucide-react'
import { CitationList } from './CitationList'
import styles from './MessageAI.module.css'

interface SearchSource {
  sourceType: 'url' | 'x' | 'news' | 'rss';
  title?: string;
  url?: string;
  snippet?: string;
}

interface MessageAIProps {
  message: string
  timestamp?: string
  isLoading?: boolean
  model?: string
  isLastMessage?: boolean
  onRegenerate?: () => void
  webSearchUsed?: boolean
  sources?: SearchSource[]
}

export const MessageAI = memo(function MessageAI({ message, isLoading, model, isLastMessage, onRegenerate, webSearchUsed, sources }: MessageAIProps) {
  const [copied, setCopied] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  
  // Debug: Check if message contains markdown
  if (message && message.length > 0 && message.length < 500) {
    const hasMarkdown = message.includes('#') || message.includes('**') || message.includes('```') || message.includes('- ');
    console.log('[MessageAI] Markdown check:', { 
      hasMarkdown, 
      model,
      messagePreview: message.substring(0, 100) 
    });
  }
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }
  if (isLoading) {
    return (
      <div className="w-full">
        <div className="flex items-center gap-2 mb-4">
          {/* Animated Leaf loading icon - matching static icon size */}
          <div className="relative">
            <svg 
              className="w-5 h-5" 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="#94a3b8"
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path 
                className={styles.leafPulse1}
                d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"
              />
              <path 
                className={styles.leafPulse2}
                d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"
              />
            </svg>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="w-full relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="prose prose-xl prose-slate max-w-none font-brand mb-3">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({children}) => <h1 className="text-display-xl mt-6 mb-4 text-slate-900">{children}</h1>,
            h2: ({children}) => <h2 className="text-display-lg mt-5 mb-3 text-slate-900">{children}</h2>,
            h3: ({children}) => <h3 className="text-heading-xl mt-4 mb-2 text-slate-900">{children}</h3>,
            h4: ({children}) => <h4 className="text-heading-lg mt-3 mb-2 text-slate-900">{children}</h4>,
            h5: ({children}) => <h5 className="text-heading-md mt-2 mb-1 text-slate-900">{children}</h5>,
            h6: ({children}) => <h6 className="text-heading-sm mt-2 mb-1 text-slate-900">{children}</h6>,
            p: ({children}) => <p className="font-brand text-xl mb-4 text-slate-700 leading-relaxed">{children}</p>,
            ul: ({children}) => <ul className="list-disc pl-6 mb-4 space-y-2 text-xl">{children}</ul>,
            ol: ({children}) => <ol className="list-decimal pl-6 mb-4 space-y-2 text-xl">{children}</ol>,
            li: ({children}) => <li className="font-brand text-xl text-slate-700">{children}</li>,
            blockquote: ({children}) => (
              <blockquote className="border-l-4 border-slate-300 pl-4 my-4 italic text-xl text-slate-600">
                {children}
              </blockquote>
            ),
            a: ({href, children}) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-mono text-[11px] bg-[#EEF4F5] text-slate-900 px-2 py-0.5 rounded-full border border-slate-200 hover:bg-slate-100 hover:border-slate-300 transition-colors no-underline"
              >
                {children}
              </a>
            ),
            code: ({inline, className, children, ...props}: any) => {
              const match = /language-(\w+)/.exec(className || '')
              const language = match ? match[1] : ''
              
              if (!inline && language) {
                return (
                  <SyntaxHighlighter
                    style={oneDark}
                    language={language}
                    PreTag="div"
                    className="rounded-md my-4 text-lg"
                    {...props}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                )
              }
              
              return (
                <code className="bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded text-lg font-mono" {...props}>
                  {children}
                </code>
              )
            },
            table: ({children}) => (
              <div className="overflow-x-auto my-4">
                <table className="min-w-full divide-y divide-slate-300">
                  {children}
                </table>
              </div>
            ),
            thead: ({children}) => <thead className="bg-slate-100">{children}</thead>,
            tbody: ({children}) => <tbody className="divide-y divide-slate-200">{children}</tbody>,
            tr: ({children}) => <tr>{children}</tr>,
            th: ({children}) => (
              <th className="px-4 py-2 text-left text-lg font-semibold text-slate-900">
                {children}
              </th>
            ),
            td: ({children}) => (
              <td className="px-4 py-2 text-lg text-slate-700">
                {children}
              </td>
            ),
            strong: ({children}) => <strong className="font-semibold text-slate-900">{children}</strong>,
            em: ({children}) => <em className="italic">{children}</em>,
          }}
        >
          {message}
        </ReactMarkdown>
      </div>

      {/* Citations */}
      {sources && sources.length > 0 && (
        <CitationList sources={sources} />
      )}

      {/* Footer with icons - fixed height to prevent shift */}
      <div className="flex items-center justify-between text-label-sm text-slate-500 h-8">
        <div className="flex items-center gap-3">
          <Leaf className="w-5 h-5 text-slate-400" />
          {webSearchUsed && (
            <div className="flex items-center gap-1 text-slate-400">
              <Globe className="w-4 h-4" />
              <span className="text-xs">Web search used</span>
            </div>
          )}
        </div>

        {/* Action buttons - always render but control visibility */}
        <div className={`flex items-center gap-1 transition-opacity duration-200 ${!isLoading && isHovered ? 'opacity-100' : 'opacity-0'}`}>
          <button
            onClick={handleCopy}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-200 rounded transition-colors"
            title="Copy message"
            disabled={!isHovered}
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-600" />
            ) : (
              <Copy className="w-4 h-4 text-slate-600" />
            )}
          </button>
          {isLastMessage && onRegenerate && (
            <button
              onClick={onRegenerate}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-200 rounded transition-colors"
              title="Regenerate response"
              disabled={!isHovered}
            >
              <RefreshCw className="w-4 h-4 text-slate-600" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
})