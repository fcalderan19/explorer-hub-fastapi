import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Tooltip } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix for default markers in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

interface ActivityMapProps {
  businessName: string
  location: {
    address: string
    city: string
    state: string
    country: string
    latitude?: number
    longitude?: number
  }
}

const ActivityMapComponent: React.FC<ActivityMapProps> = ({ businessName, location }) => {
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const getCoordinates = async () => {
      setIsLoading(true)

      // Guard: require minimal address info (address + city)
      const hasBasicAddress = Boolean(location?.address) && Boolean(location?.city)
      // Guard: if both coords are present and are valid numbers, use them
      const hasValidCoords =
        typeof location?.latitude === 'number' && !isNaN(location.latitude!) &&
        typeof location?.longitude === 'number' && !isNaN(location.longitude!)

      if (hasValidCoords) {
        setCoordinates({ lat: location.latitude!, lng: location.longitude! })
        setIsLoading(false)
        return
      }

      // If address is incomplete, do not attempt geocoding and do not render
      if (!hasBasicAddress) {
        setIsLoading(false)
        setCoordinates(null)
        return
      }

      // Otherwise, geocode the address
      const query = `${location.address}, ${location.city}, ${location.state || ''}, ${location.country || ''}`
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`)
        const data = await response.json()
        if (Array.isArray(data) && data.length > 0) {
          const lat = parseFloat(data[0].lat)
          const lng = parseFloat(data[0].lon)
          if (!isNaN(lat) && !isNaN(lng)) {
            setCoordinates({ lat, lng })
          }
        }
      } catch (error) {
        console.error('Error geocoding:', error)
      }

      setIsLoading(false)
    }

    getCoordinates()
  }, [location])

  // Do not render any UI on errors or while loading
  if (isLoading || !coordinates) {
    return null
  }

  return (
    <div style={{ height: '300px', width: '100%' }}>
      <MapContainer center={[coordinates.lat, coordinates.lng]} zoom={15} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <Marker position={[coordinates.lat, coordinates.lng]}>
          <Tooltip permanent>
            <div style={{ maxWidth: '200px' }}>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 'bold' }}>{businessName}</h3>
              <p style={{ margin: '0', fontSize: '12px' }}>
                {location.address}, {location.city}
              </p>
            </div>
          </Tooltip>
        </Marker>
      </MapContainer>
    </div>
  )
}

export default ActivityMapComponent
