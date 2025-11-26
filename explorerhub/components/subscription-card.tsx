"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Crown, Calendar, AlertCircle, CheckCircle2, ShoppingCart } from "lucide-react"
import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface SubscriptionCardProps {
  businessId: number
  businessName: string
  isSubscribed: boolean
  subscriptionTier?: string | null
  subscriptionEndsAt?: string | null
  onSubscriptionUpdate?: () => void
}

interface SubscriptionPrices {
  basic: {
    monthly_usd: number
    monthly_ars: number
    quarterly_ars: number
    semiannual_ars: number
    annual_ars: number
  }
  premium: {
    monthly_usd: number
    monthly_ars: number
    quarterly_ars: number
    semiannual_ars: number
    annual_ars: number
  }
  enterprise: {
    monthly_usd: number
    monthly_ars: number
    quarterly_ars: number
    semiannual_ars: number
    annual_ars: number
  }
}

export function SubscriptionCard({
  businessId,
  businessName,
  isSubscribed,
  subscriptionTier,
  subscriptionEndsAt,
  onSubscriptionUpdate,
}: SubscriptionCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedTier, setSelectedTier] = useState("basic")
  const [selectedDuration, setSelectedDuration] = useState("30")
  const [isLoading, setIsLoading] = useState(false)
  const [prices, setPrices] = useState<SubscriptionPrices | null>(null)

  // Cargar precios al montar el componente
  useEffect(() => {
    fetchPrices()
  }, [])

  const fetchPrices = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/api/mercadopago/subscription-prices`
      )
      if (response.ok) {
        const data = await response.json()
        setPrices(data.prices)
      }
    } catch (error) {
      console.error("Error al cargar precios:", error)
    }
  }

  const getPrice = () => {
    if (!prices) return { ars: 0, usd: 0 }
    
    const tierPrices = prices[selectedTier as keyof SubscriptionPrices]
    if (!tierPrices) return { ars: 0, usd: 0 }
    
    const durationMap: { [key: string]: { ars: number; usd: number } } = {
      "30": { ars: tierPrices.monthly_ars, usd: tierPrices.monthly_usd },
      "90": { ars: tierPrices.quarterly_ars, usd: tierPrices.monthly_usd * 3 },
      "180": { ars: tierPrices.semiannual_ars, usd: tierPrices.monthly_usd * 6 },
      "365": { ars: tierPrices.annual_ars, usd: tierPrices.monthly_usd * 12 }
    }
    
    return durationMap[selectedDuration] || { ars: 0, usd: 0 }
  }

  const getDaysRemaining = () => {
    if (!subscriptionEndsAt) return 0
    const now = new Date()
    const endDate = new Date(subscriptionEndsAt)
    const diff = endDate.getTime() - now.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  const daysRemaining = getDaysRemaining()
  const isActive = isSubscribed && daysRemaining > 0

  const handleSubscribe = async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem("token")
      
      if (!token) {
        alert("Por favor inicia sesión para continuar")
        setIsDialogOpen(false)
        setIsLoading(false)
        return
      }
      
      console.log("Creando preferencia de pago...") // Debug
      
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
            business_id: businessId,
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
        console.log("Redirigiendo a:", data.init_point)
        window.location.href = data.init_point
      } else {
        const error = await response.json()
        console.error("Error del servidor:", error) // Debug
        alert(`Error: ${error.detail || "No se pudo crear la preferencia de pago"}`)
        setIsLoading(false)
      }
    } catch (error) {
      console.error("Error al crear preferencia de pago:", error)
      alert("Error al procesar la solicitud de compra")
      setIsLoading(false)
    }
  }

  const handleCancelSubscription = async () => {
    if (!confirm("¿Estás seguro de que deseas cancelar la suscripción?")) return

    setIsLoading(true)
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/api/businesses/${businessId}/subscription`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (response.ok) {
        alert("Suscripción cancelada")
        onSubscriptionUpdate?.()
      } else {
        alert("Error al cancelar la suscripción")
      }
    } catch (error) {
      console.error("Error:", error)
      alert("Error al cancelar la suscripción")
    } finally {
      setIsLoading(false)
    }
  }

  const getTierColor = (tier?: string | null) => {
    switch (tier) {
      case "basic":
        return "bg-blue-100 text-blue-800"
      case "premium":
        return "bg-purple-100 text-purple-800"
      case "enterprise":
        return "bg-amber-100 text-amber-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getTierLabel = (tier?: string | null) => {
    switch (tier) {
      case "basic":
        return "Básico"
      case "premium":
        return "Premium"
      case "enterprise":
        return "Enterprise"
      default:
        return "Sin suscripción"
    }
  }

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-amber-500" />
          Suscripción Premium
        </CardTitle>
        <CardDescription>{businessName}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">Estado</p>
            <div className="flex items-center gap-2">
              {isActive ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <Badge className={getTierColor(subscriptionTier)}>{getTierLabel(subscriptionTier)}</Badge>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-gray-400" />
                  <Badge variant="outline">Sin suscripción</Badge>
                </>
              )}
            </div>
          </div>

          {isActive && (
            <div className="text-right">
              <p className="text-sm font-medium">Expira en</p>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span className={daysRemaining <= 7 ? "text-red-600 font-semibold" : ""}>
                  {daysRemaining} día{daysRemaining !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          )}
        </div>

        {isActive && (
          <div className="p-3 bg-primary/5 rounded-lg">
            <p className="text-sm text-muted-foreground">
              Tu negocio aparece <strong>primero en las búsquedas</strong> relacionadas a tu categoría
            </p>
          </div>
        )}

        <div className="flex gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex-1" disabled={isLoading}>
                <Crown className="h-4 w-4 mr-2" />
                {isActive ? "Renovar" : "Comprar"} Suscripción
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Comprar Suscripción Premium</DialogTitle>
                <DialogDescription>
                  Mejora la visibilidad de tu negocio apareciendo primero en las búsquedas
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="tier">Plan de Suscripción</Label>
                  <Select value={selectedTier} onValueChange={setSelectedTier}>
                    <SelectTrigger id="tier">
                      <SelectValue placeholder="Selecciona un plan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Básico - $5 USD/mes - Prioridad en búsquedas</SelectItem>
                      <SelectItem value="premium">Premium - $10 USD/mes - Prioridad + Beneficios extra</SelectItem>
                      <SelectItem value="enterprise">Enterprise - $15 USD/mes - Máxima prioridad</SelectItem>
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
                  <h4 className="font-semibold text-sm">Resumen de Compra:</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Plan:</span>
                      <span className="font-medium">{getTierLabel(selectedTier)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Duración:</span>
                      <span className="font-medium">{selectedDuration} días</span>
                    </div>
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between font-semibold">
                        <span>Total:</span>
                        <span>
                          ${getPrice().usd.toFixed(2)} USD
                          <span className="text-xs text-muted-foreground ml-2">
                            (≈ ${getPrice().ars.toFixed(0)} ARS)
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <ul className="text-xs space-y-1 text-muted-foreground mt-3">
                    <li>✓ Tu negocio aparece primero en búsquedas</li>
                    <li>✓ Mayor visibilidad para usuarios</li>
                    <li>✓ Prioridad sobre competidores</li>
                  </ul>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button className="flex-1 bg-blue-500 hover:bg-blue-600" onClick={handleSubscribe} disabled={isLoading || !prices}>
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  {isLoading ? "Procesando..." : "Comprar"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {isActive && (
            <Button variant="outline" onClick={handleCancelSubscription} disabled={isLoading}>
              Cancelar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
