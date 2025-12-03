"use client"

import { useEffect, useRef, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, MapPin, Navigation } from "lucide-react"
import dynamic from "next/dynamic"
import "leaflet/dist/leaflet.css"

// Lazy-load react-leaflet components to avoid SSR issues
const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer as any), { ssr: false })
const TileLayer = dynamic(() => import("react-leaflet").then(m => m.TileLayer as any), { ssr: false })
const Marker = dynamic(() => import("react-leaflet").then(m => m.Marker as any), { ssr: false })
const Polyline = dynamic(() => import("react-leaflet").then(m => m.Polyline as any), { ssr: false })

interface DirectionsMapModalProps {
  isOpen: boolean
  onClose: () => void
  destination: {
    address: string
    city: string
    lat?: number
    lng?: number
  }
  destinationName: string
}

export function DirectionsMapModal({
  isOpen,
  onClose,
  destination,
  destinationName,
}: DirectionsMapModalProps) {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [routeCoords, setRouteCoords] = useState<Array<[number, number]>>([])
  const [routeError, setRouteError] = useState<string | null>(null)
  const [routeLoading, setRouteLoading] = useState(false)
  const mapRef = useRef<any>(null)

  useEffect(() => {
    if (isOpen) {
      setLoading(true)
      setError(null)
      setRouteCoords([])
      setRouteError(null)

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude })
            setLoading(false)
          },
          (err) => {
            console.error("Error getting location:", err)
            setError("No se pudo obtener tu ubicación. Por favor, permite el acceso a tu ubicación.")
            setLoading(false)
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        )
      } else {
        setError("Tu navegador no soporta geolocalización")
        setLoading(false)
      }
    }
  }, [isOpen])

  // Fetch real route from OSRM when both locations available
  useEffect(() => {
    if (!isOpen) return
    if (!userLocation) return
    if (!destination.lat || !destination.lng) return
    setRouteLoading(true)
    setRouteError(null)
    const originLonLat = `${userLocation.lng},${userLocation.lat}`
    const destLonLat = `${destination.lng},${destination.lat}`
    const url = `https://router.project-osrm.org/route/v1/driving/${originLonLat};${destLonLat}?overview=full&geometries=geojson`
    fetch(url)
      .then(r => {
        if (!r.ok) throw new Error(`Error ruta OSRM: ${r.status}`)
        return r.json()
      })
      .then(data => {
        const geometry = data.routes?.[0]?.geometry
        if (geometry?.type === 'LineString' && Array.isArray(geometry.coordinates)) {
          // Convert [lon, lat] to [lat, lon]
            const coords = geometry.coordinates.map((c: [number, number]) => [c[1], c[0]])
            setRouteCoords(coords)
        } else {
          setRouteError('No se pudo obtener la geometría de la ruta')
        }
      })
      .catch(err => {
        console.error(err)
        setRouteError('Error al obtener la ruta')
      })
      .finally(() => setRouteLoading(false))
  }, [isOpen, userLocation, destination.lat, destination.lng])

  const getOSMDirectionsUrl = () => {
    if (!userLocation) return ""
    const origin = `${userLocation.lat},${userLocation.lng}`
    const dest = destination.lat && destination.lng
      ? `${destination.lat},${destination.lng}`
      : encodeURIComponent(`${destination.address}, ${destination.city}`)
    // Use OSRM car routing on OpenStreetMap
    return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${origin};${dest}`
  }

  const getOSMDirectionsUrlFor = (mode: "car" | "bike" | "foot") => {
    if (!userLocation) return ""
    const origin = `${userLocation.lat},${userLocation.lng}`
    const dest = destination.lat && destination.lng
      ? `${destination.lat},${destination.lng}`
      : encodeURIComponent(`${destination.address}, ${destination.city}`)
    const engine = mode === "car" ? "fossgis_osrm_car" : mode === "bike" ? "fossgis_osrm_bike" : "fossgis_osrm_foot"
    return `https://www.openstreetmap.org/directions?engine=${engine}&route=${origin};${dest}`
  }

  // Fallback simple line (solo si no hay ruta real)
  const fallbackLine = userLocation && destination.lat && destination.lng && routeCoords.length === 0 && !routeLoading ? [ [userLocation.lat, userLocation.lng], [destination.lat, destination.lng] ] : undefined

  // Fit bounds to route or points
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const coordsToFit = routeCoords.length > 0
      ? routeCoords
      : (fallbackLine || null)
    if (coordsToFit && coordsToFit.length >= 2) {
      try {
        map.fitBounds(coordsToFit, { padding: [24, 24] })
      } catch (e) {
        // ignore if fitBounds fails
      }
    }
  }, [routeCoords, fallbackLine])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full p-0 overflow-hidden">
        <div className="flex flex-col max-h-[85vh]">
          <div className="px-6 pt-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base md:text-lg">
                <Navigation className="h-5 w-5" />
                ¿Cómo llegar a {destinationName}?
              </DialogTitle>
            </DialogHeader>
          </div>
          <div className="space-y-4 px-6 pb-6 mt-2 flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400 mb-4" />
              <p className="text-sm text-gray-500">Obteniendo tu ubicación...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <MapPin className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-sm text-red-600 text-center">{error}</p>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Asegúrate de permitir el acceso a tu ubicación en tu navegador
              </p>
            </div>
          ) : userLocation ? (
            <>
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Tu ubicación</p>
                    <p className="text-xs text-muted-foreground">
                      {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{destinationName}</p>
                    <p className="text-xs text-muted-foreground">
                      {destination.address}, {destination.city}
                    </p>
                  </div>
                </div>
              </div>
              <div className="relative w-full rounded-lg overflow-hidden border bg-white">
                <div className="h-[20rem] md:h-[24rem] w-full">
                  {MapContainer && (
                    (require("react").createElement as any)(MapContainer, { center: [userLocation.lat, userLocation.lng], zoom: 13, style: { height: "100%", width: "100%" }, whenCreated: (m: any) => { mapRef.current = m } },
                      (require("react").createElement as any)(TileLayer, { url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" }),
                      (require("react").createElement as any)(Marker, { position: [userLocation.lat, userLocation.lng] }),
                      (destination.lat && destination.lng) ? (require("react").createElement as any)(Marker, { position: [destination.lat, destination.lng] }) : null,
                      routeCoords.length > 0 ? (require("react").createElement as any)(Polyline, { positions: routeCoords, pathOptions: { color: "#2563eb", weight: 5 } }) : null,
                      fallbackLine ? (require("react").createElement as any)(Polyline, { positions: fallbackLine, pathOptions: { color: "#60a5fa", dashArray: '8 6', weight: 3 } }) : null
                    )
                  )}
                  {routeLoading && (
                    <div className="absolute top-2 left-2 bg-white/80 backdrop-blur rounded px-2 py-1 text-xs text-gray-600 shadow">
                      Calculando ruta...
                    </div>
                  )}
                  {routeError && !routeLoading && (
                    <div className="absolute top-2 left-2 bg-red-50 rounded px-2 py-1 text-xs text-red-600 shadow">
                      {routeError}
                    </div>
                  )}
                </div>
              <div className="bg-muted/60 rounded-lg p-3 space-y-2">
                <p className="text-sm font-medium">Opciones de transporte</p>
                <p className="text-xs text-muted-foreground">La ruta mostrada usa conducción (OSRM). Puedes abrir indicaciones en OpenStreetMap según el modo:</p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => window.open(getOSMDirectionsUrlFor("car"), "_blank")}>
                    🚗 Auto
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => window.open(getOSMDirectionsUrlFor("bike"), "_blank")}>
                    🚲 Bici
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => window.open(getOSMDirectionsUrlFor("foot"), "_blank")}>
                    🚶 A pie
                  </Button>
                </div>
              </div>
              </div>
              <div className="flex flex-col md:flex-row gap-2 md:gap-3 mt-4">
                <Button
                  className="flex-1 text-sm"
                  onClick={() => {
                    window.open(getOSMDirectionsUrl(), "_blank")
                  }}
                >
                  <Navigation className="h-4 w-4 mr-2" />
                  Abrir en OpenStreetMap
                </Button>
                <Button variant="outline" onClick={onClose} className="flex-1 text-sm">
                  Cerrar
                </Button>
              </div>
            </>
          ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default DirectionsMapModal
