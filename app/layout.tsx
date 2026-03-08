import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Aegis Dashboard',
  description: 'Strategic automation for Neuropathy Profit Engine',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}