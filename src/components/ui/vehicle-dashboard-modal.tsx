"use client"

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import * as Dialog from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { useGoogleMaps } from "@/hooks/use-google-maps"

const toNumber = (value: any) => {
  if (value === null || value === undefined || value === "") return null
  const parsed = Number.parseFloat(String(value))
  return Number.isFinite(parsed) ? parsed : null
}

const normalizePlate = (value: any) =>
  String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")

const extractPlateLikeTokens = (value: any) => {
  const raw = String(value || "").toUpperCase()
  if (!raw) return []
  const parts = raw
    .split(/[^A-Z0-9]+/g)
    .map((p) => normalizePlate(p))
    .filter((p) => p.length >= 6 && p.length <= 12)
  const compact = normalizePlate(raw)
  if (compact.length >= 6 && compact.length <= 12) parts.unshift(compact)
  return Array.from(new Set(parts))
}

const hammingDistance = (a: string, b: string) => {
  if (!a || !b || a.length !== b.length) return Number.POSITIVE_INFINITY
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) diff += 1
  }
  return diff
}

const scorePlateSimilarity = (target: string, candidate: string) => {
  if (!target || !candidate) return Number.POSITIVE_INFINITY
  const sameLength = target.length === candidate.length
  const hamming = sameLength ? hammingDistance(target, candidate) : Number.POSITIVE_INFINITY
  const startsWith2 = target.slice(0, 2) === candidate.slice(0, 2) ? 0 : 2
  const endsWith3 = target.slice(-3) === candidate.slice(-3) ? 0 : 2
  const lengthPenalty = Math.abs(target.length - candidate.length)
  const base = Number.isFinite(hamming) ? hamming : Math.min(target.length, candidate.length)
  return base + startsWith2 + endsWith3 + lengthPenalty
}

const findBestPlateMatch = (list: any[], targetPlateRaw: string | string[]) => {
  const targets = Array.isArray(targetPlateRaw)
    ? targetPlateRaw.map((x) => normalizePlate(x)).filter(Boolean)
    : extractPlateLikeTokens(targetPlateRaw)
  if (!targets.length) return null

  const normalized = list.map((item) => ({
    item,
    plate: normalizePlate(item?.Plate || item?.plate || item?.registration_number),
  }))

  const exact = normalized.find((x) => targets.includes(x.plate))
  if (exact) return exact.item

  const scored = normalized
    .filter((x) => x.plate)
    .map((x) => {
      const bestScore = targets.reduce((min, t) => Math.min(min, scorePlateSimilarity(t, x.plate)), Number.POSITIVE_INFINITY)
      return { ...x, score: bestScore }
    })
    .sort((a, b) => a.score - b.score)

  const best = scored[0]
  if (!best) return null
  return best.score <= 3 ? best.item : null
}

const isSameLiveVehicleData = (prev: any, next: any) => {
  if (!prev && !next) return true
  if (!prev || !next) return false
  return (
    String(prev?.Id ?? "") === String(next?.Id ?? "") &&
    String(prev?.updated_at ?? "") === String(next?.updated_at ?? "") &&
    String(prev?.LocTime ?? "") === String(next?.LocTime ?? "") &&
    String(prev?.Plate ?? prev?.plate ?? "") === String(next?.Plate ?? next?.plate ?? "")
  )
}

function MiniGauge({
  value,
  max,
  color,
  size = 44,
  strokeWidth = 5,
}: {
  value: number
  max: number
  color: string
  size?: number
  strokeWidth?: number
}) {
  const r = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(value / max, 1))
  return (
    <svg width={size} height={size} className="shrink-0" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1a2540" strokeWidth={strokeWidth} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - pct)}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  )
}

function AnalogGauge({
  value,
  min,
  max,
  startAngle,
  endAngle,
  majorTicks,
  color,
  size = 320,
  redZone,
}: {
  value: number
  min: number
  max: number
  startAngle: number
  endAngle: number
  majorTicks: number[]
  color: string
  size?: number
  redZone?: [number, number]
}) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const c = ref.current
    if (!c) return
    const dpr = window.devicePixelRatio || 1
    c.width = size * dpr
    c.height = size * dpr
    const ctx = c.getContext("2d")
    if (!ctx) return
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, size, size)

    const cx = size / 2
    const cy = size / 2
    const R = size / 2 - 14
    const rad = (d: number) => (d * Math.PI) / 180
    const v2a = (v: number) => startAngle + ((v - min) / (max - min)) * (endAngle - startAngle)

    ctx.beginPath()
    ctx.arc(cx, cy, R - 12, rad(startAngle), rad(endAngle))
    ctx.strokeStyle = "#162035"
    ctx.lineWidth = 8
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(cx, cy, R - 12, rad(startAngle), rad(v2a(value)))
    ctx.strokeStyle = color
    ctx.lineWidth = 8
    ctx.lineCap = "round"
    ctx.stroke()

    if (redZone) {
      ctx.beginPath()
      ctx.arc(cx, cy, R - 12, rad(v2a(redZone[0])), rad(v2a(redZone[1])))
      ctx.strokeStyle = "#dc2626"
      ctx.lineWidth = 8
      ctx.stroke()
    }

    const totalMinor = (majorTicks.length - 1) * 5
    for (let i = 0; i <= totalMinor; i++) {
      const v = min + (i / totalMinor) * (max - min)
      const a = rad(v2a(v))
      const isMajor = majorTicks.some((t) => Math.abs(t - v) < (max - min) * 0.002)
      const len = isMajor ? 18 : 9
      const r1 = R
      const r2 = R - len
      ctx.beginPath()
      ctx.moveTo(cx + r1 * Math.cos(a), cy + r1 * Math.sin(a))
      ctx.lineTo(cx + r2 * Math.cos(a), cy + r2 * Math.sin(a))
      ctx.strokeStyle = isMajor ? "#94a3b8" : "#334155"
      ctx.lineWidth = isMajor ? 2 : 1
      ctx.stroke()
    }

    ctx.fillStyle = "#94a3b8"
    ctx.font = `bold ${Math.round(size * 0.044)}px sans-serif`
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    for (const t of majorTicks) {
      const a = rad(v2a(t))
      const lr = R - 28
      ctx.fillText(String(t), cx + lr * Math.cos(a), cy + lr * Math.sin(a))
    }

    const na = rad(v2a(value))
    const nl = R - 42
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(na)
    ctx.beginPath()
    ctx.moveTo(-8, -2)
    ctx.lineTo(nl, 0)
    ctx.lineTo(-8, 2)
    ctx.closePath()
    ctx.fillStyle = "#cbd5e1"
    ctx.fill()
    ctx.restore()

    ctx.beginPath()
    ctx.arc(cx, cy, 5, 0, Math.PI * 2)
    ctx.fillStyle = "#94a3b8"
    ctx.fill()
  }, [value, min, max, startAngle, endAngle, majorTicks, color, size, redZone])

  return <canvas ref={ref} style={{ width: size, height: size }} aria-label={`Gauge reading ${value}`} />
}

function LiveMapPanel({
  location,
  plate,
  speed,
  fuelPercent,
  geozone,
}: {
  location: { lat: number; lng: number } | null
  plate: string
  speed: number
  fuelPercent: number
  geozone?: string
}) {
  const { loaded: mapsLoaded } = useGoogleMaps()
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const markerRef = useRef<google.maps.Marker | null>(null)

  useEffect(() => {
    if (!mapsLoaded || !mapContainerRef.current || mapRef.current) return
    mapRef.current = new google.maps.Map(mapContainerRef.current, {
      center: location ? { lat: location.lat, lng: location.lng } : { lat: -26.2041, lng: 28.0473 },
      zoom: location ? 12 : 6,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      styles: [{ featureType: "poi", stylers: [{ visibility: "off" }] }],
    })
  }, [mapsLoaded])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !location) return
    map.setCenter({ lat: location.lat, lng: location.lng })
    map.setZoom(12)
    if (markerRef.current) markerRef.current.setMap(null)
    markerRef.current = new google.maps.Marker({
      position: { lat: location.lat, lng: location.lng },
      map,
      title: plate,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: "#f97316",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 3,
      },
    })
  }, [location, plate, mapsLoaded])

  return <div ref={mapContainerRef} className="absolute inset-0 h-full w-full" />
}

function PressureBar({ value, max }: { value: number; max: number }) {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full" style={{ background: "#0f1d32" }}>
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "linear-gradient(90deg,#06b6d4,#38bdf8)" }} />
    </div>
  )
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border p-3 ${className}`} style={{ background: "rgba(10,18,36,0.82)", borderColor: "rgba(51,65,85,0.45)" }}>
      {children}
    </div>
  )
}

function CardHeader({ title, spn }: { title: string; spn: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#94a3b8" }}>{title}</span>
      <span className="text-[10px] font-medium" style={{ color: "#475569" }}>{spn}</span>
    </div>
  )
}

function DashboardContent({
  trip,
  driverInfo,
  vehicleInfo,
  vehicleLocation,
  open,
}: {
  trip?: any
  driverInfo?: any
  vehicleInfo?: any
  vehicleLocation?: any
  open: boolean
}) {
  const [liveVehicleData, setLiveVehicleData] = useState<any>(null)

  const plateCandidates = useMemo(() => {
    const assignments = trip?.vehicleassignments || trip?.vehicle_assignments || []
    const assignmentVehicle = assignments?.[0]?.vehicle?.name || assignments?.[0]?.trailer?.name || ""
    const values = [
      vehicleLocation?.plate,
      vehicleInfo?.registration_number,
      trip?.vehicle,
      trip?.vehicles,
      assignmentVehicle,
    ]
    return Array.from(
      new Set(values.flatMap((v) => extractPlateLikeTokens(v)).filter(Boolean))
    )
  }, [vehicleLocation, vehicleInfo, trip])

  useEffect(() => {
    let active = true
    const fetchLiveData = async () => {
      if (!open || !plateCandidates.length) return
      try {
        const [energyRiteResponse, epsResponse] = await Promise.all([
          fetch("/api/energy-rite/vehicles", { cache: "no-store" }),
          fetch("/api/eps-vehicles", { cache: "no-store" }),
        ])

        let energyRiteMatch = null
        if (energyRiteResponse.ok) {
          const payload = await energyRiteResponse.json()
          const list = Array.isArray(payload) ? payload : payload?.data || payload?.result?.data || []
          energyRiteMatch = findBestPlateMatch(list, plateCandidates)
        }

        let epsMatch = null
        if (epsResponse.ok) {
          const payload = await epsResponse.json()
          const list = Array.isArray(payload) ? payload : payload?.data || payload?.result?.data || []
          epsMatch = findBestPlateMatch(list, plateCandidates)
        }

        const nextData = energyRiteMatch || epsMatch || null
        if (active) {
          setLiveVehicleData((prev: any) => (isSameLiveVehicleData(prev, nextData) ? prev : nextData))
        }
      } catch {
        if (active) setLiveVehicleData(null)
      }
    }

    if (open) fetchLiveData()
    const interval = open ? setInterval(fetchLiveData, 30000) : null
    return () => {
      active = false
      if (interval) clearInterval(interval)
    }
  }, [plateCandidates, open])

  const speed = toNumber(liveVehicleData?.Speed ?? liveVehicleData?.speed ?? vehicleLocation?.speed ?? trip?.current_speed) ?? 0
  const rpmRaw = toNumber(liveVehicleData?.rpm ?? liveVehicleData?.engine_rpm ?? trip?.rpm)
  const rpm = rpmRaw !== null ? Math.max(0, Math.min(9, rpmRaw / (rpmRaw > 20 ? 1000 : 1))) : null
  const rpmGaugeValue = rpm ?? 0
  const mileage = toNumber(liveVehicleData?.Mileage ?? liveVehicleData?.mileage ?? vehicleLocation?.mileage)
  const fuelLevel = toNumber(liveVehicleData?.fuel_probe_1_level ?? vehicleLocation?.fuel_probe_1_level) ?? 0
  const fuelPct = toNumber(liveVehicleData?.fuel_probe_1_level_percentage ?? vehicleLocation?.fuel_probe_1_level_percentage) ?? 0
  const fuelVol = toNumber(liveVehicleData?.fuel_probe_1_volume_in_tank ?? vehicleLocation?.fuel_probe_1_volume_in_tank) ?? 0
  const fuelTemp = toNumber(liveVehicleData?.fuel_probe_1_temperature ?? vehicleLocation?.fuel_probe_1_temperature)
  const fuel2Pct = toNumber(liveVehicleData?.fuel_probe_2_level_percentage ?? vehicleLocation?.fuel_probe_2_level_percentage) ?? 0
  const fuel2Vol = toNumber(liveVehicleData?.fuel_probe_2_volume_in_tank ?? vehicleLocation?.fuel_probe_2_volume_in_tank) ?? null
  const fuel2Temp = toNumber(liveVehicleData?.fuel_probe_2_temperature ?? vehicleLocation?.fuel_probe_2_temperature)
  const messageType = liveVehicleData?.message_type ?? vehicleLocation?.message_type ?? null
  const dataId = liveVehicleData?.Id ?? vehicleLocation?.id ?? null
  const quality = String(liveVehicleData?.Quality ?? vehicleLocation?.quality ?? "").trim()
  const locTime = String(liveVehicleData?.LocTime ?? vehicleLocation?.loc_time ?? "").trim()
  const updatedAt = String(liveVehicleData?.updated_at ?? "").trim()
  const ipAddress = String(liveVehicleData?.IPAddress ?? liveVehicleData?.ip_address ?? "").trim()
  const company = String(liveVehicleData?.company ?? "").trim()
  const costCode = String(liveVehicleData?.cost_code ?? "").trim()
  const currentStatus = String(liveVehicleData?.current_status ?? liveVehicleData?.status ?? "").trim()
  const truck = liveVehicleData?.Plate || vehicleLocation?.plate || vehicleInfo?.registration_number || "TRUCK"
  const liveDriverName = String(liveVehicleData?.DriverName || "").trim()
  const driver =
    liveDriverName && !["engine on", "engine off"].includes(liveDriverName.toLowerCase())
      ? liveDriverName
      : driverInfo
        ? `${driverInfo.first_name || ""} ${driverInfo.surname || ""}`.trim()
        : "Driver"
  const tripRef = trip?.ordernumber || trip?.trip_id || "N/A"
  const geozone = liveVehicleData?.Geozone || vehicleLocation?.address || "Live route"
  const engineState = liveDriverName || String(liveVehicleData?.NameEvent || "").trim() || (speed > 0 ? "Moving" : "Stopped")

  const mapLocation = useMemo(() => {
    const lat = toNumber(liveVehicleData?.Latitude ?? vehicleLocation?.latitude ?? trip?.current_latitude)
    const lng = toNumber(liveVehicleData?.Longitude ?? vehicleLocation?.longitude ?? trip?.current_longitude)
    if (lat === null || lng === null) return null
    return { lat, lng }
  }, [liveVehicleData, vehicleLocation, trip])

  return (
    <div className="relative h-full w-full overflow-hidden select-none bg-[#040914] text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(220,38,38,0.12),transparent_55%)]" />

      <div className="relative flex h-full flex-col px-4 py-3">
        <div className="mb-2 flex items-center justify-between rounded-lg border border-slate-800/80 bg-[#060c1a]/85 px-4 py-2">
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-cyan-300/80">Vehicle Dashboard</div>
            <div className="text-xl font-bold">{truck} <span className="text-lg font-normal text-slate-300">— {driver || "Unassigned"}</span></div>
            <div className="text-xs text-slate-400">{engineState || "No engine state"} · {Math.round(speed)} km/h · {geozone}</div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Trip</div>
            <div className="text-lg font-semibold">{tripRef}</div>
            <div className="text-xs text-slate-400">{locTime || updatedAt || "No timestamp"}</div>
          </div>
        </div>

        <div className="grid h-full min-h-0 grid-cols-[340px_minmax(0,1fr)_340px] gap-3">
          <div className="flex min-h-0 flex-col gap-3">
            <div className="relative flex h-[48%] items-center justify-center rounded-xl border border-red-900/70 bg-[#060b17]">
              <AnalogGauge value={speed} min={0} max={260} startAngle={135} endAngle={405} majorTicks={[0, 20, 40, 60, 80, 100, 140, 200, 260]} color="#ef4444" size={300} redZone={[0, 110]} />
              <div className="pointer-events-none absolute text-center">
                <div className="text-5xl font-black tabular-nums text-red-200">{Math.round(speed)}</div>
                <div className="text-sm uppercase tracking-[0.2em] text-slate-400">km/h</div>
              </div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-[#060c1a]/90 p-3">
              <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.15em] text-slate-400">
                <span>Fuel System</span>
                <span>{fuel2Vol !== null ? 'Probe 1 / Probe 2' : 'Probe 1'}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <MiniGauge value={fuelPct} max={100} color="#34d399" />
                    <div>
                      <div className="text-2xl font-bold text-emerald-300">{Math.round(fuelPct)}%</div>
                      <div className="text-xs text-slate-400">Tank 1</div>
                    </div>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">{fuelVol.toFixed(1)}L</div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <MiniGauge value={fuel2Vol !== null ? fuel2Pct : 0} max={100} color={fuel2Vol !== null ? "#c084fc" : "#334155"} />
                    <div>
                      <div className="text-2xl font-bold" style={{ color: fuel2Vol !== null ? '#c4b5fd' : '#475569' }}>{fuel2Vol !== null ? `${Math.round(fuel2Pct)}%` : "--"}</div>
                      <div className="text-xs text-slate-400">Tank 2</div>
                    </div>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">{fuel2Vol !== null ? `${fuel2Vol.toFixed(1)}L` : "N/A"}</div>
                </div>
              </div>
              <div className="mt-2">
                <PressureBar value={fuelVol} max={fuelVol + (fuel2Vol || 0) || 700} />
              </div>
            </div>
          </div>

          <div className="relative min-h-0 overflow-hidden rounded-xl border border-slate-800 bg-[#060c1a]/80">
            <LiveMapPanel location={mapLocation} plate={truck} speed={speed} fuelPercent={fuelPct} geozone={geozone} />
            <div className="absolute left-3 top-3 rounded border border-cyan-500/60 bg-[#061024]/85 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-cyan-300">
              {geozone}
            </div>
            <div className="absolute right-3 top-3 rounded border border-slate-700/90 bg-[#061024]/85 px-2 py-1 text-[10px] text-slate-300">
              {mapLocation ? `${mapLocation.lat.toFixed(5)}, ${mapLocation.lng.toFixed(5)}` : "No GPS"}
            </div>
            <div className="absolute bottom-3 left-3 right-3 grid grid-cols-4 gap-2 rounded-lg border border-slate-800/90 bg-[#040914]/85 p-2 text-center">
              <div>
                <div className="text-[10px] uppercase tracking-[0.12em] text-slate-400">Tank 1</div>
                <div className="text-lg font-semibold text-emerald-300">{Math.round(fuelPct)}%</div>
                <div className="text-[10px] text-slate-500">{fuelVol.toFixed(1)}L</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.12em] text-slate-400">Tank 2</div>
                <div className="text-lg font-semibold" style={{ color: fuel2Vol !== null ? '#c4b5fd' : '#475569' }}>{fuel2Vol !== null ? `${Math.round(fuel2Pct)}%` : "--"}</div>
                <div className="text-[10px] text-slate-500">{fuel2Vol !== null ? `${fuel2Vol.toFixed(1)}L` : "N/A"}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.12em] text-slate-400">Mileage</div>
                <div className="text-lg font-semibold text-slate-100">{mileage !== null ? `${Math.round(mileage).toLocaleString()} km` : "--"}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.12em] text-slate-400">Driver</div>
                <div className="text-lg font-semibold text-cyan-300 truncate">{driver || "--"}</div>
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-col gap-3">
            <div className="relative flex h-[48%] items-center justify-center rounded-xl border border-orange-900/70 bg-[#060b17]">
              <AnalogGauge value={rpmGaugeValue} min={0} max={8} startAngle={135} endAngle={405} majorTicks={[0, 1, 2, 3, 4, 5, 6, 7, 8]} color="#f97316" size={300} />
              <div className="pointer-events-none absolute text-center">
                <div className="text-5xl font-black tabular-nums text-orange-200">{rpm !== null ? rpm.toFixed(1) : "--"}</div>
                <div className="text-sm uppercase tracking-[0.2em] text-slate-400">x1000 r/min</div>
              </div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-[#060c1a]/90 p-3">
              <div className="mb-2 text-xs uppercase tracking-[0.15em] text-slate-400">Live Telemetry</div>
              <div className="grid grid-cols-2 gap-y-1.5 text-xs">
                <div className="text-slate-400">Status</div>
                <div className="text-right font-semibold">{currentStatus || engineState || "--"}</div>
                <div className="text-slate-400">Company</div>
                <div className="text-right font-semibold">{company || "--"}</div>
                <div className="text-slate-400">Cost Code</div>
                <div className="text-right font-semibold">{costCode || "--"}</div>
                <div className="text-slate-400">IP Address</div>
                <div className="text-right font-semibold text-cyan-300">{ipAddress || "--"}</div>
                <div className="text-slate-400">Quality</div>
                <div className="text-right font-semibold">{quality || "--"}</div>
                <div className="text-slate-400">Device ID</div>
                <div className="text-right font-semibold">{dataId ?? "--"}</div>
                <div className="text-slate-400">LocTime</div>
                <div className="text-right font-semibold">{locTime || "--"}</div>
                <div className="text-slate-400">Updated</div>
                <div className="text-right font-semibold">{updatedAt || "--"}</div>
                <div className="text-slate-400">Fuel Temp 1</div>
                <div className="text-right font-semibold text-emerald-300">{fuelTemp !== null ? `${Math.round(fuelTemp)}°C` : "--"}</div>
                {fuel2Temp !== null && (
                  <>
                    <div className="text-slate-400">Fuel Temp 2</div>
                    <div className="text-right font-semibold text-violet-300">{`${Math.round(fuel2Temp)}°C`}</div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function VehicleDashboardModal({
  open,
  onOpenChange,
  trip,
  driverInfo,
  vehicleInfo,
  vehicleLocation,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  trip?: any
  driverInfo?: any
  vehicleInfo?: any
  vehicleLocation?: any
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm" />
        {open && (
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[101] h-[92vh] w-[95vw] max-w-[1680px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border border-slate-700 bg-[#060c1a] p-0 shadow-2xl">
          <Dialog.Title className="sr-only">Vehicle Internal Dashboard</Dialog.Title>
          <Dialog.Close className="absolute right-3 top-3 z-50 rounded-md border border-slate-700 bg-[#0b1222]/90 p-1 text-slate-300 hover:text-white">
            <X className="h-4 w-4" />
          </Dialog.Close>
          <DashboardContent trip={trip} driverInfo={driverInfo} vehicleInfo={vehicleInfo} vehicleLocation={vehicleLocation} open={open} />
        </Dialog.Content>
        )}
      </Dialog.Portal>
    </Dialog.Root>
  )
}
