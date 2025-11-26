"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ActivityCard } from "@/components/activity-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Briefcase, Plus, Edit, Eye, Loader2, Users, Calendar, Clock, Crown, CheckCircle2, AlertCircle, Info } from "lucide-react"
import styles from "./page.module.css"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

interface Business {
  id: number
  name: string
  description: string
  category: string | string[]
  categories?: string[]
  location: {
    address: string
    city: string
    state: string
    country: string
  }
  rating: number
  review_count: number
  price_level: number
  images: string[]
  tags: string[]
  is_active: boolean
  is_subscribed: boolean
  subscription_tier?: string | null
  subscription_ends_at?: string | null
}

export default function BusinessDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [capacityInfo, setCapacityInfo] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingCapacity, setIsLoadingCapacity] = useState(false)
  const [isSubscriptionDialogOpen, setIsSubscriptionDialogOpen] = useState(false)
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>("")
  const [selectedTier, setSelectedTier] = useState("basic")
  const [selectedDuration, setSelectedDuration] = useState("30")
  const [isProcessing, setIsProcessing] = useState(false)
  const [alertDialog, setAlertDialog] = useState<{
    open: boolean
    type: 'success' | 'error' | 'info'
    title: string
    message: string
  }>({
    open: false,
    type: 'success',
    title: '',
    message: ''
  })

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
    setUser(parsedUser)
    fetchMyBusinesses()
    fetchCapacityInfo()
    
    // Manejar retorno de MercadoPago
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('subscription_success') === 'true') {
      showAlert('success', '¡Pago exitoso!', 'Tu suscripción se activará en breve. Actualiza la página en unos segundos.')
      // Limpiar la URL
      window.history.replaceState({}, '', '/dashboard/business')
      // Actualizar negocios después de 3 segundos
      setTimeout(() => {
        fetchMyBusinesses()
      }, 3000)
    } else if (urlParams.get('subscription_failure') === 'true') {
      showAlert('error', 'Pago rechazado', 'El pago no pudo ser procesado. Por favor intenta nuevamente.')
      window.history.replaceState({}, '', '/dashboard/business')
    } else if (urlParams.get('subscription_pending') === 'true') {
      showAlert('info', 'Pago pendiente', 'Tu pago está pendiente de aprobación. Te notificaremos cuando se procese.')
      window.history.replaceState({}, '', '/dashboard/business')
    }
  }, [router])

  const fetchMyBusinesses = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'}/api/businesses/owner/my-businesses`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setBusinesses(data)
      }
    } catch (error) {
      console.error("Error fetching businesses:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCapacityInfo = async () => {
    try {
      setIsLoadingCapacity(true)
      const token = localStorage.getItem("token")
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'}/api/businesses/owner/capacity-usage`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setCapacityInfo(data)
      }
    } catch (error) {
      console.error("Error fetching capacity info:", error)
    } finally {
      setIsLoadingCapacity(false)
    }
  }

  const showAlert = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    setAlertDialog({ open: true, type, title, message })
  }

  const closeAlert = () => {
    setAlertDialog({ ...alertDialog, open: false })
  }

  const handleSubscribe = async () => {
    if (!selectedBusinessId) {
      showAlert('error', 'Error', 'Por favor selecciona un negocio')
      return
    }

    setIsProcessing(true)
    try {
      const token = localStorage.getItem("token")
      
      if (!token) {
        showAlert('error', 'Sesión requerida', 'Por favor inicia sesión para continuar')
        setIsProcessing(false)
        return
      }
      
      console.log("Creando preferencia de pago para negocio:", selectedBusinessId) // Debug
      
      // Crear preferencia de pago en MercadoPago
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/api/mercadopago/create-subscription-preference`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            business_id: parseInt(selectedBusinessId),
            tier: selectedTier,
            duration_days: parseInt(selectedDuration),
          }),
        }
      )

      console.log("Respuesta recibida:", response.status) // Debug

      if (response.ok) {
        const data = await response.json()
        console.log("Datos de preferencia:", data) // Debug
        
        // Redirigir a MercadoPago
        console.log("Redirigiendo a MercadoPago:", data.init_point)
        window.location.href = data.init_point
      } else {
        const error = await response.json()
        console.error("Error del servidor:", error) // Debug
        showAlert('error', 'Error', error.detail || 'No se pudo crear la preferencia de pago')
        setIsProcessing(false)
      }
    } catch (error) {
      console.error("Error al crear preferencia de pago:", error)
      showAlert('error', 'Error', 'Error al procesar la solicitud de compra. Intenta nuevamente.')
      setIsProcessing(false)
    }
  }

  const getSelectedBusiness = () => {
    return businesses.find(b => b.id.toString() === selectedBusinessId)
  }

  const selectedBusiness = getSelectedBusiness()

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 bg-gradient-to-br from-primary/5 via-background to-primary/10">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-3xl font-bold mb-2">¡Bienvenido, {user.full_name}!</h1>
                <p className="text-muted-foreground">Gestiona tus establecimientos</p>
              </div>
              <div className="flex gap-3">
                <Button asChild variant="outline" className={styles.editProfileButton}>
                  <Link href="/profile/edit">
                    <Edit className="mr-2 h-4 w-4" />
                    Editar Perfil
                  </Link>
                </Button>
                <Dialog open={isSubscriptionDialogOpen} onOpenChange={setIsSubscriptionDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="default" className="bg-amber-500 hover:bg-amber-600">
                      <Crown className="mr-2 h-4 w-4" />
                      Gestionar Suscripciones
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Gestionar Suscripción Premium</DialogTitle>
                      <DialogDescription>
                        Activa o renueva la suscripción de tus negocios para aparecer primero en las búsquedas
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="business">Seleccionar Negocio</Label>
                        <Select value={selectedBusinessId} onValueChange={setSelectedBusinessId}>
                          <SelectTrigger id="business">
                            <SelectValue placeholder="Selecciona un negocio" />
                          </SelectTrigger>
                          <SelectContent>
                            {businesses.map((business) => (
                              <SelectItem key={business.id} value={business.id.toString()}>
                                <div className="flex items-center justify-between w-full">
                                  <span>{business.name}</span>
                                  {business.is_subscribed && (
                                    <Badge className="ml-2 bg-amber-100 text-amber-800 text-xs">
                                      Premium
                                    </Badge>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedBusiness?.is_subscribed && (
                          <p className="text-xs text-muted-foreground">
                            Estado actual: <strong>{selectedBusiness.subscription_tier}</strong>
                            {selectedBusiness.subscription_ends_at && (
                              <> · Expira: {new Date(selectedBusiness.subscription_ends_at).toLocaleDateString()}</>
                            )}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="tier">Plan de Suscripción</Label>
                        <Select value={selectedTier} onValueChange={setSelectedTier}>
                          <SelectTrigger id="tier">
                            <SelectValue placeholder="Selecciona un plan" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="basic">
                              <div className="flex flex-col items-start">
                                <span className="font-medium">Básico - $5 USD/mes</span>
                                <span className="text-xs text-muted-foreground">Prioridad en búsquedas</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="premium">
                              <div className="flex flex-col items-start">
                                <span className="font-medium">Premium - $10 USD/mes</span>
                                <span className="text-xs text-muted-foreground">Prioridad + Beneficios extra</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="enterprise">
                              <div className="flex flex-col items-start">
                                <span className="font-medium">Enterprise - $15 USD/mes</span>
                                <span className="text-xs text-muted-foreground">Máxima prioridad</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="duration">Duración</Label>
                        <Select value={selectedDuration} onValueChange={setSelectedDuration}>
                          <SelectTrigger id="duration">
                            <SelectValue placeholder="Selecciona duración" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="30">30 días - 1 mes</SelectItem>
                            <SelectItem value="90">90 días - 3 meses</SelectItem>
                            <SelectItem value="180">180 días - 6 meses</SelectItem>
                            <SelectItem value="365">365 días - 1 año</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="p-4 bg-primary/5 rounded-lg space-y-2">
                        <h4 className="font-semibold text-sm">Beneficios de la Suscripción:</h4>
                        <ul className="text-sm space-y-1 text-muted-foreground">
                          <li>✓ Tu negocio aparece primero en búsquedas</li>
                          <li>✓ Mayor visibilidad para usuarios</li>
                          <li>✓ Prioridad sobre competidores</li>
                          <li>✓ Incrementa reservas y vistas</li>
                        </ul>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        className="flex-1" 
                        onClick={() => {
                          setIsSubscriptionDialogOpen(false)
                          setSelectedBusinessId("")
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button 
                        className="flex-1 bg-amber-500 hover:bg-amber-600" 
                        onClick={handleSubscribe} 
                        disabled={isProcessing || !selectedBusinessId}
                      >
                        {isProcessing ? "Procesando..." : selectedBusiness?.is_subscribed ? "Renovar" : "Comprar"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button asChild className={styles.addBusinessButton}>
                  <Link href="/business/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar Negocio
                  </Link>
                </Button>
              </div>
            </div>

          {/* Businesses List */}
          <Card>
            <CardHeader>
              <CardTitle>Mis Establecimientos</CardTitle>
              <CardDescription>
                {businesses.length === 0
                  ? "Aún no has agregado ningún negocio"
                  : `Tienes ${businesses.length} establecimiento${businesses.length !== 1 ? "s" : ""} registrado${businesses.length !== 1 ? "s" : ""}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : businesses.length === 0 ? (
                <div className="text-center py-12">
                  <Briefcase className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No tienes negocios registrados</h3>
                  <p className="text-muted-foreground mb-6">Comienza agregando tu primer establecimiento</p>
                  <Button asChild className={styles.addBusinessButton}>
                    <Link href="/business/new">
                      <Plus className="mr-2 h-4 w-4" />
                      Agregar Negocio
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {businesses.map((business) => (
                    <div key={business.id} className="relative flex flex-col h-full">
                      {!business.is_active && (
                        <div className="absolute top-2 right-2 px-3 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full font-medium z-10">
                          Inactivo
                        </div>
                      )}
                      {business.is_subscribed && (
                        <div className="absolute top-2 left-2 px-3 py-1 text-xs bg-amber-100 text-amber-800 rounded-full font-medium z-10 flex items-center gap-1">
                          <Crown className="h-3 w-3" />
                          Premium
                        </div>
                      )}
                      <ActivityCard
                        id={business.id}
                        name={business.name}
                        categories={business.categories || (business.category ? (Array.isArray(business.category) ? business.category : [business.category]) : [])}
                        location={`${business.location.city}, ${business.location.state}`}
                        rating={business.rating}
                        reviewCount={business.review_count}
                        priceLevel={business.price_level}
                        images={business.images}
                        description={business.description}
                        tags={business.tags}
                        badgeClassName={styles.categoryBadge}
                      />
                      <div className="flex gap-2 mt-3">
                        <Button asChild variant="outline" size="sm" className={`${styles.viewButton} flex-1`}>
                          <Link href={`/activity/${business.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            Ver
                          </Link>
                        </Button>
                        <Button asChild size="sm" className={`${styles.editButton} flex-1`}>
                          <Link href={`/business/${business.id}/edit`}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Capacity Usage Section */}
          {capacityInfo.length > 0 && (
            <Card className="mt-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Ocupación de Cupos
                </CardTitle>
                <CardDescription>
                  Información sobre la ocupación de cupos en tus establecimientos con límite de capacidad
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingCapacity ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    {capacityInfo.map((business) => (
                      <div key={business.business_id} className="border rounded-lg p-4">
                        <h3 className="font-semibold text-lg mb-3">{business.business_name}</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Capacidad máxima: {business.max_capacity} personas
                        </p>

                        {business.capacity_usage.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No hay reservas confirmadas próximamente</p>
                        ) : (
                          <div className="space-y-3">
                            {business.capacity_usage.map((usage: any, index: number) => (
                              <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                <div className="flex items-center gap-3">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  <div>
                                    <p className="font-medium">{usage.date}</p>
                                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                      <Clock className="h-3 w-3" />
                                      {usage.time}
                                    </div>
                                  </div>
                                </div>

                                <div className="text-right">
                                  <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4" />
                                    <span className="font-medium">
                                      {usage.used}/{usage.max_capacity}
                                    </span>
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {usage.bookings.length} reserva{usage.bookings.length !== 1 ? 's' : ''}
                                  </div>
                                </div>

                                <div className="w-24">
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                      className={`h-2 rounded-full ${
                                        usage.used / usage.max_capacity >= 0.9
                                          ? 'bg-red-500'
                                          : usage.used / usage.max_capacity >= 0.7
                                          ? 'bg-yellow-500'
                                          : 'bg-green-500'
                                      }`}
                                      style={{ width: `${(usage.used / usage.max_capacity) * 100}%` }}
                                    ></div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          </div>
        </div>
      </main>
      
      <Footer />

      {/* Alert Dialog */}
      <Dialog open={alertDialog.open} onOpenChange={closeAlert}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              {alertDialog.type === 'success' && (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
              )}
              {alertDialog.type === 'error' && (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
              )}
              {alertDialog.type === 'info' && (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                  <Info className="h-6 w-6 text-blue-600" />
                </div>
              )}
              <div>
                <DialogTitle>{alertDialog.title}</DialogTitle>
                <DialogDescription className="mt-1">
                  {alertDialog.message}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <DialogFooter className="sm:justify-end">
            <Button onClick={closeAlert} className="w-full sm:w-auto">
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
