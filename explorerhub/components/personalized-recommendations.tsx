"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { X, Search, DollarSign, Check, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import styles from "./personalized-recommendations.module.css"

interface PersonalizedRecommendationsProps {
  onClose: () => void
}

export function PersonalizedRecommendations({ onClose }: PersonalizedRecommendationsProps) {
  useEffect(() => {
    console.log("[v0] PersonalizedRecommendations component mounted")
    return () => {
      console.log("[v0] PersonalizedRecommendations component unmounted")
    }
  }, [])

  const router = useRouter()
  const [selectedBudget, setSelectedBudget] = useState<number[]>([])
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [displayedTags, setDisplayedTags] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [tagSearch, setTagSearch] = useState("")
  const [tagsToShow, setTagsToShow] = useState(20)

  useEffect(() => {
    const fetchTags = async () => {
      console.log("[v0] Starting to fetch tags from backend")
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://localhost:8000'
        console.log("[v0] Backend URL:", backendUrl)

        const response = await fetch(`${backendUrl}/api/businesses`)
        console.log("[v0] Response status:", response.status)

        if (response.ok) {
          const businesses = await response.json()
          console.log("[v0] Businesses fetched:", businesses.length)

          const allTags = new Set<string>()

          businesses.forEach((business: any) => {
            if (business.tags && Array.isArray(business.tags)) {
              business.tags.forEach((tag: string) => allTags.add(tag))
            }
          })

          const uniqueTags = Array.from(allTags).sort()
          console.log("[v0] Unique tags found:", uniqueTags.length, uniqueTags)
          setAvailableTags(uniqueTags)
          setDisplayedTags(uniqueTags.slice(0, 20))
        } else {
          console.log("[v0] Failed to fetch businesses, response not ok")
        }
      } catch (error) {
        console.error("[v0] Error fetching tags:", error)
      }
    }

    fetchTags()
  }, [])

  useEffect(() => {
    if (tagSearch) {
      const filtered = availableTags.filter((tag) => tag.toLowerCase().includes(tagSearch.toLowerCase()))
      setDisplayedTags(filtered.slice(0, tagsToShow))
    } else {
      setDisplayedTags(availableTags.slice(0, tagsToShow))
    }
  }, [tagSearch, availableTags, tagsToShow])

  const budgetLevels = [
    { value: 1, label: "$" },
    { value: 2, label: "$$" },
    { value: 3, label: "$$$" },
    { value: 4, label: "$$$$" },
  ]

  const toggleBudget = (value: number) => {
    if (selectedBudget.includes(value)) {
      setSelectedBudget(selectedBudget.filter((b) => b !== value))
    } else {
      setSelectedBudget([...selectedBudget, value])
    }
  }

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag))
    } else {
      setSelectedTags([...selectedTags, tag])
    }
  }

  const loadMoreTags = () => {
    setTagsToShow((prev) => prev + 20)
  }

  const filteredTags = tagSearch
    ? availableTags.filter((tag) => tag.toLowerCase().includes(tagSearch.toLowerCase()))
    : availableTags
  const hasMoreTags = filteredTags.length > tagsToShow

  const handleSearch = () => {
    console.log("[v0] Search clicked with filters:", { selectedBudget, selectedTags })

    const params = new URLSearchParams()

    if (selectedBudget.length > 0) {
      const minBudget = Math.min(...selectedBudget)
      const maxBudget = Math.max(...selectedBudget)
      params.set("minPrice", minBudget.toString())
      params.set("maxPrice", maxBudget.toString())
    }

    if (selectedTags.length > 0) {
      params.set("tags", selectedTags.join(","))
    }

    console.log("[v0] Navigating to explore with params:", params.toString())

    router.push(`/explore?${params.toString()}`)
    onClose()
  }

  console.log("[v0] Rendering modal overlay")

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Recomendaciones Personalizadas</h2>
          <button className={styles.closeButton} onClick={onClose} aria-label="Cerrar">
            <X className={styles.closeIcon} />
          </button>
        </div>

        <div className={styles.content}>
          {/* Budget Selection */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>
              <DollarSign className={styles.sectionIcon} />
              Selecciona tu presupuesto
            </h3>
            <div className={styles.budgetGrid}>
              {budgetLevels.map((budget) => (
                <button
                  key={budget.value}
                  className={`${styles.budgetButton} ${
                    selectedBudget.includes(budget.value) ? styles.budgetButtonSelected : ""
                  }`}
                  onClick={() => toggleBudget(budget.value)}
                >
                  {budget.label}
                  {selectedBudget.includes(budget.value) && <Check className={styles.checkIcon} />}
                </button>
              ))}
            </div>
            {selectedBudget.length > 0 && (
              <p className={styles.selectedInfo}>
                {selectedBudget.length} nivel{selectedBudget.length !== 1 ? "es" : ""} seleccionado
                {selectedBudget.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>

          {/* Tags Selection */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>
              <Search className={styles.sectionIcon} />
              Palabras clave
            </h3>

            {/* Search Input */}
            <div className={styles.searchWrapper}>
              <Search className={styles.searchIcon} />
              <Input
                type="text"
                placeholder="Buscar palabras clave..."
                value={tagSearch}
                onChange={(e) => setTagSearch(e.target.value)}
                className={styles.searchInput}
              />
            </div>

            {/* Tags Grid */}
            <div className={styles.tagsGrid}>
              {displayedTags.map((tag) => (
                <button
                  key={tag}
                  className={`${styles.tagButton} ${selectedTags.includes(tag) ? styles.tagButtonSelected : ""}`}
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                  {selectedTags.includes(tag) && <Check className={styles.tagCheckIcon} />}
                </button>
              ))}
            </div>

            {displayedTags.length === 0 && <p className={styles.noResults}>No se encontraron palabras clave</p>}

            {hasMoreTags && (
              <div className={styles.showMoreContainer}>
                <Button variant="outline" onClick={loadMoreTags} className={styles.showMoreButton}>
                  Mostrar más
                </Button>
              </div>
            )}

            {selectedTags.length > 0 && (
              <p className={styles.selectedInfo}>
                {selectedTags.length} palabra{selectedTags.length !== 1 ? "s" : ""} clave seleccionada
                {selectedTags.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <Button variant="outline" onClick={onClose} className={styles.cancelButton}>
            Cancelar
          </Button>
          <Button
            onClick={handleSearch}
            disabled={selectedBudget.length === 0 && selectedTags.length === 0}
            className={styles.searchButton}
          >
            Buscar Actividades
          </Button>
        </div>
      </div>
    </div>
  )
}
