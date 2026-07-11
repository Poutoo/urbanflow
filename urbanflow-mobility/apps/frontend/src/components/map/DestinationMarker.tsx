'use client'
import { Marker, Tooltip } from 'react-leaflet'
import L from 'leaflet'

// Drapeau à damier planté au point d'arrivée du trajet.
const FLAG_SVG = `
<svg width="30" height="34" viewBox="0 0 24 26" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2px 2px rgba(0,0,0,.35))">
  <rect x="3" y="1" width="2.5" height="24" rx="1.25" fill="#0F1B2D"/>
  <rect x="5.5" y="2" width="16" height="12" fill="#FFFFFF" stroke="#0F1B2D" stroke-width="1"/>
  <rect x="5.5" y="2" width="4" height="4" fill="#0F1B2D"/>
  <rect x="13.5" y="2" width="4" height="4" fill="#0F1B2D"/>
  <rect x="9.5" y="6" width="4" height="4" fill="#0F1B2D"/>
  <rect x="17.5" y="6" width="4" height="4" fill="#0F1B2D"/>
  <rect x="5.5" y="10" width="4" height="4" fill="#0F1B2D"/>
  <rect x="13.5" y="10" width="4" height="4" fill="#0F1B2D"/>
</svg>
`

const flagIcon = L.divIcon({
  html: FLAG_SVG,
  className: '',
  iconSize: [30, 34],
  iconAnchor: [4, 25], // base du mât = point d'arrivée exact
  popupAnchor: [0, -24],
})

export function DestinationMarker({ lat, lng }: { lat: number; lng: number }) {
  return (
    <Marker position={[lat, lng]} icon={flagIcon} zIndexOffset={500}>
      <Tooltip direction="top" offset={[0, -22]}>
        Arrivée
      </Tooltip>
    </Marker>
  )
}
