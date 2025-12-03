"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Heart, MapPin, MessageCircle, ChevronLeft, ChevronRight, ArrowLeft, Calendar } from "lucide-react"
import { getUser } from "@/lib/auth"
import { format } from "date-fns"
import { es } from "date-fns/locale"

import styles from "../explore/page.module.css"

interface FavoriteActivity {
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

interface FavoriteTrip {
  id: number
  name: string
  destination: string
  start_date: string
  end_date: string
  description?: string
  cover_image?: string
  activities: any[]
  user_name: string
  user_profile_picture?: string
  likes_count: number
  created_at: string
}

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<FavoriteActivity[]>([])
  const [favoriteTrips, setFavoriteTrips] = useState<FavoriteTrip[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [imageIndexes, setImageIndexes] = useState<Record<number, number>>({})
  const router = useRouter()

  useEffect(() => {
    const user = getUser()
    if (!user) {
      router.push("/sign-in")
      return
    }

    fetchFavorites()
    fetchFavoriteTrips()
  }, [router])

  const fetchFavorites = async () => {
    try {
      const token = localStorage.getItem('token')

      if (!token) {
        setError("No autorizado")
        return
      }

      const response = await fetch('/api/favorites', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error("Error al cargar favoritos")
      }

      const data = await response.json()
      setFavorites(data)
    } catch (err) {
      console.error("Error fetching favorites:", err)
      setError(err instanceof Error ? err.message : "Error desconocido")
    }
  }

  const fetchFavoriteTrips = async () => {
    try {
      const token = localStorage.getItem('token')

      if (!token) {
        return
      }

      const response = await fetch('/api/favorites/trips', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error("Error al cargar viajes favoritos")
      }

      const data = await response.json()
      setFavoriteTrips(data)
    } catch (err) {
      console.error("Error fetching favorite trips:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleFavorite = async (businessId: number) => {
    const token = localStorage.getItem('token')
    if (!token) return

    try {
      const response = await fetch(`/api/favorites/${businessId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        // Remove from local state
        setFavorites(prev => prev.filter(fav => fav.business_id !== businessId))
      }
    } catch (error) {
      console.error('Error removing favorite:', error)
    }
  }

  const toggleTripFavorite = async (tripId: number) => {
    const token = localStorage.getItem('token')
    if (!token) return

    try {
      const response = await fetch(`/api/favorites/trips/${tripId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        // Remove from local state
        setFavoriteTrips(prev => prev.filter(trip => trip.id !== tripId))
      }
    } catch (error) {
      console.error('Error removing trip favorite:', error)
    }
  }

  const nextImage = (id: number, maxImages: number) => {
    setImageIndexes(prev => ({
      ...prev,
      [id]: ((prev[id] || 0) + 1) % maxImages
    }))
  }

  const prevImage = (id: number, maxImages: number) => {
    setImageIndexes(prev => ({
      ...prev,
      [id]: ((prev[id] || 0) - 1 + maxImages) % maxImages
    }))
  }

  return (
    <div className={styles.pageContainer}>
      <Header />

      <main className={styles.mainContent}>
        <div className={styles.contentWrapper}>
          {/* Header Section */}
          <div className={styles.headerSection}>
            <div className={styles.headerTop}>
              <Button
                variant="ghost"
                onClick={() => router.back()}
                className={styles.backButton}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
              </Button>
              <h1 className={styles.mainTitle}>
                Mis Favoritos
              </h1>
            </div>
            <p className={styles.subtitle}>
              Tus <strong>actividades y viajes favoritos</strong> guardados para futuras aventuras.
            </p>
          </div>

          {isLoading ? (
            <div className={styles.loadingContainer}>
              <Loader2 className={styles.loadingSpinner} />
            </div>
          ) : error ? (
            <div className={styles.errorContainer}>
              <p className={styles.errorTitle}>Error al cargar favoritos</p>
              <p className={styles.errorText}>{error}</p>
              <Button onClick={() => { fetchFavorites(); fetchFavoriteTrips(); }} className={styles.retryButton}>
                Reintentar
              </Button>
            </div>
          ) : (
            <Tabs defaultValue="activities" className="w-full max-w-[1400px] mx-auto">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="activities">Actividades ({favorites.length})</TabsTrigger>
                <TabsTrigger value="trips">Viajes ({favoriteTrips.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="activities">
                {favorites.length === 0 ? (
                  <div className={styles.emptyState}>
                    <Heart className={styles.emptyIcon} />
                    <p className={styles.emptyTitle}>No tienes actividades favoritas</p>
                    <p className={styles.emptyMessage}>
                      Explora actividades y guarda las que más te gusten.
                    </p>
                    <Button onClick={() => router.push('/explore')} className={styles.retryButton}>
                      Explorar Actividades
                    </Button>
                  </div>
                ) : (
                  <div className={styles.attractionsGrid}>
                    {favorites.map((favorite, index) => {
                      const activity = {
                        id: favorite.business_id,
                        name: favorite.business_name,
                        description: favorite.business_description || '',
                        categories: favorite.business_categories,
                        location: { city: favorite.business_location.split(',')[1]?.trim() || '', state: favorite.business_location.split(',')[2]?.trim() || '' },
                        rating: favorite.business_rating,
                        review_count: favorite.business_review_count,
                        price_level: favorite.business_price_level,
                        images: favorite.business_images,
                        tags: favorite.business_tags,
                        is_active: true,
                        allows_bookings: true,
                        max_capacity: undefined
                      }

                      const currentImageIndex = imageIndexes[activity.id] || 0
                      const hasMultipleImages = activity.images.length > 1

                      return (
                        <div key={favorite.id} className={styles.attractionCard}>
                          {/* Image Section */}
                          <div className={styles.imageContainer}>
                            <div className={styles.imageWrapper}>
                              <img
                                src={activity.images[currentImageIndex] || '/images/placeholder-business.jpg'}
                                alt={activity.name}
                                className={styles.cardImage}
                              />

                              {/* Favorite Button - Always filled since these are favorites */}
                              <button
                                className={styles.favoriteButton}
                                onClick={() => toggleFavorite(activity.id)}
                                aria-label="Remover de favoritos"
                              >
                                <Heart
                                  className={styles.heartIcon}
                                  fill="currentColor"
                                />
                              </button>

                              {/* Navigation Arrows */}
                              {hasMultipleImages && (
                                <>
                                  <button
                                    className={`${styles.navButton} ${styles.navButtonLeft}`}
                                    onClick={(e) => {
                                      e.preventDefault()
                                      prevImage(activity.id, activity.images.length)
                                    }}
                                    aria-label="Imagen anterior"
                                  >
                                    <ChevronLeft className={styles.navIcon} />
                                  </button>
                                  <button
                                    className={`${styles.navButton} ${styles.navButtonRight}`}
                                    onClick={(e) => {
                                      e.preventDefault()
                                      nextImage(activity.id, activity.images.length)
                                    }}
                                    aria-label="Imagen siguiente"
                                  >
                                    <ChevronRight className={styles.navIcon} />
                                  </button>

                                  {/* Image Indicators */}
                                  <div className={styles.imageIndicators}>
                                    {activity.images.map((_, imgIndex) => (
                                      <div
                                        key={imgIndex}
                                        className={`${styles.indicator} ${imgIndex === currentImageIndex ? styles.indicatorActive : ''}`}
                                      />
                                    ))}
                                  </div>
                                </>
                              )}

                              {/* Badge */}
                              <div className={styles.badge}>
                                {activity.categories[0] || 'Sin categoría'}
                              </div>
                            </div>
                          </div>

                          {/* Content Section */}
                          <div
                            className={styles.cardContent}
                            onClick={() => router.push(`/activity/${activity.id}`)}
                            role="button"
                            tabIndex={0}
                          >
                            <div className={styles.cardHeader}>
                              <span className={styles.cardNumber}>{index + 1}.</span>
                              <h2 className={styles.cardTitle}>{activity.name}</h2>
                            </div>

                            {/* Rating */}
                            <div className={styles.ratingSection}>
                              <div className={styles.ratingBubbles}>
                                {[...Array(5)].map((_, i) => (
                                  <div
                                    key={i}
                                    className={`${styles.ratingBubble} ${i < Math.floor(activity.rating) ? styles.ratingBubbleFilled : ''}`}
                                  />
                                ))}
                              </div>
                              <span className={styles.reviewCount}>
                                ({activity.review_count.toLocaleString()})
                              </span>
                            </div>

                            {/* Category Badge */}
                            <div className={styles.categoryBadge}>
                              {activity.tags.slice(0, 2).join(' • ')}
                            </div>

                            {/* Description */}
                            <p className={styles.cardDescription}>
                              {activity.description.slice(0, 150)}
                              {activity.description.length > 150 && '...'}
                            </p>

                            {/* Footer */}
                            <div className={styles.cardFooter}>
                              <div className={styles.locationInfo}>
                                <MapPin className={styles.locationIcon} />
                                <span>{activity.location.city}, {activity.location.state}</span>
                              </div>
                              <div className={styles.statsContainer}>
                                <div className={styles.statItem}>
                                  <Heart className={styles.statIcon} />
                                  <span className={styles.statCount}>
                                    ❤️
                                  </span>
                                </div>
                                <div className={styles.statItem}>
                                  <MessageCircle className={styles.statIcon} />
                                  <span className={styles.statCount}>
                                    {activity.review_count}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="trips">
                {favoriteTrips.length === 0 ? (
                  <div className={styles.emptyState}>
                    <Heart className={styles.emptyIcon} />
                    <p className={styles.emptyTitle}>No tienes viajes favoritos</p>
                    <p className={styles.emptyMessage}>
                      Explora viajes en la comunidad y guarda los que más te inspiren.
                    </p>
                    <Button onClick={() => router.push('/community')} className={styles.retryButton}>
                      Explorar Comunidad
                    </Button>
                  </div>
                ) : (
                  <div className={styles.attractionsGrid}>
                    {favoriteTrips.map((trip, index) => {
                      const tripImages = trip.activities
                        .filter((a: any) => a.images && a.images.length > 0)
                        .flatMap((a: any) => a.images)
                      const currentImageIndex = imageIndexes[trip.id] || 0
                      const hasImages = tripImages.length > 0

                      return (
                        <div key={trip.id} className={styles.attractionCard}>
                          {/* Image Section */}
                          <div className={styles.imageContainer}>
                            <div className={styles.imageWrapper}>
                              <img
                                src={tripImages[currentImageIndex] || trip.cover_image || '/images/placeholder-trip.jpg'}
                                alt={trip.name}
                                className={styles.cardImage}
                              />

                              {/* Favorite Button */}
                              <button
                                className={styles.favoriteButton}
                                onClick={() => toggleTripFavorite(trip.id)}
                                aria-label="Remover de favoritos"
                              >
                                <Heart
                                  className={styles.heartIcon}
                                  fill="currentColor"
                                />
                              </button>

                              {/* Navigation Arrows */}
                              {hasImages && tripImages.length > 1 && (
                                <>
                                  <button
                                    className={`${styles.navButton} ${styles.navButtonLeft}`}
                                    onClick={(e) => {
                                      e.preventDefault()
                                      prevImage(trip.id, tripImages.length)
                                    }}
                                    aria-label="Imagen anterior"
                                  >
                                    <ChevronLeft className={styles.navIcon} />
                                  </button>
                                  <button
                                    className={`${styles.navButton} ${styles.navButtonRight}`}
                                    onClick={(e) => {
                                      e.preventDefault()
                                      nextImage(trip.id, tripImages.length)
                                    }}
                                    aria-label="Imagen siguiente"
                                  >
                                    <ChevronRight className={styles.navIcon} />
                                  </button>

                                  {/* Image Indicators */}
                                  <div className={styles.imageIndicators}>
                                    {tripImages.map((_, imgIndex) => (
                                      <div
                                        key={imgIndex}
                                        className={`${styles.indicator} ${imgIndex === currentImageIndex ? styles.indicatorActive : ''}`}
                                      />
                                    ))}
                                  </div>
                                </>
                              )}

                              {/* Badge */}
                              <div className={styles.badge}>
                                Viaje
                              </div>
                            </div>
                          </div>

                          {/* Content Section */}
                          <div
                            className={styles.cardContent}
                            onClick={() => router.push(`/trips/${trip.id}/view`)}
                            role="button"
                            tabIndex={0}
                          >
                            <div className={styles.cardHeader}>
                              <span className={styles.cardNumber}>{index + 1}.</span>
                              <h2 className={styles.cardTitle}>{trip.name}</h2>
                            </div>

                            {/* Trip Creator */}
                            <div className={styles.creatorInfo}>
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                                {trip.user_profile_picture ? (
                                  <img
                                    src={trip.user_profile_picture}
                                    alt={trip.user_name}
                                    className="w-full h-full rounded-full object-cover"
                                  />
                                ) : (
                                  <span>{trip.user_name.charAt(0).toUpperCase()}</span>
                                )}
                              </div>
                              <span className="text-sm text-muted-foreground">por {trip.user_name}</span>
                            </div>

                            {/* Description */}
                            <p className={styles.cardDescription}>
                              {trip.description || `Viaje increíble a ${trip.destination}`}
                            </p>

                            {/* Footer */}
                            <div className={styles.cardFooter}>
                              <div className={styles.locationInfo}>
                                <MapPin className={styles.locationIcon} />
                                <span>{trip.destination}</span>
                              </div>
                              <div className={styles.tripDateInfo}>
                                <Calendar className={styles.locationIcon} />
                                <span>
                                  {format(new Date(trip.start_date), "MMM d", { locale: es })} - {format(new Date(trip.end_date), "MMM d, yyyy", { locale: es })}
                                </span>
                              </div>
                              <div className={styles.statsContainer}>
                                <div className={styles.statItem}>
                                  <Heart className={styles.statIcon} />
                                  <span className={styles.statCount}>
                                    {trip.likes_count}
                                  </span>
                                </div>
                                <div className={styles.statItem}>
                                  <MessageCircle className={styles.statIcon} />
                                  <span className={styles.statCount}>
                                    {trip.activities.length}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
