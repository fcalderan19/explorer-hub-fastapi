"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Search, X, Plus, MapPin, Star } from "lucide-react"
import { CachedImage } from "@/components/cached-image"
import { authFetch } from "@/lib/api"

interface Business {
  id: number
  name: string
  description: string
  categories: string[]
  location: {
    address: string
    city: string
    state: string
    country: string
  }
  rating: number
  review_count: number
  images: string[]
}

interface ActivitySearchModalProps {
  isOpen: boolean
  onClose: () => void
  onAddActivity: (business: Business, scheduledDate?: string) => void
  tripId: string
  tripStartDate: string // Trip start date
  tripEndDate: string // Trip end date
}

export function ActivitySearchModal({ isOpen, onClose, onAddActivity, tripId, tripStartDate, tripEndDate }: ActivitySearchModalProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [filteredBusinesses, setFilteredBusinesses] = useState<Business[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [scheduledDate, setScheduledDate] = useState<string>(tripStartDate || "")

  useEffect(() => {
    if (isOpen) {
      // Reset search state when modal opens
      setSearchQuery("")
      setFilteredBusinesses([])
      setHasSearched(false)
    }
  }, [isOpen])

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredBusinesses([])
    } else {
      const filtered = businesses.filter((business) =>
        business.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        business.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        business.categories.some((cat) => cat.toLowerCase().includes(searchQuery.toLowerCase()))
      )
      setFilteredBusinesses(filtered)
    }
  }, [searchQuery, businesses])

  const handleSearch = async () => {
    if (searchQuery.trim() === "") return

    setIsLoading(true)
    setHasSearched(true)
    try {
      const data = await fetch("https://localhost:8000/api/businesses").then((res) => res.json())
      setBusinesses(data)
      
      // Filter results based on search query
      const filtered = data.filter((business: Business) =>
        business.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        business.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        business.categories.some((cat: string) => cat.toLowerCase().includes(searchQuery.toLowerCase()))
      )
      setFilteredBusinesses(filtered)
    } catch (error) {
      console.error("Error loading businesses:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddActivity = async (business: Business) => {
    if (!scheduledDate) {
      const errorMessage = document.createElement('div')
      errorMessage.textContent = 'Por favor selecciona una fecha para la actividad'
      errorMessage.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ef4444;
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        z-index: 1000;
        font-weight: 500;
      `
      document.body.appendChild(errorMessage)
      setTimeout(() => {
        document.body.removeChild(errorMessage)
      }, 3000)
      return
    }

    try {
      const token = localStorage.getItem("token")
      // Use selected date, or fallback to trip start date, or null
      let scheduled_date = null
      if (scheduledDate) {
        scheduled_date = new Date(scheduledDate + "T12:00:00").toISOString()
      } else if (tripStartDate) {
        // Use trip start date as default (like the automatic generation does)
        scheduled_date = new Date(tripStartDate + "T12:00:00").toISOString()
      }
      
      await fetch(`https://localhost:8000/api/trips/${tripId}/activities`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          business_id: business.id,
          business_name: business.name,
          scheduled_date,
          notes: null,
        }),
      })

      onAddActivity(business, scheduledDate)
      // Show success message instead of alert
      const successMessage = document.createElement('div')
      successMessage.textContent = '¡Actividad agregada al itinerario!'
      successMessage.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        z-index: 1000;
        font-weight: 500;
      `
      document.body.appendChild(successMessage)
      setTimeout(() => {
        document.body.removeChild(successMessage)
      }, 3000)
    } catch (error) {
      const errorString = String(error)
      const match = errorString.match(/Error:\s*(.+)/)
      const errorText = match ? match[1] : 'Error al agregar la actividad'
      
      // Show error message instead of alert
      const errorMessage = document.createElement('div')
      errorMessage.textContent = errorText
      errorMessage.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ef4444;
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        z-index: 1000;
        font-weight: 500;
      `
      document.body.appendChild(errorMessage)
      setTimeout(() => {
        document.body.removeChild(errorMessage)
      }, 3000)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white border border-gray-200 rounded-lg shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-2xl font-bold">Agregar Actividad</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Search and Date */}
        <div className="p-6 border-b">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Buscar actividades, restaurantes, atracciones..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch} disabled={isLoading || searchQuery.trim() === ""}>
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Buscar
                </>
              )}
            </Button>
          </div>
          <div className="mt-3">
            <label className="block text-sm font-medium text-gray-900 mb-1">Fecha de la actividad *</label>
            <Input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              min={tripStartDate}
              max={tripEndDate}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Selecciona una fecha entre {new Date(tripStartDate).toLocaleDateString('es-ES')} y {new Date(tripEndDate).toLocaleDateString('es-ES')}
            </p>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-6">
          {!hasSearched ? (
            <div className="text-center py-12">
              <Search className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-lg font-medium text-gray-900">Busca actividades</p>
              <p className="text-gray-500">Ingresa un término de búsqueda y haz clic en "Buscar" para ver resultados</p>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            </div>
          ) : filteredBusinesses.length === 0 ? (
            <div className="text-center py-12">
              <Search className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-lg font-medium text-gray-900">No se encontraron resultados</p>
              <p className="text-gray-500">Intenta con otros términos de búsqueda</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredBusinesses.map((business) => (
                <Card key={business.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      {/* Image */}
                      <div className="shrink-0">
                        <CachedImage
                          src={business.images?.[0] || "/placeholder.svg"}
                          alt={business.name}
                          className="w-12 h-12 object-cover rounded-lg"
                          fallback="/placeholder.svg"
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg mb-1 truncate">{business.name}</h3>
                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">{business.description}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            <span className="truncate">{business.location.address}, {business.location.city}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span>{business.rating.toFixed(1)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Add Button */}
                      <div className="shrink-0">
                        <Button size="sm" onClick={() => handleAddActivity(business)}>
                          <Plus className="h-4 w-4 mr-1" />
                          Agregar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
