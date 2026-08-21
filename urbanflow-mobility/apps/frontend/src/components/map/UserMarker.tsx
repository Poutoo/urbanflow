'use client'
import { CircleMarker, Tooltip } from 'react-leaflet'
import { useIsDarkMode } from '@/hooks/useIsDarkMode'
import { getContentColor } from '@/lib/darkColors'

interface Props {
  lat: number
  lng: number
}

export function UserMarker({ lat, lng }: Props) {
  const isDark = useIsDarkMode()
  const color = getContentColor('#1A5F7A', isDark)

  return (
    <CircleMarker
      center={[lat, lng]}
      radius={10}
      pathOptions={{ color, fillColor: color, fillOpacity: 0.9 }}
    >
      <Tooltip permanent direction="top" offset={[0, -12]}>
        Ma position
      </Tooltip>
    </CircleMarker>
  )
}
