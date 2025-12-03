"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, MapPin, Plus, Trash2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { CheckCircle2, AlertCircle, Info } from "lucide-react"
import Link from "next/link"
import styles from "./page.module.css"
import { authFetch } from "@/lib/api"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Trip {
  id: string
  name: string
  destination: string
  start_date: string
  end_date: string
  description?: string
  cover_image?: string
  activities: any[]
}

export default function TripsPage() {
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [trips, setTrips] = useState<Trip[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [availableCities, setAvailableCities] = useState<string[]>([])
  const [loadingCities, setLoadingCities] = useState(false)
  const [alertDialog, setAlertDialog] = useState<{
    open: boolean
    type: 'success' | 'error' | 'confirm' | 'info'
    title: string
    message: string
    onConfirm?: () => void
  }>({
    open: false,
    type: 'success',
    title: '',
    message: ''
  })

  const [generatorOpen, setGeneratorOpen] = useState(false)
  const [genTitle, setGenTitle] = useState("")
  const [genBudget, setGenBudget] = useState<'bajo'|'medio'|'alto'>('medio')
  const [genActivitiesPerDay, setGenActivitiesPerDay] = useState<1|2>(1)
  const [genCities, setGenCities] = useState<Array<{city: string; start_date: string; end_date: string}>>([
    { city: "", start_date: "", end_date: "" }
  ])

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (!userData) {
      router.push("/sign-in")
      return
    }
    const parsedUser = JSON.parse(userData)
    if (parsedUser.role === "business") {
      router.push("/dashboard/business")
      return
    }
    setIsAuthorized(true)
    loadTrips()
    loadCities()
  }, [router])

  const loadCities = async () => {
    try {
      setLoadingCities(true)
      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"
      const data = await fetch(`${baseUrl}/api/businesses/cities`)
      if (data.ok) {
        const cities = await data.json()
        setAvailableCities(cities)
      }
    } catch (error) {
      console.error("Error loading cities:", error)
    } finally {
      setLoadingCities(false)
    }
  }

  const loadTrips = async () => {
    try {
      const data = await authFetch("https://localhost:8000/api/trips/")
      setTrips(data)
    } catch (error) {
      console.error("Error loading trips:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const showAlert = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    setAlertDialog({ open: true, type, title, message })
  }

  const closeAlert = () => {
    setAlertDialog({ ...alertDialog, open: false })
  }

  const addCity = () => {
    setGenCities(prev => [...prev, { city: "", start_date: "", end_date: "" }])
  }

  const removeCity = (idx: number) => {
    setGenCities(prev => {
      const next = prev.filter((_, i) => i !== idx)
      return next.length > 0 ? next : [{ city: "", start_date: "", end_date: "" }]
    })
  }

  const updateCity = (idx: number, key: 'city'|'start_date'|'end_date', value: string) => {
    // Validate date format when updating date fields
    if ((key === 'start_date' || key === 'end_date') && value) {
      const parts = value.split('-')
      if (parts.length === 3) {
        const year = parseInt(parts[0])
        const month = parseInt(parts[1])
        const day = parseInt(parts[2])
        
        // Check if date is valid
        const testDate = new Date(year, month - 1, day)
        if (testDate.getFullYear() !== year || testDate.getMonth() !== month - 1 || testDate.getDate() !== day) {
          showAlert('error', 'Fecha inválida', 'Fecha inválida')
          return
        }
      }
    }
    setGenCities(prev => prev.map((c, i) => i === idx ? { ...c, [key]: value } : c))
  }

  const submitGenerate = async () => {
    if (!genTitle.trim()) {
      showAlert('error', 'Falta el título', 'Ingresa un título para el viaje')
      return
    }

    // Check each city for missing fields
    for (let i = 0; i < genCities.length; i++) {
      const city = genCities[i]
      if (!city.city?.trim()) {
        showAlert('error', 'Falta información', `Ingresa el nombre de la ciudad ${i + 1}`)
        return
      }
      if (!city.start_date) {
        showAlert('error', 'Fecha Invalida', `Ingresa una fecha de inicio válida para ${city.city}`)
        return
      }
      if (!city.end_date) {
        showAlert('error', 'Fecha Invalida', `Ingresa una fecha de fin válida para ${city.city}`)
        return
      }
    }

    const norm = genCities.filter(c => c.city?.trim() && c.start_date && c.end_date)
    if (norm.length === 0) {
      showAlert('error', 'Faltan ciudades', 'Ingresa al menos una ciudad con fechas')
      return
    }
    
    // Validate that all dates are valid
    for (const city of norm) {
      const startDate = new Date(city.start_date)
      const endDate = new Date(city.end_date)
      
      if (isNaN(startDate.getTime())) {
        showAlert('error', 'Fecha inválida', 'Fecha inválida')
        return
      }
      if (isNaN(endDate.getTime())) {
        showAlert('error', 'Fecha inválida', 'Fecha inválida')
        return
      }
      
      // Check if the date string matches what was parsed (catches cases like 2025-11-31)
      const startDateStr = city.start_date
      const endDateStr = city.end_date
      const reformattedStart = startDate.toISOString().split('T')[0]
      const reformattedEnd = endDate.toISOString().split('T')[0]
      
      if (startDateStr !== reformattedStart) {
        showAlert('error', 'Fecha inválida', 'Fecha inválida')
        return
      }
      if (endDateStr !== reformattedEnd) {
        showAlert('error', 'Fecha inválida', 'Fecha inválida')
        return
      }
    }
    const overallStart = new Date(Math.min(...norm.map(c => new Date(c.start_date).getTime())))
    const overallEnd = new Date(Math.max(...norm.map(c => new Date(c.end_date).getTime())))
    const payload = {
      name: genTitle.trim(),
      budget: genBudget,
      activities_per_day: genActivitiesPerDay,
      cities: norm.map(c => ({
        city: c.city,
        start_date: new Date(c.start_date).toISOString(),
        end_date: new Date(c.end_date).toISOString()
      }))
    }
    try {
      const trip = await authFetch('https://localhost:8000/api/trips/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      setGeneratorOpen(false)
      setGenTitle("")
      setGenBudget('medio')
      setGenActivitiesPerDay(1)
      setGenCities([{ city: "", start_date: "", end_date: "" }])
      if (trip && trip.id) {
        router.push(`/trips/${trip.id}`)
        return
      }
      // Fallback: fetch trips and try to locate the one we just created
      const list = await authFetch('https://localhost:8000/api/trips/')
      if (Array.isArray(list) && list.length > 0) {
        const found = list.find((t: any) => {
          try {
            const sd = new Date(t.start_date)
            const ed = new Date(t.end_date)
            return t.name === payload.name && sd.getTime() === overallStart.getTime() && ed.getTime() === overallEnd.getTime()
          } catch {
            return false
          }
        }) || list[0]
        if (found && found.id) {
          router.push(`/trips/${found.id}`)
          return
        }
      }
      // As a last resort, just reload list
      router.push('/trips')
    } catch (e) {
      const errorString = String(e)
      const match = errorString.match(/\{"detail":"([^"]+)"\}/)
      const errorMessage = match ? match[1] : 'Intenta nuevamente más tarde'
      showAlert('error', 'No se pudo generar', errorMessage)
    }
  }

  const handleDeleteTrip = async (tripId: string, event: React.MouseEvent) => {
    event.preventDefault() // Prevent navigation to trip detail page
    
    setAlertDialog({
      open: true,
      type: 'confirm',
      title: 'Eliminar viaje',
      message: '¿Estás seguro de que quieres eliminar este viaje? Esta acción no se puede deshacer.',
      onConfirm: async () => {
        try {
          await authFetch(`https://localhost:8000/api/trips/${tripId}`, {
            method: "DELETE",
          })
          
          // Reload trips list
          loadTrips()
          
          // Show success message after a small delay
          setTimeout(() => {
            showAlert('success', 'Viaje eliminado', 'El viaje ha sido eliminado exitosamente')
          }, 100)
        } catch (error) {
          showAlert('error', 'Error', 'No se pudo eliminar el viaje')
        }
      }
    })
  }

  if (!isAuthorized) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
      </div>
    )
  }

  return (
    <div className={styles.pageContainer}>
      <Header />

      <main className={styles.mainContent}>
        <div className={styles.headerSection}>
          <div className={styles.headerText}>
            <h1>Viajes</h1>
            <p>Planifica y organiza tus aventuras de viaje</p>
          </div>
          <div className="flex gap-2">
            <Link href="/trips/new">
              <Button className={styles.createButton}>
                <Plus className={styles.buttonIcon} />
                Crear Viaje
              </Button>
            </Link>
            <Button variant="outline" onClick={() => setGeneratorOpen(true)}>
              Generar viaje automático
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.loadingSpinner}></div>
          </div>
        ) : trips.length === 0 ? (
          <Card className={styles.emptyState}>
            <CardContent>
              <div className={styles.emptyStateContent}>
                <MapPin className={styles.emptyIcon} />
                <h3 className={styles.emptyTitle}>Aún no tienes viajes</h3>
                <p className={styles.emptyText}>
                  Comienza a planificar tu próxima aventura creando tu primer viaje
                </p>
                <Link href="/trips/new">
                  <Button className={styles.createFirstTripButton}>
                    <Plus className={styles.buttonIcon} />
                    Crear Tu Primer Viaje
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className={styles.tripsGrid}>
            {trips.map((trip) => (
              <Link key={trip.id} href={`/trips/${trip.id}`} className={styles.tripCardLink}>
                <Card className={styles.tripCard}>
                  <div className={styles.tripImageWrapper}>
                    <img
                      src={trip.cover_image || `https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400&h=300&fit=crop`}
                      alt={trip.name}
                      className={styles.tripImage}
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      className={styles.deleteButton}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleDeleteTrip(trip.id, e)
                      }}
                    >
                      <Trash2 className={styles.deleteIcon} />
                    </Button>
                  </div>
                  <CardHeader>
                    <CardTitle>{trip.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={styles.tripContent}>
                      <div className={styles.tripInfo}>
                        <MapPin className={styles.infoIcon} />
                        <span>{trip.destination}</span>
                      </div>
                      <div className={styles.tripInfo}>
                        <Calendar className={styles.infoIcon} />
                        <span>
                          {format(new Date(trip.start_date), "d 'de' MMM", { locale: es })} -{" "}
                          {format(new Date(trip.end_date), "d 'de' MMM, yyyy", { locale: es })}
                        </span>
                      </div>
                      <div className={styles.tripActivities}>
                        <span className={styles.activitiesText}>
                          {trip.activities.length} actividades planeadas
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Generator Dialog */}
      <Dialog open={generatorOpen} onOpenChange={setGeneratorOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generar viaje automático</DialogTitle>
            <DialogDescription>Completa los datos para crear un itinerario</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 px-1">
            <div className="space-y-2">
              <Label>Título del viaje</Label>
              <Input value={genTitle} onChange={e => setGenTitle(e.target.value)} placeholder="Ej: Europa en 10 días" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Preferencia de presupuesto</Label>
                <Select value={genBudget} onValueChange={(val) => setGenBudget(val as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona presupuesto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bajo">Económico</SelectItem>
                    <SelectItem value="medio">Estándar</SelectItem>
                    <SelectItem value="alto">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Actividades por día</Label>
                <Select value={String(genActivitiesPerDay)} onValueChange={(val) => setGenActivitiesPerDay(Number(val) as 1|2)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona cantidad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 actividad</SelectItem>
                    <SelectItem value="2">2 actividades</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Ciudades e itinerario</Label>
                <Button variant="outline" size="sm" onClick={addCity}>
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar ciudad
                </Button>
              </div>
              
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                {genCities.map((c, idx) => (
                  <div key={idx} className="border rounded-lg p-3 space-y-3 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Ciudad {idx + 1}</span>
                      {genCities.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCity(idx)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-xs">Ciudad</Label>
                      <Select 
                        value={c.city} 
                        onValueChange={(val) => updateCity(idx, 'city', val)}
                        disabled={loadingCities}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={loadingCities ? "Cargando..." : "Selecciona ciudad"} />
                        </SelectTrigger>
                        <SelectContent>
                          {availableCities.map((city) => (
                            <SelectItem key={city} value={city}>
                              {city}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs">Fecha inicio</Label>
                        <Input 
                          type="date" 
                          value={c.start_date} 
                          onChange={e => updateCity(idx, 'start_date', e.target.value)}
                          className="w-full"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Fecha fin</Label>
                        <Input 
                          type="date" 
                          value={c.end_date} 
                          onChange={e => updateCity(idx, 'end_date', e.target.value)}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setGeneratorOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={submitGenerate}>
              Generar viaje
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog */}
      <Dialog open={alertDialog.open} onOpenChange={closeAlert}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-2">
              {alertDialog.type === 'success' && <CheckCircle2 className="h-5 w-5 text-green-600" />}
              {alertDialog.type === 'error' && <AlertCircle className="h-5 w-5 text-red-600" />}
              {alertDialog.type === 'info' && <Info className="h-5 w-5 text-blue-600" />}
              <DialogTitle>{alertDialog.title}</DialogTitle>
            </div>
            <DialogDescription>
              {alertDialog.message}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            {alertDialog.type === 'confirm' ? (
              <>
                <Button variant="outline" onClick={closeAlert}>
                  Cancelar
                </Button>
                <Button 
                  variant="destructive" 
                  className="destructiveButton hover:bg-[#dc2626]! hover:border-[#dc2626]!"
                  onClick={() => {
                    alertDialog.onConfirm?.()
                    closeAlert()
                  }}
                >
                  Confirmar
                </Button>
              </>
            ) : (
              <Button onClick={closeAlert}>
                Aceptar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  )
}
