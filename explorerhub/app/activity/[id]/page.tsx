"use client"

import { use, useEffect, useState, useCallback, memo } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Star, MapPin, Phone, Globe, DollarSign, Calendar, Heart, Loader2, ArrowLeft, Plus, MessageSquare, Trash2, Reply, AlertCircle, CheckCircle2, Tag, Share2 } from "lucide-react"
import { AuthRequiredDialog } from "@/components/auth-required-dialog"
import { ReviewForm } from "@/components/review-form"
import { PromotionCard } from "@/components/promotion-card"
import { useAuthRequired } from "@/lib/hooks/use-auth-required"
import styles from "./page.module.css"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import dynamic from "next/dynamic"

// Dynamic import for Map component to avoid SSR issues
const ActivityMap = dynamic(() => import("./ActivityMapComponent"), { ssr: false })

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
  phone?: string
  website?: string
  allows_bookings: boolean
  ticket_pricing?: {
    adult_price?: number
    senior_price?: number
    child_price?: number
  }
  hotel_pricing?: {
    price_per_night?: number
    min_nights?: number
    max_nights?: number
  }
  restaurant_pricing?: {
    reservation_fee?: number
    average_price_per_person?: number
    min_consumption?: number
  }
  wellness_pricing?: {
    session_price?: number
    package_price?: number
    sessions_in_package?: number
  }
}

interface Reply {
  id: number
  user_id: string
  user_name: string
  text: string
  created_at: string
  replies: Reply[]
}

interface Review {
  id: number
  user_id: string
  user_name: string
  business_id: string
  rating: number
  title: string
  text: string
  images?: string[]
  helpful_count: number
  replies: Reply[]
  created_at: string
}

interface Promotion {
  id: number
  title: string
  description: string
  discount_percentage?: number
  discount_amount?: number
  code?: string
  promotion_type: string  // "code" | "automatic"
  start_date: string
  end_date: string
  terms_conditions?: string
  current_uses: number
  max_uses?: number
  min_purchase?: number
  is_active: boolean
  business_id: number
  applies_to_ticket_types?: string[]
}

// Componente recursivo para renderizar respuestas (fuera del componente principal)
const RenderReply = memo(({ 
  reply, 
  reviewId, 
  depth = 0,
  parentKey = '',
  replyingToReply,
  nestedReplyTexts,
  setNestedReplyTexts,
  setReplyingToReply,
  handleReplyToReply,
  handleSubmitNestedReply,
  handleDeleteReply,
  isOwnReply,
  styles
}: { 
  reply: Reply
  reviewId: number
  depth?: number
  parentKey?: string
  replyingToReply: string | null
  nestedReplyTexts: Record<string, string>
  setNestedReplyTexts: (value: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void
  setReplyingToReply: (value: string | null) => void
  handleReplyToReply: (reviewId: number, replyId: number, uniqueKey: string) => void
  handleSubmitNestedReply: (uniqueKey: string, reviewId: number, replyId: number) => void
  handleDeleteReply: (reviewId: number, replyId: number) => void
  isOwnReply: (reply: Reply) => boolean
  styles: any
}) => {
  const uniqueKey = parentKey ? `${parentKey}-${reply.id}` : `${reviewId}-${reply.id}`
  // Usar uniqueKey en lugar de replyKey simple para evitar colisiones
  const replyKey = uniqueKey
  const currentText = nestedReplyTexts[replyKey] || ""
  return (
    <div className={styles.replyItem} style={{ marginLeft: `${depth * 20}px` }}>
      <div className={styles.replyHeader}>
        <span className={styles.replyAuthor}>{reply.user_name}</span>
        <span className={styles.replyDate}>
          {new Date(reply.created_at).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })}
        </span>
      </div>
      <p className={styles.replyText}>{reply.text}</p>
      
      <div className={styles.replyActions}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleReplyToReply(reviewId, reply.id, uniqueKey)}
          className={styles.replyActionButton}
        >
          <Reply className="h-3 w-3 mr-1" />
          Responder
        </Button>
        
        {isOwnReply(reply) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteReply(reviewId, reply.id)}
            className={styles.deleteReplyButton}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Nested Reply Form */}
      {replyingToReply === uniqueKey && (
        <div className={styles.replyForm} style={{ marginTop: '10px' }}>
          <textarea
            key={uniqueKey}
            value={currentText}
            onChange={(e) => setNestedReplyTexts(prev => ({
              ...prev,
              [replyKey]: e.target.value
            }))}
            placeholder="Escribe tu respuesta..."
            className={styles.replyTextarea}
            rows={3}
            autoFocus
            dir="ltr"
            style={{ direction: 'ltr', textAlign: 'left', unicodeBidi: 'normal' }}
          />
          <div className={styles.replyFormActions}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setReplyingToReply(null)
                setNestedReplyTexts(prev => {
                  const newTexts = { ...prev }
                  delete newTexts[replyKey]
                  return newTexts
                })
              }}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={() => handleSubmitNestedReply(uniqueKey, reviewId, reply.id)}
            >
              Enviar
            </Button>
          </div>
        </div>
      )}

      {/* Render nested replies recursively */}
      {reply.replies && reply.replies.length > 0 && (
        <div className={styles.nestedRepliesContainer}>
          {reply.replies.map((nestedReply, index) => (
            <RenderReply 
              key={`${uniqueKey}-${index}-${nestedReply.id}`}
              reply={nestedReply} 
              reviewId={reviewId}
              depth={depth + 1}
              parentKey={`${uniqueKey}-${index}`}
              replyingToReply={replyingToReply}
              nestedReplyTexts={nestedReplyTexts}
              setNestedReplyTexts={setNestedReplyTexts}
              setReplyingToReply={setReplyingToReply}
              handleReplyToReply={handleReplyToReply}
              handleSubmitNestedReply={handleSubmitNestedReply}
              handleDeleteReply={handleDeleteReply}
              isOwnReply={isOwnReply}
              styles={styles}
            />
          ))}
        </div>
      )}
    </div>
  )
})

RenderReply.displayName = 'RenderReply'

export default function ActivityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const { id } = resolvedParams
  const router = useRouter()
  const [activity, setActivity] = useState<Business | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const { showAuthDialog, setShowAuthDialog, requireAuth } = useAuthRequired()
  
  const [replyingTo, setReplyingTo] = useState<number | null>(null)
  const [replyText, setReplyText] = useState("")
  const [replyingToReply, setReplyingToReply] = useState<string | null>(null)
  const [nestedReplyTexts, setNestedReplyTexts] = useState<Record<string, string>>({})
  const [expandedReplies, setExpandedReplies] = useState<Set<number>>(new Set())
  const [openBookingDialog, setOpenBookingDialog] = useState(false)
  const [bookingName, setBookingName] = useState("")
  const [bookingAmount, setBookingAmount] = useState("1") // Default 1 person
  const [bookingDate, setBookingDate] = useState("")
  const [bookingTime, setBookingTime] = useState("")
  const [bookingPromoCode, setBookingPromoCode] = useState("")
  const [availablePromoCodes, setAvailablePromoCodes] = useState<any[]>([])
  const [isLoadingPromoCodes, setIsLoadingPromoCodes] = useState(false)
  
  // Ticket selection states
  const [adultCount, setAdultCount] = useState(1)
  const [seniorCount, setSeniorCount] = useState(0)
  const [childCount, setChildCount] = useState(0)
  const [priceCalculation, setPriceCalculation] = useState<any>(null)
  const [isCalculatingPrice, setIsCalculatingPrice] = useState(false)
  const [automaticPromotions, setAutomaticPromotions] = useState<Promotion[]>([])
  const [isLoadingAutomaticPromotions, setIsLoadingAutomaticPromotions] = useState(false)
  const [allAvailablePromotions, setAllAvailablePromotions] = useState<any[]>([])
  const [selectedPromotionId, setSelectedPromotionId] = useState<string>("")
  
  // Hotel booking states
  const [nightsCount, setNightsCount] = useState(1)
  
  // Save to Trip dialog
  const [openSaveToTripDialog, setOpenSaveToTripDialog] = useState(false)
  const [userTrips, setUserTrips] = useState<any[]>([])
  const [selectedTripId, setSelectedTripId] = useState<string>("")
  const [tripNotes, setTripNotes] = useState("")
  const [tripScheduledDate, setTripScheduledDate] = useState("")
  const [isLoadingTrips, setIsLoadingTrips] = useState(false)
  const [isSavingToTrip, setIsSavingToTrip] = useState(false)
  // New add-to-trip flow (like /explore)
  const [showTripSelector, setShowTripSelector] = useState<boolean>(false)
  const [showDateDialog, setShowDateDialog] = useState<boolean>(false)
  const [selectedTrip, setSelectedTrip] = useState<any>(null)
  const [selectedDate, setSelectedDate] = useState<string>("")
  
  // Favorites
  const [isFavorite, setIsFavorite] = useState(false)
  const [isCheckingFavorite, setIsCheckingFavorite] = useState(false)
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false)
  
  // Promotion creation dialog
  const [openPromotionDialog, setOpenPromotionDialog] = useState(false)
  const [isCreatingPromotion, setIsCreatingPromotion] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [isBusinessUser, setIsBusinessUser] = useState(false)
  
  // All promotions modal
  const [openAllPromotionsDialog, setOpenAllPromotionsDialog] = useState(false)
  
  // Recommended activities
  const [recommendedActivities, setRecommendedActivities] = useState<Business[]>([])
  
  const [promotionForm, setPromotionForm] = useState({
    title: "",
    description: "",
    promotionType: "code",  // "code" or "automatic"
    discountType: "percentage",
    discountValue: "",
    code: "",
    startDate: "",
    endDate: "",
    termsConditions: "",
    maxUses: "",
    minPurchase: "",
  })

  // Minimum booking date (local timezone) formatted as YYYY-MM-DD for the date input
  const minBookingDate = (() => {
    const d = new Date()
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  })()

  // Alert/Confirm Dialog states
  const [alertDialog, setAlertDialog] = useState<{
    open: boolean
    type: 'success' | 'error' | 'confirm'
    title: string
    message: string
    onConfirm?: () => void
  }>({
    open: false,
    type: 'success',
    title: '',
    message: ''
  })

  const showAlert = (type: 'success' | 'error', title: string, message: string) => {
    setAlertDialog({ open: true, type, title, message })
  }

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setAlertDialog({ open: true, type: 'confirm', title, message, onConfirm })
  }

  const closeAlert = () => {
    setAlertDialog({ ...alertDialog, open: false })
  }

  useEffect(() => {
    const fetchBusiness = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'https://localhost:8000'}/api/businesses/${resolvedParams.id}`)
        
        if (!response.ok) {
          throw new Error("Negocio no encontrado")
        }

        const data = await response.json()
        setActivity(data)
        
        // Fetch recommended activities based on same city and category
        const fetchRecommended = async () => {
          try {
            const params = new URLSearchParams()
            params.set("city", data.location.city)
            if (data.categories && data.categories.length > 0) {
              params.append("category", data.categories[0])
            }
            params.set("skip", "0")
            params.set("limit", "3")
            
            const recResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'}/api/businesses?${params.toString()}`)
            if (recResponse.ok) {
              const recData = await recResponse.json()
              const filtered = recData.filter((b: Business) => b.id !== data.id).slice(0, 2)
              setRecommendedActivities(filtered)
            }
          } catch (error) {
            console.error("Error fetching recommended activities:", error)
          }
        }
        fetchRecommended()
        
        // Check if current user is the owner
        const userData = localStorage.getItem("user")
        if (userData) {
          try {
            const user = JSON.parse(userData)
            if (user.role === "business") {
              setIsBusinessUser(true)
              if (String(user.id) === String(data.owner_id)) {
                setIsOwner(true)
              }
            }
          } catch (e) {
            console.error("Error parsing user data:", e)
          }
        }

        // Fetch reviews - ruta correcta
        const reviewsResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'https://localhost:8000'}/api/reviews/business/${resolvedParams.id}`)
        console.log("Fetching reviews from:", `${process.env.NEXT_PUBLIC_BACKEND_URL || 'https://localhost:8000'}/api/reviews/business/${resolvedParams.id}`)

        // Fetch promotions
        const promotionsResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'https://localhost:8000'}/api/promotions?business_id=${resolvedParams.id}&active_only=true`)
        console.log("Fetching promotions from:", `${process.env.NEXT_PUBLIC_BACKEND_URL || 'https://localhost:8000'}/api/promotions?business_id=${resolvedParams.id}&active_only=true`)
        
        if (reviewsResponse.ok) {
          const reviewsData = await reviewsResponse.json()
          console.log("Reviews recibidas:", reviewsData)
          setReviews(reviewsData)
        } else {
          console.error("Error al obtener reseñas:", reviewsResponse.status)
        }

        if (promotionsResponse.ok) {
          const promotionsData = await promotionsResponse.json()
          console.log("Promociones recibidas:", promotionsData)
          setPromotions(promotionsData)
        } else {
          console.error("Error al obtener promociones:", promotionsResponse.status)
        }
      } catch (err) {
        console.error("Error fetching business:", err)
        setError(err instanceof Error ? err.message : "Error desconocido")
      } finally {
        setIsLoading(false)
      }
    }

    fetchBusiness()
  }, [resolvedParams.id])

  // Check if business is in favorites
  useEffect(() => {
    const checkFavorite = async () => {
      const token = localStorage.getItem("token")
      if (!token || !activity) return

      setIsCheckingFavorite(true)
      try {
        const response = await fetch(`/api/favorites/check/${activity.id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          setIsFavorite(data.is_favorite)
        }
      } catch (err) {
        console.error("Error checking favorite:", err)
      } finally {
        setIsCheckingFavorite(false)
      }
    }

    checkFavorite()
  }, [activity])

  const handleToggleFavorite = async () => {
    requireAuth(async () => {
      if (!activity) return

      setIsTogglingFavorite(true)
      try {
        const token = localStorage.getItem("token")
        
        if (isFavorite) {
          // Remove from favorites
          const response = await fetch(`/api/favorites/${activity.id}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })

          if (response.ok || response.status === 204) {
            setIsFavorite(false)
            showAlert('success', 'Eliminado', 'Se eliminó de tus destinos de interés')
          } else {
            const error = await response.json()
            showAlert('error', 'Error', error.detail || 'No se pudo eliminar de favoritos')
          }
        } else {
          // Add to favorites
          const response = await fetch(`/api/favorites`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              business_id: activity.id,
            }),
          })

          if (response.ok) {
            setIsFavorite(true)
            showAlert('success', '¡Guardado!', 'Se agregó a tus destinos de interés')
          } else {
            const error = await response.json()
            showAlert('error', 'Error', error.detail || 'No se pudo agregar a favoritos')
          }
        }
      } catch (err) {
        console.error("Error toggling favorite:", err)
        showAlert('error', 'Error', 'Error al actualizar favoritos')
      } finally {
        setIsTogglingFavorite(false)
      }
    })
  }

  const handleShare = () => {
    try {
      const url = window.location.href || `${window.location.origin}/activity/${id}`
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url)
          .then(() => {
            showAlert('success', 'Compartir', 'Enlace copiado al portapapeles')
          })
          .catch(() => {
            fallbackCopy(url)
            showAlert('success', 'Compartir', 'Enlace copiado al portapapeles')
          })
      } else {
        fallbackCopy(url)
        showAlert('success', 'Compartir', 'Enlace copiado al portapapeles')
      }
    } catch {
      showAlert('error', 'Error', 'No se pudo copiar el enlace')
    }
  }

  const fallbackCopy = (text: string) => {
    try {
      const tempInput = document.createElement('input')
      tempInput.value = text
      document.body.appendChild(tempInput)
      tempInput.select()
      document.execCommand('copy')
      document.body.removeChild(tempInput)
    } catch (e) {
      console.error('Fallback copy failed:', e)
    }
  }

  const handleBook = () => {
    console.log("handleBook clicked")
    requireAuth(async () => {
      // Reset ticket counts
      setAdultCount(1)
      setSeniorCount(0)
      setChildCount(0)
      setPriceCalculation(null)
      setSelectedPromotionId("")
      setBookingPromoCode("")
      
      // Initialize nights count for hotels
      if (activity?.hotel_pricing) {
        const minNights = activity.hotel_pricing.min_nights || 1
        setNightsCount(minNights)
      } else {
        setNightsCount(1)
      }
      
      // Load available promo codes and automatic promotions
      await loadAllAvailablePromotions()
      setOpenBookingDialog(true)
    })
  }

  const loadAllAvailablePromotions = async () => {
    try {
      setIsLoadingPromoCodes(true)
      setIsLoadingAutomaticPromotions(true)
      
      const token = localStorage.getItem("token")
      
      // Fetch automatic promotions
      const automaticResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'https://localhost:8000'}/api/promotions/automatic/${id}`)
      let automaticPromos: any[] = []
      if (automaticResponse.ok) {
        automaticPromos = await automaticResponse.json()
        console.log("Automatic promotions loaded:", automaticPromos)
      } else {
        console.log("No automatic promotions found or error:", automaticResponse.status)
      }
      
      // Fetch code-based promotions (user's claimed promotions)
      let codePromos: any[] = []
      if (token) {
        const codeResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'https://localhost:8000'}/api/promotions/available/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        if (codeResponse.ok) {
          codePromos = await codeResponse.json()
          console.log("Code promotions loaded:", codePromos)
        }
      }
      
      // Combine all promotions
      const allPromos = [
        ...automaticPromos.map(p => ({ ...p, promotion_type: 'automatic' })),
        ...codePromos.map(p => ({ ...p, promotion_type: 'code' }))
      ]
      
      console.log("Total promotions available:", allPromos.length)
      
      setAllAvailablePromotions(allPromos)
      setAutomaticPromotions(automaticPromos)
      setAvailablePromoCodes(codePromos)
      
      // Set default selection to first automatic promotion if available
      if (automaticPromos.length > 0) {
        setSelectedPromotionId(`auto-${automaticPromos[0].id}`)
        console.log("Default promotion selected:", `auto-${automaticPromos[0].id}`)
      }
      
    } catch (err) {
      console.error("Error loading promotions:", err)
      setAllAvailablePromotions([])
      setAutomaticPromotions([])
      setAvailablePromoCodes([])
    } finally {
      setIsLoadingPromoCodes(false)
      setIsLoadingAutomaticPromotions(false)
    }
  }

  const fetchAutomaticPromotions = async () => {
    try {
      setIsLoadingAutomaticPromotions(true)
      const response = await fetch(`/api/promotions/automatic/${id}`)
      
      if (response.ok) {
        const data = await response.json()
        console.log("Automatic promotions fetched:", data.length, "promotions")
        setAutomaticPromotions(data)
      } else {
        setAutomaticPromotions([])
      }
    } catch (err) {
      console.error("Error fetching automatic promotions:", err)
      setAutomaticPromotions([])
    } finally {
      setIsLoadingAutomaticPromotions(false)
    }
  }

  const calculatePrice = useCallback(async () => {
    // Check if we have any pricing configured
    if (!activity?.ticket_pricing && !activity?.hotel_pricing) {
      setPriceCalculation(null)
      return
    }

    // For ticket pricing, check if at least one ticket is selected
    if (activity?.ticket_pricing) {
      const totalTickets = adultCount + seniorCount + childCount
      if (totalTickets === 0) {
        setPriceCalculation(null)
        return
      }
    }

    // For hotel pricing, we always need at least 1 night
    if (activity?.hotel_pricing && nightsCount < (activity.hotel_pricing.min_nights || 1)) {
      setPriceCalculation(null)
      return
    }

    try {
      setIsCalculatingPrice(true)
      const token = localStorage.getItem("token")
      
      // Determine which promotion code to use based on selection
      let promotionCode = undefined
      if (selectedPromotionId && selectedPromotionId.startsWith("code-")) {
        const selectedPromo = allAvailablePromotions.find(p => `code-${p.id}` === selectedPromotionId)
        if (selectedPromo) {
          promotionCode = selectedPromo.code
        }
      }
      
      const requestBody: any = {
        promotion_code: promotionCode,
      }

      // Add ticket selection if applicable
      if (activity?.ticket_pricing) {
        requestBody.ticket_selection = {
          adult_count: adultCount,
          senior_count: seniorCount,
          child_count: childCount,
        }
      }

      // Add hotel booking details if applicable
      if (activity?.hotel_pricing) {
        requestBody.nights = nightsCount
      }
      
      console.log("Calculating price with:", requestBody)
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'https://localhost:8000'}/api/businesses/${id}/calculate-price`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      })

      if (response.ok) {
        const data = await response.json()
        console.log("Price calculation result:", data)
        setPriceCalculation(data)
      } else {
        console.error("Price calculation failed:", response.status)
        setPriceCalculation(null)
      }
    } catch (err) {
      console.error("Error calculating price:", err)
      setPriceCalculation(null)
    } finally {
      setIsCalculatingPrice(false)
    }
  }, [activity, adultCount, seniorCount, childCount, nightsCount, selectedPromotionId, allAvailablePromotions, id])

  // Recalculate price when ticket counts, nights, or selected promotion change
  useEffect(() => {
    if (openBookingDialog && activity && (activity?.ticket_pricing || activity?.hotel_pricing)) {
      console.log("Triggering price calculation - nights:", nightsCount, "promotion:", selectedPromotionId)
      // Add a small delay to avoid too many rapid calls
      const timer = setTimeout(() => {
        calculatePrice()
      }, 100)
      
      return () => clearTimeout(timer)
    }
  }, [adultCount, seniorCount, childCount, nightsCount, selectedPromotionId, openBookingDialog, activity, calculatePrice])

  const fetchAvailablePromoCodes = async () => {
    try {
      setIsLoadingPromoCodes(true)
      const token = localStorage.getItem("token")
      
      if (!token) {
        console.log("No token found, skipping promo code fetch")
        setAvailablePromoCodes([])
        return
      }
      
      const response = await fetch(`/api/promotions/available/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log("Available promo codes fetched:", data.length, "codes")
        setAvailablePromoCodes(data)
      } else {
        // Don't log error for 404 or when user simply has no codes
        if (response.status !== 404 && response.status !== 401) {
          const errorData = await response.json().catch(() => ({}))
          console.warn("Could not fetch promo codes:", response.status, errorData)
        }
        setAvailablePromoCodes([])
      }
    } catch (err) {
      console.error("Error fetching available promo codes:", err)
      setAvailablePromoCodes([])
    } finally {
      setIsLoadingPromoCodes(false)
    }
  }

  const closeReserve = () => {
    setOpenBookingDialog(false)
    setBookingPromoCode("")
    setSelectedPromotionId("")
    setAdultCount(1)
    setSeniorCount(0)
    setChildCount(0)
    setNightsCount(1)
    setPriceCalculation(null)
  }

  // Load user's trips (shared with add-to-trip flow)
  const loadUserTrips = async (): Promise<any[]> => {
    const token = localStorage.getItem("token")
    if (!token) return []
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'}/api/trips/`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const trips = await response.json()
        setUserTrips(trips)
        return trips
      }
    } catch (e) {
      console.error('Error loading trips:', e)
    }
    return []
  }

  const handleSaveToTrip = () => {
    console.log("handleSaveToTrip clicked")
    requireAuth(async () => {
      const token = localStorage.getItem("token")
      if (!token) {
        setShowAuthDialog(true)
        return
      }

      setIsLoadingTrips(true)
      // Load trips then re-fetch to ensure freshness (mirrors /explore)
      let trips = await loadUserTrips()
      try {
        const token = localStorage.getItem("token")
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL || 'https://localhost:8000'}/api/trips/`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )
        
        if (response.ok) {
          trips = await response.json()
          setUserTrips(trips)
        }
      } catch (e) {
        console.error('Error reloading trips:', e)
      } finally {
        setIsLoadingTrips(false)
      }

      if (!trips || trips.length === 0) {
        showConfirm(
          'Sin viajes',
          'No tienes viajes. ¿Quieres crear uno ahora?',
          () => router.push('/trips/new')
        )
        return
      }

      setShowTripSelector(true)
    })
  }

  const addToTrip = async (businessId: number, tripId: string, scheduledDate: string) => {
    const token = localStorage.getItem("token")
    if (!token) {
      setShowAuthDialog(true)
      return
    }

    if (!scheduledDate) {
      showAlert('error', 'Fecha requerida', 'Por favor selecciona una fecha para la actividad')
      return
    }

    try {
      if (!activity) return
      const scheduled_date = new Date(scheduledDate + 'T12:00:00').toISOString()
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'}/api/trips/${tripId}/activities`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          business_id: String(businessId),
          business_name: activity.name,
          scheduled_date,
          notes: null,
        }),
      })

      if (response.ok) {
        showAlert('success', '¡Agregado!', 'Actividad agregada al itinerario')
        setShowDateDialog(false)
        setShowTripSelector(false)
        setSelectedTrip(null)
        setSelectedDate("")
      } else {
        const err = await response.json().catch(() => ({}))
        showAlert('error', 'Error', err.detail || 'No se pudo agregar la actividad')
      }
    } catch (error) {
      console.error('Error adding to trip:', error)
      showAlert('error', 'Error', 'Error al agregar la actividad')
    }
  }

  const handleConfirmSaveToTrip = async () => {
    if (!selectedTripId) {
      showAlert('error', 'Selecciona un viaje', 'Por favor selecciona un viaje')
      return
    }

    if (!activity) return

    setIsSavingToTrip(true)
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || 'https://localhost:8000'}/api/trips/${selectedTripId}/activities`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            business_id: activity.id.toString(),
            business_name: activity.name,
            scheduled_date: tripScheduledDate || null,
            notes: tripNotes || null,
          }),
        }
      )

      if (response.ok) {
        showAlert('success', '¡Guardado!', 'La actividad se guardó en tu viaje')
        setOpenSaveToTripDialog(false)
        setSelectedTripId("")
        setTripNotes("")
        setTripScheduledDate("")
      } else {
        const error = await response.json()
        showAlert('error', 'Error', error.detail || 'No se pudo guardar en el viaje')
      }
    } catch (err) {
      console.error("Error saving to trip:", err)
      showAlert('error', 'Error', 'Error al guardar en el viaje')
    } finally {
      setIsSavingToTrip(false)
    }
  }

  const handleAddReview = () => {
    console.log("handleAddReview clicked")
    requireAuth(() => {
      console.log("Agregar reseña - Usuario autenticado")
      setShowReviewForm(true)
    })
  }

  const handleClaimPromotion = async (promotionId: number) => {
    console.log("handleClaimPromotion clicked for promotion:", promotionId)
    requireAuth(async () => {
      try {
        const token = localStorage.getItem("token")
        
        if (!token) {
          showAlert('error', 'Sesión requerida', 'Debes iniciar sesión para reclamar una promoción')
          setShowAuthDialog(true)
          return
        }

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL || 'https://localhost:8000'}/api/promotions/${promotionId}/claim`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )

        if (response.status === 401) {
          localStorage.removeItem("token")
          localStorage.removeItem("user")
          showAlert('error', 'Sesión expirada', 'Tu sesión ha expirado. Por favor inicia sesión nuevamente.')
          setTimeout(() => setShowAuthDialog(true), 1500)
          return
        }

        if (response.ok) {
          const data = await response.json()
          showAlert('success', '¡Promoción reclamada!', 'La promoción ha sido agregada a tu cuenta. Puedes verla en tu perfil.')
          
          // Actualizar el conteo de usos
          setPromotions(prev => prev.map(p => 
            p.id === promotionId 
              ? { ...p, current_uses: p.current_uses + 1 }
              : p
          ))
        } else {
          const errorData = await response.json()
          showAlert('error', 'Error', errorData.detail || 'No se pudo reclamar la promoción')
        }
      } catch (error) {
        console.error("Error al reclamar promoción:", error)
        showAlert('error', 'Error', 'Error al reclamar la promoción')
      }
    })
  }

  const handleCreatePromotion = async () => {
    if (!activity) return
    
    setIsCreatingPromotion(true)
    setError(null)

    try {
      const token = localStorage.getItem("token")
      
      if (!token) {
        showAlert('error', 'Sesión requerida', 'Debes iniciar sesión para crear una promoción')
        setShowAuthDialog(true)
        return
      }

      const promotionData: any = {
        title: promotionForm.title,
        description: promotionForm.description || undefined,
        promotion_type: promotionForm.promotionType,
        start_date: promotionForm.startDate,
        end_date: promotionForm.endDate,
        terms_conditions: promotionForm.termsConditions || undefined,
        code: promotionForm.promotionType === "code" ? promotionForm.code : undefined,
        max_uses: promotionForm.maxUses ? parseInt(promotionForm.maxUses) : undefined,
        min_purchase: promotionForm.minPurchase ? parseFloat(promotionForm.minPurchase) : undefined,
      }

      if (promotionForm.discountType === "percentage") {
        promotionData.discount_percentage = parseInt(promotionForm.discountValue)
      } else {
        promotionData.discount_amount = parseFloat(promotionForm.discountValue)
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || "https://localhost:8000"}/api/promotions?business_id=${activity.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(promotionData),
        }
      )

      if (response.status === 401) {
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        showAlert('error', 'Sesión expirada', 'Tu sesión ha expirado. Por favor inicia sesión nuevamente.')
        setTimeout(() => setShowAuthDialog(true), 1500)
        return
      }

      if (response.ok) {
        const newPromotion = await response.json()
        showAlert('success', '¡Promoción creada!', 'La promoción ha sido creada exitosamente.')
        setOpenPromotionDialog(false)
        setPromotionForm({
          title: "",
          description: "",
          promotionType: "code",
          discountType: "percentage",
          discountValue: "",
          code: "",
          startDate: "",
          endDate: "",
          termsConditions: "",
          maxUses: "",
          minPurchase: "",
        })
        // Agregar la nueva promoción a la lista
        setPromotions(prev => [...prev, newPromotion])
      } else {
        const errorData = await response.json()
        showAlert('error', 'Error', errorData.detail || 'Error al crear la promoción')
      }
    } catch (error) {
      console.error("Error creating promotion:", error)
      showAlert('error', 'Error', 'Error al crear la promoción')
    } finally {
      setIsCreatingPromotion(false)
    }
  }

  const handleReviewSuccess = async (reviewData: any) => {
    try {
      const token = localStorage.getItem("token")
      
      if (!token) {
        showAlert('error', 'Sesión requerida', 'Debes iniciar sesión para dejar una reseña')
        setShowAuthDialog(true)
        return
      }
      
      // Asegurar que business_id sea número
      const payload = {
        ...reviewData,
        business_id: parseInt(id)
      }
      
      console.log("Enviando reseña:", payload)
      console.log("Token:", token ? "presente" : "ausente")
      console.log("URL:", `${process.env.NEXT_PUBLIC_BACKEND_URL || 'https://localhost:8000'}/api/reviews`)
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'https://localhost:8000'}/api/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      console.log("Response status:", response.status)

      if (response.status === 401) {
        // Token inválido o expirado
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        showAlert('error', 'Sesión expirada', 'Tu sesión ha expirado. Por favor inicia sesión nuevamente.')
        setTimeout(() => {
          setShowAuthDialog(true)
          setShowReviewForm(false)
        }, 1500)
        return
      }

      if (response.ok) {
        console.log("Reseña creada exitosamente")
        showAlert('success', '¡Éxito!', '¡Reseña agregada exitosamente!')
        setShowReviewForm(false)
        // Recargar las reseñas después de un momento
        setTimeout(() => window.location.reload(), 1500)
      } else {
        const errorData = await response.json().catch(() => ({ detail: "Error desconocido" }))
        console.error("Error del servidor:", errorData)
        showAlert('error', 'Error', errorData.detail || 'No se pudo crear la reseña')
      }
    } catch (error) {
      console.error("Error completo al enviar la reseña:", error)
      if (error instanceof TypeError && error.message.includes('fetch')) {
        showAlert('error', 'Error de conexión', 'No se puede conectar al servidor. Verifica que el backend esté corriendo.')
      } else {
        showAlert('error', 'Error', error instanceof Error ? error.message : 'Error desconocido al enviar la reseña')
      }
    }
  }

  const handleDeleteReview = (reviewId: number) => {
    requireAuth(async () => {
      showConfirm(
        '¿Eliminar reseña?',
        '¿Estás seguro de que deseas eliminar esta reseña? Esta acción no se puede deshacer.',
        async () => {
          try {
            const token = localStorage.getItem("token")
            
            if (!token) {
              showAlert('error', 'Sesión expirada', 'Por favor inicia sesión nuevamente')
              setShowAuthDialog(true)
              return
            }
            
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'https://localhost:8000'}/api/reviews/${reviewId}`, {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${token}`,
              },
            })

            if (response.status === 401) {
              // Token inválido o expirado
              localStorage.removeItem("token")
              localStorage.removeItem("user")
              showAlert('error', 'Sesión expirada', 'Tu sesión ha expirado. Por favor inicia sesión nuevamente.')
              setTimeout(() => setShowAuthDialog(true), 1500)
              return
            }

            if (response.ok) {
              showAlert('success', 'Reseña eliminada', 'La reseña ha sido eliminada exitosamente')
              // Actualizar la lista de reseñas
              setReviews(reviews.filter(review => review.id !== reviewId))
              // Recargar para actualizar el rating
              setTimeout(() => window.location.reload(), 1500)
            } else {
              showAlert('error', 'Error', 'No tienes permiso para eliminar esta reseña')
            }
          } catch (error) {
            console.error("Error al eliminar la reseña:", error)
            showAlert('error', 'Error', 'Error al eliminar la reseña')
          }
        }
      )
    })
  }

  const handleReplyReview = (reviewId: number) => {
    requireAuth(() => {
      setReplyingTo(reviewId)
      setReplyText("")
    })
  }

  const handleSubmitReply = async (reviewId: number) => {
    if (!replyText.trim()) {
      showAlert('error', 'Error', 'Por favor escribe una respuesta')
      return
    }

    try {
      const token = localStorage.getItem("token")
      
      if (!token) {
        showAlert('error', 'Sesión expirada', 'Por favor inicia sesión nuevamente')
        setShowAuthDialog(true)
        return
      }
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'https://localhost:8000'}/api/reviews/${reviewId}/replies`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: replyText.trim() }),
      })

      if (response.status === 401) {
        // Token inválido o expirado
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        showAlert('error', 'Sesión expirada', 'Tu sesión ha expirado. Por favor inicia sesión nuevamente.')
        setTimeout(() => {
          setShowAuthDialog(true)
          setReplyingTo(null)
        }, 1500)
        return
      }

      if (response.ok) {
        showAlert('success', '¡Éxito!', 'Respuesta agregada exitosamente')
        setReplyingTo(null)
        setReplyText("")
        // Recargar las reseñas
        setTimeout(() => window.location.reload(), 1500)
      } else {
        const errorData = await response.json().catch(() => ({ detail: "Error desconocido" }))
        showAlert('error', 'Error', errorData.detail || 'No se pudo agregar la respuesta')
      }
    } catch (error) {
      console.error("Error al enviar respuesta:", error)
      showAlert('error', 'Error', 'Error al enviar la respuesta')
    }
  }

  const handleDeleteReply = useCallback((reviewId: number, replyId: number) => {
    requireAuth(() => {
      showConfirm(
        '¿Eliminar respuesta?',
        '¿Estás seguro de que deseas eliminar esta respuesta?',
        async () => {
          try {
            const token = localStorage.getItem("token")
            
            if (!token) {
              showAlert('error', 'Sesión expirada', 'Por favor inicia sesión nuevamente')
              setShowAuthDialog(true)
              return
            }
            
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'https://localhost:8000'}/api/reviews/${reviewId}/replies/${replyId}`, {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${token}`,
              },
            })

            if (response.status === 401) {
              // Token inválido o expirado
              localStorage.removeItem("token")
              localStorage.removeItem("user")
              showAlert('error', 'Sesión expirada', 'Tu sesión ha expirado. Por favor inicia sesión nuevamente.')
              setTimeout(() => setShowAuthDialog(true), 1500)
              return
            }

            if (response.ok) {
              showAlert('success', 'Respuesta eliminada', 'La respuesta ha sido eliminada exitosamente')
              setTimeout(() => window.location.reload(), 1500)
            } else {
              showAlert('error', 'Error', 'No tienes permiso para eliminar esta respuesta')
            }
          } catch (error) {
            console.error("Error al eliminar respuesta:", error)
            showAlert('error', 'Error', 'Error al eliminar la respuesta')
          }
        }
      )
    })
  }, [requireAuth, showAlert, showConfirm, setShowAuthDialog])

  const handleReplyToReply = useCallback((reviewId: number, replyId: number, uniqueKey: string) => {
    requireAuth(() => {
      setReplyingToReply(uniqueKey)
    })
  }, [requireAuth])

  const handleSubmitNestedReply = useCallback(async (uniqueKey: string, reviewId: number, replyId: number) => {
    if (!replyingToReply) return
    
    const currentText = nestedReplyTexts[uniqueKey] || ""
    
    if (!currentText.trim()) {
      showAlert('error', 'Error', 'Por favor escribe una respuesta')
      return
    }

    try {
      const token = localStorage.getItem("token")
      
      if (!token) {
        showAlert('error', 'Sesión expirada', 'Por favor inicia sesión nuevamente')
        setShowAuthDialog(true)
        return
      }
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'https://localhost:8000'}/api/reviews/${reviewId}/replies/${replyId}/replies`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reply_text: currentText.trim() }),
      })

      if (response.status === 401) {
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        showAlert('error', 'Sesión expirada', 'Tu sesión ha expirado. Por favor inicia sesión nuevamente.')
        setTimeout(() => {
          setShowAuthDialog(true)
          setReplyingToReply(null)
        }, 1500)
        return
      }

      if (response.ok) {
        showAlert('success', '¡Éxito!', 'Respuesta agregada exitosamente')
        setReplyingToReply(null)
        // Limpiar solo el texto de esta respuesta específica
        setNestedReplyTexts(prev => {
          const newTexts = { ...prev }
          delete newTexts[uniqueKey]
          return newTexts
        })
        setTimeout(() => window.location.reload(), 1500)
      } else {
        const errorData = await response.json().catch(() => ({ detail: "Error desconocido" }))
        showAlert('error', 'Error', errorData.detail || 'No se pudo agregar la respuesta')
      }
    } catch (error) {
      console.error("Error al enviar respuesta anidada:", error)
      showAlert('error', 'Error', 'Error al enviar la respuesta')
    }
  }, [replyingToReply, nestedReplyTexts, showAlert, setShowAuthDialog])

  const isOwnReview = (review: Review): boolean => {
    const userData = localStorage.getItem("user")
    if (!userData) return false
    
    try {
      const user = JSON.parse(userData)
      // Comparar como strings ya que user_id puede venir como string del backend
      return String(user.id) === String(review.user_id)
    } catch {
      return false
    }
  }

  const isOwnReply = useCallback((reply: Reply): boolean => {
    const userData = localStorage.getItem("user")
    if (!userData) return false
    
    try {
      const user = JSON.parse(userData)
      return String(user.id) === String(reply.user_id)
    } catch {
      return false
    }
  }, [])

  const toggleRepliesExpanded = (reviewId: number) => {
    setExpandedReplies(prev => {
      const newSet = new Set(prev)
      if (newSet.has(reviewId)) {
        newSet.delete(reviewId)
      } else {
        newSet.add(reviewId)
      }
      return newSet
    })
  }

  const getTotalReplyCount = (replies: Reply[]): number => {
    let count = replies.length
    replies.forEach(reply => {
      if (reply.replies && reply.replies.length > 0) {
        count += getTotalReplyCount(reply.replies)
      }
    })
    return count
  }

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const token = localStorage.getItem("token")
      
      if (!token) {
        showAlert('error', 'Sesión expirada', 'Por favor inicia sesión nuevamente')
        setShowAuthDialog(true)
        return
      }

      const totalPeople = adultCount + seniorCount + childCount
      
      const bookingPayload: any = {
        name: bookingName,
        amount: totalPeople || 1,
        date: bookingDate,
        time: bookingTime.includes(':') && bookingTime.split(':').length === 2 
          ? `${bookingTime}:00` 
          : bookingTime,
      }

      // Add ticket selection if business has pricing
      if (activity?.ticket_pricing && totalPeople > 0) {
        bookingPayload.ticket_selection = {
          adult_count: adultCount,
          senior_count: seniorCount,
          child_count: childCount,
        }
      }

      // Add promotion code if code-based promotion is selected
      if (selectedPromotionId && selectedPromotionId.startsWith("code-")) {
        const selectedPromo = allAvailablePromotions.find(p => `code-${p.id}` === selectedPromotionId)
        if (selectedPromo) {
          bookingPayload.promotion_code = selectedPromo.code
        }
      }

      console.log('Booking payload:', JSON.stringify(bookingPayload, null, 2))
      
      const response = await fetch(`/api/businesses/${id}/bookings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(bookingPayload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || "Error al realizar reserva")
      }

      if (response.status === 401) {
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        showAlert('error', 'Sesión expirada', 'Tu sesión ha expirado. Por favor inicia sesión nuevamente.')
        setTimeout(() => {
          setShowAuthDialog(true)
          setReplyingToReply(null)
        }, 1500)
        return
      }

      if (response.ok) {
        showAlert('success', '¡Éxito!', 'La reserva se ha realizado correctamente')
        closeReserve()
      } else {
        const errorData = await response.json().catch(() => ({ detail: "Error desconocido" }))
        showAlert('error', 'Error', errorData.detail || 'No se pudo realizar la reserva')
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error")
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className={styles.pageContainer}>
        <Header />
        <main className={styles.loadingContainer}>
          <Loader2 className={styles.loadingSpinner} />
        </main>
        <Footer />
      </div>
    )
  }

  if (error || !activity) {
    return (
      <div className={styles.pageContainer}>
        <Header />
        <main className={styles.loadingContainer}>
          <div className={styles.errorContainer}>
            <p className={styles.errorTitle}>Error al cargar el negocio</p>
            <p className={styles.errorText}>{error || "No encontrado"}</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className={styles.pageContainer}>
      <Header />

      <main className={styles.mainContent}>
        <div className={styles.heroSection}
          style={{
            backgroundImage: activity.images && activity.images.length > 0 
              ? `url(${activity.images[0]})` 
              : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center top',
            backgroundRepeat: 'no-repeat'
          }}
        >
          <div className={styles.heroOverlay} />

          {/* Botón Volver */}
          <div className={styles.backButtonContainer}>
            <Button
              variant="secondary"
              onClick={() => router.back()}
              className={styles.backButton}
            >
              <ArrowLeft className={styles.backIcon} />
              Volver
            </Button>
          </div>

          {/* Contenido inferior (nombre, categoría, etc.) */}
          <div className={styles.heroContent}>
            <div className={styles.heroInner}>
              <div className={styles.categoryBadges}>
                {activity.categories && activity.categories.length > 0 ? (
                  activity.categories.map((category, index) => (
                    <Badge key={index} className={styles.categoryBadge}>
                      {category}
                    </Badge>
                  ))
                ) : (
                  <Badge className={styles.categoryBadge}>Sin categoría</Badge>
                )}
              </div>
              <h1 className={styles.heroTitle}>{activity.name}</h1>
              <div className={styles.heroInfo}>
                <div className={styles.ratingGroup}>
                  <Star className={styles.starIcon} />
                  <span className={styles.ratingText}>{activity.rating.toFixed(1)}</span>
                  <span className={styles.reviewCount}>({activity.review_count} reseñas)</span>
                </div>
                <div className={styles.priceGroup}>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <DollarSign
                      key={i}
                      className={`${styles.dollarIcon} ${i < activity.price_level ? styles.dollarActive : styles.dollarInactive}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.contentContainer}>
          <div className={styles.contentGrid}>
            {/* Main Content */}
            <div className={styles.mainColumn}>
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Acerca de</h2>
                <p className={styles.description}>{activity.description}</p>
                {activity.tags && activity.tags.length > 0 && (
                  <div className={styles.tagsContainer}>
                    {activity.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Photos Section */}
              {activity.images && activity.images.length > 0 && (
                <div className={styles.section}>
                  <h2 className={styles.sectionTitle}>Fotos ({activity.images.length})</h2>
                  <div className={styles.photosGrid}>
                    {activity.images.map((image, index) => (
                      <div
                        key={index}
                        className={styles.photoItem}
                      >
                        <img
                          src={image}
                          alt={`${activity.name} - Foto ${index + 1}`}
                          className={styles.photoImage}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pricing Section */}
              {(activity.ticket_pricing || activity.hotel_pricing || activity.restaurant_pricing || activity.wellness_pricing) && (
                <div className={styles.section}>
                  <h2 className={styles.sectionTitle}>Precios</h2>
                  <Card>
                    <CardContent className="p-6">
                      {activity.ticket_pricing && (
                        <div className="space-y-3">
                          <h3 className="font-semibold text-lg mb-4">Entradas</h3>
                          {activity.ticket_pricing.adult_price != null && (
                            <div className="flex justify-between items-center py-2 border-b">
                              <span className="text-muted-foreground">Adultos</span>
                              <span className="font-semibold text-lg">${activity.ticket_pricing.adult_price.toFixed(2)}</span>
                            </div>
                          )}
                          {activity.ticket_pricing.senior_price != null && (
                            <div className="flex justify-between items-center py-2 border-b">
                              <span className="text-muted-foreground">Adultos Mayores</span>
                              <span className="font-semibold text-lg">${activity.ticket_pricing.senior_price.toFixed(2)}</span>
                            </div>
                          )}
                          {activity.ticket_pricing.child_price != null && (
                            <div className="flex justify-between items-center py-2 border-b">
                              <span className="text-muted-foreground">Niños</span>
                              <span className="font-semibold text-lg">${activity.ticket_pricing.child_price.toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                      )}
                      {activity.hotel_pricing && (
                        <div className="space-y-3">
                          <h3 className="font-semibold text-lg mb-4">Alojamiento</h3>
                          <div className="flex justify-between items-center py-2 border-b">
                            <span className="text-muted-foreground">Precio por noche</span>
                            <span className="font-semibold text-lg">${activity.hotel_pricing.price_per_night?.toFixed(2)}</span>
                          </div>
                          {activity.hotel_pricing.min_nights && (
                            <div className="flex justify-between items-center py-2">
                              <span className="text-muted-foreground">Mínimo de noches</span>
                              <span className="font-semibold">{activity.hotel_pricing.min_nights}</span>
                            </div>
                          )}
                        </div>
                      )}
                      {activity.restaurant_pricing && (
                        <div className="space-y-3">
                          <h3 className="font-semibold text-lg mb-4">Restaurante</h3>
                          {activity.restaurant_pricing.reservation_fee != null && activity.restaurant_pricing.reservation_fee > 0 && (
                            <div className="flex justify-between items-center py-2 border-b">
                              <span className="text-muted-foreground">Cargo por reserva</span>
                              <span className="font-semibold text-lg">${activity.restaurant_pricing.reservation_fee.toFixed(2)}</span>
                            </div>
                          )}
                          {activity.restaurant_pricing.average_price_per_person != null && (
                            <div className="flex justify-between items-center py-2 border-b">
                              <span className="text-muted-foreground">Precio promedio por persona</span>
                              <span className="font-semibold text-lg">${activity.restaurant_pricing.average_price_per_person.toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                      )}
                      {activity.wellness_pricing && (
                        <div className="space-y-3">
                          <h3 className="font-semibold text-lg mb-4">Bienestar</h3>
                          {activity.wellness_pricing.session_price != null && (
                            <div className="flex justify-between items-center py-2 border-b">
                              <span className="text-muted-foreground">Precio por sesión</span>
                              <span className="font-semibold text-lg">${activity.wellness_pricing.session_price.toFixed(2)}</span>
                            </div>
                          )}
                          {activity.wellness_pricing.package_price != null && (
                            <div className="flex justify-between items-center py-2 border-b">
                              <span className="text-muted-foreground">Paquete ({activity.wellness_pricing.sessions_in_package} sesiones)</span>
                              <span className="font-semibold text-lg">${activity.wellness_pricing.package_price.toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Reviews Section */}
              <div className={styles.section}>
                <div className={styles.reviewsHeader}>
                  <h2 className={styles.sectionTitle}>Reseñas ({reviews.length})</h2>
                  <Button onClick={handleAddReview} className={styles.addReviewButton}>
                    <Plus className={styles.addReviewIcon} />
                    Agregar Reseña
                  </Button>
                </div>
                
                {reviews.length > 0 ? (
                  <div className={styles.reviewsList}>
                    {reviews.map((review) => (
                      <Card key={review.id}>
                        <CardContent className={styles.reviewCard}>
                          <div className={styles.reviewHeader}>
                            <div>
                              <h4 className={styles.reviewAuthor}>{review.user_name}</h4>
                              <p className={styles.reviewDate}>
                                {new Date(review.created_at).toLocaleDateString('es-ES', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </p>
                            </div>
                            <div className={styles.reviewRating}>
                              <Star className={styles.reviewStarIcon} />
                              <span className={styles.reviewRatingText}>{review.rating.toFixed(1)}</span>
                            </div>
                          </div>
                          <h3 className={styles.reviewTitle}>{review.title}</h3>
                          <p className={styles.reviewText}>{review.text}</p>
                          
                          {/* Replies Section */}
                          {review.replies && review.replies.length >= 2 && (
                            <div className={styles.repliesToggleContainer}>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleRepliesExpanded(review.id)}
                                className={styles.repliesToggleButton}
                              >
                                <MessageSquare className="h-4 w-4 mr-2" />
                                {expandedReplies.has(review.id) 
                                  ? 'Ocultar respuestas' 
                                  : `Ver ${getTotalReplyCount(review.replies)} respuestas`
                                }
                              </Button>
                            </div>
                          )}

                          {review.replies && review.replies.length > 0 && (review.replies.length < 2 || expandedReplies.has(review.id)) && (
                            <div className={styles.repliesContainer}>
                              {review.replies.map((reply, index) => (
                                <RenderReply 
                                  key={`review-${review.id}-reply-${index}-${reply.id}`}
                                  reply={reply} 
                                  reviewId={review.id}
                                  parentKey={`review-${review.id}-${index}`}
                                  replyingToReply={replyingToReply}
                                  nestedReplyTexts={nestedReplyTexts}
                                  setNestedReplyTexts={setNestedReplyTexts}
                                  setReplyingToReply={setReplyingToReply}
                                  handleReplyToReply={handleReplyToReply}
                                  handleSubmitNestedReply={handleSubmitNestedReply}
                                  handleDeleteReply={handleDeleteReply}
                                  isOwnReply={isOwnReply}
                                  styles={styles}
                                />
                              ))}
                            </div>
                          )}

                          {/* Reply Form */}
                          {replyingTo === review.id && (
                            <div className={styles.replyForm}>
                              <textarea
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder="Escribe tu respuesta..."
                                className={styles.replyTextarea}
                                rows={3}
                                dir="ltr"
                                style={{ direction: 'ltr', textAlign: 'left' }}
                              />
                              <div className={styles.replyFormActions}>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setReplyingTo(null)
                                    setReplyText("")
                                  }}
                                >
                                  Cancelar
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleSubmitReply(review.id)}
                                >
                                  Enviar
                                </Button>
                              </div>
                            </div>
                          )}
                          
                          {/* Review Actions */}
                          <div className={styles.reviewActions}>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleReplyReview(review.id)}
                              className={styles.reviewActionButton}
                            >
                              <Reply className={styles.actionIcon} />
                              Responder
                            </Button>
                            
                            {isOwnReview(review) && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleDeleteReview(review.id)}
                                className={`${styles.reviewActionButton} ${styles.deleteButton}`}
                              >
                                <Trash2 className={styles.actionIcon} />
                                Eliminar
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className={styles.emptyReviews}>
                      <MessageSquare className={styles.emptyIcon} />
                      <p className={styles.emptyText}>
                        Aún no hay reseñas para este lugar.
                      </p>
                      <Button onClick={handleAddReview} variant="outline">
                        Sé el primero en dejar una reseña
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className={styles.sidebar}>
              <Card>
                <CardContent className={styles.sidebarCard}>
                  <div className={styles.sidebarButtons}>
                    {activity.allows_bookings && (
                      <Button onClick={handleBook} className={styles.buttonFull} size="lg">
                        <Calendar className={styles.buttonIcon} />
                        Reservar Ahora
                      </Button>
                    )}
                    <Button 
                      onClick={handleSaveToTrip} 
                      variant="outline" 
                      className={styles.buttonFull} 
                      size="lg"
                    >
                      <Plus className={styles.buttonIcon} />
                      Agregar a Viaje
                    </Button>
                    <Button 
                      onClick={handleToggleFavorite} 
                      variant={isFavorite ? "default" : "outline"}
                      className={styles.buttonFull} 
                      size="lg"
                      disabled={isTogglingFavorite || isCheckingFavorite}
                    >
                      {isTogglingFavorite || isCheckingFavorite ? (
                        <>
                          <Loader2 className={`${styles.buttonIcon} animate-spin`} />
                          {isFavorite ? "Guardando..." : "Guardando..."}
                        </>
                      ) : (
                        <>
                          <Heart className={`${styles.buttonIcon} ${isFavorite ? 'fill-current' : ''}`} />
                          {isFavorite ? "Guardado en Favoritos" : "Guardar como Favorito"}
                        </>
                      )}
                    </Button>
                    <Button 
                      onClick={handleShare}
                      variant="outline"
                      className={styles.buttonFull}
                      size="lg"
                    >
                      <Share2 className={styles.buttonIcon} />
                      Compartir
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className={styles.contactSection}>
                  <h3 className={styles.contactTitle}>Información de Contacto</h3>
                  <div className={styles.contactList}>
                    <div className={styles.contactItem}>
                      <MapPin className={styles.contactIcon} />
                      <span>
                        {activity.location.address}, {activity.location.city}, {activity.location.state}, {activity.location.country}
                      </span>
                    </div>
                    {activity.phone && (
                      <div className={styles.contactItem}>
                        <Phone className={styles.contactIcon} />
                        <span>{activity.phone}</span>
                      </div>
                    )}
                    {activity.website && (
                      <div className={styles.contactItem}>
                        <Globe className={styles.contactIcon} />
                        <a href={activity.website} target="_blank" rel="noopener noreferrer" className={styles.contactLink}>
                          Visitar Sitio Web
                        </a>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Map Section */}
              <Card>
                <CardContent className={styles.contactSection}>
                  <h3 className={styles.contactTitle}>Ubicación</h3>
                  <div style={{ marginTop: '16px' }}>
                    <ActivityMap
                      businessName={activity.name}
                      location={activity.location}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Promotions Section */}
              {promotions.length > 0 && (
                <Card>
                  <CardContent className={styles.contactSection}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Tag className="h-5 w-5 text-primary flex-shrink-0" />
                        <h3 className={styles.contactTitle}>
                          Promociones ({promotions.length})
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        {promotions.length >= 3 && (
                          <Button 
                            onClick={() => setOpenAllPromotionsDialog(true)} 
                            variant="outline"
                            size="sm"
                          >
                            Ver todas
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="space-y-3">
                      {promotions.slice(0, 2).map((promotion) => (
                        <PromotionCard
                          key={promotion.id}
                          id={promotion.id}
                          title={promotion.title}
                          description={promotion.description}
                          discountPercentage={promotion.discount_percentage}
                          discountAmount={promotion.discount_amount}
                          code={promotion.code}
                          promotionType={promotion.promotion_type}
                          startDate={promotion.start_date}
                          endDate={promotion.end_date}
                          termsConditions={promotion.terms_conditions}
                          currentUses={promotion.current_uses}
                          maxUses={promotion.max_uses}
                          minPurchase={promotion.min_purchase}
                          isActive={promotion.is_active}
                          onClaim={isBusinessUser || promotion.promotion_type === "automatic" ? undefined : handleClaimPromotion}
                          showActions={true}
                          compact={true}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Recommended Activities Section */}
          {recommendedActivities.length > 0 && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>También puede interesarte...</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recommendedActivities.map((recActivity) => (
                  <Card 
                    key={recActivity.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow py-0"
                    onClick={() => router.push(`/activity/${recActivity.id}`)}
                  >
                    <CardContent className="p-0">
                      <div className="relative h-48 mb-3 rounded-t-lg overflow-hidden">
                        <img
                          src={recActivity.images[0] || "/images/placeholder-business.jpg"}
                          alt={recActivity.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-lg mb-2">{recActivity.name}</h3>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex items-center">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${i < Math.floor(recActivity.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                              />
                            ))}
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {recActivity.rating.toFixed(1)} ({recActivity.review_count})
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {recActivity.description}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>{recActivity.location.city}, {recActivity.location.state}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Review Form Dialog */}
      <Dialog open={showReviewForm} onOpenChange={setShowReviewForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Reseña</DialogTitle>
          </DialogHeader>
          <ReviewForm
            businessId={id}
            businessName={activity?.name || ""}
            onSubmit={handleReviewSuccess}
            onCancel={() => setShowReviewForm(false)}
            showCard={false}
          />
        </DialogContent>
      </Dialog>

      {/* Auth Dialog */}
      <AuthRequiredDialog 
        open={showAuthDialog} 
        onOpenChange={setShowAuthDialog}
      />

      {/* Create Promotion Dialog */}
      <Dialog open={openPromotionDialog} onOpenChange={setOpenPromotionDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crear Nueva Promoción</DialogTitle>
            <DialogDescription>
              Completa los detalles de la promoción que deseas ofrecer
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="promo-title">Título de la Promoción *</Label>
              <Input
                id="promo-title"
                value={promotionForm.title}
                onChange={(e) => setPromotionForm({ ...promotionForm, title: e.target.value })}
                placeholder="Ej: Descuento de Verano"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="promo-description">Descripción (opcional)</Label>
              <Textarea
                id="promo-description"
                value={promotionForm.description}
                onChange={(e) => setPromotionForm({ ...promotionForm, description: e.target.value })}
                placeholder="Describe los detalles de la promoción"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="promo-type">Tipo de Promoción *</Label>
              <Select
                value={promotionForm.promotionType}
                onValueChange={(value) => setPromotionForm({ ...promotionForm, promotionType: value, code: value === "automatic" ? "" : promotionForm.code })}
              >
                <SelectTrigger id="promo-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="code">Código Promocional</SelectItem>
                  <SelectItem value="automatic">Descuento Automático</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {promotionForm.promotionType === "code" 
                  ? "Los usuarios deben reclamar y usar un código" 
                  : "Se aplica automáticamente al precio en la reserva"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="promo-discountType">Tipo de Descuento *</Label>
                <Select
                  value={promotionForm.discountType}
                  onValueChange={(value) => setPromotionForm({ ...promotionForm, discountType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Porcentaje (%)</SelectItem>
                    <SelectItem value="amount">Monto Fijo ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="promo-discountValue">
                  Valor del Descuento * {promotionForm.discountType === "percentage" ? "(%)" : "($)"}
                </Label>
                <Input
                  id="promo-discountValue"
                  type="number"
                  value={promotionForm.discountValue}
                  onChange={(e) => setPromotionForm({ ...promotionForm, discountValue: e.target.value })}
                  placeholder={promotionForm.discountType === "percentage" ? "10" : "50"}
                  min="0"
                  max={promotionForm.discountType === "percentage" ? "100" : undefined}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="promo-code">
                Código Promocional {promotionForm.promotionType === "code" && "*"}
              </Label>
              <Input
                id="promo-code"
                value={promotionForm.code}
                onChange={(e) => setPromotionForm({ ...promotionForm, code: e.target.value.toUpperCase() })}
                placeholder="VERANO2025"
                disabled={promotionForm.promotionType === "automatic"}
                required={promotionForm.promotionType === "code"}
              />
              {promotionForm.promotionType === "automatic" && (
                <p className="text-xs text-muted-foreground">
                  No se requiere código para descuentos automáticos
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="promo-startDate">Fecha de Inicio *</Label>
                <Input
                  id="promo-startDate"
                  type="date"
                  value={promotionForm.startDate}
                  onChange={(e) => setPromotionForm({ ...promotionForm, startDate: e.target.value })}
                  min={minBookingDate}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="promo-endDate">Fecha de Fin *</Label>
                <Input
                  id="promo-endDate"
                  type="date"
                  value={promotionForm.endDate}
                  onChange={(e) => setPromotionForm({ ...promotionForm, endDate: e.target.value })}
                  min={promotionForm.startDate || minBookingDate}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="promo-maxUses">Máximo de Usos (opcional)</Label>
                <Input
                  id="promo-maxUses"
                  type="number"
                  value={promotionForm.maxUses}
                  onChange={(e) => setPromotionForm({ ...promotionForm, maxUses: e.target.value })}
                  placeholder="100"
                  min="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="promo-minPurchase">Compra Mínima $ (opcional)</Label>
                <Input
                  id="promo-minPurchase"
                  type="number"
                  value={promotionForm.minPurchase}
                  onChange={(e) => setPromotionForm({ ...promotionForm, minPurchase: e.target.value })}
                  placeholder="50.00"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="promo-termsConditions">Términos y Condiciones (opcional)</Label>
              <Textarea
                id="promo-termsConditions"
                value={promotionForm.termsConditions}
                onChange={(e) => setPromotionForm({ ...promotionForm, termsConditions: e.target.value })}
                placeholder="Especifica las condiciones de uso de la promoción"
                rows={3}
              />
            </div>

            <Button 
              onClick={handleCreatePromotion} 
              disabled={
                isCreatingPromotion || 
                !promotionForm.title || 
                !promotionForm.discountValue || 
                !promotionForm.startDate || 
                !promotionForm.endDate ||
                (promotionForm.promotionType === "code" && !promotionForm.code)
              } 
              className="w-full"
            >
              {isCreatingPromotion ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                "Crear Promoción"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Alert/Confirm Dialog */}
      <Dialog open={alertDialog.open} onOpenChange={closeAlert}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-2">
              {alertDialog.type === 'success' && <CheckCircle2 className="h-5 w-5 text-green-600" />}
              {alertDialog.type === 'error' && <AlertCircle className="h-5 w-5 text-red-600" />}
              {alertDialog.type === 'confirm' && <AlertCircle className="h-5 w-5 text-amber-600" />}
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

      <Dialog open={openBookingDialog} onOpenChange={closeReserve}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reservar en {activity?.name}</DialogTitle>
            <DialogDescription>Ingrese los datos para realizar la reserva</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                type="text"
                placeholder="Juan Pérez"
                value={bookingName}
                onChange={(e) => setBookingName(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            {/* Hotel Night Selection - Only if business has hotel pricing */}
            {activity?.hotel_pricing && (
              <div className="flex flex-col gap-3 p-4 border rounded-lg bg-muted/50">
                <h3 className="font-semibold text-sm">Reserva de Alojamiento</h3>
                
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <Label htmlFor="nights-count">Noches</Label>
                    <p className="text-xs text-muted-foreground">
                      ${activity.hotel_pricing.price_per_night?.toFixed(2)} por noche
                    </p>
                    {activity.hotel_pricing.min_nights && (
                      <p className="text-xs text-amber-600">
                        Mínimo: {activity.hotel_pricing.min_nights} noche(s)
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setNightsCount(Math.max(activity.hotel_pricing?.min_nights || 1, nightsCount - 1))}
                      disabled={isLoading || nightsCount <= (activity.hotel_pricing?.min_nights || 1)}
                    >
                      -
                    </Button>
                    <span className="w-12 text-center font-medium">{nightsCount}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const maxNights = activity.hotel_pricing?.max_nights
                        if (!maxNights || nightsCount < maxNights) {
                          setNightsCount(nightsCount + 1)
                        }
                      }}
                      disabled={isLoading || (activity.hotel_pricing?.max_nights != null && nightsCount >= activity.hotel_pricing.max_nights)}
                    >
                      +
                    </Button>
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <p className="text-sm font-medium">
                    Total de noches: {nightsCount}
                  </p>
                  {activity.hotel_pricing.max_nights && (
                    <p className="text-xs text-muted-foreground">
                      Máximo: {activity.hotel_pricing.max_nights} noche(s)
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Ticket Selection - Only if business has pricing */}
            {activity?.ticket_pricing && (
              <div className="flex flex-col gap-3 p-4 border rounded-lg bg-muted/50">
                <h3 className="font-semibold text-sm">Selecciona tus entradas</h3>
                
                {activity.ticket_pricing.adult_price != null && (
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <Label htmlFor="adult-count">Adultos</Label>
                      <p className="text-xs text-muted-foreground">
                        ${activity.ticket_pricing.adult_price.toFixed(2)} por persona
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setAdultCount(Math.max(0, adultCount - 1))}
                        disabled={isLoading || adultCount === 0}
                      >
                        -
                      </Button>
                      <span className="w-12 text-center font-medium">{adultCount}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setAdultCount(adultCount + 1)}
                        disabled={isLoading}
                      >
                        +
                      </Button>
                    </div>
                  </div>
                )}

                {activity.ticket_pricing.senior_price != null && (
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <Label htmlFor="senior-count">Adultos Mayores</Label>
                      <p className="text-xs text-muted-foreground">
                        ${activity.ticket_pricing.senior_price.toFixed(2)} por persona
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSeniorCount(Math.max(0, seniorCount - 1))}
                        disabled={isLoading || seniorCount === 0}
                      >
                        -
                      </Button>
                      <span className="w-12 text-center font-medium">{seniorCount}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSeniorCount(seniorCount + 1)}
                        disabled={isLoading}
                      >
                        +
                      </Button>
                    </div>
                  </div>
                )}

                {activity.ticket_pricing.child_price != null && (
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <Label htmlFor="child-count">Niños</Label>
                      <p className="text-xs text-muted-foreground">
                        ${activity.ticket_pricing.child_price.toFixed(2)} por persona
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setChildCount(Math.max(0, childCount - 1))}
                        disabled={isLoading || childCount === 0}
                      >
                        -
                      </Button>
                      <span className="w-12 text-center font-medium">{childCount}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setChildCount(childCount + 1)}
                        disabled={isLoading}
                      >
                        +
                      </Button>
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t">
                  <p className="text-sm font-medium">
                    Total de personas: {adultCount + seniorCount + childCount}
                  </p>
                </div>
              </div>
            )}

            {/* Unified Promotion Selector */}
            {(isLoadingPromoCodes || isLoadingAutomaticPromotions) ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">Cargando promociones...</span>
              </div>
            ) : allAvailablePromotions.length > 0 ? (
              <div className="flex flex-col gap-2">
                <Label htmlFor="promotion-select">Promociones Disponibles</Label>
                <Select
                  value={selectedPromotionId || "NONE"}
                  onValueChange={(value) => setSelectedPromotionId(value === "NONE" ? "" : value)}
                  disabled={isLoading}
                >
                  <SelectTrigger id="promotion-select" className="w-full">
                    <SelectValue placeholder="Selecciona una promoción" />
                  </SelectTrigger>
                  <SelectContent position="popper" align="start" sideOffset={5} className="w-full">
                    <SelectItem value="NONE">Sin promoción</SelectItem>
                    
                    {/* Automatic Promotions */}
                    {automaticPromotions.length > 0 && (
                      <>
                        {automaticPromotions.map((promo) => (
                          <SelectItem key={`auto-${promo.id}`} value={`auto-${promo.id}`}>
                            🎁 {promo.title} - {promo.discount_percentage 
                              ? `${promo.discount_percentage}% OFF` 
                              : `$${promo.discount_amount} OFF`}
                            {promo.min_purchase && ` (Min: $${promo.min_purchase})`}
                          </SelectItem>
                        ))}
                      </>
                    )}
                    
                    {/* Code-based Promotions */}
                    {availablePromoCodes.length > 0 && automaticPromotions.length > 0 && (
                      <SelectItem value="SEPARATOR" disabled>──────────</SelectItem>
                    )}
                    {availablePromoCodes.length > 0 && (
                      <>
                        {availablePromoCodes.map((promo) => (
                          <SelectItem key={`code-${promo.id}`} value={`code-${promo.id}`}>
                            🎟️ {promo.code} - {promo.discount_percentage 
                              ? `${promo.discount_percentage}% OFF` 
                              : `$${promo.discount_amount} OFF`}
                            {promo.title && ` (${promo.title})`}
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
                
                {selectedPromotionId && selectedPromotionId !== "NONE" && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {selectedPromotionId.startsWith("auto-") ? (
                      <p className="text-green-600">✓ Descuento automático aplicado</p>
                    ) : (
                      <p className="text-blue-600">✓ Código promocional seleccionado</p>
                    )}
                  </div>
                )}
                
                {allAvailablePromotions.length > 0 && !selectedPromotionId && (
                  <p className="text-xs text-amber-600">
                    💡 Selecciona una promoción para aplicar un descuento
                  </p>
                )}
              </div>
            ) : (
              <div className="p-4 border rounded-lg bg-muted/30">
                <p className="text-sm text-muted-foreground text-center">
                  No hay promociones disponibles actualmente.
                  {promotions.filter(p => p.promotion_type === "code").length > 0 && (
                    <span className="block mt-1">
                      Reclama códigos en la sección de promociones.
                    </span>
                  )}
                </p>
              </div>
            )}

            {/* Price Calculation Summary */}
            {priceCalculation && ((adultCount + seniorCount + childCount) > 0 || nightsCount > 0) && (
              <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
                <h3 className="font-semibold text-sm mb-3">Resumen de Precio</h3>
                
                {/* Ticket breakdown */}
                {priceCalculation.breakdown?.adult && (
                  <div className="flex justify-between text-sm mb-1">
                    <span>{priceCalculation.breakdown.adult.count} Adulto(s)</span>
                    <span>${priceCalculation.breakdown.adult.subtotal.toFixed(2)}</span>
                  </div>
                )}
                
                {priceCalculation.breakdown?.senior && (
                  <div className="flex justify-between text-sm mb-1">
                    <span>{priceCalculation.breakdown.senior.count} Adulto(s) Mayor(es)</span>
                    <span>${priceCalculation.breakdown.senior.subtotal.toFixed(2)}</span>
                  </div>
                )}
                
                {priceCalculation.breakdown?.child && (
                  <div className="flex justify-between text-sm mb-1">
                    <span>{priceCalculation.breakdown.child.count} Niño(s)</span>
                    <span>${priceCalculation.breakdown.child.subtotal.toFixed(2)}</span>
                  </div>
                )}

                {/* Hotel breakdown */}
                {priceCalculation.breakdown?.nights != null && (
                  <div className="flex justify-between text-sm mb-1">
                    <span>{priceCalculation.breakdown.nights} noche(s) × ${priceCalculation.breakdown.price_per_night?.toFixed(2)}/noche</span>
                    <span>${priceCalculation.breakdown.total?.toFixed(2)}</span>
                  </div>
                )}
                
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Subtotal:</span>
                    <span>${priceCalculation.original_price.toFixed(2)}</span>
                  </div>
                  
                  {priceCalculation.discount_amount > 0 && (
                    <div className="flex justify-between text-sm mb-1 text-green-600">
                      <span>Descuento ({priceCalculation.discount_percentage.toFixed(0)}%):</span>
                      <span>-${priceCalculation.discount_amount.toFixed(2)}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between font-bold text-lg mt-2">
                    <span>Total:</span>
                    <span>${priceCalculation.final_price.toFixed(2)}</span>
                  </div>
                </div>

                {priceCalculation.promotion_applied && (
                  <div className="mt-2 text-xs text-green-600">
                    ✓ Promoción aplicada: {priceCalculation.promotion_applied.title}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="date">Fecha</Label>
              <Input
                id="date"
                type="date"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                min={minBookingDate}
                required
                disabled={isLoading}
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <Label htmlFor="time">Hora</Label>
              <Input
                id="time"
                type="time"
                value={bookingTime}
                onChange={(e) => setBookingTime(e.target.value)}
                min="09:00"
                max="21:00"
                required
                disabled={isLoading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeReserve} disabled={isLoading}>
              Cancelar
            </Button>
            <Button
              type="submit"
              onClick={handleBookingSubmit}
              disabled={isLoading || !bookingName || !bookingDate || !bookingTime || (activity?.ticket_pricing && (adultCount + seniorCount + childCount) === 0)}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Reservando...
                </>
              ) : (
                "Confirmar Reserva"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save to Trip Dialog */}
      <Dialog open={openSaveToTripDialog} onOpenChange={setOpenSaveToTripDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Guardar en Viaje</DialogTitle>
            <DialogDescription>
              Agrega esta actividad a uno de tus viajes planificados
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {isLoadingTrips ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : userTrips.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  No tienes viajes creados aún
                </p>
                <Button
                  onClick={() => {
                    setOpenSaveToTripDialog(false)
                    router.push("/trips/new")
                  }}
                  variant="outline"
                >
                  Crear mi primer viaje
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="trip-select">Selecciona un viaje *</Label>
                  <Select
                    value={selectedTripId}
                    onValueChange={setSelectedTripId}
                  >
                    <SelectTrigger id="trip-select">
                      <SelectValue placeholder="Elige un viaje" />
                    </SelectTrigger>
                    <SelectContent>
                      {userTrips.map((trip) => (
                        <SelectItem key={trip.id} value={trip.id.toString()}>
                          {trip.name} - {trip.destination}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="trip-date">Fecha programada (opcional)</Label>
                  <Input
                    id="trip-date"
                    type="date"
                    value={tripScheduledDate}
                    onChange={(e) => setTripScheduledDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="trip-notes">Notas (opcional)</Label>
                  <Textarea
                    id="trip-notes"
                    value={tripNotes}
                    onChange={(e) => setTripNotes(e.target.value)}
                    placeholder="Ej: Reservar con anticipación, ir temprano..."
                    rows={3}
                  />
                </div>
              </>
            )}
          </div>

          {userTrips.length > 0 && (
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setOpenSaveToTripDialog(false)
                  setSelectedTripId("")
                  setTripNotes("")
                  setTripScheduledDate("")
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmSaveToTrip}
                disabled={!selectedTripId || isSavingToTrip}
              >
                {isSavingToTrip ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Guardar"
                )}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Trip Selector Overlay (nuevo flujo) */}
      {showTripSelector && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowTripSelector(false)}
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
                    setSelectedDate(trip.start_date.split('T')[0])
                    setShowTripSelector(false)
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
              <Button variant="outline" className="flex-1 bg-transparent" onClick={() => setShowTripSelector(false)}>
                Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  setShowTripSelector(false)
                  router.push('/trips/new')
                }}
              >
                Crear Nuevo Viaje
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Date Selection Dialog (nuevo flujo) */}
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
            {activity && (
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <img
                  src={activity.images?.[0] || "/images/placeholder-business.jpg"}
                  alt={activity.name}
                  className="h-12 w-12 rounded object-cover shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{activity.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {activity.location.city}
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
                setSelectedDate("")
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (activity && selectedTrip && selectedDate) {
                  addToTrip(activity.id, selectedTrip.id, selectedDate)
                } else {
                  showAlert('error', 'Fecha requerida', 'Selecciona una fecha dentro del rango del viaje')
                }
              }}
              disabled={!selectedDate}
            >
              Agregar al itinerario
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* All Promotions Modal */}
      <Dialog open={openAllPromotionsDialog} onOpenChange={setOpenAllPromotionsDialog}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-6 w-6 text-primary" />
              Todas las Promociones ({promotions.length})
            </DialogTitle>
            <DialogDescription>
              Explora todas las promociones disponibles para {activity?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {promotions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {promotions.map((promotion) => (
                  <PromotionCard
                    key={promotion.id}
                    id={promotion.id}
                    title={promotion.title}
                    description={promotion.description}
                    discountPercentage={promotion.discount_percentage}
                    discountAmount={promotion.discount_amount}
                    code={promotion.code}
                    promotionType={promotion.promotion_type}
                    startDate={promotion.start_date}
                    endDate={promotion.end_date}
                    termsConditions={promotion.terms_conditions}
                    currentUses={promotion.current_uses}
                    maxUses={promotion.max_uses}
                    minPurchase={promotion.min_purchase}
                    isActive={promotion.is_active}
                    onClaim={isBusinessUser || promotion.promotion_type === "automatic" ? undefined : handleClaimPromotion}
                    showActions={true}
                    compact={false}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No hay promociones disponibles
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenAllPromotionsDialog(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  )
}
