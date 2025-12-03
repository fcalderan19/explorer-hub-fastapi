"use client"

import { useState, useEffect, useRef } from "react"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Star } from "lucide-react"
import styles from "./filter-sidebar.module.css"

interface FilterSidebarProps {
  onFilterChange?: (filters: any) => void
  availableCategories?: string[]
}

export function FilterSidebar({ onFilterChange, availableCategories = [] }: FilterSidebarProps) {
  const [priceRange, setPriceRange] = useState([1, 4])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [minRating, setMinRating] = useState(0)
  const onChangeRef = useRef<typeof onFilterChange | undefined>(onFilterChange)
  useEffect(() => {
    onChangeRef.current = onFilterChange
  }, [onFilterChange])

  useEffect(() => {
    // Emit changes only when local filter values change; avoid depending on callback identity
    onChangeRef.current?.({
      priceRange,
      categories: selectedCategories,
      minRating,
    })
  }, [priceRange, selectedCategories, minRating])

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category],
    )
  }

  const handleClearFilters = () => {
    setPriceRange([1, 4])
    setSelectedCategories([])
    setMinRating(0)
  }

  return (
    <div className={styles.rootContainer}>
      <div className={styles.categorySection}>
        <h3 className={styles.heading}>Categorías</h3>
        <div className={styles.spaceY3}>
          {availableCategories.map((category) => (
            <div key={category} className={styles.row}>
              <Checkbox
                id={category}
                checked={selectedCategories.includes(category)}
                onCheckedChange={() => handleCategoryToggle(category)}
              />
              <Label htmlFor={category} className={styles.label}>
                {category}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.sectionDivider}>
        <h3 className={styles.heading}>Rango de Precio</h3>
        <Slider value={priceRange} onValueChange={setPriceRange} min={1} max={4} step={1} className={styles.slider} />
        <div className={styles.priceRow}>
          <span className={styles.priceText}>
            {"$".repeat(priceRange[0])} - {"$".repeat(priceRange[1])}
          </span>
        </div>
      </div>

      <div className={styles.sectionDivider}>
        <h3 className={styles.heading}>Calificación Mínima</h3>
        <div className={styles.ratingList}>
          {[4, 3, 2, 1, 0].map((rating) => (
            <button
              key={rating}
              onClick={() => setMinRating(rating)}
              className={styles.ratingButton}
              style={{
                backgroundColor: minRating === rating ? 'hsl(var(--primary))' : 'transparent',
                color: minRating === rating ? 'hsl(var(--primary-foreground))' : 'inherit',
                borderColor: minRating === rating ? 'hsl(var(--primary))' : 'transparent',
              }}
            >
              <div className={styles.ratingStars}>
                {rating > 0 ? (
                  <>
                    {Array.from({ length: rating }).map((_, i) => (
                      <Star key={i} className={styles.ratingIcon} />
                    ))}
                    <span className={styles.ratingText}>y más</span>
                  </>
                ) : (
                  <span className={styles.ratingText}>Todas las calificaciones</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.sectionDivider}>
        <Button 
          variant="outline" 
          className={styles.clearBtn} 
          onClick={handleClearFilters}
        >
          Limpiar Filtros
        </Button>
      </div>
    </div>
  )
}
