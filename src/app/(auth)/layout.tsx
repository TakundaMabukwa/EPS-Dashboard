'use client'

import { usePathname } from 'next/navigation'

interface AuthLayoutProps {
  children: React.ReactNode
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-[#F5F6FA] relative overflow-hidden flex items-center justify-center">
      {/* Background diagonal accents */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1A245E]/10 via-white to-[#6B7280]/10"></div>
      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#1A245E] to-[#6B7280]" />

      {/* Auth Card */}
      <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-xl p-8 mx-4 border border-gray-100">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img
              src="/premier logo.jpg"
              alt="Premier Logistics Solutions"
              width={180}
              height={100}
              className="object-contain"
            />
          </div>
          <p className="text-gray-600 text-sm">Reliable. Professional. Nationwide.</p>
        </div>

        {children}

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-gray-500">
          © 2025 Premier Logistics Solutions. All rights reserved.
        </div>
      </div>

      {/* Decorative stripes */}
      <div className="absolute bottom-0 left-0 w-full h-20 bg-gradient-to-r from-[#1A245E] via-[#1A245E]/70 to-[#6B7280]/70 transform -skew-y-3"></div>
    </div>
  )
}
