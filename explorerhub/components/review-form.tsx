"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Star } from "lucide-react"
import styles from "./review-form.module.css"

interface ReviewFormProps {
  businessId: string
  businessName: string
  onSubmit: (data: any) => void
  onCancel?: () => void
  showCard?: boolean
}

export function ReviewForm({ businessId, businessName, onSubmit, onCancel, showCard = true }: ReviewFormProps) {
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [title, setTitle] = useState("")
  const [text, setText] = useState("")
  const [errors, setErrors] = useState<{ rating?: string; title?: string; text?: string }>({})
  
  const MAX_TEXT_LENGTH = 300

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validar campos
    const newErrors: { rating?: string; title?: string; text?: string } = {}
    
    if (rating === 0) {
      newErrors.rating = "Por favor selecciona una calificación"
    }
    
    if (!title.trim()) {
      newErrors.title = "El título es requerido"
    }
    
    if (!text.trim()) {
      newErrors.text = "El comentario es requerido"
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    
    // Limpiar errores
    setErrors({})
    
    onSubmit({
      business_id: parseInt(businessId),
      rating,
      title: title.trim(),
      text: text.trim(),
    })
  }

  const formContent = (
    <form onSubmit={handleSubmit} className={styles.formContainer}>
      <div className={styles.spaceY2}>
        <Label>Puntuacion *</Label>
        <div className={styles.starRow}>
          {Array.from({ length: 5 }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setRating(i + 1)
                setErrors({ ...errors, rating: undefined })
              }}
              onMouseEnter={() => setHoveredRating(i + 1)}
              onMouseLeave={() => setHoveredRating(0)}
              className={styles.starBtn}
            >
              <Star
                className={`${styles.starIcon} ${
                  i < (hoveredRating || rating) ? styles.starFilled : styles.starEmpty
                }`}
              />
            </button>
          ))}
        </div>
        {errors.rating && <p className="text-sm text-red-600 mt-1">{errors.rating}</p>}
      </div>

      <div className={styles.fieldContainer}>
        <Label htmlFor="title">Titulo *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            setErrors({ ...errors, title: undefined })
          }}
          placeholder="Conta tu experiencia"
          required
          className={errors.title ? "border-red-500" : ""}
        />
        {errors.title && <p className="text-sm text-red-600 mt-1">{errors.title}</p>}
      </div>

      <div className={styles.fieldContainer}>
        <Label htmlFor="text">Comentarios *</Label>
        <Textarea
          id="text"
          value={text}
          onChange={(e) => {
            const newValue = e.target.value
            if (newValue.length <= MAX_TEXT_LENGTH) {
              setText(newValue)
            }
            if (errors.text) {
              setErrors({ ...errors, text: undefined })
            }
          }}
          placeholder="Comparte los detalles de tu experiencia..."
          rows={6}
          required
          maxLength={MAX_TEXT_LENGTH}
          className={errors.text ? "border-red-500" : ""}
        />
        <div className="flex justify-between items-center mt-1">
          {errors.text ? (
            <p className="text-sm text-red-600">{errors.text}</p>
          ) : (
            <div />
          )}
          <p className={`text-sm ${text.length >= MAX_TEXT_LENGTH ? 'text-red-600' : 'text-muted-foreground'}`}>
            {text.length}/{MAX_TEXT_LENGTH}
          </p>
        </div>
      </div>

      <div className={styles.actions}>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={rating === 0}>
          Enviar Reseña
        </Button>
      </div>
    </form>
  )

  if (!showCard) {
    return formContent
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Write a Review for {businessName}</CardTitle>
      </CardHeader>
      <CardContent>
        {formContent}
      </CardContent>
    </Card>
  )
}
