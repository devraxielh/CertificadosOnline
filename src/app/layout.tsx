import type { Metadata } from "next"
import { Outfit } from "next/font/google"
import "./globals.css"
import AuthProvider from "@/components/AuthProvider"

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" })

export const metadata: Metadata = {
  title: "Certificados Online",
  description: "Sistema de gestión de certificados",
}

import { Toaster } from "react-hot-toast"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className={`${outfit.variable} font-outfit antialiased`}>
        <AuthProvider>
          <Toaster position="top-right" toastOptions={{ duration: 4000, style: { fontSize: '14px' } }} />
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
