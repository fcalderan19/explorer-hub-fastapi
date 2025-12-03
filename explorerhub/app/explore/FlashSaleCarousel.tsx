"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight, Zap, Clock, Heart, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FlashSaleBadgeCompact } from "@/components/flash-sale-badge"
import styles from "./flash-carousel.module.css"

interface FlashPromotion {
  id: number
  business_id: number
  business_name: string
  business_image?: string
  business_rating?: number
  business_location?: string
  title: string
  discount_percentage?: number
  discount_amount?: number
  start_date: string
  flash_duration_hours: number
  current_uses: number
  max_uses?: number
  min_purchase?: number
}

export function FlashSaleCarousel() {
  const router = useRouter()
  const [flashPromotions, setFlashPromotions] = useState<FlashPromotion[]>([])
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [timeLeft, setTimeLeft] = useState<Record<number, string>>({})

  useEffect(() => {
    fetchFlashPromotions()
  }, [])

  // Actualizar contadores cada segundo
  useEffect(() => {
    const interval = setInterval(() => {
      const newTimeLeft: Record<number, string> = {}
      
      flashPromotions.forEach((promo) => {
        const start = new Date(promo.start_date)
        const end = new Date(start.getTime() + promo.flash_duration_hours * 60 * 60 * 1000)
        const now = new Date()
        const diff = end.getTime() - now.getTime()

        if (diff > 0) {
          const hours = Math.floor(diff / (1000 * 60 * 60))
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
          const seconds = Math.floor((diff % (1000 * 60)) / 1000)
          
          // Formato tipo Mercado Libre: "02 : 54 : 23"
          newTimeLeft[promo.id] = `${String(hours).padStart(2, '0')} : ${String(minutes).padStart(2, '0')} : ${String(seconds).padStart(2, '0')}`
        }
      })

      setTimeLeft(newTimeLeft)
    }, 1000)

    return () => clearInterval(interval)
  }, [flashPromotions])

  const fetchFlashPromotions = async () => {
    try {
      setIsLoading(true)
      
      // Obtener todas las promociones flash activas
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || "https://localhost:8000"}/api/promotions/flash-sales`
      )

      if (!response.ok) {
        console.error("Error fetching flash promotions")
        setFlashPromotions([])
        return
      }

      const data = await response.json()
      setFlashPromotions(data)
    } catch (error) {
      console.error("Error:", error)
      setFlashPromotions([])
    } finally {
      setIsLoading(false)
    }
  }

  const nextSlide = () => {
    setCurrentSlide((prev) => 
      prev === Math.max(0, flashPromotions.length - 3) ? 0 : prev + 1
    )
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => 
      prev === 0 ? Math.max(0, flashPromotions.length - 3) : prev - 1
    )
  }

  if (isLoading) {
    return (
      <div className={styles.carouselContainer}>
        <div className={styles.carouselHeader}>
          <Zap className={styles.headerIcon} />
          <h2 className={styles.carouselTitle}>Ofertas Relámpago</h2>
        </div>
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>Cargando ofertas...</p>
        </div>
      </div>
    )
  }

  // Si no hay ofertas flash, no renderizar nada
  if (flashPromotions.length === 0) {
    return null
  }

  return (
    <div className={styles.carouselContainer}>
      {/* Header */}
      <div className={styles.carouselHeader}>
        <div className={styles.headerLeft}>
          <h2 className={styles.carouselTitle}>⚡ Ofertas Relámpago</h2>
          <span className={styles.headerBadge}>¡Por tiempo limitado!</span>
        </div>
        <div className={styles.carouselControls}>
          <Button
            variant="outline"
            size="icon"
            onClick={prevSlide}
            className={styles.controlButton}
            disabled={flashPromotions.length <= 3}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={nextSlide}
            className={styles.controlButton}
            disabled={flashPromotions.length <= 3}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Carousel */}
      <div className={styles.carouselWrapper}>
        <div 
          className={styles.carouselTrack}
          style={{
            transform: `translateX(-${currentSlide * (100 / 3)}%)`,
          }}
        >
          {flashPromotions.map((promo) => {
            const remaining = promo.max_uses ? promo.max_uses - promo.current_uses : undefined
            const isLowStock = remaining !== undefined && remaining <= 5 && remaining > 0
            const isLastOne = remaining === 1
            
            return (
              <div
                key={promo.id}
                className={styles.flashCard}
                onClick={() => router.push(`/activity/${promo.business_id}`)}
              >
                {/* Flash Sale Badge tipo Mercado Libre */}
                <div className={styles.mlBadge}>
                  <span className={styles.mlBadgeText}>OFERTA RELÁMPAGO</span>
                  {timeLeft[promo.id] && (
                    <span className={styles.mlTimer}>{timeLeft[promo.id]}</span>
                  )}
                </div>

                {/* Image */}
                <div className={styles.cardImage}>
                  <img
                    src={promo.business_image || "/placeholder.jpg"}
                    alt={promo.business_name}
                  />
                  <div className={styles.imageOverlay} />
                </div>

                {/* Content */}
                <div className={styles.cardContent}>
                  <h3 className={styles.businessName}>{promo.business_name}</h3>
                  
                  {/* Promotion Title */}
                  <p className={styles.promoTitle}>{promo.title}</p>

                  {/* Precio con descuento estilo ML */}
                  <div className={styles.priceSection}>
                    {promo.discount_percentage && (
                      <span className={styles.mlDiscount}>
                        {promo.discount_percentage}% OFF
                      </span>
                    )}
                  </div>

                  {/* Stock warnings estilo ML */}
                  {isLastOne && (
                    <div className={styles.mlStockCritical}>
                      ¡Último disponible!
                    </div>
                  )}
                  
                  {isLowStock && !isLastOne && (
                    <div className={styles.mlStockLow}>
                      ¡Quedan {remaining}!
                    </div>
                  )}
                  
                  {remaining !== undefined && remaining > 5 && (
                    <div className={styles.mlStockNormal}>
                      {remaining} disponibles
                    </div>
                  )}

                  {/* Rating & Location */}
                  <div className={styles.cardFooter}>
                    {promo.business_rating && (
                      <div className={styles.rating}>
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span>{promo.business_rating.toFixed(1)}</span>
                      </div>
                    )}
                    {promo.business_location && (
                      <span className={styles.location}>{promo.business_location}</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Indicators */}
      {flashPromotions.length > 3 && (
        <div className={styles.indicators}>
          {Array.from({ length: Math.max(0, flashPromotions.length - 2) }).map((_, idx) => (
            <button
              key={idx}
              className={`${styles.indicator} ${idx === currentSlide ? styles.indicatorActive : ""}`}
              onClick={() => setCurrentSlide(idx)}
              aria-label={`Ir a slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
