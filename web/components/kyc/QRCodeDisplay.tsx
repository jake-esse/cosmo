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
    let isMounted = true
    let retryCount = 0
    const MAX_RETRIES = 50 // 50 attempts * 100ms = 5 seconds max wait

    const generateQRCode = async () => {
      console.log('[QRCodeDisplay] Generating QR code...', {
        hasCanvas: !!canvasRef.current,
        hasUrl: !!url,
        url: url,
        size: size,
        retryCount,
      })

      if (!url) {
        console.warn('[QRCodeDisplay] No URL provided')
        setLoading(false)
        return
      }

      // Wait for canvas to be available with retry mechanism
      if (!canvasRef.current) {
        if (retryCount < MAX_RETRIES) {
          console.log('[QRCodeDisplay] Canvas ref not available yet, retrying...', {
            attempt: retryCount + 1,
            maxRetries: MAX_RETRIES,
          })
          retryCount++

          // Use requestAnimationFrame to wait for next browser paint
          requestAnimationFrame(() => {
            if (isMounted) {
              generateQRCode()
            }
          })
          return
        } else {
          console.error('[QRCodeDisplay] Canvas ref not available after max retries')
          if (isMounted) {
            setError('Failed to initialize QR code canvas')
            setLoading(false)
          }
          return
        }
      }

      try {
        if (isMounted) {
          setLoading(true)
          setError(null)
        }

        console.log('[QRCodeDisplay] Canvas available, calling QRCode.toCanvas...', {
          canvasWidth: canvasRef.current.width,
          canvasHeight: canvasRef.current.height,
        })

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
        if (isMounted) {
          setLoading(false)
        }
      } catch (err) {
        console.error('[QRCodeDisplay] Error generating QR code:', err)
        if (isMounted) {
          setError('Failed to generate QR code')
          setLoading(false)
        }
      }
    }

    generateQRCode()

    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false
    }
  }, [url, size])

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      {/* QR Code Canvas Container */}
      <div className="relative bg-white p-4 rounded-2xl shadow-lg border-2 border-gray-200">
        {/* Canvas - always rendered so ref is available */}
        <canvas
          ref={canvasRef}
          className="block"
          style={{
            width: size,
            height: size,
            opacity: loading || error ? 0 : 1,
            transition: 'opacity 0.3s ease-in-out',
          }}
        />

        {/* Loading Overlay */}
        {loading && !error && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-lg"
            style={{ margin: '1rem' }}
          >
            <div className="animate-pulse">
              <Smartphone className="w-12 h-12 text-gray-400" />
            </div>
          </div>
        )}

        {/* Error Overlay */}
        {error && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-red-50 rounded-lg"
            style={{ margin: '1rem' }}
          >
            <p className="text-red-600 text-sm text-center px-4">{error}</p>
          </div>
        )}
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
