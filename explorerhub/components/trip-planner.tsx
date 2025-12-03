"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import styles from "./trip-planner.module.css"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Sparkles, Globe, Lock, Users } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface TripPlannerProps {
  onCreateTrip: (data: any) => void
}

export function TripPlanner({ onCreateTrip }: TripPlannerProps) {
  const [name, setName] = useState("")
  const [destination, setDestination] = useState("")
  const [startDate, setStartDate] = useState<Date>()
  const [endDate, setEndDate] = useState<Date>()
  const [description, setDescription] = useState("")
  const [coverImage, setCoverImage] = useState("")
  const [visibility, setVisibility] = useState<"private" | "followers" | "public">("private")
  const [isStartDateOpen, setIsStartDateOpen] = useState(false)
  const [isEndDateOpen, setIsEndDateOpen] = useState(false)
  const [cities, setCities] = useState<string[]>([])
  const [loadingCities, setLoadingCities] = useState(true)

  useEffect(() => {
    const fetchCities = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"
        const res = await fetch(`${baseUrl}/api/businesses/cities`)
        if (res.ok) {
          const data = await res.json()
          setCities(data)
        }
      } catch (error) {
        console.error("Error fetching cities:", error)
      } finally {
        setLoadingCities(false)
      }
    }
    fetchCities()
  }, [])

  const handleStartDateSelect = (date: Date | undefined) => {
    if (date && endDate && date > endDate) {
      setEndDate(undefined)
    }
    setStartDate(date)
    setIsStartDateOpen(false)
  }

  const handleEndDateSelect = (date: Date | undefined) => {
    if (date && startDate && date < startDate) {
      return
    }
    setEndDate(date)
    setIsEndDateOpen(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onCreateTrip({
      name,
      destination,
      start_date: startDate ? startDate.toISOString() : null,
      end_date: endDate ? endDate.toISOString() : null,
      description,
      cover_image: coverImage || null,
      visibility,
    })
  }

  const dateError = startDate && endDate && startDate > endDate

  return (
    <Card>
      <CardHeader>
        <CardTitle className={styles.cardTitle}>
          <Sparkles className={styles.titleIcon} />
          Arma tu viaje
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className={styles.formContainer}>
          <div className={styles.fieldContainer}>
            <Label htmlFor="name" className={styles.labelMargin}>Nombre del viaje *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Verano en Italia"
              required
            />
          </div>

          <div className={styles.fieldContainer}>
            <Label htmlFor="destination" className={styles.labelMargin}>Ciudad de destino *</Label>
            <Select value={destination} onValueChange={setDestination} disabled={loadingCities}>
              <SelectTrigger id="destination">
                <SelectValue placeholder={loadingCities ? "Cargando ciudades..." : "Selecciona una ciudad"} />
              </SelectTrigger>
              <SelectContent>
                {cities.map((city) => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className={styles.gridTwo}>
            <div className={styles.fieldContainer}>
              <Label>Fecha de inicio *</Label>
              <Popover open={isStartDateOpen} onOpenChange={setIsStartDateOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={styles.calendarButton}>
                    <CalendarIcon className={styles.calendarIcon} />
                    {startDate ? format(startDate, "PPP", { locale: es }) : <span>Selecciona una fecha</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className={styles.popoverContent}>
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={handleStartDateSelect}
                    disabled={endDate ? [{ after: endDate }] : undefined}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className={styles.fieldContainer}>
              <Label>Fecha de fin *</Label>
              <Popover open={isEndDateOpen} onOpenChange={setIsEndDateOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={styles.calendarButton}>
                    <CalendarIcon className={styles.calendarIcon} />
                    {endDate ? format(endDate, "PPP", { locale: es }) : <span>Selecciona una fecha</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className={styles.popoverContent}>
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={handleEndDateSelect}
                    disabled={startDate ? [{ before: startDate }] : undefined}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className={styles.fieldContainer}>
            <Label htmlFor="description">
              Descripción {visibility === "private" ? "(Opcional)" : "*"}
            </Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={visibility === "private" ? "Añade notas sobre tu viaje..." : "Describe tu viaje para compartirlo con otros..."}
              required={visibility !== "private"}
            />
          </div>

          <div className={styles.fieldContainer}>
            <Label htmlFor="coverImage">Imagen de Portada (URL)</Label>
            <Input
              id="coverImage"
              type="url"
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
              placeholder="https://ejemplo.com/imagen.jpg"
            />
            {coverImage && (
              <div className="mt-2">
                <img
                  src={coverImage}
                  alt="Vista previa de portada"
                  className="w-full max-w-xs h-32 object-cover rounded border"
                />
              </div>
            )}
          </div>

          <div className={styles.fieldContainer}>
            <Label>Visibilidad del itinerario</Label>
            <div className="flex flex-row gap-2 mt-2">
              <Button
                type="button"
                variant={visibility === "private" ? "default" : "outline"}
                onClick={() => setVisibility("private")}
                className="flex flex-col items-center gap-1 h-auto p-3 flex-1"
              >
                <Lock className="h-5 w-5" />
                <div className="text-center">
                  <div className="font-medium text-sm">Privado</div>
                  <div className="text-xs opacity-70">Solo tú</div>
                </div>
              </Button>
              
              <Button
                type="button"
                variant={visibility === "followers" ? "default" : "outline"}
                onClick={() => setVisibility("followers")}
                className="flex flex-col items-center gap-1 h-auto p-3 flex-1"
              >
                <Users className="h-5 w-5" />
                <div className="text-center">
                  <div className="font-medium text-sm">Seguidores</div>
                  <div className="text-xs opacity-70">Tus seguidores</div>
                </div>
              </Button>
              
              <Button
                type="button"
                variant={visibility === "public" ? "default" : "outline"}
                onClick={() => setVisibility("public")}
                className="flex flex-col items-center gap-1 h-auto p-3 flex-1"
              >
                <Globe className="h-5 w-5" />
                <div className="text-center">
                  <div className="font-medium text-sm">Público</div>
                  <div className="text-xs opacity-70">Todos</div>
                </div>
              </Button>
            </div>
          </div>

          {dateError && (
            <div className="text-sm text-red-600 -mt-2 mb-4">
              La fecha de inicio no puede ser posterior a la fecha de fin.
            </div>
          )}

          <Button
            type="submit"
            className={styles.fullWidthBtn}
            disabled={!name || !destination || !startDate || !endDate || dateError || (visibility !== "private" && !description.trim())}
          >
            Crear Viaje
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
