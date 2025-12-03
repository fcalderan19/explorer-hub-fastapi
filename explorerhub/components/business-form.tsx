"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { X, Upload, ImageIcon, ChevronDown } from "lucide-react"
import { CachedImage } from "@/components/cached-image"
import styles from "./business-form.module.css"

interface BusinessFormProps {
  onSubmit: (data: any) => void
  initialData?: any
  isLoading?: boolean
}

export function BusinessForm({ onSubmit, initialData, isLoading }: BusinessFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    description: initialData?.description || "",
    categories: initialData?.categories || [], // Cambiado de category a categories
    address: initialData?.location?.address || "",
    city: initialData?.location?.city || "",
    state: initialData?.location?.state || "",
    country: initialData?.location?.country || "",
    phone: initialData?.phone || "",
    website: initialData?.website || "",
    price_level: initialData?.price_level || 2,
    tags: initialData?.tags ? initialData.tags.join(", ") : "",
    images: initialData?.images || [],
    allows_bookings: initialData?.allows_bookings !== undefined ? initialData.allows_bookings : true,
    max_capacity: initialData?.max_capacity || "", // Nuevo campo para cupo máximo
    is_unique: initialData?.is_unique || false, // Nueva opción de actividad única
    // Pricing models
    ticket_pricing: initialData?.ticket_pricing || null,
    hotel_pricing: initialData?.hotel_pricing || null,
    restaurant_pricing: initialData?.restaurant_pricing || null,
    wellness_pricing: initialData?.wellness_pricing || null,
  })

  const [imageUrls, setImageUrls] = useState<string[]>(initialData?.images || [])
  const [newImageUrl, setNewImageUrl] = useState("")

  // Update form data when initialData changes
  useEffect(() => {
    if (initialData) {
      console.log("📋 InitialData categories:", initialData.categories)
      console.log("[v0] InitialData is_unique:", initialData.is_unique)

      // Normalizar categorías: convertir español → inglés si es necesario
      const normalizedCategories = (initialData.categories || []).map((cat: string) => {
        const mapping: Record<string, string> = {
          Restaurante: "Restaurant",
          Actividad: "Activity",
          Atracción: "Attraction",
          Naturaleza: "Nature",
          Cultural: "Cultural",
          Entretenimiento: "Entertainment",
          Compras: "Shopping",
          "Vida Nocturna": "Nightlife",
          Alojamiento: "Hotel",
          Accommodation: "Hotel",
          Bienestar: "Wellness",
          Histórico: "Historical",
          Familiar: "Family",
        }
        return mapping[cat] || cat // Si ya está en inglés, lo deja igual
      })

      console.log("✅ Normalized categories:", normalizedCategories)

      setFormData({
        name: initialData.name || "",
        description: initialData.description || "",
        categories: normalizedCategories,
        address: initialData.location?.address || "",
        city: initialData.location?.city || "",
        state: initialData.location?.state || "",
        country: initialData.location?.country || "",
        phone: initialData.phone || "",
        website: initialData.website || "",
        price_level: initialData.price_level || 2,
        tags: initialData.tags ? initialData.tags.join(", ") : "",
        images: initialData.images || [],
        allows_bookings: initialData.allows_bookings !== undefined ? initialData.allows_bookings : true,
        max_capacity: initialData.max_capacity || "",
        is_unique: initialData.is_unique || false,
        ticket_pricing: initialData.ticket_pricing || null,
        hotel_pricing: initialData.hotel_pricing || null,
        restaurant_pricing: initialData.restaurant_pricing || null,
        wellness_pricing: initialData.wellness_pricing || null,
      })
      setImageUrls(initialData.images || [])
    }
  }, [initialData])

  // Lista de categorías disponibles (valores en inglés para el backend)
  const availableCategories = [
    { value: "Restaurant", label: "Restaurante" },
    { value: "Activity", label: "Actividad" },
    { value: "Attraction", label: "Atracción" },
    { value: "Nature", label: "Naturaleza" },
    { value: "Cultural", label: "Cultural" },
    { value: "Entertainment", label: "Entretenimiento" },
    { value: "Shopping", label: "Compras" },
    { value: "Nightlife", label: "Vida Nocturna" },
    { value: "Hotel", label: "Hotel" },
    { value: "Wellness", label: "Bienestar" },
    { value: "Historical", label: "Histórico" },
    { value: "Family", label: "Familiar" },
  ]

  const handleCategoryToggle = (categoryValue: string) => {
    const currentCategories = formData.categories
    const isSelected = currentCategories.includes(categoryValue)

    if (isSelected) {
      setFormData({
        ...formData,
        categories: currentCategories.filter((cat: string) => cat !== categoryValue),
      })
    } else {
      setFormData({
        ...formData,
        categories: [...currentCategories, categoryValue],
      })
    }
  }

  const handleAddImage = () => {
    if (newImageUrl.trim()) {
      const updatedImages = [...imageUrls, newImageUrl.trim()]
      setImageUrls(updatedImages)
      setFormData({ ...formData, images: updatedImages })
      setNewImageUrl("")
    }
  }

  const handleRemoveImage = (index: number) => {
    const updatedImages = imageUrls.filter((_, i) => i !== index)
    setImageUrls(updatedImages)
    setFormData({ ...formData, images: updatedImages })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validar que al menos una categoría esté seleccionada
    if (formData.categories.length === 0) {
      alert("Debes seleccionar al menos una categoría")
      return
    }

    console.log("[v0] Submitting form with is_unique:", formData.is_unique)

    const submitData = {
      ...formData,
      location: {
        address: formData.address,
        city: formData.city,
        state: formData.state,
        country: formData.country,
      },
      tags: Array.isArray(formData.tags)
        ? formData.tags
        : formData.tags
            .split(",")
            .map((tag: string) => tag.trim())
            .filter((tag: string) => tag),
      images: imageUrls,
      allows_bookings: formData.allows_bookings,
      max_capacity: formData.max_capacity ? Number.parseInt(formData.max_capacity) : null,
      is_unique: formData.is_unique,
      // Include pricing models (only send if they have values)
      ticket_pricing: formData.ticket_pricing?.adult_price ? formData.ticket_pricing : undefined,
      hotel_pricing: formData.hotel_pricing?.price_per_night ? formData.hotel_pricing : undefined,
      restaurant_pricing:
        formData.restaurant_pricing?.reservation_fee || formData.restaurant_pricing?.average_price_per_person
          ? formData.restaurant_pricing
          : undefined,
      wellness_pricing: formData.wellness_pricing?.session_price ? formData.wellness_pricing : undefined,
    }
    onSubmit(submitData)
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>{initialData ? "Editar Negocio" : "Agregar Nuevo Negocio"}</CardTitle>
        </CardHeader>
        <CardContent className={styles.contentSpace}>
          <div className={styles.gridTwo}>
            <div className={styles.spaceY2}>
              <Label htmlFor="name">Nombre del Negocio *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className={styles.spaceY2}>
              <Label>Categorías *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className={`${styles.multiSelectTrigger} justify-between`}>
                    <span className={styles.multiSelectText}>
                      {formData.categories.length > 0
                        ? formData.categories.length <= 2
                          ? formData.categories
                              .map((cat: string) => availableCategories.find((c) => c.value === cat)?.label)
                              .join(", ")
                          : `${formData.categories.length} categorías seleccionadas`
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
                          checked={formData.categories.includes(cat.value)}
                          onCheckedChange={() => handleCategoryToggle(cat.value)}
                        />
                        <Label
                          htmlFor={`category-${cat.value}`}
                          className={`${styles.multiSelectLabel} text-sm font-normal cursor-pointer`}
                        >
                          {cat.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              {formData.categories.length === 0 && (
                <p className="text-sm text-red-500 mt-1">Selecciona al menos una categoría</p>
              )}
            </div>
          </div>

          <div className={styles.spaceY2}>
            <Label htmlFor="description">Descripción *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              required
            />
          </div>

          <div className={styles.spaceY2}>
            <Label htmlFor="tags">Palabras Clave</Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="ej: aventura, familia, naturaleza (separadas por comas)"
            />
            <p className="text-xs text-gray-500 mt-1">
              Agrega palabras clave que describan tu negocio, separadas por comas. Estas ayudarán a los usuarios a
              encontrar tu actividad mediante recomendaciones personalizadas.
            </p>
          </div>

          <div className={styles.spaceY2}>
            <div className="flex items-start space-x-3 p-4 border-2 border-dashed border-primary/30 rounded-lg bg-primary/5">
              <Checkbox
                id="is_unique"
                checked={formData.is_unique}
                onCheckedChange={(checked) => {
                  console.log("[v0] Checkbox changed to:", checked)
                  setFormData({ ...formData, is_unique: checked as boolean })
                }}
              />
              <div className="flex-1">
                <Label htmlFor="is_unique" className="text-sm font-semibold leading-none cursor-pointer">
                  Actividad Única
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Marca esta opción si tu negocio ofrece una experiencia única e irrepetible
                </p>
              </div>
            </div>
          </div>

          <div className={styles.gridTwo}>
            <div className={styles.spaceY2}>
              <Label htmlFor="address">Dirección *</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                required
              />
            </div>

            <div className={styles.spaceY2}>
              <Label htmlFor="city">Ciudad *</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                required
              />
            </div>
          </div>

          <div className={styles.gridTwo}>
            <div className={styles.spaceY2}>
              <Label htmlFor="state">Provincia/Estado *</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                required
              />
            </div>

            <div className={styles.spaceY2}>
              <Label htmlFor="country">País *</Label>
              <Input
                id="country"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                required
              />
            </div>
          </div>

          <div className={styles.gridTwo}>
            <div className={styles.spaceY2}>
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div className={styles.spaceY2}>
              <Label htmlFor="website">Sitio Web</Label>
              <Input
                id="website"
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              />
            </div>
          </div>

          <div className={styles.gridTwo}>
            <div className={styles.spaceY2}>
              <Label htmlFor="price_level">Nivel de Precio *</Label>
              <Select
                value={formData.price_level.toString()}
                onValueChange={(value) => setFormData({ ...formData, price_level: Number.parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">$ - Económico</SelectItem>
                  <SelectItem value="2">$$ - Moderado</SelectItem>
                  <SelectItem value="3">$$$ - Costoso</SelectItem>
                  <SelectItem value="4">$$$$ - Lujo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className={styles.spaceY2}>
              <Label htmlFor="max_capacity">Cupo Máximo (opcional)</Label>
              <Input
                id="max_capacity"
                type="number"
                min="1"
                value={formData.max_capacity}
                onChange={(e) => setFormData({ ...formData, max_capacity: e.target.value })}
                placeholder="ej: 50 personas"
              />
              <p className="text-xs text-gray-500 mt-1">Límite de personas que pueden reservar al mismo tiempo</p>
            </div>
          </div>

          <div className={styles.spaceY2}>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="allows_bookings"
                checked={formData.allows_bookings}
                onCheckedChange={(checked) => setFormData({ ...formData, allows_bookings: checked as boolean })}
              />
              <Label
                htmlFor="allows_bookings"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Permitir reservas en este negocio
              </Label>
            </div>
          </div>

          {/* PRICING SECTIONS - Mostrar según categorías */}

          {/* TICKET PRICING - Para museos, atracciones, actividades, entretenimiento */}
          {(formData.categories.includes("Attraction") ||
            formData.categories.includes("Cultural") ||
            formData.categories.includes("Historical") ||
            formData.categories.includes("Nature") ||
            formData.categories.includes("Family") ||
            formData.categories.includes("Activity") ||
            formData.categories.includes("Entertainment")) && (
            <Card className="mt-4 border-2 border-blue-200">
              <CardHeader className="bg-blue-50">
                <CardTitle className="text-lg">🎫 Precios de Entrada</CardTitle>
                <p className="text-sm text-gray-600">Configura los precios para diferentes tipos de visitantes</p>
              </CardHeader>
              <CardContent className="pt-6">
                <div className={styles.gridTwo}>
                  <div className={styles.spaceY2}>
                    <Label htmlFor="adult_price">Precio Adulto ($)</Label>
                    <Input
                      id="adult_price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.ticket_pricing?.adult_price || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          ticket_pricing: {
                            ...formData.ticket_pricing,
                            adult_price: e.target.value ? Number.parseFloat(e.target.value) : null,
                          },
                        })
                      }
                      placeholder="ej: 15.00"
                    />
                  </div>
                  <div className={styles.spaceY2}>
                    <Label htmlFor="senior_price">Precio Adulto Mayor ($)</Label>
                    <Input
                      id="senior_price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.ticket_pricing?.senior_price || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          ticket_pricing: {
                            ...formData.ticket_pricing,
                            senior_price: e.target.value ? Number.parseFloat(e.target.value) : null,
                          },
                        })
                      }
                      placeholder="ej: 10.00"
                    />
                  </div>
                </div>
                <div className={styles.spaceY2}>
                  <Label htmlFor="child_price">Precio Niño ($)</Label>
                  <Input
                    id="child_price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.ticket_pricing?.child_price || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        ticket_pricing: {
                          ...formData.ticket_pricing,
                          child_price: e.target.value ? Number.parseFloat(e.target.value) : null,
                        },
                      })
                    }
                    placeholder="ej: 8.00"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* HOTEL PRICING - Para alojamientos */}
          {formData.categories.includes("Hotel") && (
            <Card className="mt-4 border-2 border-purple-200">
              <CardHeader className="bg-purple-50">
                <CardTitle className="text-lg">🏨 Precios de Hotel</CardTitle>
                <p className="text-sm text-gray-600">Configura tarifas por noche y estadía mínima/máxima</p>
              </CardHeader>
              <CardContent className="pt-6">
                <div className={styles.gridTwo}>
                  <div className={styles.spaceY2}>
                    <Label htmlFor="price_per_night">Precio por Noche ($) *</Label>
                    <Input
                      id="price_per_night"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.hotel_pricing?.price_per_night || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          hotel_pricing: {
                            ...formData.hotel_pricing,
                            price_per_night: e.target.value ? Number.parseFloat(e.target.value) : null,
                          },
                        })
                      }
                      placeholder="ej: 85.00"
                      required={formData.categories.includes("Hotel")}
                    />
                  </div>
                  <div className={styles.spaceY2}>
                    <Label htmlFor="min_nights">Mínimo de Noches</Label>
                    <Input
                      id="min_nights"
                      type="number"
                      min="1"
                      value={formData.hotel_pricing?.min_nights || 1}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          hotel_pricing: {
                            ...formData.hotel_pricing,
                            min_nights: e.target.value ? Number.parseInt(e.target.value) : 1,
                          },
                        })
                      }
                      placeholder="ej: 2"
                    />
                  </div>
                </div>
                <div className={styles.spaceY2}>
                  <Label htmlFor="max_nights">Máximo de Noches (opcional)</Label>
                  <Input
                    id="max_nights"
                    type="number"
                    min="1"
                    value={formData.hotel_pricing?.max_nights || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        hotel_pricing: {
                          ...formData.hotel_pricing,
                          max_nights: e.target.value ? Number.parseInt(e.target.value) : null,
                        },
                      })
                    }
                    placeholder="Dejar vacío si no hay límite"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* RESTAURANT PRICING - Para restaurantes */}
          {(formData.categories.includes("Restaurant") || formData.categories.includes("Nightlife")) && (
            <Card className="mt-4 border-2 border-orange-200">
              <CardHeader className="bg-orange-50">
                <CardTitle className="text-lg">🍽️ Precios de Restaurante</CardTitle>
                <p className="text-sm text-gray-600">Cargo de reserva y precios estimados</p>
              </CardHeader>
              <CardContent className="pt-6">
                <div className={styles.gridTwo}>
                  <div className={styles.spaceY2}>
                    <Label htmlFor="reservation_fee">Cargo de Reserva ($)</Label>
                    <Input
                      id="reservation_fee"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.restaurant_pricing?.reservation_fee || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          restaurant_pricing: {
                            ...formData.restaurant_pricing,
                            reservation_fee: e.target.value ? Number.parseFloat(e.target.value) : null,
                          },
                        })
                      }
                      placeholder="ej: 5.00"
                    />
                    <p className="text-xs text-gray-500">Cargo por adelantado al reservar</p>
                  </div>
                  <div className={styles.spaceY2}>
                    <Label htmlFor="average_price_per_person">Precio Promedio por Persona ($)</Label>
                    <Input
                      id="average_price_per_person"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.restaurant_pricing?.average_price_per_person || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          restaurant_pricing: {
                            ...formData.restaurant_pricing,
                            average_price_per_person: e.target.value ? Number.parseFloat(e.target.value) : null,
                          },
                        })
                      }
                      placeholder="ej: 25.00"
                    />
                    <p className="text-xs text-gray-500">Para estimación de costos</p>
                  </div>
                </div>
                <div className={styles.spaceY2}>
                  <Label htmlFor="min_consumption">Consumo Mínimo ($)</Label>
                  <Input
                    id="min_consumption"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.restaurant_pricing?.min_consumption || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        restaurant_pricing: {
                          ...formData.restaurant_pricing,
                          min_consumption: e.target.value ? Number.parseFloat(e.target.value) : null,
                        },
                      })
                    }
                    placeholder="ej: 50.00"
                  />
                  <p className="text-xs text-gray-500">Consumo mínimo requerido (opcional)</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* WELLNESS PRICING - Para spas y bienestar */}
          {formData.categories.includes("Wellness") && (
            <Card className="mt-4 border-2 border-teal-200">
              <CardHeader className="bg-teal-50">
                <CardTitle className="text-lg">💆 Precios de Bienestar</CardTitle>
                <p className="text-sm text-gray-600">Sesiones individuales y paquetes</p>
              </CardHeader>
              <CardContent className="pt-6">
                <div className={styles.gridTwo}>
                  <div className={styles.spaceY2}>
                    <Label htmlFor="session_price">Precio por Sesión ($) *</Label>
                    <Input
                      id="session_price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.wellness_pricing?.session_price || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          wellness_pricing: {
                            ...formData.wellness_pricing,
                            session_price: e.target.value ? Number.parseFloat(e.target.value) : null,
                          },
                        })
                      }
                      placeholder="ej: 50.00"
                      required={formData.categories.includes("Wellness")}
                    />
                  </div>
                  <div className={styles.spaceY2}>
                    <Label htmlFor="sessions_in_package">Sesiones en Paquete</Label>
                    <Input
                      id="sessions_in_package"
                      type="number"
                      min="2"
                      value={formData.wellness_pricing?.sessions_in_package || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          wellness_pricing: {
                            ...formData.wellness_pricing,
                            sessions_in_package: e.target.value ? Number.parseInt(e.target.value) : null,
                          },
                        })
                      }
                      placeholder="ej: 4"
                    />
                    <p className="text-xs text-gray-500">Número de sesiones incluidas</p>
                  </div>
                </div>
                <div className={styles.spaceY2}>
                  <Label htmlFor="package_price">Precio del Paquete ($)</Label>
                  <Input
                    id="package_price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.wellness_pricing?.package_price || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        wellness_pricing: {
                          ...formData.wellness_pricing,
                          package_price: e.target.value ? Number.parseFloat(e.target.value) : null,
                        },
                      })
                    }
                    placeholder="ej: 180.00"
                  />
                  {formData.wellness_pricing?.session_price &&
                    formData.wellness_pricing?.sessions_in_package &&
                    formData.wellness_pricing?.package_price && (
                      <p className="text-xs text-green-600 mt-1">
                        ✨ Ahorro por paquete: $
                        {(
                          formData.wellness_pricing.session_price * formData.wellness_pricing.sessions_in_package -
                          formData.wellness_pricing.package_price
                        ).toFixed(2)}
                      </p>
                    )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Image Upload Section */}
          <div className={styles.spaceY2}>
            <Label>Imágenes del Negocio</Label>
            <div className={styles.spaceY3}>
              <div className={styles.imageInputRow}>
                <Input
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="URL de la imagen"
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleAddImage()
                    }
                  }}
                />
                <Button type="button" onClick={handleAddImage} disabled={!newImageUrl.trim()}>
                  <Upload className="h-4 w-4 mr-2" />
                  Agregar
                </Button>
              </div>

              {imageUrls.length > 0 && (
                <div className={styles.imageGrid}>
                  {imageUrls.map((url, index) => (
                    <div key={index} className={styles.imageWrapper}>
                      <div className={styles.imageContainer}>
                        <CachedImage
                          src={url}
                          alt={`Imagen ${index + 1}`}
                          className={styles.imagePreview}
                          fallback="/placeholder.svg"
                        />
                      </div>
                      <button type="button" onClick={() => handleRemoveImage(index)} className={styles.removeButton}>
                        <X className="h-4 w-4" />
                      </button>
                      <div className={styles.imageIndex}>{index + 1}</div>
                    </div>
                  ))}
                </div>
              )}

              {imageUrls.length === 0 && (
                <div className={styles.emptyState}>
                  <ImageIcon className={styles.emptyIcon} />
                  <p className={styles.emptyText}>No hay imágenes agregadas</p>
                  <p className={styles.emptySubtext}>Agrega URLs de imágenes para tu negocio</p>
                </div>
              )}
            </div>
          </div>

          <div className={styles.actions}>
            <Button type="submit" disabled={isLoading} className={styles.submitButton}>
              {isLoading ? "Guardando..." : initialData ? "Actualizar Negocio" : "Crear Negocio"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
