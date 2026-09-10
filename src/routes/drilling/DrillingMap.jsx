import { useRef } from 'react'
import '@/lib/leafletIcon'
import L from 'leaflet'
import { MapContainer, Marker, Popup, TileLayer, Tooltip } from 'react-leaflet'

const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

/** Single pin for whatever coordinate the form currently has — remounts
 * (via `key`) whenever the point moves, since react-leaflet only honors
 * `center` on first mount. */
export function DrillingMiniMap({ lat, lon }) {
  if (lat == null || lon == null) {
    return (
      <div className="flex h-40 w-full items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
        Complete both coordinates to preview on the map
      </div>
    )
  }
  return (
    <div className="h-40 w-full overflow-hidden rounded-lg border border-border">
      <MapContainer
        key={`${lat}-${lon}`}
        center={[lat, lon]}
        zoom={9}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer attribution={ATTRIBUTION} url={TILE_URL} />
        <Marker position={[lat, lon]} />
      </MapContainer>
    </div>
  )
}

// A slightly larger, brand-navy pin so hovered/clicked wells stand out from
// the default marker at a glance rather than all looking identical.
const HOVER_ICON = L.divIcon({
  className: '',
  html: '<div style="width:26px;height:26px;border-radius:50% 50% 50% 0;background:#2563eb;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35);transform:rotate(-45deg)"></div>',
  iconSize: [26, 26],
  iconAnchor: [13, 26],
})

function WellMarker({ row, onSelect }) {
  const markerRef = useRef(null)
  return (
    <Marker
      ref={markerRef}
      position={[row.latitude_decimal, row.longitude_decimal]}
      riseOnHover
      eventHandlers={{
        click: () => onSelect(row),
        mouseover: () => markerRef.current?.setIcon(HOVER_ICON),
        mouseout: () => markerRef.current?.setIcon(new L.Icon.Default()),
      }}
    >
      <Tooltip direction="top" offset={[0, -28]}>
        <span className="font-semibold">{row.rig_name}</span>
        {row.location ? ` — ${row.location}` : ''}
      </Tooltip>
      <Popup>
        <p className="font-semibold">{row.location}</p>
        <p>{row.rig_name}</p>
        {row.first_anchor_down_dt && <p>{row.first_anchor_down_dt.slice(0, 10)}</p>}
      </Popup>
    </Marker>
  )
}

/** Every currently-filtered well plotted at once — hover a pin for its rig,
 * click to open that record the same as clicking it in the list would. */
export function DrillingWellsMap({ rows, onSelect }) {
  const points = rows
    .filter((r) => r.latitude_decimal != null && r.longitude_decimal != null)
    .map((r) => ({ ...r, lat: r.latitude_decimal, lon: r.longitude_decimal }))

  return (
    <div className="flex h-full w-full flex-col gap-1">
      <div className="flex-1 overflow-hidden rounded-2xl border border-border">
        <MapContainer center={[20, 80]} zoom={4} style={{ height: '100%', width: '100%' }}>
          <TileLayer attribution={ATTRIBUTION} url={TILE_URL} />
          {points.map((r) => (
            <WellMarker key={r.drilling_hdr_id} row={r} onSelect={onSelect} />
          ))}
        </MapContainer>
      </div>
      {rows.length > 0 && points.length < rows.length && (
        <p className="text-[11px] text-muted-foreground">
          {rows.length - points.length} of {rows.length} record(s) have no plottable coordinates.
        </p>
      )}
    </div>
  )
}
