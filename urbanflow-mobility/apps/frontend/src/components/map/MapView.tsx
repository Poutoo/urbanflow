'use client'
import { MapContainer, TileLayer, Tooltip } from 'react-leaflet'
import L from 'leaflet'
import { UserMarker } from './UserMarker'
import { RouteLayer } from './RouteLayer'
import { StationMarkers } from './StationMarkers'
import { AnimatedPolyline } from './AnimatedPolyline'
import { DestinationMarker } from './DestinationMarker'

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

  // Point d'arrivée = dernière coordonnée du dernier segment ayant une géométrie
  const lastSection = [...sections].reverse().find((s) => s.coordinates.length > 0)
  const lastCoord = lastSection?.coordinates[lastSection.coordinates.length - 1]
  const destination = lastCoord ? { lng: lastCoord[0]!, lat: lastCoord[1]! } : undefined

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
        <AnimatedPolyline
          positions={[
            [userLat, userLng],
            [recommendedStation.lat, recommendedStation.lng],
          ]}
          color="#16A34A"
          weight={4}
          opacity={0.9}
          dashArray="4 9"
        >
          <Tooltip sticky>Marche jusqu’au Vélib’</Tooltip>
        </AnimatedPolyline>
      )}

      {stations.length > 0 && (
        <StationMarkers stations={stations} highlightId={recommendedStationId} />
      )}

      {/* Drapeau à damier à l'arrivée */}
      {destination && <DestinationMarker lat={destination.lat} lng={destination.lng} />}
    </MapContainer>
  )
}

export { PARIS_CENTER }
