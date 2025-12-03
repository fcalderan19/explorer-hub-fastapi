"use client"

import { use, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { CheckCircle2 } from "lucide-react"
import { ArrowLeft, Save, Globe, Lock, Users } from "lucide-react"
import Link from "next/link"
import { authFetch } from "@/lib/api"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import styles from "./page.module.css"

interface Trip {
  id: string
  name: string
  destination: string
  start_date: string
  end_date: string
  description?: string
  cover_image?: string
  visibility?: string
  activities: any[]
}

export default function EditTripPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  
  const [name, setName] = useState("")
  const [destination, setDestination] = useState("")
  const [startDate, setStartDate] = useState<Date>()
  const [endDate, setEndDate] = useState<Date>()
  const [description, setDescription] = useState("")
  const [coverImage, setCoverImage] = useState("")
  const [visibility, setVisibility] = useState<"private" | "followers" | "public">("private")
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)

  useEffect(() => {
    loadTrip()
  }, [resolvedParams.id])

  const loadTrip = async () => {
    try {
      const data = await authFetch(`https://localhost:8000/api/trips/${resolvedParams.id}`)
      
      setName(data.name)
      setDestination(data.destination)
      setStartDate(new Date(data.start_date))
      setEndDate(new Date(data.end_date))
      setDescription(data.description || "")
      setCoverImage(data.cover_image || "")
      setVisibility((data.visibility as "private" | "followers" | "public") || "private")
    } catch (error) {
      console.error("Error loading trip:", error)
      alert("Error al cargar el viaje")
      router.push("/trips")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      await authFetch(`https://localhost:8000/api/trips/${resolvedParams.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          destination,
          start_date: startDate,
          end_date: endDate,
          description,
          cover_image: coverImage || null,
          visibility,
        }),
      })

      setShowSuccessDialog(true)
    } catch (error: any) {
      // Extract error message from the error object
      let errorMessage = 'Error al actualizar el viaje. Por favor, intenta de nuevo.'
      
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
      
      alert(errorMessage)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Link href={`/trips/${resolvedParams.id}`}>
            <Button variant="ghost" className="mb-6">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver al Viaje
            </Button>
          </Link>

          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Editar Viaje</h1>
            <p className="text-muted-foreground">Actualiza la información de tu viaje</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Información del Viaje</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre del Viaje *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="ej. Verano en Italia"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="destination">Destino *</Label>
                  <Input
                    id="destination"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="ej. Roma, Florencia, Venecia"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fecha de Inicio *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {startDate ? format(startDate, "d 'de' MMM 'de' yyyy", { locale: es }) : <span>Seleccionar fecha</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>Fecha de Fin *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {endDate ? format(endDate, "d 'de' MMM 'de' yyyy", { locale: es }) : <span>Seleccionar fecha</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">
                    Descripción {visibility === "private" ? "(Opcional)" : "*"}
                  </Label>
                  <Input
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={visibility === "private" ? "Añade notas sobre tu viaje..." : "Describe tu viaje para compartirlo con otros..."}
                    required={visibility !== "private"}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="coverImage">Imagen de Portada (URL)</Label>
                  <Input
                    id="coverImage"
                    type="url"
                    value={coverImage}
                    onChange={(e) => setCoverImage(e.target.value)}
                    placeholder="https://ejemplo.com/imagen.jpg"
                  />
                  {coverImage && (
                    <div className="mt-2">
                      <img
                        src={coverImage}
                        alt="Vista previa de portada"
                        className="w-full max-w-xs h-32 object-cover rounded border"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Visibilidad del itinerario</Label>
                  <div className="flex flex-row gap-2 mt-2">
                    <Button
                      type="button"
                      variant={visibility === "private" ? "default" : "outline"}
                      onClick={() => setVisibility("private")}
                      className="flex flex-col items-center gap-1 h-auto p-3 flex-1"
                    >
                      <Lock className="h-5 w-5" />
                      <div className="text-center">
                        <div className="font-medium text-sm">Privado</div>
                        <div className="text-xs opacity-70">Solo tú</div>
                      </div>
                    </Button>
                    
                    <Button
                      type="button"
                      variant={visibility === "followers" ? "default" : "outline"}
                      onClick={() => setVisibility("followers")}
                      className="flex flex-col items-center gap-1 h-auto p-3 flex-1"
                    >
                      <Users className="h-5 w-5" />
                      <div className="text-center">
                        <div className="font-medium text-sm">Seguidores</div>
                        <div className="text-xs opacity-70">Tus seguidores</div>
                      </div>
                    </Button>
                    
                    <Button
                      type="button"
                      variant={visibility === "public" ? "default" : "outline"}
                      onClick={() => setVisibility("public")}
                      className="flex flex-col items-center gap-1 h-auto p-3 flex-1"
                    >
                      <Globe className="h-5 w-5" />
                      <div className="text-center">
                        <div className="font-medium text-sm">Público</div>
                        <div className="text-xs opacity-70">Todos</div>
                      </div>
                    </Button>
                  </div>
                </div>

                <div className={styles.buttonContainer}>
                  <Button
                    type="button"
                    variant="outline"
                    className={`${styles.cancelButton} flex-1`}
                    onClick={() => router.push(`/trips/${resolvedParams.id}`)}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    className={`${styles.saveButton} flex-1`}
                    disabled={isSaving || !name.trim() || !destination.trim() || !startDate || !endDate || (visibility !== "private" && !description.trim())}
                  >
                    {isSaving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Guardar Cambios
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              ¡Viaje actualizado exitosamente!
            </DialogTitle>
            <DialogDescription>
              Los cambios han sido guardados correctamente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => {
              setShowSuccessDialog(false)
              router.push(`/trips/${resolvedParams.id}`)
            }}>
              Aceptar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  )
}
