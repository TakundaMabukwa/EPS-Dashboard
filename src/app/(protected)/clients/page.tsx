"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Building2,
  Eye,
  Mail,
  MapPinned,
  Pencil,
  Phone,
  Plus,
  Search,
  User2,
  X,
} from "lucide-react";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { SecureButton } from "@/components/SecureButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClientFormDialog } from "@/components/ui/client-form-dialog";
import { StopFormDialog } from "@/components/ui/stop-form-dialog";
import { useGoogleMaps } from "@/hooks/use-google-maps";
import { toast } from "sonner";

type ClientRecord = {
  id: number;
  name?: string | null;
  client_id?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  contact_person?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  email?: string | null;
  phone?: string | null;
  status?: string | null;
  industry?: string | null;
  credit_limit?: number | null;
  dormant_flag?: boolean | null;
  postal_code?: string | null;
  fax_number?: string | null;
  registration_number?: string | null;
  registration_name?: string | null;
  ck_number?: string | null;
  tax_number?: string | null;
  vat_number?: string | null;
  operating_hours?: string | null;
  capacity?: string | null;
  notes?: string | null;
  coordinates?: string | null;
  coords?: string | null;
};

export default function ClientsPage() {
  const [activeTab, setActiveTab] = useState("clients");
  const [search, setSearch] = useState("");

  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [isClientSheetOpen, setIsClientSheetOpen] = useState(false);
  const [editingClientId, setEditingClientId] = useState<number | null>(null);

  const [stops, setStops] = useState<any[]>([]);
  const [isLoadingStops, setIsLoadingStops] = useState(false);
  const [isStopSheetOpen, setIsStopSheetOpen] = useState(false);
  const [editingStop, setEditingStop] = useState<any | null>(null);
  const [viewingStop, setViewingStop] = useState<any | null>(null);
  const [isStopViewDialogOpen, setIsStopViewDialogOpen] = useState(false);

  const [viewingClient, setViewingClient] = useState<ClientRecord | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  const fetchClients = async () => {
    setIsLoadingClients(true);
    try {
      const response = await fetch("/api/eps-client-list", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to load clients");
      setClients(Array.isArray(payload.data)
        ? (payload.data as ClientRecord[]).sort((a, b) =>
            (a.name || "").localeCompare(b.name || "")
          )
        : []);
    } catch (error) {
      console.error("Failed to load clients:", error);
      toast.error("Could not load clients right now");
      setClients([]);
    } finally {
      setIsLoadingClients(false);
    }
  };

  const fetchStops = async () => {
    setIsLoadingStops(true);
    try {
      const response = await fetch("/api/stops", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to load stops");
      setStops(Array.isArray(payload.data)
        ? (payload.data as any[]).sort((a, b) =>
            (a.name || "").localeCompare(b.name || "")
          )
        : []);
    } catch (error) {
      console.error("Failed to load stops:", error);
      toast.error("Could not load stops right now");
      setStops([]);
    } finally {
      setIsLoadingStops(false);
    }
  };

  useEffect(() => {
    void fetchClients();
    void fetchStops();
  }, []);

  const filteredClients = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return clients;
    return clients.filter((client) =>
      [
        client.client_id,
        client.name,
        client.contact_person,
        client.contact_phone,
        client.contact_email,
        client.email,
        client.phone,
        client.address,
        client.city,
        client.country,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle)
    );
  }, [clients, search]);

  const filteredStops = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return stops;
    return stops.filter((stop) =>
      [
        stop.name,
        stop.address,
        stop.city,
        stop.contact_person,
        stop.contact_phone,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle)
    );
  }, [stops, search]);

  const activeClients = filteredClients.filter((client) => client.status !== "Inactive").length;
  const dormantClients = filteredClients.filter((client) => Boolean(client.dormant_flag)).length;
  const stopWithCoords = filteredStops.filter((stop) => Boolean(stop.coordinates || stop.coords)).length;
  const stopWithContacts = filteredStops.filter((stop) => Boolean(stop.contact_person || stop.contact_phone || stop.contact_email)).length;

  const openCreateClient = () => {
    setEditingClientId(null);
    setIsClientSheetOpen(true);
  };

  const openEditClient = (client: ClientRecord) => {
    setEditingClientId(client.id);
    setIsClientSheetOpen(true);
  };

  const closeClientForm = () => {
    setIsClientSheetOpen(false);
    setEditingClientId(null);
  };

  const currentTitle = activeTab === "clients" ? "Clients" : "Stops";
  const currentDescription = activeTab === "clients"
    ? "View, add, and update client records."
    : "View and manage stop locations.";

  return (
    <div className="w-full min-w-0 max-w-full space-y-6 overflow-x-hidden">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{currentTitle}</h1>
          <p className="text-slate-600">{currentDescription}</p>
        </div>
        {activeTab === "stops" ? (
          <Button onClick={() => { setEditingStop(null); setIsStopSheetOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            Add Stop
          </Button>
        ) : null}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
        <TabsList className="grid w-full max-w-sm grid-cols-2">
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="stops">Stops</TabsTrigger>
        </TabsList>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={activeTab === "clients" ? "Search by client ID, name, contact, or address..." : "Search by stop name, contact, or address..."}
            className="pl-9"
          />
        </div>

        <TabsContent value="clients" className="space-y-6">
          <div className="grid w-full min-w-0 gap-4 md:grid-cols-3">
            <Card className="min-w-0"><CardContent className="pt-6"><div className="text-sm text-slate-500">Total Clients</div><div className="mt-2 text-3xl font-bold text-slate-900">{clients.length}</div></CardContent></Card>
            <Card className="min-w-0"><CardContent className="pt-6"><div className="text-sm text-slate-500">Active</div><div className="mt-2 text-3xl font-bold text-emerald-600">{activeClients}</div></CardContent></Card>
            <Card className="min-w-0"><CardContent className="pt-6"><div className="text-sm text-slate-500">Dormant</div><div className="mt-2 text-3xl font-bold text-amber-600">{dormantClients}</div></CardContent></Card>
          </div>

          <Card className="w-full min-w-0 max-w-full overflow-hidden">
            <CardHeader><CardTitle>Client List</CardTitle></CardHeader>
            <CardContent>
              <div className="w-full overflow-x-auto rounded-lg border border-slate-200">
                <Table className="min-w-[810px] w-full">
                  <TableHeader><TableRow className="bg-slate-50"><TableHead className="w-[200px] text-xs">Name</TableHead><TableHead className="w-[140px] text-xs">Contact</TableHead><TableHead className="w-[190px] text-xs">Phone / Email</TableHead><TableHead className="text-xs">Address</TableHead><TableHead className="w-[130px] text-right text-xs">Actions</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {isLoadingClients ? (
                      <TableRow><TableCell colSpan={5} className="py-6 text-center text-sm text-slate-500">Loading clients...</TableCell></TableRow>
                    ) : filteredClients.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="py-6 text-center text-sm text-slate-500">No client rows found.</TableCell></TableRow>
                    ) : filteredClients.map((client) => (
                      <TableRow key={client.id} className="border-b border-slate-100">
                        <TableCell className="py-1.5"><div className="flex flex-col"><span className="truncate text-xs font-medium text-slate-900">{client.name || "-"}</span>{client.industry ? <span className="text-[11px] text-slate-500 truncate">{client.industry}</span> : null}</div></TableCell>
                        <TableCell className="py-1.5"><div className="flex items-center gap-1 truncate text-xs text-slate-700"><User2 className="h-3 w-3 shrink-0 text-slate-400" /><span className="truncate">{client.contact_person || "-"}</span></div></TableCell>
                        <TableCell className="py-1.5"><div className="space-y-0.5 text-xs text-slate-700"><div className="flex items-center gap-1 truncate"><Phone className="h-3 w-3 shrink-0 text-slate-400" /><span className="truncate">{client.contact_phone || client.phone || "-"}</span></div><div className="flex items-center gap-1 truncate"><Mail className="h-3 w-3 shrink-0 text-slate-400" /><span className="truncate">{client.contact_email || client.email || "-"}</span></div></div></TableCell>
                        <TableCell className="py-1.5"><div className="flex items-center gap-1 text-xs text-slate-700"><Building2 className="h-3 w-3 shrink-0 text-slate-400" /><span className="truncate">{[client.address, client.city, client.state, client.country].filter(Boolean).join(", ") || "-"}</span></div></TableCell>
                        <TableCell className="py-1.5 text-right">
                          <div className="flex items-center justify-end gap-0.5">
                            {(client.coordinates && String(client.coordinates).trim()) && (
                              <SecureButton page="clients" action="edit" variant="outline" size="sm" className="h-6 min-w-[48px] px-1 text-[11px]" onClick={() => { setViewingClient(client); setIsViewDialogOpen(true); }}>
                                <Eye className="mr-0.5 h-3 w-3" />View
                              </SecureButton>
                            )}
                            <SecureButton page="clients" action="edit" variant="outline" size="sm" className="h-6 min-w-[48px] px-1 text-[11px]" onClick={() => openEditClient(client)}><Pencil className="mr-0.5 h-3 w-3" />Edit</SecureButton>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stops" className="space-y-6">
          <div className="grid w-full min-w-0 gap-4 md:grid-cols-3">
            <Card className="min-w-0"><CardContent className="pt-6"><div className="text-sm text-slate-500">Total Stops</div><div className="mt-2 text-3xl font-bold text-slate-900">{stops.length}</div></CardContent></Card>
            <Card className="min-w-0"><CardContent className="pt-6"><div className="text-sm text-slate-500">With Geozone</div><div className="mt-2 text-3xl font-bold text-emerald-600">{stopWithCoords}</div></CardContent></Card>
            <Card className="min-w-0"><CardContent className="pt-6"><div className="text-sm text-slate-500">With Contact</div><div className="mt-2 text-3xl font-bold text-amber-600">{stopWithContacts}</div></CardContent></Card>
          </div>

          <Card className="w-full min-w-0 max-w-full overflow-hidden">
            <CardHeader><CardTitle>Stop List</CardTitle></CardHeader>
            <CardContent>
              <div className="w-full overflow-x-auto rounded-lg border border-slate-200">
                <Table className="min-w-[400px] w-full">
                  <TableHeader><TableRow className="bg-slate-50"><TableHead className="w-[200px] text-xs">Stop</TableHead><TableHead className="text-right text-xs">Actions</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {isLoadingStops ? (
                      <TableRow><TableCell colSpan={2} className="py-6 text-center text-sm text-slate-500">Loading stops...</TableCell></TableRow>
                    ) : filteredStops.length === 0 ? (
                      <TableRow><TableCell colSpan={2} className="py-6 text-center text-sm text-slate-500">No stop rows found.</TableCell></TableRow>
                    ) : filteredStops.map((stop) => (
                      <TableRow key={stop.id} className="border-b border-slate-100">
                        <TableCell className="py-1.5"><div className="flex items-center gap-1 text-xs text-slate-700"><MapPinned className="h-3 w-3 shrink-0 text-slate-400" /><div className="min-w-0"><div className="truncate font-medium text-slate-900">{stop.name || stop.name2 || "-"}</div>{stop.type ? <div className="text-[11px] text-slate-500 truncate">{stop.type}</div> : null}</div></div></TableCell>
                        <TableCell className="py-1.5 text-right">
                          <div className="flex items-center justify-end gap-0.5">
                            {(stop.coordinates && String(stop.coordinates).trim()) && (
                              <Button variant="outline" size="sm" className="h-6 min-w-[48px] px-1 text-[11px]" onClick={() => { setViewingStop(stop); setIsStopViewDialogOpen(true); }}>
                                <Eye className="mr-0.5 h-3 w-3" />View
                              </Button>
                            )}
                            <Button variant="outline" size="sm" className="h-6 min-w-[48px] px-1 text-[11px]" onClick={() => { setEditingStop(stop); setIsStopSheetOpen(true); }}><Pencil className="mr-0.5 h-3 w-3" />Edit</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ClientFormDialog
        open={isClientSheetOpen}
        onOpenChange={(open) => { if (!open) closeClientForm(); else setIsClientSheetOpen(true) }}
        onSaved={async () => { await fetchClients() }}
        initialRecord={editingClientId ? clients.find(c => c.id === editingClientId) : null}
      />

      <DialogPrimitive.Root open={isViewDialogOpen} onOpenChange={(open) => { if (!open) { setIsViewDialogOpen(false); setViewingClient(null); } }}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%] w-[95vw] h-[95vh] max-w-[900px] max-h-[700px] bg-white shadow-xl border border-gray-200 rounded-lg overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
            <DialogPrimitive.Title className="sr-only">Geozone: {viewingClient?.name}</DialogPrimitive.Title>
            <DialogPrimitive.Close className="absolute right-4 top-4 z-10 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2">
              <X className="h-5 w-5" />
            </DialogPrimitive.Close>
            {isViewDialogOpen && viewingClient && <GeozoneViewContent record={viewingClient} onClose={() => { setIsViewDialogOpen(false); setViewingClient(null); }} />}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <StopFormDialog
        open={isStopSheetOpen}
        onOpenChange={(open) => { if (!open) { setEditingStop(null); setIsStopSheetOpen(false); } else setIsStopSheetOpen(true); }}
        onSaved={async () => {
          toast.success(editingStop ? "Stop updated successfully" : "Stop added successfully");
          setEditingStop(null);
          await fetchStops();
        }}
        initialRecord={editingStop}
      />

      <DialogPrimitive.Root open={isStopViewDialogOpen} onOpenChange={(open) => { if (!open) { setIsStopViewDialogOpen(false); setViewingStop(null); } }}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%] w-[95vw] h-[95vh] max-w-[900px] max-h-[700px] bg-white shadow-xl border border-gray-200 rounded-lg overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
            <DialogPrimitive.Title className="sr-only">Geozone: {viewingStop?.name}</DialogPrimitive.Title>
            <DialogPrimitive.Close className="absolute right-4 top-4 z-10 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2">
              <X className="h-5 w-5" />
            </DialogPrimitive.Close>
            {isStopViewDialogOpen && viewingStop && <GeozoneViewContent record={viewingStop} onClose={() => { setIsStopViewDialogOpen(false); setViewingStop(null); }} />}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
}

function GeozoneViewContent({ record, onClose }: { record: any; onClose: () => void }) {
  const { loaded: mapsLoaded, error: mapsError } = useGoogleMaps()
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const overlaysRef = useRef<(google.maps.Polygon | google.maps.Marker)[]>([])

  const hasCoordinates = Boolean(record.coordinates) && String(record.coordinates).trim().length > 0

  useEffect(() => {
    if (!mapsLoaded || !mapContainerRef.current || mapRef.current) return

    const map = new window.google.maps.Map(mapContainerRef.current, {
      center: { lat: -26.2041, lng: 28.0473 },
      zoom: 4.8,
      mapTypeId: window.google.maps.MapTypeId.ROADMAP,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    })
    mapRef.current = map

    if (!hasCoordinates) {
      map.setCenter({ lat: -26.2041, lng: 28.0473 })
      map.setZoom(4.8)
      return () => { overlaysRef.current = []; mapRef.current = null }
    }

    const bounds = new window.google.maps.LatLngBounds()
    const overlays: (google.maps.Polygon | google.maps.Marker)[] = []

    if (record.coordinates) {
      const coordsStr = String(record.coordinates).trim()
      let path: { lat: number; lng: number }[] | null = null
      try {
        const parsed = JSON.parse(coordsStr)
        if (Array.isArray(parsed) && parsed.length >= 3) {
          path = parsed.map((c: number[]) => ({ lat: c[1], lng: c[0] }))
        }
      } catch {
        const triplets = coordsStr.split(/\s+/).filter(Boolean)
        if (triplets.length >= 3) {
          const pts = triplets
            .map((t) => {
              const parts = t.split(',').map(Number)
              if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                return { lng: parts[0], lat: parts[1] }
              }
              return null
            })
            .filter((p): p is { lat: number; lng: number } => p !== null)
          if (pts.length >= 3) path = pts
        }
      }
      if (path && path.length >= 3) {
        const polygon = new window.google.maps.Polygon({
          paths: path,
          map,
          strokeColor: '#7c3aed',
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: '#7c3aed',
          fillOpacity: 0.12,
        })
        overlays.push(polygon)
        path.forEach((p) => bounds.extend(p))

        const labelLat = path.reduce((s: number, p: any) => s + p.lat, 0) / path.length
        const labelLng = path.reduce((s: number, p: any) => s + p.lng, 0) / path.length
        const label = new window.google.maps.Marker({
          position: { lat: labelLat, lng: labelLng },
          map,
          title: `Geozone: ${record.name}`,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 6,
            fillColor: '#7c3aed',
            fillOpacity: 0.4,
            strokeColor: '#5b21b6',
            strokeWeight: 2,
          },
        })
        overlays.push(label)
      }
    }

    overlaysRef.current = overlays

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, 60)
    } else {
      map.setCenter({ lat: -26.2041, lng: 28.0473 })
      map.setZoom(4.8)
    }

    return () => {
      overlaysRef.current.forEach((o) => o.setMap(null))
      overlaysRef.current = []
      mapRef.current = null
    }
  }, [mapsLoaded, record, hasCoordinates])

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-slate-900">{record.name || 'Record'}</h2>
        <p className="text-sm text-slate-500">
          {record.client_id ? `ID: ${record.client_id} — ` : ''}
          {[record.address, record.city, record.state, record.country].filter(Boolean).join(', ') || 'No address'}
        </p>
      </div>
      <div className="flex-1 p-4">
        {!hasCoordinates ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <MapPinned className="h-16 w-16 text-slate-200 mb-4" />
            <p className="text-lg font-medium text-slate-500">No geozone added</p>
            <p className="text-sm text-slate-400 mt-1">This record does not have a polygon geozone.</p>
          </div>
        ) : mapsError ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            Map failed to load: {mapsError}
          </div>
        ) : (
          <div ref={mapContainerRef} className="h-full w-full rounded-lg border border-slate-200" />
        )}
      </div>
    </div>
  )
}
