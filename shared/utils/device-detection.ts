/**
 * Device Detection Utilities
 * Determines device type from User-Agent for KYC flow routing
 */

import type { DeviceType } from '@shared/types/persona'

/**
 * Detect device type from User-Agent string
 *
 * Mobile includes: iPhone, iPod, Android phones, Windows Phone
 * Desktop includes: iPad (lacks MediaDevices API in Safari), laptops, desktops
 *
 * @param userAgent - User-Agent header string
 * @returns 'mobile' | 'desktop' | 'unknown'
 */
export function detectDevice(userAgent: string | null): DeviceType {
  if (!userAgent) {
    return 'unknown'
  }

  const ua = userAgent.toLowerCase()

  // Mobile patterns (but NOT iPad)
  const mobilePatterns = [
    /android.*mobile/,  // Android phones (but not tablets)
    /iphone/,
    /ipod/,
    /windows phone/,
    /blackberry/,
    /bb10/,
    /mobile.*firefox/,
  ]

  // Check if it's a mobile device
  const isMobile = mobilePatterns.some(pattern => pattern.test(ua))

  if (isMobile) {
    return 'mobile'
  }

  // Desktop patterns (including iPad and Android tablets)
  const desktopPatterns = [
    /ipad/,           // iPad counts as desktop for camera API reasons
    /android/,        // Android tablets
    /windows/,
    /macintosh/,
    /mac os x/,
    /linux/,
    /cros/,           // Chrome OS
  ]

  const isDesktop = desktopPatterns.some(pattern => pattern.test(ua))

  if (isDesktop) {
    return 'desktop'
  }

  return 'unknown'
}

/**
 * Check if device is mobile (boolean helper)
 *
 * @param userAgent - User-Agent header string
 * @returns true if mobile device
 */
export function isMobileDevice(userAgent: string | null): boolean {
  return detectDevice(userAgent) === 'mobile'
}

/**
 * Check if device supports camera API reliably
 *
 * Note: This is a server-side check based on User-Agent.
 * Client-side should use navigator.mediaDevices.getUserMedia() for actual capability check.
 *
 * @param userAgent - User-Agent header string
 * @returns true if device likely supports camera API
 */
export function hasCameraSupport(userAgent: string | null): boolean {
  if (!userAgent) {
    return false
  }

  const ua = userAgent.toLowerCase()

  // Modern mobile devices generally support camera API
  const supportedMobilePatterns = [
    /iphone.*os (1[1-9]|[2-9]\d)/, // iOS 11+
    /android.*chrome/,              // Android Chrome
    /android.*firefox/,             // Android Firefox
  ]

  return supportedMobilePatterns.some(pattern => pattern.test(ua))
}

/**
 * Get device info for logging/analytics
 *
 * @param userAgent - User-Agent header string
 * @returns Device information object
 */
export function getDeviceInfo(userAgent: string | null) {
  if (!userAgent) {
    return {
      type: 'unknown' as DeviceType,
      os: 'unknown',
      browser: 'unknown',
      isMobile: false,
      hasCamera: false,
    }
  }

  const ua = userAgent.toLowerCase()
  const deviceType = detectDevice(userAgent)

  // OS Detection
  let os = 'unknown'
  if (/iphone|ipad|ipod/.test(ua)) os = 'ios'
  else if (/android/.test(ua)) os = 'android'
  else if (/windows/.test(ua)) os = 'windows'
  else if (/mac os x/.test(ua)) os = 'macos'
  else if (/linux/.test(ua)) os = 'linux'
  else if (/cros/.test(ua)) os = 'chromeos'

  // Browser Detection
  let browser = 'unknown'
  if (/edg/.test(ua)) browser = 'edge'
  else if (/chrome/.test(ua)) browser = 'chrome'
  else if (/safari/.test(ua) && !/chrome/.test(ua)) browser = 'safari'
  else if (/firefox/.test(ua)) browser = 'firefox'
  else if (/opera|opr/.test(ua)) browser = 'opera'

  return {
    type: deviceType,
    os,
    browser,
    isMobile: deviceType === 'mobile',
    hasCamera: hasCameraSupport(userAgent),
  }
}
