"use client"

import { useState, useMemo, useEffect, useRef, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { FlashSaleCarousel } from "./FlashSaleCarousel"
import { Button } from "@/components/ui/button"
import {
  Search,
  Loader2,
  MapPin,
  Grid3x3,
  Heart,
  ChevronLeft,
  ChevronRight,
  Plus,
  MessageCircle,
  ChevronDown,
  Filter,
} from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import dynamic from "next/dynamic"
import styles from "./page.module.css"
import { FilterSidebar } from "@/components/filter-sidebar"

// Dynamic import for Map component to avoid SSR issues
const Map = dynamic(() => import("./MapComponent"), { ssr: false })

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
  price_level: number
  images: string[]
  tags: string[]
  is_active: boolean
  allows_bookings: boolean
  max_capacity?: number
  is_unique?: boolean
}

export default function ExplorePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activities, setActivities] = useState<Business[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid")
  const [favorites, setFavorites] = useState<Set<number>>(new Set())
  const [imageIndexes, setImageIndexes] = useState<Record<number, number>>({})
  const [favoriteCounts, setFavoriteCounts] = useState<Record<number, number>>({})
  const [userTrips, setUserTrips] = useState<any[]>([])
  const [showTripSelector, setShowTripSelector] = useState<number | null>(null)
  const [showDateDialog, setShowDateDialog] = useState(false)
  const [selectedTrip, setSelectedTrip] = useState<any>(null)
  const [selectedBusinessId, setSelectedBusinessId] = useState<number | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>("")
  const [showFilters, setShowFilters] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const observerTarget = useRef<HTMLDivElement>(null)
  const PAGE_SIZE = 20

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (userData) {
      const parsedUser = JSON.parse(userData)
      if (parsedUser.role === "business") {
        router.push("/dashboard/business")
      }
    }

    // If the home page sent a category/search via query params, prefill local filters
    const categoryParam = searchParams?.get("category")
    const searchParam = searchParams?.get("search")
    const tagsParam = searchParams?.get("tags")
    const minPriceParam = searchParams?.get("minPrice")
    const maxPriceParam = searchParams?.get("maxPrice")

    if (categoryParam) {
      setFilters((prev) => ({ ...prev, categories: [categoryParam] }))
    }
    if (searchParam) {
      setSearchQuery(searchParam)
    }
    if (tagsParam) {
      setSearchQuery(tagsParam.split(",").join(" "))
    }
    if (minPriceParam && maxPriceParam) {
      setFilters((prev) => ({
        ...prev,
        priceRange: [Number.parseInt(minPriceParam), Number.parseInt(maxPriceParam)],
      }))
    }

    fetchBusinesses()
    loadFavorites()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  const fetchBusinesses = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || "https://localhost:8000"}/api/businesses?skip=0&limit=${PAGE_SIZE}`)

      if (!response.ok) {
        throw new Error("Error al cargar los establecimientos")
      }

      const data = await response.json()
      setActivities(data)
      setPage(1)
      setHasMore(data.length === PAGE_SIZE)

      // Load favorite counts for all businesses
      await loadFavoriteCounts(data)
    } catch (err) {
      console.error("Error fetching businesses:", err)
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setIsLoading(false)
    }
  }

  const loadMoreActivities = useCallback(async () => {
    if (isLoadingMore || !hasMore) return

    try {
      setIsLoadingMore(true)
      const nextPage = page + 1
      const skip = page * PAGE_SIZE // page empieza en 1
      const url = `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/api/businesses?skip=${skip}&limit=${PAGE_SIZE}`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error("Error al cargar más establecimientos")
      }

      const data: Business[] = await response.json()

      if (data.length === 0) {
        setHasMore(false)
      } else {
        setActivities(prev => [...prev, ...data])
        await loadFavoriteCounts(data)
        setPage(nextPage)
        if (data.length < PAGE_SIZE) {
          setHasMore(false)
        }
      }
    } catch (err) {
      console.error("Error loading more businesses:", err)
    } finally {
      setIsLoadingMore(false)
    }
  }, [page, isLoadingMore, hasMore, PAGE_SIZE])

  const loadFavorites = async () => {
    const token = localStorage.getItem("token")
    if (!token) return

    try {
      const response = await fetch("/api/favorites", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const favoritesData = await response.json()
        const favoriteIds = new Set<number>(favoritesData.map((fav: any) => fav.business_id as number))
        setFavorites(favoriteIds)
      }
    } catch (error) {
      console.error("Error loading favorites:", error)
    }
  }

  const loadFavoriteCounts = async (businesses: Business[]) => {
    const counts: Record<number, number> = {}

    for (const business of businesses) {
      try {
        const response = await fetch(`/api/favorites/count/${business.id}`)
        if (response.ok) {
          const data = await response.json()
          counts[business.id] = data.count
        }
      } catch (error) {
        console.error(`Error loading favorite count for business ${business.id}:`, error)
        counts[business.id] = 0
      }
    }

    setFavoriteCounts(counts)
  }

  const toggleFavorite = async (id: number) => {
    const token = localStorage.getItem("token")
    if (!token) {
      // TODO: Show login dialog
      console.log("User not logged in")
      return
    }

    try {
      const isCurrentlyFavorite = favorites.has(id)

      if (isCurrentlyFavorite) {
        // Remove from favorites
        const response = await fetch(`/api/favorites/${id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })

        if (response.ok) {
          const newFavorites = new Set(favorites)
          newFavorites.delete(id)
          setFavorites(newFavorites)
          // Update favorite count
          setFavoriteCounts((prev) => ({
            ...prev,
            [id]: Math.max(0, (prev[id] || 0) - 1),
          }))
        }
      } else {
        // Add to favorites
        const response = await fetch("/api/favorites", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ business_id: id }),
        })

        if (response.ok) {
          const newFavorites = new Set(favorites)
          newFavorites.add(id)
          setFavorites(newFavorites)
          // Update favorite count
          setFavoriteCounts((prev) => ({
            ...prev,
            [id]: (prev[id] || 0) + 1,
          }))
        }
      }
    } catch (error) {
      console.error("Error toggling favorite:", error)
    }
  }

  const loadUserTrips = async () => {
    const token = localStorage.getItem("token")
    if (!token) return

    try {
      const response = await fetch("https://localhost:8000/api/trips/", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const trips = await response.json()
        setUserTrips(trips)
      }
    } catch (error) {
      console.error("Error loading trips:", error)
    }
  }

  const addToTrip = async (businessId: number, tripId: string, scheduledDate: string) => {
    const token = localStorage.getItem("token")
    if (!token) return

    if (!scheduledDate) {
      alert("Por favor selecciona una fecha para la actividad")
      return
    }

    try {
      const business = activities.find((a) => a.id === businessId)
      if (!business) return

      const response = await fetch(`https://localhost:8000/api/trips/${tripId}/activities`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          business_id: String(businessId),
          business_name: business.name,
          scheduled_date,
          notes: null,
        }),
      })

      if (response.ok) {
        alert("¡Actividad agregada al itinerario!")
        setShowDateDialog(false)
        setShowTripSelector(null)
        setSelectedTrip(null)
        setSelectedBusinessId(null)
        setSelectedDate("")
      } else {
        alert("Error al agregar la actividad")
      }
    } catch (error) {
      console.error("Error adding to trip:", error)
      alert("Error al agregar la actividad")
    }
  }

  const handleAddToItinerary = async (businessId: number) => {
    const token = localStorage.getItem("token")
    if (!token) {
      alert("Debes iniciar sesión para agregar actividades a un itinerario")
      router.push("/sign-in")
      return
    }

    // Load user trips if not loaded
    let trips = userTrips
    if (trips.length === 0) {
      await loadUserTrips()
      // Re-fetch trips directly to ensure we have the latest data
      try {
        const response = await fetch("http://localhost:8000/api/trips/", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        if (response.ok) {
          trips = await response.json()
          setUserTrips(trips)
        }
      } catch (error) {
        console.error("Error loading trips:", error)
      }
    }

    // If user has no trips, redirect to create one
    if (trips.length === 0) {
      if (confirm("No tienes viajes. ¿Quieres crear uno?")) {
        router.push("/trips/new")
      }
      return
    }

    // Show trip selector
    setShowTripSelector(businessId)
  }

  const nextImage = (id: number, maxImages: number) => {
    setImageIndexes((prev) => ({
      ...prev,
      [id]: ((prev[id] || 0) + 1) % maxImages,
    }))
  }

  const prevImage = (id: number, maxImages: number) => {
    setImageIndexes((prev) => ({
      ...prev,
      [id]: ((prev[id] || 0) - 1 + maxImages) % maxImages,
    }))
  }

  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState("recommended")
  const [filters, setFilters] = useState({
    priceRange: [1, 4],
    categories: [] as string[],
    minRating: 0,
  })

  // Lista de categorías disponibles (igual que en BusinessForm)
  const availableCategories = [
    { value: "Restaurante", label: "Restaurante" },
    { value: "Actividad", label: "Actividad" },
    { value: "Atracción", label: "Atracción" },
    { value: "Naturaleza", label: "Naturaleza" },
    { value: "Cultural", label: "Cultural" },
    { value: "Entretenimiento", label: "Entretenimiento" },
    { value: "Compras", label: "Compras" },
    { value: "Vida Nocturna", label: "Vida Nocturna" },
    { value: "Alojamiento", label: "Alojamiento" },
    { value: "Bienestar", label: "Bienestar" },
    { value: "Histórico", label: "Histórico" },
    { value: "Familiar", label: "Familiar" },
  ]

  const handleCategoryToggle = (categoryValue: string) => {
    const currentCategories = filters.categories
    const isSelected = currentCategories.includes(categoryValue)

    if (isSelected) {
      setFilters({
        ...filters,
        categories: currentCategories.filter((cat: string) => cat !== categoryValue),
      })
    } else {
      setFilters({
        ...filters,
        categories: [...currentCategories, categoryValue],
      })
    }
  }

  const filteredActivities = useMemo(() => {
    let filtered = activities.filter((activity) => activity.is_active)
    
    // Debug: Log is_unique values
    console.log("Activities with is_unique:", activities.filter(a => a.is_unique).map(a => ({ id: a.id, name: a.name, is_unique: a.is_unique })))

    if (searchQuery) {
      const searchTerms = searchQuery
        .toLowerCase()
        .split(" ")
        .filter((term) => term.length > 0)

      filtered = filtered.filter((activity) => {
        const matchesName = activity.name.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesDescription = activity.description.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesLocation =
          activity.location.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
          activity.location.state.toLowerCase().includes(searchQuery.toLowerCase())

        // Check if any search term matches any tag
        const matchesTags = searchTerms.some((term) => activity.tags.some((tag) => tag.toLowerCase().includes(term)))

        return matchesName || matchesDescription || matchesLocation || matchesTags
      })
    }

    // Apply category filter
    if (filters.categories.length > 0) {
      filtered = filtered.filter((activity) => activity.categories.some((cat) => filters.categories.includes(cat)))
    }

    // Apply price range filter
    filtered = filtered.filter(
      (activity) => activity.price_level >= filters.priceRange[0] && activity.price_level <= filters.priceRange[1],
    )

    // Apply minimum rating filter
    if (filters.minRating > 0) {
      filtered = filtered.filter((activity) => activity.rating >= filters.minRating)
    }

    // Apply sorting
    switch (sortBy) {
      case "rating":
        filtered = [...filtered].sort((a, b) => b.rating - a.rating)
        break
      case "reviews":
        filtered = [...filtered].sort((a, b) => b.review_count - a.review_count)
        break
      case "price-low":
        filtered = [...filtered].sort((a, b) => a.price_level - b.price_level)
        break
      case "price-high":
        filtered = [...filtered].sort((a, b) => b.price_level - a.price_level)
        break
      default:
        // Keep recommended order
        break
    }

    return filtered
  }, [activities, searchQuery, filters, sortBy])

  const gridAvailableCategories = useMemo(() => {
    const categorySet = new Set<string>()
    activities
      .filter((activity) => activity.is_active)
      .forEach((activity) => {
        activity.categories.forEach((cat) => categorySet.add(cat))
      })
    return Array.from(categorySet).sort()
  }, [activities])

  // Infinite scroll observer
  useEffect(() => {
    if (viewMode !== 'grid') return

    const target = observerTarget.current
    if (!target) return

    console.log('[InfiniteScroll] Mount observer. hasMore=', hasMore, 'isLoadingMore=', isLoadingMore, 'page=', page)

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry.isIntersecting) {
          console.log('[InfiniteScroll] Sentinel intersecting. hasMore=', hasMore, 'isLoadingMore=', isLoadingMore, 'page=', page)
          if (hasMore && !isLoadingMore) {
            loadMoreActivities()
          }
        }
      },
      {
        root: null,
        rootMargin: '200px 0px 400px 0px', // pre-carga antes de tocar fondo y extra margen inferior
        threshold: 0 // disparamos al primer píxel visible
      }
    )

    observer.observe(target)

    return () => {
      observer.disconnect()
    }
  }, [hasMore, isLoadingMore, loadMoreActivities, viewMode, page])

  // Fallback por scroll manual en caso de que el observer falle (algunas combinaciones de layout / CSS)
  useEffect(() => {
    if (viewMode !== 'grid') return
    const onScroll = () => {
      if (!hasMore || isLoadingMore) return
      const scrollPosition = window.innerHeight + window.scrollY
      const threshold = document.body.offsetHeight - 600 // a 600px del final
      if (scrollPosition >= threshold) {
        console.log('[InfiniteScroll][Fallback] Cerca del final, intentando cargar más. page=', page)
        loadMoreActivities()
      }
    }
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [hasMore, isLoadingMore, loadMoreActivities, viewMode, page])

  // Desactivamos backfill inicial para evitar doble request en carga

  return (
    <div className={styles.pageContainer}>
      <Header />

      <main className={styles.mainContent}>
        <div className={styles.contentWrapper}>
          {/* Header Section */}
          <div className={styles.headerSection}>
            <div className={styles.headerTop}>
              <h1 className={styles.mainTitle}>Las experiencias más populares</h1>
              <div className={styles.viewButtons}>
                <Button
                  variant={viewMode === "grid" ? "default" : "outline"}
                  onClick={() => setViewMode("grid")}
                  className={styles.viewButton}
                >
                  <Grid3x3 className={styles.viewIcon} />
                  Ver todo
                </Button>
                <Button
                  variant={viewMode === "map" ? "default" : "outline"}
                  onClick={() => setViewMode("map")}
                  className={styles.viewButton}
                >
                  <MapPin className={styles.viewIcon} />
                  Mapa
                </Button>
              </div>
            </div>
            <p className={styles.subtitle}>
              Los <strong>establecimientos</strong> se basan en datos de otros usuarios. Tomamos en consideración sus
              opiniones y calificaciones, la cantidad de visualizaciones de la página y su ubicación.
            </p>
          </div>

          {/* Flash Sale Carousel */}
          <FlashSaleCarousel />

          {isLoading ? (
            <div className={styles.loadingContainer}>
              <Loader2 className={styles.loadingSpinner} />
            </div>
          ) : error ? (
            <div className={styles.errorContainer}>
              <p className={styles.errorTitle}>Error al cargar experiencias</p>
              <p className={styles.errorText}>{error}</p>
              <Button onClick={fetchBusinesses} className={styles.retryButton}>
                Reintentar
              </Button>
            </div>
          ) : (
            <>
              {/* Grid View */}
              {viewMode === "grid" && (
                <>
                  {/* Filter Toggle Button - visible only on < 1024px */}
                  <Button
                    variant="outline"
                    className={styles.filterToggleButton}
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    <Filter className={styles.filterIcon} />
                    Filtros
                  </Button>

                  <div className={styles.gridWithSidebar}>
                    <div 
                      className={`${styles.filterSidebarWrapper} ${showFilters ? styles.filterSidebarVisible : ''}`}
                      onClick={() => setShowFilters(false)}
                    >
                      <div onClick={(e) => e.stopPropagation()}>
                        <FilterSidebar
                          availableCategories={gridAvailableCategories}
                          onFilterChange={(f) => {
                            setFilters((prev) => ({
                              ...prev,
                              priceRange: f.priceRange ?? prev.priceRange,
                              categories: Array.isArray(f.categories) ? f.categories : prev.categories,
                              minRating: typeof f.minRating === 'number' ? f.minRating : prev.minRating,
                            }))
                          }}
                        />
                      </div>
                    </div>
                    <div className={styles.attractionsGrid}>
                  {filteredActivities.map((activity, index) => {
                    const currentImageIndex = imageIndexes[activity.id] || 0
                    const hasMultipleImages = activity.images.length > 1

                    return (
                      <div key={activity.id} className={styles.attractionCard}>
                        {/* Image Section */}
                        <div className={styles.imageContainer}>
                          <div className={styles.imageWrapper}>
                            <img
                              src={activity.images[currentImageIndex] || "/images/placeholder-business.jpg"}
                              alt={activity.name}
                              className={styles.cardImage}
                            />

                            {/* Favorite Button */}
                            <button
                              className={styles.favoriteButton}
                              onClick={() => toggleFavorite(activity.id)}
                              aria-label="Guardar en favoritos"
                            >
                              <Heart
                                className={styles.heartIcon}
                                fill={favorites.has(activity.id) ? "currentColor" : "none"}
                              />
                            </button>

                            {/* Add to Itinerary Button */}
                            <button
                              className={styles.itineraryButton}
                              onClick={(e) => {
                                e.preventDefault()
                                handleAddToItinerary(activity.id)
                              }}
                              aria-label="Agregar a itinerario"
                            >
                              <Plus className={styles.plusIcon} />
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
                                      className={`${styles.indicator} ${imgIndex === currentImageIndex ? styles.indicatorActive : ""}`}
                                    />
                                  ))}
                                </div>
                              </>
                            )}

                            {/* Badge */}
                            <div className={styles.badge}>{activity.categories[0] || "Sin categoría"}</div>
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
                            {activity.is_unique && <span className={styles.uniqueBadge}>Único</span>}
                          </div>

                          {/* Rating */}
                          <div className={styles.ratingSection}>
                            <div className={styles.ratingBubbles}>
                              {[...Array(5)].map((_, i) => (
                                <div
                                  key={i}
                                  className={`${styles.ratingBubble} ${i < Math.floor(activity.rating) ? styles.ratingBubbleFilled : ""}`}
                                />
                              ))}
                            </div>
                            <span className={styles.reviewCount}>({activity.review_count.toLocaleString()})</span>
                          </div>

                          {/* Category Badge */}
                          <div className={styles.categoryBadge}>{activity.tags.slice(0, 2).join(" • ")}</div>

                          {/* Description */}
                          <p className={styles.cardDescription}>
                            {activity.description.slice(0, 150)}
                            {activity.description.length > 150 && "..."}
                          </p>

                          {/* Footer */}
                          <div className={styles.cardFooter}>
                            <div className={styles.locationInfo}>
                              <MapPin className={styles.locationIcon} />
                              <span>
                                {activity.location.city}, {activity.location.state}
                              </span>
                            </div>
                            <div className={styles.statsContainer}>
                              <div className={styles.statItem}>
                                <Heart className={styles.statIcon} />
                                <span className={styles.statCount}>{favoriteCounts[activity.id] || 0}</span>
                              </div>
                              <div className={styles.statItem}>
                                <MessageCircle className={styles.statIcon} />
                                <span className={styles.statCount}>{activity.review_count}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  {/* Infinite Scroll Loader */}
                  <div ref={observerTarget} className={styles.scrollSentinel}>
                    {isLoadingMore && (
                      <div className={styles.loadingMoreContainer}>
                        <Loader2 className={styles.loadingSpinner} />
                        <span>Cargando más actividades...</span>
                      </div>
                    )}
                  </div>
                </div>
                </div>
              </>
              )}

              {/* Map View */}
              {viewMode === "map" && (
                <div className={styles.mapLayout}>
                  {/* Sidebar with Filters */}
                  <div className={styles.mapSidebar}>
                    <div className={styles.filterSection}>
                      <h3 className={styles.filterTitle}>Buscar</h3>
                      <input
                        type="text"
                        placeholder="Buscar establecimientos..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={styles.searchInput}
                      />
                    </div>

                    <div className={styles.filterSection}>
                      <h3 className={styles.filterTitle}>Rango de Precio</h3>
                      <div className={styles.priceRangeSelects}>
                        <div className={styles.priceSelectGroup}>
                          <label className={styles.priceSelectLabel}>Mínimo</label>
                          <select
                            value={filters.priceRange[0]}
                            onChange={(e) => {
                              const newMin = Number.parseInt(e.target.value)
                              setFilters((prev) => ({
                                ...prev,
                                priceRange: [newMin, Math.max(newMin, prev.priceRange[1])],
                              }))
                            }}
                            className={styles.priceSelect}
                          >
                            <option value={1}>$</option>
                            <option value={2}>$$</option>
                            <option value={3}>$$$</option>
                            <option value={4}>$$$$</option>
                          </select>
                        </div>
                        <div className={styles.priceSelectGroup}>
                          <label className={styles.priceSelectLabel}>Máximo</label>
                          <select
                            value={filters.priceRange[1]}
                            onChange={(e) => {
                              const newMax = Number.parseInt(e.target.value)
                              setFilters((prev) => ({
                                ...prev,
                                priceRange: [Math.min(prev.priceRange[0], newMax), newMax],
                              }))
                            }}
                            className={styles.priceSelect}
                          >
                            <option value={1}>$</option>
                            <option value={2}>$$</option>
                            <option value={3}>$$$</option>
                            <option value={4}>$$$$</option>
                          </select>
                        </div>
                      </div>
                      <div className={styles.priceRangeDisplay}>
                        Rango seleccionado: {"$".repeat(filters.priceRange[0])} - {"$".repeat(filters.priceRange[1])}
                      </div>
                    </div>

                    <div className={styles.filterSection}>
                      <h3 className={styles.filterTitle}>Calificación Mínima</h3>
                      <select
                        value={filters.minRating}
                        onChange={(e) =>
                          setFilters((prev) => ({ ...prev, minRating: Number.parseInt(e.target.value) }))
                        }
                        className={styles.searchInput}
                      >
                        <option value={0}>Todas las calificaciones</option>
                        <option value={1}>★ y arriba</option>
                        <option value={2}>★★ y arriba</option>
                        <option value={3}>★★★ y arriba</option>
                        <option value={4}>★★★★ y arriba</option>
                        <option value={5}>★★★★★</option>
                      </select>
                    </div>

                    <div className={styles.filterSection}>
                      <h3 className={styles.filterTitle}>Categorías</h3>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={`${styles.multiSelectTrigger} justify-between`}
                          >
                            <span className={styles.multiSelectText}>
                              {filters.categories.length > 0
                                ? filters.categories.length <= 2
                                  ? filters.categories
                                      .map((cat) => availableCategories.find((c) => c.value === cat)?.label)
                                      .join(", ")
                                  : `${filters.categories.length} categorías seleccionadas`
                                : "Seleccionar categorías..."}
                            </span>
                            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className={`${styles.multiSelectContent} w-full p-0`} align="start">
                          <div className="p-2">
                            {availableCategories.map((cat) => (
                              <div key={cat.value} className={styles.multiSelectItem}>
                                <Checkbox
                                  id={`category-${cat.value}`}
                                  checked={filters.categories.includes(cat.value)}
                                  onCheckedChange={() => handleCategoryToggle(cat.value)}
                                />
                                <label
                                  htmlFor={`category-${cat.value}`}
                                  className={`${styles.multiSelectLabel} text-sm font-normal cursor-pointer`}
                                >
                                  {cat.label}
                                </label>
                              </div>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {/* Map Container */}
                  <div className={styles.mapContainer}>
                    <Map businesses={filteredActivities} />
                  </div>
                </div>
              )}

              {filteredActivities.length === 0 && (
                <div className={styles.emptyState}>
                  <Search className={styles.emptyIcon} />
                  <p className={styles.emptyTitle}>No se encontraron experiencias</p>
                  <p className={styles.emptyMessage}>Intenta ajustar tus criterios de búsqueda.</p>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Trip Selector Modal */}
      {showTripSelector !== null && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowTripSelector(null)}
        >
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4">Selecciona un viaje</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {userTrips.map((trip) => (
                <button
                  key={trip.id}
                  className="w-full p-3 text-left border rounded-lg hover:bg-gray-50 transition-colors"
                  onClick={() => {
                    setSelectedTrip(trip)
                    setSelectedBusinessId(showTripSelector)
                    setSelectedDate(trip.start_date.split('T')[0])
                    setShowTripSelector(null)
                    setShowDateDialog(true)
                  }}
                >
                  <div className="font-medium">{trip.name}</div>
                  <div className="text-sm text-gray-500">{trip.destination}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(trip.start_date).toLocaleDateString('es-ES')} - {new Date(trip.end_date).toLocaleDateString('es-ES')}
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" className="flex-1 bg-transparent" onClick={() => setShowTripSelector(null)}>
                Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  setShowTripSelector(null)
                  router.push("/trips/new")
                }}
              >
                Crear Nuevo Viaje
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Date Selection Dialog */}
      <Dialog open={showDateDialog} onOpenChange={setShowDateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Seleccionar fecha</DialogTitle>
            <DialogDescription>
              Elige la fecha en la que realizarás esta actividad durante tu viaje
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedTrip && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">{selectedTrip.name}</p>
                <p className="text-xs text-muted-foreground">{selectedTrip.destination}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="activity-date">Fecha de la actividad</Label>
              <Input
                id="activity-date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={selectedTrip?.start_date?.split('T')[0]}
                max={selectedTrip?.end_date?.split('T')[0]}
                required
              />
              {selectedTrip && (
                <p className="text-xs text-muted-foreground">
                  Selecciona una fecha entre {new Date(selectedTrip.start_date).toLocaleDateString('es-ES')} y {new Date(selectedTrip.end_date).toLocaleDateString('es-ES')}
                </p>
              )}
            </div>
            {selectedBusinessId && activities.find(a => a.id === selectedBusinessId) && (
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <img
                  src={activities.find(a => a.id === selectedBusinessId)?.images?.[0] || "/images/placeholder-business.jpg"}
                  alt={activities.find(a => a.id === selectedBusinessId)?.name}
                  className="h-12 w-12 rounded object-cover flex-shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{activities.find(a => a.id === selectedBusinessId)?.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {activities.find(a => a.id === selectedBusinessId)?.location.city}
                  </p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDateDialog(false)
                setSelectedTrip(null)
                setSelectedBusinessId(null)
                setSelectedDate("")
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (selectedBusinessId && selectedTrip && selectedDate) {
                  addToTrip(selectedBusinessId, selectedTrip.id, selectedDate)
                }
              }}
              disabled={!selectedDate}
            >
              Agregar al itinerario
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  )
}
