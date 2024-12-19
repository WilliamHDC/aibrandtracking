'use client'
import './globals.css'
import Navigation from './components/Navigation'

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-[#0f1420] text-white">
        <Navigation />
        {children}
      </body>
    </html>
  )
}