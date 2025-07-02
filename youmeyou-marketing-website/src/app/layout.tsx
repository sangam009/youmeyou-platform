import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import React from 'react'
import './globals.css'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
})

const jetbrainsMono = JetBrains_Mono({ 
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
})

export const metadata: Metadata = {
  title: {
    default: 'YouMeYou AI - Revolutionary AI-Powered Development Platform',
    template: '%s | YouMeYou AI',
  },
  description: 'Transform your ideas into reality with YouMeYou AI. Our intelligent agents collaborate to design, develop, and deploy your projects faster than ever before.',
  keywords: 'AI development, intelligent agents, automated coding, project management, AI platform, codaloo, youmeyou',
  authors: [{ name: 'YouMeYou AI Team' }],
  creator: 'YouMeYou AI',
  publisher: 'YouMeYou AI',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://youmeyou.ai'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://youmeyou.ai',
    siteName: 'YouMeYou AI',
    title: 'YouMeYou AI - Revolutionary AI-Powered Development Platform',
    description: 'Transform your ideas into reality with YouMeYou AI. Our intelligent agents collaborate to design, develop, and deploy your projects faster than ever before.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'YouMeYou AI Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'YouMeYou AI - Revolutionary AI-Powered Development Platform',
    description: 'Transform your ideas into reality with YouMeYou AI. Our intelligent agents collaborate to design, develop, and deploy your projects faster than ever before.',
    images: ['/og-image.jpg'],
    creator: '@youmeyouai',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans antialiased bg-dark-primary text-white">
        {children}
      </body>
    </html>
  )
} 