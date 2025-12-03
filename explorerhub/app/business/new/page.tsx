"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { BusinessForm } from "@/components/business-form"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NewBusinessPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (!userData) {
      router.push("/sign-in")
      return
    }
    const parsedUser = JSON.parse(userData)
    if (parsedUser.role !== "business") {
      router.push("/explore")
      return
    }
    setIsAuthorized(true)
  }, [router])

  const handleSubmit = async (data: any) => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem("token")
      console.log("Token:", token ? "exists" : "missing")
      console.log("Data to send:", data)
      
      const res = await fetch("/api/businesses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      })

      console.log("Response status:", res.status)
      const responseData = await res.json()
      console.log("Response data:", responseData)

      if (!res.ok) {
        throw new Error(responseData.detail || "Failed to create business")
      }
      
      // Redirect to dashboard after successful creation
      router.push("/dashboard/business")
    } catch (error) {
      console.error("Error creating business:", error)
      alert(`Error: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Link href="/dashboard/business">
            <Button variant="ghost" className="mb-6">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver al Panel
            </Button>
          </Link>

          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Agregar Nuevo Negocio</h1>
            <p className="text-muted-foreground">Completa los detalles para publicar tu negocio en ExplorerHub</p>
          </div>

          <BusinessForm onSubmit={handleSubmit} isLoading={isLoading} />
        </div>
      </main>

      <Footer />
    </div>
  )
}
