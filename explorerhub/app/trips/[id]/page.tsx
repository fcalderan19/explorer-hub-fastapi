"use client"

import { use, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, MapPin, Calendar, Edit, Share2, Trash2, Users } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { CheckCircle2, AlertCircle, Info, X, UserPlus } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import ItineraryBuilder from "@/components/itinerary-builder"
import { ActivitySearchModal } from "@/components/activity-search-modal"
import { authFetch } from "@/lib/api"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import styles from "./page.module.css"
import { WeatherCard } from "@/components/weather-card"
import { SavedPlacesCard } from "@/components/saved-places-card"
import { NearbyEventsCard } from "@/components/nearby-events-card"
import { TransportRecommendations } from "@/components/transport-recommendations"
import { CurrentLocationMapLink } from "@/components/current-location-map-link"

interface TripActivity {
  categories: never[]
  business_id: string
  business_name: string
  scheduled_date?: string
  notes?: string
  images?: Array<{url: string, notes?: string}>
  business_images?: string[]
  location?: {
    address?: string
    city?: string
    lat?: number
    lng?: number
  }
}

interface Trip {
  id: string
  name: string
  destination: string
  start_date: string
  end_date: string
  description?: string
  cover_image?: string
  activities: TripActivity[]
  user_id: string
  collaborators?: string[]
}

interface Collaborator {
  id: string
  username: string
  full_name: string
  profile_picture?: string
}

interface UserSearchResult {
  id: string
  username: string
  full_name: string
  profile_picture?: string
  trips_count: number
  is_following: boolean
}

export default function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [trip, setTrip] = useState<Trip | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showActivitySearch, setShowActivitySearch] = useState(false)
  const [canEdit, setCanEdit] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [showCollaborators, setShowCollaborators] = useState(false)
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
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

  useEffect(() => {
    loadTrip()
  }, [resolvedParams.id])

  const loadTrip = async () => {
    try {
      const data = await authFetch(`https://localhost:8000/api/trips/${resolvedParams.id}`)
      
      // Check if current user is the owner
      const userData = localStorage.getItem("user")
      if (userData) {
        try {
          const currentUser = JSON.parse(userData)
          const currentUserId = String(currentUser.id)
          
          const owner = String(data.user_id) === currentUserId
          const collaborator = Array.isArray(data.collaborators) && data.collaborators.includes(currentUserId)
          const allowed = owner || collaborator

          setIsOwner(owner)
          setCanEdit(allowed)

          if (!allowed) {
            // User is neither owner nor collaborator, redirect to view mode
            router.push(`/trips/${resolvedParams.id}/view`)
            return
          }
        } catch (error) {
          // User data parsing failed, redirect to view mode
          router.push(`/trips/${resolvedParams.id}/view`)
          return
        }
      } else {
        // No user data, redirect to view mode
        router.push(`/trips/${resolvedParams.id}/view`)
        return
      }
      
      setTrip(data)
    } catch (error) {
      console.error("Error loading trip:", error)
      router.push("/community")
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

  const handleAddActivity = () => {
    // Show activity search modal instead of navigating away
    setShowActivitySearch(true)
  }

  const handleActivityAdded = (business: any) => {
    // Reload trip data
    loadTrip()
    setShowActivitySearch(false)
  }

  const handleRemoveActivity = async (businessId: string) => {
    if (!trip) return
    
    try {
      await authFetch(`https://localhost:8000/api/trips/${trip.id}/activities/${businessId}`, {
        method: "DELETE",
      })
      
      // Reload trip data
      loadTrip()
    } catch (error) {
      const errorString = String(error)
      const match = errorString.match(/\{"detail":"([^"]+)"\}/)
      const errorMessage = match ? match[1] : 'Error al eliminar la actividad'
      showAlert('error', 'Error', errorMessage)
    }
  }

  const handleDeleteTrip = async () => {
    if (!trip) return
    
    setAlertDialog({
      open: true,
      type: 'confirm',
      title: 'Eliminar viaje',
      message: '¿Estás seguro de que quieres eliminar este viaje? Esta acción no se puede deshacer.',
      onConfirm: async () => {
        try {
          await authFetch(`https://localhost:8000/api/trips/${trip.id}`, {
            method: "DELETE",
          })
          
          showAlert('success', 'Viaje eliminado', 'El viaje ha sido eliminado exitosamente')
          router.push("/trips")
        } catch (error) {
          const errorString = String(error)
          const match = errorString.match(/\{"detail":"([^"]+)"\}/)
          const errorMessage = match ? match[1] : 'No se pudo eliminar el viaje'
          showAlert('error', 'Error', errorMessage)
        }
      }
    })
  }

  const handleUpdateSchedule = async (businessId: string, date: Date | null) => {
    if (!trip) return
    
    try {
      await authFetch(`https://localhost:8000/api/trips/${trip.id}/activities/${businessId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduled_date: date ? date.toISOString() : null }),
      })
      
      // Reload trip data
      loadTrip()
    } catch (error) {
      const errorString = String(error)
      const match = errorString.match(/\{"detail":"([^"]+)"\}/)
      const errorMessage = match ? match[1] : 'Error al actualizar la fecha programada'
      showAlert('error', 'Error', errorMessage)
    }
  }

  const firstActivity = trip && trip.activities.length > 0 ? trip.activities[0] : null

  const handleUpdateNotes = async (businessId: string, notes: string) => {
    if (!trip) return
    
    try {
      await authFetch(`https://localhost:8000/api/trips/${trip.id}/activities/${businessId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      })
      
      // Reload trip data
      loadTrip()
    } catch (error) {
      const errorString = String(error)
      const match = errorString.match(/\{"detail":"([^"]+)"\}/)
      const errorMessage = match ? match[1] : 'Error al actualizar las notas'
      showAlert('error', 'Error', errorMessage)
    }
  }

  const handleAddImage = async (businessId: string, imageUrl: string) => {
    if (!trip) return
    
    try {
      // Get current activity to add the image
      const currentActivity = trip.activities.find(a => a.business_id === businessId)
      if (!currentActivity) return
      
      const currentImages = currentActivity.images || []
      const updatedImages = [...currentImages, { url: imageUrl, notes: "" }]
      
      await authFetch(`https://localhost:8000/api/trips/${trip.id}/activities/${businessId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: updatedImages }),
      })
      
      // Reload trip data
      loadTrip()
    } catch (error) {
      const errorString = String(error)
      const match = errorString.match(/\{"detail":"([^"]+)"\}/)
      const errorMessage = match ? match[1] : 'Error al añadir la imagen'
      showAlert('error', 'Error', errorMessage)
    }
  }

  const handleUpdateImageNotes = async (businessId: string, imageIndex: number, notes: string) => {
    if (!trip) return
    
    try {
      const currentActivity = trip.activities.find(a => a.business_id === businessId)
      if (!currentActivity || !currentActivity.images) return
      
      const updatedImages = currentActivity.images.map((img, idx) => 
        idx === imageIndex ? { ...img, notes } : img
      )
      
      await authFetch(`https://localhost:8000/api/trips/${trip.id}/activities/${businessId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: updatedImages }),
      })
      
      // Reload trip data
      loadTrip()
    } catch (error) {
      const errorString = String(error)
      const match = errorString.match(/\{"detail":"([^"]+)"\}/)
      const errorMessage = match ? match[1] : 'Error al actualizar las notas de la imagen'
      showAlert('error', 'Error', errorMessage)
    }
  }

  const handleRemoveImage = async (businessId: string, imageIndex: number) => {
    if (!trip) return
    
    try {
      const currentActivity = trip.activities.find(a => a.business_id === businessId)
      if (!currentActivity || !currentActivity.images) return
      
      const updatedImages = currentActivity.images.filter((_, idx) => idx !== imageIndex)
      
      await authFetch(`https://localhost:8000/api/trips/${trip.id}/activities/${businessId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: updatedImages }),
      })
      
      // Reload trip data
      loadTrip()
    } catch (error) {
      const errorString = String(error)
      const match = errorString.match(/\{"detail":"([^"]+)"\}/)
      const errorMessage = match ? match[1] : 'Error al eliminar la imagen'
      showAlert('error', 'Error', errorMessage)
    }
  }

  const handleOpenCollaborators = async () => {
    if (!trip) return
    setShowCollaborators(true)
    await loadCollaborators()
  }

  const loadCollaborators = async () => {
    if (!trip) return
    try {
      const data = await authFetch(`https://localhost:8000/api/trips/${trip.id}/collaborators`)
      setCollaborators(data)
    } catch (error) {
      console.error("Error loading collaborators:", error)
    }
  }

  const handleSearchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }
    
    setIsSearching(true)
    try {
      const data = await authFetch(`https://localhost:8000/api/users/search?q=${encodeURIComponent(query)}`)
      setSearchResults(data)
    } catch (error) {
      console.error("Error searching users:", error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleAddCollaborator = async (userId: string) => {
    if (!trip) return
    
    try {
      await authFetch(`https://localhost:8000/api/trips/${trip.id}/collaborators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      })
      
      await loadCollaborators()
      setSearchQuery("")
      setSearchResults([])
      showAlert('success', 'Colaborador agregado', 'El usuario ha sido agregado como colaborador')
    } catch (error) {
      console.error("Error adding collaborator:", error)
      showAlert('error', 'Error', 'No se pudo agregar el colaborador')
    }
  }

  const handleRemoveCollaborator = async (userId: string) => {
    if (!trip) return
    
    setAlertDialog({
      open: true,
      type: 'confirm',
      title: 'Eliminar colaborador',
      message: '¿Estás seguro de que quieres eliminar este colaborador?',
      onConfirm: async () => {
        try {
          await authFetch(`https://localhost:8000/api/trips/${trip.id}/collaborators/${userId}`, {
            method: "DELETE",
          })
          
          await loadCollaborators()
          showAlert('success', 'Colaborador eliminado', 'El colaborador ha sido eliminado')
        } catch (error) {
          console.error("Error removing collaborator:", error)
          showAlert('error', 'Error', 'No se pudo eliminar el colaborador')
        }
      }
    })
  }

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
      </div>
    )
  }

  if (!trip) {
    return null
  }

  const formattedActivities = trip.activities.map((activity) => ({
    id: activity.business_id,
    business_id: activity.business_id,
    business_name: activity.business_name,
    categories: activity.categories || [],
    scheduled_date: activity.scheduled_date ? new Date(activity.scheduled_date) : undefined,
    notes: activity.notes,
    images: activity.images || [],
    business_images: activity.business_images || [],
    location: activity.location,
  }))

  // Calculate nearest city for weather - use trip destination or first activity with location
  const nearestCity = trip.activities.find(a => a.location?.city)?.location?.city || 
                      trip.destination.split(',')[0].trim() || 
                      'Buenos Aires'

  return (
    <div className={styles.pageContainer}>
      <Header />

      <main className={styles.mainContent}>
        <Link href="/trips">
          <Button variant="ghost" className={styles.backButton}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Viajes
          </Button>
        </Link>

        <div className={styles.contentGrid}>
          {/* Main Content */}
          <div className={styles.mainSection}>
            <div>
              <div className={styles.tripHeader}>
                <div className={styles.tripInfo}>
                  <h1 className={styles.tripTitle}>{trip.name}</h1>
                  <div className={styles.tripMeta}>
                    <div className={styles.tripMetaItem}>
                      <MapPin className="h-4 w-4" />
                      <span>{trip.destination}</span>
                    </div>
                    <div className={styles.tripMetaItem}>
                      <Calendar className="h-4 w-4" />
                      <span>
                        {format(new Date(trip.start_date), "MMM d")} - {format(new Date(trip.end_date), "MMM d, yyyy")}
                      </span>
                    </div>
                  </div>
                </div>

                <div className={styles.actionButtons}>
                  {isOwner && (
                    <Button variant="outline" size="sm" onClick={() => router.push(`/trips/${trip.id}/edit`)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                  )}
                  {isOwner && (
                    <Button variant="outline" size="sm" onClick={handleOpenCollaborators}>
                      <Users className="h-4 w-4 mr-2" />
                      Colaboradores
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => showAlert('info', 'Próximamente', 'Función de compartir próximamente')}>
                    <Share2 className="h-4 w-4 mr-2" />
                    Compartir
                  </Button>
                  {isOwner && (
                    <Button variant="destructive" size="sm" onClick={handleDeleteTrip} className="hover:bg-red-700">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar
                    </Button>
                  )}
                </div>
              </div>

              {trip.description && <p className={styles.tripDescription}>{trip.description}</p>}

              {trip.cover_image && (
                <div className="mb-6">
                  <img
                    src={trip.cover_image}
                    alt={`Portada de ${trip.name}`}
                    className="w-full h-64 object-cover rounded-lg shadow-md"
                  />
                </div>
              )}
            </div>

            <ItineraryBuilder
              activities={formattedActivities}
              onAddActivity={handleAddActivity}
              onRemoveActivity={handleRemoveActivity}
              onUpdateSchedule={handleUpdateSchedule}
              /* firstActivityMapLink={
                firstActivity ? (
                  <CurrentLocationMapLink
                    address={firstActivity.location?.address || ""}
                    city={firstActivity.location?.city || ""}
                    activityName={firstActivity.business_name}
                  />
                ) : undefined
              } */
              onUpdateNotes={handleUpdateNotes}
              onAddImage={handleAddImage}
              onUpdateImageNotes={handleUpdateImageNotes}
              onRemoveImage={handleRemoveImage}
            />
          </div>

          {/* Sidebar */}
          <div className={styles.sidebar}>
            {/* Weather Card - Always show using trip destination */}
            <WeatherCard city={nearestCity} />

            {/* Saved places from favorites matching city */}
            <SavedPlacesCard 
              tripCity={nearestCity} 
              tripId={trip.id} 
              tripStartDate={trip.start_date.split('T')[0]}
              tripEndDate={trip.end_date.split('T')[0]}
              onAdded={loadTrip} 
            />

            {/* Nearby Events - Always show using nearest city */}
            {/* <NearbyEventsCard city={nearestCity} /> */}
            <Card>
              <CardContent className={styles.cardContent}>
                <h3 className={styles.sectionTitle}>Resumen del Viaje</h3>
                <div className={styles.tripSummary}>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>Duración</span>
                    <span className={styles.summaryValue}>
                      {Math.ceil(
                        (new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) /
                          (1000 * 60 * 60 * 24)
                      )}{" "}
                      días
                    </span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>Actividades</span>
                    <span className={styles.summaryValue}>{trip.activities.length}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>Destino</span>
                    <span className={styles.summaryValue}>{trip.destination}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

           {/*  <Card>
              <CardContent className={styles.cardContent}>
                <h3 className={styles.sectionTitle}>Recomendaciones</h3>
                <p className={styles.recommendationsText}>
                  Basado en tu itinerario, también te podrían gustar estas experiencias:
                </p>
                <div className={styles.recommendationsList}>
                  <Link href="/explore">
                    <div className={styles.recommendationItem}>
                      <h4 className={styles.recommendationTitle}>Explorar más actividades</h4>
                      <p className={styles.recommendationDescription}>Descubre nuevas experiencias</p>
                    </div>
                  </Link>
                </div>
              </CardContent>
            </Card> */}
          </div>
        </div>
      </main>

      {/* Activity Search Modal */}
      <ActivitySearchModal
        isOpen={showActivitySearch}
        onClose={() => setShowActivitySearch(false)}
        onAddActivity={(business, scheduledDate) => handleActivityAdded(business)}
        tripId={trip?.id || ""}
        tripStartDate={trip?.start_date ? trip.start_date.split('T')[0] : ""}
        tripEndDate={trip?.end_date ? trip.end_date.split('T')[0] : ""}
      />

      {/* Collaborators Dialog */}
      <Dialog open={showCollaborators} onOpenChange={setShowCollaborators}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Colaboradores del viaje</DialogTitle>
            <DialogDescription>
              Agrega personas que puedan editar este itinerario contigo
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search Section */}
            <div className="space-y-2">
              <Label>Buscar usuarios</Label>
              <div className="relative">
                <Input
                  placeholder="Busca por nombre de usuario..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    handleSearchUsers(e.target.value)
                  }}
                />
                {isSearching && (
                  <div className="absolute right-3 top-3">
                    <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-gray-600 rounded-full"></div>
                  </div>
                )}
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                  {searchResults.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-3 hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                          {user.profile_picture ? (
                            <img src={user.profile_picture} alt={user.full_name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-gray-600 font-medium">{user.full_name.charAt(0)}</span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{user.full_name}</p>
                          <p className="text-xs text-gray-500">@{user.username}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleAddCollaborator(user.id)}
                        disabled={collaborators.some(c => c.id === user.id)}
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        {collaborators.some(c => c.id === user.id) ? 'Agregado' : 'Agregar'}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Current Collaborators */}
            <div className="space-y-2">
              <Label>Colaboradores actuales ({collaborators.length})</Label>
              {collaborators.length === 0 ? (
                <p className="text-sm text-gray-500 py-4 text-center">No hay colaboradores aún</p>
              ) : (
                <div className="border rounded-lg divide-y">
                  {collaborators.map((collab) => (
                    <div key={collab.id} className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                          {collab.profile_picture ? (
                            <img src={collab.profile_picture} alt={collab.full_name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-gray-600 font-medium">{collab.full_name.charAt(0)}</span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{collab.full_name}</p>
                          <p className="text-xs text-gray-500">@{collab.username}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveCollaborator(collab.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowCollaborators(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog */}
      <Dialog open={alertDialog.open} onOpenChange={(open) => setAlertDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {alertDialog.type === 'success' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
              {alertDialog.type === 'error' && <AlertCircle className="h-5 w-5 text-red-500" />}
              {alertDialog.type === 'info' && <Info className="h-5 w-5 text-blue-500" />}
              {alertDialog.title}
            </DialogTitle>
            <DialogDescription>
              {alertDialog.message}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            {alertDialog.type === 'confirm' ? (
              <>
                <Button variant="outline" onClick={() => setAlertDialog(prev => ({ ...prev, open: false }))}>
                  Cancelar
                </Button>
                <Button 
                  variant="destructive" 
                  className="destructiveButton hover:bg-[#dc2626]! hover:border-[#dc2626]!"
                  onClick={() => {
                    alertDialog.onConfirm?.()
                    setAlertDialog(prev => ({ ...prev, open: false }))
                  }}
                >
                  Confirmar
                </Button>
              </>
            ) : (
              <Button onClick={() => setAlertDialog(prev => ({ ...prev, open: false }))}>
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
