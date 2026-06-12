'use client'
import { CircleMarker, Tooltip } from 'react-leaflet'

interface Props {
  lat: number
  lng: number
}

export function UserMarker({ lat, lng }: Props) {
  return (
    <CircleMarker
      center={[lat, lng]}
      radius={10}
      pathOptions={{ color: '#1A5F7A', fillColor: '#1A5F7A', fillOpacity: 0.9 }}
    >
      <Tooltip permanent direction="top" offset={[0, -12]}>
        Ma position
      </Tooltip>
    </CircleMarker>
  )
}
