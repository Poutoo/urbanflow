'use client'
import { MapContainer, TileLayer, Polyline, Tooltip } from 'react-leaflet'
import L from 'leaflet'
import { UserMarker } from './UserMarker'
import { RouteLayer } from './RouteLayer'
import { StationMarkers } from './StationMarkers'

// Fix icônes Leaflet cassées dans Next.js (webpack renomme les assets)
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)['_getIconUrl']
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  iconUrl: '/leaflet/marker-icon.png',
  shadowUrl: '/leaflet/marker-shadow.png',
})

interface Section {
  type: string
  mode: string
  line?: string
  duration: number
  coordinates: number[][]
  estimated?: boolean
}

interface Station {
  id: string
  name: string
  lat: number
  lng: number
  bikesAvailable: number
  docksAvailable: number
}

interface Props {
  userLat: number
  userLng: number
  sections?: Section[]
  stations?: Station[]
  // Station Vélib' vers laquelle guider l'utilisateur (trajet écologique)
  recommendedStationId?: string
}

const PARIS_CENTER: [number, number] = [48.8566, 2.3522]

export function MapView({
  userLat,
  userLng,
  sections = [],
  stations = [],
  recommendedStationId,
}: Props) {
  const center: [number, number] =
    isNaN(userLat) || isNaN(userLng) ? PARIS_CENTER : [userLat, userLng]

  const recommendedStation = recommendedStationId
    ? stations.find((s) => s.id === recommendedStationId)
    : undefined
  const originValid = !isNaN(userLat) && !isNaN(userLng)

  return (
    <MapContainer
      center={center}
      zoom={14}
      className="h-full w-full"
      zoomControl={true}
      attributionControl={true}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        maxZoom={20}
      />
      <UserMarker lat={userLat} lng={userLng} />
      {sections.length > 0 && <RouteLayer sections={sections} />}

      {/* Trait de marche pointillé du départ vers le Vélib' recommandé */}
      {recommendedStation && originValid && (
        <Polyline
          positions={[
            [userLat, userLng],
            [recommendedStation.lat, recommendedStation.lng],
          ]}
          pathOptions={{ color: '#16A34A', weight: 4, opacity: 0.9, dashArray: '4 9' }}
        >
          <Tooltip sticky>Marche jusqu’au Vélib’</Tooltip>
        </Polyline>
      )}

      {stations.length > 0 && (
        <StationMarkers stations={stations} highlightId={recommendedStationId} />
      )}
    </MapContainer>
  )
}

export { PARIS_CENTER }
