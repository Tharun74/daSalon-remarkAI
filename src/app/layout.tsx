import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Salon Remarks',
  description: 'Voice-powered field remarks for salon agents',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
