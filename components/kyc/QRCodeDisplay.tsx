/**
 * QRCodeDisplay Component
 * Generates and displays QR code for mobile verification handoff
 */

'use client'

import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { Smartphone } from 'lucide-react'

export interface QRCodeDisplayProps {
  /** URL to encode in QR code (mobile verification URL) */
  url: string
  /** Size of QR code in pixels (default: 300) */
  size?: number
  /** Additional CSS classes */
  className?: string
}

export function QRCodeDisplay({
  url,
  size = 300,
  className = '',
}: QRCodeDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    const generateQRCode = async () => {
      console.log('[QRCodeDisplay] Generating QR code...', {
        hasCanvas: !!canvasRef.current,
        hasUrl: !!url,
        url: url,
        size: size,
      })

      if (!canvasRef.current) {
        console.warn('[QRCodeDisplay] Canvas ref not available')
        setLoading(false)
        return
      }

      if (!url) {
        console.warn('[QRCodeDisplay] No URL provided')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        console.log('[QRCodeDisplay] Calling QRCode.toCanvas...')
        await QRCode.toCanvas(canvasRef.current, url, {
          width: size,
          margin: 2,
          color: {
            dark: '#000000', // Black for high contrast
            light: '#FFFFFF', // White background
          },
          errorCorrectionLevel: 'M', // Medium error correction
        })

        console.log('[QRCodeDisplay] QR code generated successfully')
        setLoading(false)
      } catch (err) {
        console.error('[QRCodeDisplay] Error generating QR code:', err)
        setError('Failed to generate QR code')
        setLoading(false)
      }
    }

    generateQRCode()
  }, [url, size])

  if (error) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-red-50 border-2 border-red-200 rounded-2xl p-8 ${className}`}
        style={{ width: size, height: size }}
      >
        <p className="text-red-600 text-sm text-center">{error}</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-50 border-2 border-gray-200 rounded-2xl ${className}`}
        style={{ width: size, height: size }}
      >
        <div className="animate-pulse">
          <Smartphone className="w-12 h-12 text-gray-400" />
        </div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      {/* QR Code Canvas */}
      <div className="bg-white p-4 rounded-2xl shadow-lg border-2 border-gray-200">
        <canvas
          ref={canvasRef}
          className="block"
          style={{
            width: size,
            height: size,
          }}
        />
      </div>

      {/* Manual Entry URL */}
      <div className="w-full max-w-md">
        <p className="text-xs text-gray-500 text-center mb-2">
          Or enter this URL manually:
        </p>
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 break-all">
          <code className="text-xs text-gray-700 font-mono">{url}</code>
        </div>
      </div>
    </div>
  )
}
