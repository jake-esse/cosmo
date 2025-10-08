import { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"

export const metadata: Metadata = {
  title: "Ampel - Your AI Company",
  description: "Abundance only matters if it's shared. Join Ampel and earn equity rewards.",
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-white">
      <div className="flex min-h-screen">
        {/* Left side - Form (scrollable) */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-8 py-12 min-h-screen">
            <div className="w-full max-w-[420px]">
              {/* Logo and Brand - with precise bottom alignment */}
              <Link href="/" className="flex items-end mb-12 h-8">
                <div className="relative h-7 w-7">
                  <Image
                    src="/images/ampel-logo.svg"
                    alt="Ampel"
                    fill
                    className="object-contain object-bottom"
                  />
                </div>
                <span className="font-sans font-medium text-[24px] text-black tracking-[-1.2px] ml-[-5px] pb-[1px] leading-[0.85]">
                  Ampel
                </span>
              </Link>
              
              {children}
            </div>
          </div>
        </div>
        
        {/* Right side - Feature Panel with hero background (fixed) */}
        <div className="hidden lg:block lg:flex-1 sticky top-0 h-screen">
          {/* Background Image */}
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: "url('/images/hero-landscape.webp')" }}
          />
          {/* Dark overlay for better text readability */}
          <div className="absolute inset-0 bg-black/40" />
          {/* Quote - Centered */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="max-w-[520px] text-center px-12">
              <p className="font-brand font-normal text-[60px] leading-[0.9] tracking-[-1.8px] text-white">
                Abundance only matters if it&apos;s shared.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}