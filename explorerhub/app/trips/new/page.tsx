"use client"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { TripPlanner } from "@/components/trip-planner"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { CheckCircle2, AlertCircle } from "lucide-react"
import { authFetch } from "@/lib/api"

export default function NewTripPage() {
  const router = useRouter()
  const [isCreating, setIsCreating] = useState(false)
  const [alertDialog, setAlertDialog] = useState<{
    open: boolean
    type: 'success' | 'error'
    title: string
    message: string
  }>({
    open: false,
    type: 'success',
    title: '',
    message: ''
  })

  const showAlert = (type: 'success' | 'error', title: string, message: string) => {
    setAlertDialog({ open: true, type, title, message })
  }

  const closeAlert = () => {
    setAlertDialog({ ...alertDialog, open: false })
  }

  const handleCreateTrip = async (data: any) => {
    setIsCreating(true)
    try {
      const response = await authFetch("https://localhost:8000/api/trips/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      showAlert('success', '¡Viaje creado!', 'Tu viaje ha sido creado exitosamente')
      setTimeout(() => {
        router.push("/trips")
      }, 1500)
    } catch (error: any) {
      // Extract error message from the error object
      let errorMessage = 'No se pudo crear el viaje. Por favor, intenta de nuevo.'
      
      if (error.message && error.message.includes('{"detail":')) {
        try {
          const match = error.message.match(/\{"detail":"([^"]+)"\}/)
          if (match && match[1]) {
            errorMessage = match[1]
          }
        } catch (e) {
          // Keep default message if parsing fails
        }
      }
      
      showAlert('error', 'Error', errorMessage)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Link href="/trips">
            <Button variant="ghost" className="mb-6">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a Viajes
            </Button>
          </Link>

          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Crear Nuevo Viaje</h1>
            <p className="text-muted-foreground">Planifica tu próxima aventura con recomendaciones personalizadas</p>
          </div>

          <TripPlanner onCreateTrip={handleCreateTrip} />
        </div>
      </main>

      {/* Alert Dialog */}
      <Dialog open={alertDialog.open} onOpenChange={closeAlert}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-2">
              {alertDialog.type === 'success' && <CheckCircle2 className="h-5 w-5 text-green-600" />}
              {alertDialog.type === 'error' && <AlertCircle className="h-5 w-5 text-red-600" />}
              <DialogTitle>{alertDialog.title}</DialogTitle>
            </div>
            <DialogDescription>
              {alertDialog.message}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={closeAlert}>
              Aceptar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  )
}
