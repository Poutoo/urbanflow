'use client'
import { Marker, Popup } from 'react-leaflet'
import L from 'leaflet'

const bikeIcon = new L.Icon({
  iconUrl: '/leaflet/marker-icon.png',
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  shadowUrl: '/leaflet/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
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
