import type { Metadata, Viewport } from 'next'
import { Inter, Outfit } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
})

export const metadata: Metadata = {
  title: 'Seedling - Plant Your Financial Future',
  description: 'A budgeting app that helps your wealth grow. Set goals, track spending, and watch your savings sprout.',
  manifest: '/manifest.json',
  icons: {
    icon: '/Seedling.png',
    apple: '/Seedling.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#22c55e',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
      <body className="font-sans antialiased bg-gray-50 text-gray-900 min-h-screen">
        {children}
      </body>
    </html>
  )
}
