import type React from "react"
import { Geist } from "next/font/google"
import "./globals.css"

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
})

export const metadata = {
  title: "ExplorerHub - Discover Your Next Adventure",
  description: "Explore restaurants, activities, and experiences at your travel destinations",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={geistSans.variable}>
      <body className="antialiased">
        <div id="app-root" className="app-root">{children}</div>
      </body>
    </html>
  )
}
