"use client"
import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import type React from "react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Calendar, Clock, X, Plus, Edit2, Save, Image, Trash2, MapPin } from "lucide-react"
import { DirectionsMapModal } from "@/components/directions-map-modal"
import { format } from "date-fns"
import { RouteLinkWrapper } from "@/components/route-link-wrapper"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import styles from "./itinerary-builder.module.css"

interface Activity {
  id: string
  business_id: string
  business_name: string
  categories: string[]
  scheduled_date?: Date
  notes?: string
  location?: {
    address?: string
    city?: string
  }
  images?: Array<{url: string, notes?: string}>
  business_images?: string[] // Images from the business itself
}

interface ItineraryBuilderProps {
  activities: Activity[]
  onAddActivity: () => void
  onRemoveActivity: (businessId: string) => void
  onUpdateSchedule: (businessId: string, date: Date) => void
  firstActivityMapLink?: React.ReactNode
  onUpdateNotes?: (businessId: string, notes: string) => void
  onAddImage?: (businessId: string, imageUrl: string) => void
  onUpdateImageNotes?: (businessId: string, imageIndex: number, notes: string) => void
  onRemoveImage?: (businessId: string, imageIndex: number) => void
}

export function ItineraryBuilder({
  activities,
  onAddActivity,
  onRemoveActivity,
  onUpdateSchedule,
  firstActivityMapLink,
  onUpdateNotes,
  onAddImage,
  onUpdateImageNotes,
  onRemoveImage,
}: ItineraryBuilderProps) {
  const [editingNotes, setEditingNotes] = useState<string | null>(null)
  const [tempNotes, setTempNotes] = useState("")
  const [editingImageNotes, setEditingImageNotes] = useState<{businessId: string, imageIndex: number} | null>(null)
  const [tempImageNotes, setTempImageNotes] = useState("")
  const [imageInput, setImageInput] = useState<{[key: string]: string}>({})
  const [pendingScheduleChanges, setPendingScheduleChanges] = useState<{[businessId: string]: Date}>({})
  const [draggedActivity, setDraggedActivity] = useState<Activity | null>(null)
  const [directionsModalOpen, setDirectionsModalOpen] = useState(false)
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null)

  const handleEditNotes = (businessId: string, currentNotes?: string) => {
    setEditingNotes(businessId)
    setTempNotes(currentNotes || "")
  }

  const handleSaveNotes = (businessId: string) => {
    if (onUpdateNotes) {
      onUpdateNotes(businessId, tempNotes)
    }
    setEditingNotes(null)
    setTempNotes("")
  }

  const handleCancelEdit = () => {
    setEditingNotes(null)
    setTempNotes("")
  }

  const handleEditImageNotes = (businessId: string, imageIndex: number, currentNotes?: string) => {
    setEditingImageNotes({businessId, imageIndex})
    setTempImageNotes(currentNotes || "")
  }

  const handleSaveImageNotes = (businessId: string, imageIndex: number) => {
    if (onUpdateImageNotes) {
      onUpdateImageNotes(businessId, imageIndex, tempImageNotes)
    }
    setEditingImageNotes(null)
    setTempImageNotes("")
  }

  const handleCancelImageEdit = () => {
    setEditingImageNotes(null)
    setTempImageNotes("")
  }

  const handleAddImage = (businessId: string) => {
    const imageUrl = imageInput[businessId]?.trim()
    if (imageUrl && onAddImage) {
      onAddImage(businessId, imageUrl)
      setImageInput(prev => ({...prev, [businessId]: ""}))
    }
  }

  const handleRemoveImage = (businessId: string, imageIndex: number) => {
    if (onRemoveImage) {
      onRemoveImage(businessId, imageIndex)
    }
  }

  const handleOpenDirections = (activity: Activity) => {
    setSelectedActivity(activity)
    setDirectionsModalOpen(true)
  }

  const handleDragStart = (activity: Activity) => {
    setDraggedActivity(activity)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (targetDateKey: string) => {
    if (!draggedActivity) return

    let newDate: Date
    if (targetDateKey === "sin-fecha") {
      // Remove the date
      newDate = null as any
    } else {
      newDate = new Date(targetDateKey + "T12:00:00")
    }

    // Store the pending change instead of applying immediately
    setPendingScheduleChanges(prev => ({
      ...prev,
      [draggedActivity.business_id]: newDate
    }))

    setDraggedActivity(null)
  }

  const handleSaveChanges = () => {
    // Apply all pending schedule changes
    Object.entries(pendingScheduleChanges).forEach(([businessId, date]) => {
      onUpdateSchedule(businessId, date)
    })
    // Clear pending changes
    setPendingScheduleChanges({})
  }

  const hasPendingChanges = Object.keys(pendingScheduleChanges).length > 0

  // Apply pending changes to activities for display
  const activitiesWithPendingChanges = activities.map(activity => {
    if (pendingScheduleChanges[activity.business_id] !== undefined) {
      return {
        ...activity,
        scheduled_date: pendingScheduleChanges[activity.business_id]
      }
    }
    return activity
  })

  const sortedActivities = [...activitiesWithPendingChanges].sort((a, b) => {
    // Activities without dates go to the end
    if (!a.scheduled_date && !b.scheduled_date) return 0
    if (!a.scheduled_date) return 1
    if (!b.scheduled_date) return -1
    
    // Sort by date ascending
    return a.scheduled_date.getTime() - b.scheduled_date.getTime()
  })

  // Group activities by date
  const groupedActivities = sortedActivities.reduce((groups, activity) => {
    const dateKey = activity.scheduled_date 
      ? format(activity.scheduled_date, "yyyy-MM-dd")
      : "sin-fecha"
    
    if (!groups[dateKey]) {
      groups[dateKey] = []
    }
    groups[dateKey].push(activity)
    return groups
  }, {} as Record<string, typeof sortedActivities>)

  const orderedDates = Object.keys(groupedActivities).sort((a, b) => {
    if (a === "sin-fecha") return 1
    if (b === "sin-fecha") return -1
    return a.localeCompare(b)
  })

  return (
    <div className={styles.rootContainer}>
      <div className={styles.headerRow}>
        <h3 className={styles.title}>Itinerario</h3>
        <div className="flex gap-2">
          {hasPendingChanges && (
            <Button onClick={handleSaveChanges} variant="default" className="bg-green-600 hover:bg-green-700">
              <Save className="h-4 w-4 mr-2" />
              Guardar Cambios
            </Button>
          )}
          <Button onClick={onAddActivity} className={styles.addActivityButton}>
            <Plus className={styles.addIcon} />
            Agregar Actividad
          </Button>
        </div>
      </div>

      {activities.length === 0 ? (
        <Card>
          <CardContent className={styles.emptyState}>
            <Calendar className={styles.emptyIcon} />
            <h4 className={styles.emptyTitle}>No hay actividades todavía</h4>
            <p className={styles.emptyText}>Comienza a construir tu itinerario agregando actividades</p>
            <Button onClick={onAddActivity} className={styles.addActivityButton}>
              <Plus className={styles.addIcon} />
              Agregar Tu Primera Actividad
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className={styles.spaceY3}>
          {orderedDates.map((dateKey) => {
            const dateActivities = groupedActivities[dateKey]
            const isUnscheduled = dateKey === "sin-fecha"
            const displayDate = isUnscheduled 
              ? "Sin fecha programada"
              : format(new Date(dateKey + "T12:00:00"), "EEEE d 'de' MMMM", { locale: require("date-fns/locale/es").es })
            
            return (
              <div 
                key={dateKey} 
                className="space-y-3"
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(dateKey)}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 h-px bg-gray-200" />
                  <h4 className="text-lg font-semibold text-gray-700 capitalize">
                    {displayDate}
                  </h4>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
                
                {dateActivities.map((activity, activityIndex) => {
                  const globalIndex = sortedActivities.findIndex(a => a.business_id === activity.business_id)
                  const isPendingChange = pendingScheduleChanges[activity.business_id] !== undefined
                  return (
                    <Card 
                      key={activity.business_id}
                      draggable
                      onDragStart={() => handleDragStart(activity)}
                      className={`cursor-move ${isPendingChange ? 'border-2 border-yellow-500' : ''}`}
                    >
                      <CardContent className={`${styles.activityCard} relative`}>
                        <div className="absolute right-4 top-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRemoveActivity(activity.business_id)}
                            className="text-red-600 hover:text-red-700"
                            title="Eliminar actividad"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        {globalIndex === 0 && firstActivityMapLink && <div className="mb-3">{firstActivityMapLink}</div>}

                        <div className={styles.activityContent}>
                          {/* Business Image on the left */}
                          {activity.business_images && activity.business_images.length > 0 && (
                            <div className="shrink-0 mr-4">
                              <img
                                src={activity.business_images[0]}
                                alt={activity.business_name}
                                className="w-32 h-32 object-cover rounded-lg"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none'
                                }}
                              />
                            </div>
                          )}

                          <div className={styles.activityMain}>
                            <div className={styles.activityHeader}>
                              <h4 className={styles.activityTitle}>{activity.business_name}</h4>
                              <Badge variant="secondary">
                                {activity.categories && activity.categories.length > 0 ? activity.categories[0] : 'Sin categoría'}
                              </Badge>
                            </div>

                            {/* Date Scheduler - Hidden, date shown in section header */}
                            <div className={styles.timeRow} style={{ display: 'none' }}>
                              <Clock className={styles.timeIcon} />
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="ghost" size="sm" className={styles.scheduleButton}>
                                    {activity.scheduled_date ? format(activity.scheduled_date, "PPP") : "Programar fecha"}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                  <CalendarComponent
                                    mode="single"
                                    selected={activity.scheduled_date}
                                    onSelect={(date) => date && onUpdateSchedule(activity.business_id, date)}
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>

                            {/* Notes Section */}
                            {editingNotes === activity.business_id ? (
                              <div className="space-y-2 mt-2">
                                <Textarea
                                  value={tempNotes}
                                  onChange={(e) => setTempNotes(e.target.value)}
                                  placeholder="Añade notas sobre esta actividad..."
                                  className={styles.notesTextarea}
                                />
                                <div className="flex gap-2">
                                  <Button size="sm" onClick={() => handleSaveNotes(activity.business_id)}>
                                    <Save className="h-3 w-3 mr-1" />
                                    Guardar
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                                    Cancelar
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                {activity.notes && <p className={styles.activityNotes}>{activity.notes}</p>}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditNotes(activity.business_id, activity.notes)}
                                  className={styles.editNotesButton}
                                >
                                  <Edit2 className="h-3 w-3 mr-1" />
                                  {activity.notes ? "Editar notas" : "Añadir notas"}
                                </Button>
                              </>
                            )}

                            {activity.location?.city && (
                              <div className="mt-3 space-y-2">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm text-muted-foreground">
                                    📍 {activity.location.address}, {activity.location.city}
                                  </p>
                                  <button
                                    onClick={() => handleOpenDirections(activity)}
                                    className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                                  >
                                    <MapPin className="h-3 w-3" />
                                    ¿Cómo llegar?
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Images Section */}
                            {onAddImage && (
                              <div className="space-y-3 mt-4">
                                <div className="flex gap-2">
                                  <Input
                                    type="url"
                                    placeholder="URL de la imagen..."
                                    value={imageInput[activity.business_id] || ""}
                                    onChange={(e) =>
                                      setImageInput((prev) => ({
                                        ...prev,
                                        [activity.business_id]: e.target.value,
                                      }))
                                    }
                                    className="flex-1"
                                  />
                                  <Button
                                    size="sm"
                                    onClick={() => handleAddImage(activity.business_id)}
                                    disabled={!imageInput[activity.business_id]?.trim()}
                                  >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Añadir
                                  </Button>
                                </div>

                                {activity.images && activity.images.length > 0 && (
                                  <div className="space-y-2">
                                    {activity.images.map((image, imageIndex) => (
                                      <div
                                        key={imageIndex}
                                        className="border rounded-lg p-3 bg-gray-50"
                                      >
                                        <div className="flex flex-col gap-3">
                                          <img
                                            src={image.url}
                                            alt={`Imagen ${imageIndex + 1}`}
                                            className="w-full max-w-xs h-48 object-cover rounded mx-auto"
                                          />
                                          <div className="flex-1">
                                            {editingImageNotes?.businessId === activity.business_id &&
                                            editingImageNotes.imageIndex === imageIndex ? (
                                              <div className="space-y-2">
                                                <Textarea
                                                  value={tempImageNotes}
                                                  onChange={(e) => setTempImageNotes(e.target.value)}
                                                  placeholder="Notas de la imagen..."
                                                  className="text-sm"
                                                  rows={2}
                                                />
                                                <div className="flex gap-2">
                                                  <Button
                                                    size="sm"
                                                    onClick={() =>
                                                      handleSaveImageNotes(activity.business_id, imageIndex)
                                                    }
                                                  >
                                                    <Save className="h-3 w-3 mr-1" />
                                                    Guardar
                                                  </Button>
                                                  <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={handleCancelImageEdit}
                                                  >
                                                    Cancelar
                                                  </Button>
                                                </div>
                                              </div>
                                            ) : (
                                              <>
                                                {image.notes && (
                                                  <p className="text-sm text-gray-700">{image.notes}</p>
                                                )}
                                                <div className="flex gap-2 mt-2">
                                                  <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() =>
                                                      handleEditImageNotes(
                                                        activity.business_id,
                                                        imageIndex,
                                                        image.notes
                                                      )
                                                    }
                                                  >
                                                    <Edit2 className="h-3 w-3 mr-1" />
                                                    {image.notes ? "Editar" : "Añadir notas"}
                                                  </Button>
                                                  <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() =>
                                                      handleRemoveImage(activity.business_id, imageIndex)
                                                    }
                                                    className="text-red-600 hover:text-red-700"
                                                  >
                                                    <Trash2 className="h-3 w-3 mr-1" />
                                                    Eliminar
                                                  </Button>
                                                </div>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}

      {/* Directions Map Modal */}
      {selectedActivity && selectedActivity.location && (
        <DirectionsMapModal
          isOpen={directionsModalOpen}
          onClose={() => {
            setDirectionsModalOpen(false)
            setSelectedActivity(null)
          }}
          destination={{
            address: selectedActivity.location.address || "",
            city: selectedActivity.location.city || "",
            lat: (selectedActivity.location as any)?.lat,
            lng: (selectedActivity.location as any)?.lng,
          }}
          destinationName={selectedActivity.business_name}
        />
      )}
    </div>
  )
}

export default ItineraryBuilder
