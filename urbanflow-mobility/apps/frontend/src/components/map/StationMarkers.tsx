'use client'
import { Marker, Popup } from 'react-leaflet'
import L from 'leaflet'

// Épingle de position (Phosphor "map-pin-fill") + icône vélo (Phosphor "bicycle")
// composées en un seul marqueur SVG : renforce visuellement "un Vélib' est ici".
const STATION_ICON_SVG = `
<svg width="34" height="38" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2px 2px rgba(0,0,0,.35))">
  <path fill="#16A34A" d="M128 16a88.1 88.1 0 0 0-88 88c0 75.3 80 132.17 83.41 134.55a8 8 0 0 0 9.18 0C136 236.17 216 179.3 216 104a88.1 88.1 0 0 0-88-88z"/>
  <g transform="translate(100 76) scale(0.219)">
    <path fill="#ffffff" d="M208 112a47.8 47.8 0 0 0-16.93 3.09L165.93 72H192a8 8 0 0 1 8 8a8 8 0 0 0 16 0a24 24 0 0 0-24-24h-40a8 8 0 0 0-6.91 12l11.65 20H99.26L82.91 60A8 8 0 0 0 76 56H48a8 8 0 0 0 0 16h23.41l13.71 23.51l-15.71 21.55a48.13 48.13 0 1 0 12.92 9.44l11.59-15.9l31.17 53.4a8 8 0 1 0 13.82-8l-30.32-52h57.48l11.19 19.17A48 48 0 1 0 208 112M80 160a32 32 0 1 1-20.21-29.74l-18.25 25a8 8 0 1 0 12.92 9.42l18.25-25A31.88 31.88 0 0 1 80 160m128 32a32 32 0 0 1-22.51-54.72l15.6 26.72a8 8 0 1 0 13.82-8l-15.61-26.79A32 32 0 1 1 208 192"/>
  </g>
</svg>
`

const bikeIcon = L.divIcon({
  html: STATION_ICON_SVG,
  className: '', // évite les styles par défaut de Leaflet (fond blanc, bordure)
  iconSize: [34, 38],
  iconAnchor: [17, 38], // pointe de l'épingle
  popupAnchor: [0, -34],
})

interface Station {
  id: string
  name: string
  lat: number
  lng: number
  bikesAvailable: number
  docksAvailable: number
}

interface Props {
  stations: Station[]
}

export function StationMarkers({ stations }: Props) {
  return (
    <>
      {stations.map((station) => (
        <Marker key={station.id} position={[station.lat, station.lng]} icon={bikeIcon}>
          <Popup>
            <div className="text-sm">
              <p className="font-semibold">{station.name}</p>
              <p className="text-[#16A34A]">{station.bikesAvailable} vélos disponibles</p>
              <p className="text-[#6B7280]">{station.docksAvailable} bornes libres</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  )
}
