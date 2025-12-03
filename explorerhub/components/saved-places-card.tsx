"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Plus, Check, MapPin, Calendar } from "lucide-react"
import authFetch from "@/lib/api"

type FavoriteActivity = {
  id: number
  user_id: string
  business_id: number
  created_at: string
  business_name: string
  business_categories: string[]
  business_location: string
  business_rating: number
  business_review_count: number
  business_price_level: number
  business_images: string[]
  business_description?: string
  business_tags: string[]
}

export function SavedPlacesCard({
  tripCity,
  tripId,
  tripStartDate,
  tripEndDate,
  onAdded,
  limit = 5,
}: {
  tripCity: string
  tripId: string
  tripStartDate: string
  tripEndDate: string
  onAdded?: () => void
  limit?: number
}) {
  const [favorites, setFavorites] = useState<FavoriteActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [addingIds, setAddingIds] = useState<Record<number, "idle" | "adding" | "added">>({})
  const [dateDialogOpen, setDateDialogOpen] = useState(false)
  const [selectedFavorite, setSelectedFavorite] = useState<FavoriteActivity | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>(tripStartDate)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await authFetch("/api/favorites")
        setFavorites(Array.isArray(data) ? data : [])
      } catch (e) {
        setError("No se pudieron cargar tus favoritos")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const normalizedTripCity = useMemo(() => (tripCity || "").trim().toLowerCase(), [tripCity])

  const cityFromLocation = (loc: string) => {
    if (!loc) return ""
    // Common format: "Street, City, State" or "City, Country"
    const parts = loc.split(",").map((p) => p.trim())
    if (parts.length === 0) return ""
    if (parts.length === 1) return parts[0]
    // Heuristic: city is the second item when address present, else first
    return parts.length >= 2 && /\d|calle|street|avenida|av\.?/i.test(parts[0]) ? parts[1] : parts[0]
  }

  const matching = useMemo(() => {
    if (!normalizedTripCity) return [] as FavoriteActivity[]
    return favorites.filter((f) => cityFromLocation(f.business_location).toLowerCase() === normalizedTripCity)
  }, [favorites, normalizedTripCity])

  const topMatching = useMemo(() => matching.slice(0, limit), [matching, limit])

  const openDateDialog = (fav: FavoriteActivity) => {
    setSelectedFavorite(fav)
    setSelectedDate(tripStartDate)
    setDateDialogOpen(true)
  }

  const handleQuickAdd = async () => {
    if (!selectedFavorite || !selectedDate) return

    try {
      setAddingIds((prev) => ({ ...prev, [selectedFavorite.business_id]: "adding" }))
      const scheduled_date = new Date(selectedDate + "T12:00:00").toISOString()
      
      await authFetch(`http://localhost:8000/api/trips/${tripId}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: String(selectedFavorite.business_id),
          business_name: selectedFavorite.business_name,
          scheduled_date,
          notes: null,
        }),
      })
      setAddingIds((prev) => ({ ...prev, [selectedFavorite.business_id]: "added" }))
      setDateDialogOpen(false)
      onAdded?.()
      // revert to idle after a short delay to allow visual feedback
      setTimeout(() => {
        setAddingIds((prev) => ({ ...prev, [selectedFavorite.business_id]: "idle" }))
      }, 1500)
    } catch (e) {
      if (selectedFavorite) {
        setAddingIds((prev) => ({ ...prev, [selectedFavorite.business_id]: "idle" }))
      }
      setDateDialogOpen(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">De tus lugares guardados...</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-2 text-sm text-muted-foreground">Cargando...</div>
        ) : error ? (
          <div className="py-2 text-sm text-red-600">{error}</div>
        ) : topMatching.length === 0 ? (
          <div className="py-2 text-sm text-muted-foreground">
            No tienes lugares guardados en {tripCity}.
          </div>
        ) : (
          <ul className="space-y-3">
            {topMatching.map((fav) => {
              const status = addingIds[fav.business_id] || "idle"
              const image = fav.business_images?.[0] || "/images/placeholder-business.jpg"
              return (
                <li key={fav.id} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img src={image} alt={fav.business_name} className="h-10 w-10 rounded object-cover shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{fav.business_name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {cityFromLocation(fav.business_location)}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0">
                    {status === "added" ? (
                      <Button size="sm" variant="secondary" disabled>
                        <Check className="h-4 w-4 mr-1" /> Agregado
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => openDateDialog(fav)} disabled={status === "adding"}>
                        <Plus className="h-4 w-4 mr-1" /> Agregar
                      </Button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        <div className="mt-3">
          <a href="/favorites" className="text-xs text-muted-foreground hover:underline">
            Ver todos mis guardados
          </a>
        </div>
      </CardContent>

      {/* Date Selection Dialog */}
      <Dialog open={dateDialogOpen} onOpenChange={setDateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Seleccionar fecha</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="activity-date">Fecha de la actividad</Label>
              <Input
                id="activity-date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={tripStartDate}
                max={tripEndDate}
                required
              />
              <p className="text-xs text-muted-foreground">
                Selecciona una fecha entre {new Date(tripStartDate).toLocaleDateString('es-ES')} y {new Date(tripEndDate).toLocaleDateString('es-ES')}
              </p>
            </div>
            {selectedFavorite && (
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <img
                  src={selectedFavorite.business_images?.[0] || "/images/placeholder-business.jpg"}
                  alt={selectedFavorite.business_name}
                  className="h-12 w-12 rounded object-cover shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{selectedFavorite.business_name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {cityFromLocation(selectedFavorite.business_location)}
                  </p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleQuickAdd} disabled={!selectedDate}>
              <Calendar className="h-4 w-4 mr-2" />
              Agregar al itinerario
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

export default SavedPlacesCard
