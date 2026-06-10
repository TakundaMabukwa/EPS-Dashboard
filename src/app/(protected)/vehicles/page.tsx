"use client";

import { Button } from "@/components/ui/button";
import { SecureButton } from "@/components/SecureButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Truck, Car, FileText, TruckElectricIcon, Search, Wrench, AlertTriangle, MapPin, Shield, Activity } from "lucide-react";
import React, { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RollingNumber } from "@/components/ui/rolling-number";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import Link from "next/link";
import { DataTable } from "@/components/ui/data-table";
import { initialVehiclesState } from "@/context/vehicles-context/context";

const vehicleFormSchema = z.object({
  id: z.number().int().optional(),
  registration_number: z.string().min(1, "Registration number is required"),
  engine_number: z.string().min(1, "Engine number is required"),
  vin_number: z.string().min(1, "VIN number is required"),
  make: z.string().min(1, "Make is required"),
  model: z.string().min(1, "Model is required"),
  sub_model: z.string().optional(),
  manufactured_year: z.string().min(1, "Manufactured year is required"),
  vehicle_type: z.enum(
    ["vehicle", "trailer", "commercial", "tanker", "truck", "specialized"],
    { required_error: "Vehicle type is required" }
  ),
  registration_date: z.string().min(1, "Registration date is required"),
  license_expiry_date: z.string().min(1, "License expiry date is required"),
  purchase_price: z.string().min(1, "Purchase price is required"),
  retail_price: z.string().min(1, "Retail price is required"),
  vehicle_priority: z.enum(["high", "medium", "low"], {
    required_error: "Vehicle priority is required",
  }),
  fuel_type: z.enum(["petrol", "diesel", "electric", "hybrid", "lpg"], {
    required_error: "Fuel type is required",
  }),
  transmission_type: z.enum(["manual", "automatic", "cvt"], {
    required_error: "Transmission type is required",
  }),
  tank_capacity: z.string().optional(),
  register_number: z.string().optional(),
  take_on_kilometers: z.string().min(1, "Take on kilometers is required"),
  service_intervals: z.string().min(1, "Service intervals is required"),
  boarding_km_hours: z.string().optional(),
  expected_boarding_date: z.string().optional(),
  cost_centres: z.string().optional(),
  colour: z.string().min(1, "Colour is required"),
  monthly_premium: z.string().optional(),
  hourly_rate: z.string().optional(),
  created_by: z.string().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  tech_id: z.number().int().optional(),
  driver_id: z.number().int().optional(),
});

type VehicleFormValues = z.infer<typeof vehicleFormSchema>;

interface Technician {
  id: number;
  name: string;
  phone: string;
  email: string;
}

interface Driver {
  id: number;
  first_name: string;
  surname: string;
  cell_number: string;
  email_address?: string | null;
}

interface CostCenter {
  id: number;
  company: string;
  cost_code: string;
}

export default function Vehicles() {
  const [vehicles, setVehicles] = useState<VehicleFormValues[]>([]);
  const [isAddingVehicle, setIsAddingVehicle] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const [search, setSearch] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(
    null
  );
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [filteredDrivers, setFilteredDrivers] = useState<Driver[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);

  useEffect(() => {
    const getDrivers = async () => {
      const { data, error } = await supabase.from("drivers").select("*");
      if (error) {
        console.error("Error fetching drivers:", error);
        setDrivers([]);
        return;
      }
      setDrivers(data as []);
    };
    
    const getCostCenters = async () => {
      const { data, error } = await supabase
        .from("level_3_cost_centers")
        .select("id, company, cost_code")
        .order("company");
      if (error) {
        console.error("Error fetching cost centers:", error);
        setCostCenters([]);
        return;
      }
      setCostCenters(data as CostCenter[]);
    };
    
    getDrivers();
    getCostCenters();
  }, []);

  useEffect(() => {
    const filtered = drivers.filter((driver) =>
      `${driver.first_name} ${driver.surname}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );
    setFilteredDrivers(filtered);
  }, [searchTerm, drivers]);


  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [filteredTechs, setFilteredTechs] = useState<Technician[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleFormValues | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<number | null>(null);
  const [equipmentData, setEquipmentData] = useState<any[]>([]);
  const [isEquipmentSheetOpen, setIsEquipmentSheetOpen] = useState(false);
  const [equipmentVehicleReg, setEquipmentVehicleReg] = useState("");
  const [cardFilter, setCardFilter] = useState<string | null>(null);
  const [branchFilter, setBranchFilter] = useState<string>('all');
  
  const branches = [
    { name: 'BRAKEN GATE CPT', code: 'BRK' },
    { name: 'CANCELLED DN', code: 'CANCEL' },
    { name: 'DCC CROSSBORDER', code: 'DCC' },
    { name: 'EPS JOHANNESBURG', code: 'JHB' },
    { name: 'GOSFORTH PARK', code: 'GFS' },
    { name: 'HEAD OFFICE', code: 'HO' },
    { name: 'NORTHFIELDS', code: 'NORTH' },
    { name: 'OPEN NETWORK', code: 'ON' },
    { name: 'POLOKWANE LID', code: 'PLKL' },
    { name: 'RIVERSANDS', code: 'RS' },
    { name: 'SPAR KZN', code: 'SPAR' },
    { name: 'WATERFALL MIDRAND', code: 'WTF' },
    { name: 'WRITTEN OFF', code: 'WO' },
  ];
  

  const fetchVehicles = async () => {
    const { data: vehicles, error } = await supabase
      .from("vehiclesc")
      .select("*")
      .neq("branch_name", "SOLD");
    if (error) {
      console.error("the error is", error.name, error.message);
    } else {
      // @ts-expect-error
      setVehicles(vehicles || []);
    }
  };

  useEffect(() => {
    const channel = supabase
      .channel("vehicles-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vehiclesc" },
        (payload) => {
          console.log("Change received!", payload);
          fetchVehicles();
        }
      )
      .subscribe();
    fetchVehicles();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const filtered = technicians.filter((tech) =>
      tech.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredTechs(filtered as []);
  }, [searchTerm, technicians]);

  const handleUploadFile = () => {
    if (!selectedFile) return;
    // TODO: Implement upload logic here
    toast.info(`Uploading: ${selectedFile.name}`);
  };

  // Filter vehicles based on search and card filter
  const filteredVehicles = useMemo(() => {
    const now = new Date();
    const in30 = new Date();
    in30.setDate(in30.getDate() + 30);

    return vehicles.filter((vehicle) => {
      const searchLower = search.toLowerCase();
      const matchesSearch =
        (vehicle.make || '').toLowerCase().includes(searchLower) ||
        (vehicle.model || '').toLowerCase().includes(searchLower) ||
        (vehicle.registration_number || '').toLowerCase().includes(searchLower) ||
        (vehicle.vehicle_type || '').toLowerCase().includes(searchLower) ||
        (vehicle.branch_name || '').toLowerCase().includes(searchLower) ||
        (vehicle.branch_code || '').toLowerCase().includes(searchLower);

      let matchesCard = true;
      if (cardFilter === 'license-expiring') {
        const exp = vehicle.license_expiry_date ? new Date(vehicle.license_expiry_date) : null;
        matchesCard = !!exp && exp <= in30;
      } else if (cardFilter === 'license-expired') {
        const exp = vehicle.license_expiry_date ? new Date(vehicle.license_expiry_date) : null;
        matchesCard = !!exp && exp <= now;
      } else if (cardFilter === 'service-due') {
        matchesCard = vehicle.service_due_flag === true || vehicle.service_due_flag === 'true' || vehicle.service_due_flag === 1;
      }

      const matchesBranch = branchFilter === 'all' || vehicle.branch_name === branchFilter;

      return matchesSearch && matchesCard && matchesBranch;
    });
  }, [vehicles, search, cardFilter, branchFilter]);

  // Pagination state & logic (50 per page)
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 50;
  const totalPages = Math.max(1, Math.ceil(filteredVehicles.length / PAGE_SIZE));
  // Ensure currentPage stays within bounds when filteredVehicles changes
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const paginatedVehicles = filteredVehicles.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // Row background color by type
  const getRowBg = (type: string) => {
    switch (type) {
      case "vehicle":
        return "bg-blue-50";
      case "trailer":
        return "bg-purple-50";
      case "truck":
        return "bg-yellow-50";
      case "commercial":
        return "bg-green-50";
      case "tanker":
        return "bg-orange-50";
      case "specialized":
        return "bg-pink-50";
      default:
        return "";
    }
  };

  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: {
      registration_number: "",
      engine_number: "",
      vin_number: "",
      make: "",
      model: "",
      sub_model: "",
      manufactured_year: "",
      vehicle_type: "vehicle",
      registration_date: new Date().toISOString().split('T')[0],
      license_expiry_date: new Date().toISOString().split('T')[0],
      purchase_price: "",
      retail_price: "",
      vehicle_priority: "medium",
      fuel_type: "petrol",
      transmission_type: "manual",
      tank_capacity: "",
      register_number: "",
      take_on_kilometers: "",
      service_intervals: "",
      boarding_km_hours: "",
      expected_boarding_date: new Date().toISOString().split('T')[0],
      cost_centres: "",
      colour: "",
      monthly_premium: "",
      hourly_rate: "",
      // created_by: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  });

  const onSubmit = async (data: VehicleFormValues) => {
    console.log('onSubmit called with data:', data);
    console.log('Form errors:', form.formState.errors);
    try {
      if (isEditing && editingVehicleId) {
        await handleUpdateVehicle(data);
      } else {
        await handleAddVehicle(data);
      }
      fetchVehicles();
    } catch (error) {
      console.error('Form submission error:', error);
      toast.error('Form submission failed: ' + (error as Error).message);
    }
  };

  const handleAddVehicle = async (data: VehicleFormValues) => {
    console.log('Form data received:', data);
    const { id, ...dataWithoutId } = data;
    const vehicleData = {
      ...dataWithoutId,
      monthly_premium: data.monthly_premium ? parseFloat(data.monthly_premium.replace(/[^0-9.]/g, '')) : null,
      hourly_rate: data.hourly_rate ? parseFloat(data.hourly_rate.replace(/[^0-9.]/g, '')) : null
    };
    console.log('Vehicle data to insert:', vehicleData);
    const { data: vehicle, error } = await supabase
      .from("vehiclesc")
      // @ts-expect-error
      .insert(vehicleData);
    if (error) {
      console.error(error.message);
      toast.error("Failed to add vehicle: " + error.message);
      throw new Error(error.message);
    } else {
      console.log(vehicle);
      toast.success("Vehicle added successfully");
      fetchVehicles();
      form.reset();
      setIsAddingVehicle(false);
      setIsEditing(false);
      setEditingVehicleId(null);
      router.refresh();
    }
  };

  const handleUpdateVehicle = async (data: VehicleFormValues) => {
    if (!editingVehicleId) return;
    
    const vehicleData = {
      ...data,
      monthly_premium: data.monthly_premium ? parseFloat(data.monthly_premium.replace(/[^0-9.]/g, '')) : null,
      hourly_rate: data.hourly_rate ? parseFloat(data.hourly_rate.replace(/[^0-9.]/g, '')) : null
    };
    
    const { error } = await supabase
      .from("vehiclesc")
      .update(vehicleData)
      .eq("id", editingVehicleId);
    
    if (error) {
      console.error(error.message);
      toast.error("Failed to update vehicle: " + error.message);
      throw new Error(error.message);
    } else {
      toast.success("Vehicle updated successfully");
      fetchVehicles();
      form.reset();
      setIsAddingVehicle(false);
      setIsEditing(false);
      setEditingVehicleId(null);
      router.refresh();
    }
  };

  const getVehicleTypeIcon = (type: string) => {
    return type === "vehicle" ? (
      <Car className="w-4 h-4" />
    ) : (
      <Truck className="w-4 h-4" />
    );
  };

  const getPriorityBadge = (priority: string) => {
    const colors = {
      high: "bg-red-100 text-red-700 border-red-200",
      medium: "bg-amber-100 text-amber-700 border-amber-200",
      low: "bg-green-100 text-green-700 border-green-200",
    };
    return (
      <Badge className={`${colors[priority as keyof typeof colors]} text-xs px-2 py-0.5 font-medium border`}>
        {priority?.toUpperCase() || 'N/A'}
      </Badge>
    );
  };

  async function handleAssignDriver(vehicleId: number, driverId: number) {
    const { data, error } = await supabase
      .from("vehiclesc")
      .update({ driver_id: driverId })
      .eq("id", vehicleId)
      .select();

    if (error) {
      console.error("Issue in assigning driver:", error.message);
      alert("Failed to assign driver: " + error.message);
      return;
    }
    console.log("Driver assigned successfully:", data);
    fetchVehicles();
    // Optionally refresh or update state if needed
  }

  async function handleAssign(vehicleId: number, techId: number) {
    const { data: datav, error: errorv } = await supabase
      .from("vehiclesc")
      .update({ tech_id: techId })
      .eq("id", vehicleId)
      .select();

    if (errorv) {
      console.log("Issue in assigning: " + errorv.message);
      alert("Failed to assign technician: " + errorv.message);
      return;
    }
    console.log("Technician assigned successfully:", datav);
  }

  const fetchEquipmentData = async (registration: string) => {
    console.log('Searching for equipment with registration:', registration);
    
    const { data, error } = await supabase
      .from('equipment')
      .select('*')
      .ilike('reg', registration.trim());
    
    if (error) {
      console.error('Error fetching equipment:', error);
      toast.error('Failed to fetch equipment data');
      return;
    }
    
    console.log('Equipment data found:', data);
    setEquipmentData(data || []);
  };

  const { columns } = initialVehiclesState;
  // console.log("The vehicles are", columns)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vehicles</h1>
          <p className="text-gray-600 mt-1">
            Manage your vehicle and trailer fleet
          </p>
        </div>
        <SecureButton
          page="vehicles"
          action="create"
          onClick={() => setIsAddingVehicle(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Vehicle
        </SecureButton>
      </div>

      {/* Add Vehicle Form */}
      {isAddingVehicle && (
        <Card>
          <CardHeader>
            <CardTitle>{isEditing ? 'Edit Vehicle' : 'Add New Vehicle'}</CardTitle>
          </CardHeader>
          {/* <CardContent>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 mb-6 flex flex-col items-center bg-gray-50">
              <div className="flex flex-col items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                <p className="text-lg font-semibold text-gray-700">Upload Vehicles</p>
                <p className="text-sm text-gray-500 mb-2">Upload new vehicles using a CSV or spreadsheet file</p>
              </div>
              <input
                id="vehicle-upload"
                type="file"
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                className="border-2 p-2 rounded-4xl"
                onChange={e => setSelectedFile(e.target.files?.[0] || null)}
              />
              {selectedFile && (
                <span className="mt-2 text-sm text-gray-600">Selected: {selectedFile.name}</span>
              )}
              <Button className="mt-4 bg-blue-600 hover:bg-blue-700 text-white" type="button" disabled={!selectedFile} onClick={handleUploadFile}>
                Upload File
              </Button>
            </div>
          </CardContent> */}

          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Vehicle Type Selection */}
                  <FormField
                    control={form.control}
                    name="vehicle_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vehicle Type *</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select vehicle type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="vehicle">
                              <div className="flex items-center gap-2">
                                <Car className="w-4 h-4" />
                                Vehicle
                              </div>
                            </SelectItem>
                            <SelectItem value="commercial">
                              <div className="flex items-center gap-2">
                                <Truck className="w-4 h-4" />
                                Commercial
                              </div>
                            </SelectItem>
                            <SelectItem value="tanker">
                              <div className="flex items-center gap-2">
                                <TruckElectricIcon className="w-4 h-4" />
                                Truck
                              </div>
                            </SelectItem>
                            <SelectItem value="truck">
                              <div className="flex items-center gap-2">
                                <Truck className="w-4 h-4" />
                                Tanker
                              </div>
                            </SelectItem>
                            <SelectItem value="specialized">
                              <div className="flex items-center gap-2">
                                <Truck className="w-4 h-4" />
                                Specialized
                              </div>
                            </SelectItem>
                            <SelectItem value="trailer">
                              <div className="flex items-center gap-2">
                                <Truck className="w-4 h-4" />
                                Trailer
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="registration_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Registration Number *</FormLabel>
                        <FormControl>
                          <Input placeholder="ABC 123 GP" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="make"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Make *</FormLabel>
                        <FormControl>
                          <Input placeholder="Toyota" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="model"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Model *</FormLabel>
                        <FormControl>
                          <Input placeholder="Hilux" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="engine_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Engine Number *</FormLabel>
                        <FormControl>
                          <Input placeholder="ENG123456" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="vin_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>VIN Number *</FormLabel>
                        <FormControl>
                          <Input placeholder="VIN123456789" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sub_model"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sub Model</FormLabel>
                        <FormControl>
                          <Input placeholder="Double Cab" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="manufactured_year"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Manufactured Year *</FormLabel>
                        <FormControl>
                          <Input placeholder="2023" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="registration_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Registration Date *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="license_expiry_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>License Expiry Date *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="fuel_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fuel Type *</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select fuel type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="petrol">Petrol</SelectItem>
                            <SelectItem value="diesel">Diesel</SelectItem>
                            <SelectItem value="electric">Electric</SelectItem>
                            <SelectItem value="hybrid">Hybrid</SelectItem>
                            <SelectItem value="lpg">LPG</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="transmission_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Transmission *</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select transmission" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="manual">Manual</SelectItem>
                            <SelectItem value="automatic">Automatic</SelectItem>
                            <SelectItem value="cvt">CVT</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="boarding_km_hours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Boarding KM/Hours</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 1000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="expected_boarding_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expected Boarding Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cost_centres"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cost Centres</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select cost centre" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {costCenters.map((center) => (
                              <SelectItem key={center.id} value={center.company}>
                                {center.company}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="register_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Register Number</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., ZN123456" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tank_capacity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tank Capacity (L)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 80" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="vehicle_priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority *</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="colour"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Colour *</FormLabel>
                        <FormControl>
                          <Input placeholder="White" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="purchase_price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Purchase Price *</FormLabel>
                        <FormControl>
                          <Input placeholder="R 500,000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="retail_price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Retail Price *</FormLabel>
                        <FormControl>
                          <Input placeholder="R 550,000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="take_on_kilometers"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Take On Kilometers *</FormLabel>
                        <FormControl>
                          <Input placeholder="50,000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="service_intervals"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Service Intervals *</FormLabel>
                        <FormControl>
                          <Input placeholder="15,000 km" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="monthly_premium"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monthly Premium</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="R 5,000" 
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              const value = e.target.value.replace(/[^0-9.]/g, '');
                              if (value) {
                                const monthly = parseFloat(value);
                                const hourly = (monthly / 30 / 8).toFixed(2);
                                form.setValue('hourly_rate', hourly);
                              } else {
                                form.setValue('hourly_rate', '');
                              }
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="hourly_rate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hourly Rate (Auto-calculated)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="R 20.83" 
                            {...field}
                            readOnly
                            className="bg-gray-50"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex gap-4">
                  <Button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => {
                      const errors = form.formState.errors;
                      console.log('All errors:', JSON.stringify(errors, null, 2));
                      toast.error('Button clicked - check console for errors');
                      
                      if (Object.keys(errors).length > 0) {
                        Object.entries(errors).forEach(([field, error]) => {
                          console.log(`Field ${field}:`, error);
                          toast.error(`${field}: ${error?.message || 'Invalid'}`);
                        });
                      }
                    }}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    {isEditing ? 'Update Vehicle' : 'Save Vehicle'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsAddingVehicle(false);
                      setIsEditing(false);
                      setEditingVehicleId(null);
                      form.reset();
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Vehicles */}
        <button
          onClick={() => setCardFilter(null)}
          className={`relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-4 text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl text-left ${
            cardFilter === null ? 'ring-2 ring-black ring-offset-2' : ''
          }`}
        >
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10" />
          <div className="absolute -bottom-2 -right-2 h-16 w-16 rounded-full bg-white/5" />
          <div className="relative">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 mb-2">
              <Truck className="h-4 w-4" />
            </div>
            <p className="text-xs font-medium text-blue-100">Total Vehicles</p>
            <p className="text-2xl font-bold mt-0.5">
              <RollingNumber value={vehicles.length} duration={1000} />
            </p>
          </div>
        </button>

        {/* License Expiring */}
        <button
          onClick={() => setCardFilter(cardFilter === 'license-expiring' ? null : 'license-expiring')}
          className={`relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 p-4 text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl text-left ${
            cardFilter === 'license-expiring' ? 'ring-2 ring-black ring-offset-2' : ''
          }`}
        >
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10" />
          <div className="absolute -bottom-2 -right-2 h-16 w-16 rounded-full bg-white/5" />
          <div className="relative">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 mb-2">
              <Shield className="h-4 w-4" />
            </div>
            <p className="text-xs font-medium text-amber-100">License Expiring</p>
            <p className="text-2xl font-bold mt-0.5">
              <RollingNumber
                value={vehicles.filter((v) => {
                  if (!v.license_expiry_date) return false;
                  const exp = new Date(v.license_expiry_date);
                  const in30 = new Date();
                  in30.setDate(in30.getDate() + 30);
                  return exp <= in30;
                }).length}
                duration={1000}
              />
            </p>
            <p className="text-[10px] text-amber-200 mt-0.5">expired or within 30 days</p>
          </div>
        </button>

        {/* License Expired */}
        <button
          onClick={() => setCardFilter(cardFilter === 'license-expired' ? null : 'license-expired')}
          className={`relative overflow-hidden rounded-xl bg-gradient-to-br from-red-500 to-rose-600 p-4 text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl text-left ${
            cardFilter === 'license-expired' ? 'ring-2 ring-black ring-offset-2' : ''
          }`}
        >
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10" />
          <div className="absolute -bottom-2 -right-2 h-16 w-16 rounded-full bg-white/5" />
          <div className="relative">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 mb-2">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <p className="text-xs font-medium text-red-100">License Expired</p>
            <p className="text-2xl font-bold mt-0.5">
              <RollingNumber
                value={vehicles.filter((v) => {
                  if (!v.license_expiry_date) return false;
                  return new Date(v.license_expiry_date) <= new Date();
                }).length}
                duration={1000}
              />
            </p>
          </div>
        </button>

        {/* Service Due */}
        <button
          onClick={() => setCardFilter(cardFilter === 'service-due' ? null : 'service-due')}
          className={`relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-500 to-violet-500 p-4 text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl text-left ${
            cardFilter === 'service-due' ? 'ring-2 ring-black ring-offset-2' : ''
          }`}
        >
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10" />
          <div className="absolute -bottom-2 -right-2 h-16 w-16 rounded-full bg-white/5" />
          <div className="relative">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 mb-2">
              <Wrench className="h-4 w-4" />
            </div>
            <p className="text-xs font-medium text-purple-100">Service Due</p>
            <p className="text-2xl font-bold mt-0.5">
              <RollingNumber
                value={vehicles.filter((v) => v.service_due_flag === true || v.service_due_flag === 'true' || v.service_due_flag === 1).length}
                duration={1000}
              />
            </p>
          </div>
        </button>
      </div>

      {/* Vehicle List */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search vehicles..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 border border-border rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring transition-colors placeholder:text-muted-foreground"
          />
        </div>
        <select
          value={branchFilter}
          onChange={(e) => { setBranchFilter(e.target.value); setCurrentPage(1); }}
          className="px-3 py-2 border border-border rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring transition-colors text-gray-700"
        >
          <option value="all">All Branches</option>
          {branches.map((b) => (
            <option key={b.code} value={b.name}>{b.name} ({b.code})</option>
          ))}
        </select>
        {(cardFilter || branchFilter !== 'all') && (
          <button
            onClick={() => { setCardFilter(null); setBranchFilter('all'); }}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {vehicles.length > 0 && (
        <div className="border border-border rounded-lg bg-white overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 340px)', minHeight: '400px' }}>
          <div className="overflow-auto flex-1">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gradient-to-r from-slate-800 to-slate-900">
                  <th className="px-4 py-2 text-left text-[11px] font-semibold text-white uppercase tracking-wider">Registration</th>
                  <th className="px-4 py-2 text-left text-[11px] font-semibold text-white uppercase tracking-wider">Make/Model</th>
                  <th className="px-4 py-2 text-left text-[11px] font-semibold text-white uppercase tracking-wider">Branch</th>
                  <th className="px-4 py-2 text-left text-[11px] font-semibold text-white uppercase tracking-wider">Type</th>
                  <th className="px-4 py-2 text-left text-[11px] font-semibold text-white uppercase tracking-wider">Year</th>
                  <th className="px-4 py-2 text-left text-[11px] font-semibold text-white uppercase tracking-wider">License Expiry</th>
                  <th className="px-4 py-2 text-left text-[11px] font-semibold text-white uppercase tracking-wider">Service Due</th>
                  <th className="px-4 py-2 text-left text-[11px] font-semibold text-white uppercase tracking-wider">Driver</th>
                  <th className="px-4 py-2 text-right text-[11px] font-semibold text-white uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedVehicles.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                      No vehicles found
                    </td>
                  </tr>
                ) : (
                  paginatedVehicles.map((vehicle) => {
                    const getExpiryStyle = (dateStr: string | null | undefined) => {
                      if (!dateStr) return '';
                      const exp = new Date(dateStr);
                      const now = new Date();
                      const in30 = new Date();
                      in30.setDate(in30.getDate() + 30);
                      if (exp <= now) return 'animate-pulse text-red-600 font-bold bg-red-50';
                      if (exp <= in30) return 'animate-pulse text-orange-500 font-bold bg-orange-50';
                      return 'text-gray-600';
                    };
                    const isServiceDue = vehicle.service_due_flag === true || vehicle.service_due_flag === 'true' || vehicle.service_due_flag === 1;
                    return (
                      <tr key={vehicle.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-4 py-2.5 text-sm font-medium text-gray-900">{vehicle.registration_number || '-'}</td>
                        <td className="px-4 py-2.5">
                          <div className="text-sm font-medium text-gray-900">{vehicle.make || '-'}</div>
                          <div className="text-xs text-gray-500">{vehicle.model || '-'}</div>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="text-sm text-gray-900">{vehicle.branch_name || '-'}</div>
                          <div className="text-xs text-gray-500">{vehicle.branch_code || ''}</div>
                        </td>
                        <td className="px-4 py-2.5 text-sm text-gray-600 capitalize">{vehicle.vehicle_type || '-'}</td>
                        <td className="px-4 py-2.5 text-sm text-gray-600">{vehicle.manufactured_year || '-'}</td>
                        <td className={`px-4 py-2.5 text-sm ${getExpiryStyle(vehicle.license_expiry_date)}`}>
                          {vehicle.license_expiry_date ? new Date(vehicle.license_expiry_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                        </td>
                        <td className="px-4 py-2.5">
                          {isServiceDue ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                              Yes
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">No</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-sm text-gray-600">
                          {drivers.find(d => d.id === vehicle.driver_id)
                            ? `${drivers.find(d => d.id === vehicle.driver_id)?.first_name} ${drivers.find(d => d.id === vehicle.driver_id)?.surname}`
                            : <span className="text-gray-400">Unassigned</span>
                          }
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="flex gap-1 justify-end">
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-gray-600 hover:text-gray-900" onClick={() => { setSelectedVehicle(vehicle); setIsSheetOpen(true); }}>
                              View
                            </Button>
                            <Link href={`/vehicles/${vehicle.id}`}>
                              <Button variant="ghost" size="sm" className="h-7 text-xs text-gray-600 hover:text-gray-900">
                                Details
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {filteredVehicles.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-100 bg-gray-50/50 shrink-0 flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Showing {(currentPage - 1) * PAGE_SIZE + 1} - {Math.min(currentPage * PAGE_SIZE, filteredVehicles.length)} of <span className="font-medium text-gray-700">{filteredVehicles.length}</span> vehicles
              </p>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                  Prev
                </Button>
                <span className="text-xs text-gray-500">Page {currentPage} of {totalPages}</span>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Vehicle Details Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-[600px] max-w-[90vw] p-0 bg-white">
          {selectedVehicle && (
            <>
              {/* Header */}
              <div className="bg-slate-50 border-b border-slate-200 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-10 h-10 bg-slate-700 rounded-lg">
                      {getVehicleTypeIcon(selectedVehicle.vehicle_type)}
                    </div>
                    <div>
                      <SheetTitle className="text-xl font-bold text-slate-900">
                        {selectedVehicle.registration_number || 'Vehicle Details'}
                      </SheetTitle>
                      <p className="text-sm text-slate-600 mt-1">
                        {selectedVehicle.make} {selectedVehicle.model} • {selectedVehicle.manufactured_year}
                      </p>
                    </div>
                  </div>
                  {getPriorityBadge(selectedVehicle.vehicle_priority)}
                </div>
              </div>

              {/* Content */}
              <div className="overflow-y-auto h-[calc(100vh-140px)] p-6 space-y-6">
                {/* Basic Information */}
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="w-6 h-6 bg-slate-600 rounded flex items-center justify-center">
                      <Car className="w-3 h-3 text-white" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">Basic Information</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Registration</p>
                      <p className="text-sm font-medium text-slate-900 mt-1">{selectedVehicle.registration_number || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Engine Number</p>
                      <p className="text-sm text-slate-700 mt-1">{selectedVehicle.engine_number || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">VIN Number</p>
                      <p className="text-sm text-slate-700 mt-1">{selectedVehicle.vin_number || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Color</p>
                      <p className="text-sm text-slate-700 mt-1">{selectedVehicle.colour || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Technical Details */}
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="w-6 h-6 bg-slate-600 rounded flex items-center justify-center">
                      <Truck className="w-3 h-3 text-white" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">Technical Details</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Fuel Type</p>
                      <p className="text-sm text-slate-700 mt-1 capitalize">{selectedVehicle.fuel_type || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Transmission</p>
                      <p className="text-sm text-slate-700 mt-1 capitalize">{selectedVehicle.transmission_type || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Tank Capacity</p>
                      <p className="text-sm text-slate-700 mt-1">{selectedVehicle.tank_capacity ? `${selectedVehicle.tank_capacity}L` : '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Service Intervals</p>
                      <p className="text-sm text-slate-700 mt-1">{selectedVehicle.service_intervals || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Financial Information */}
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="w-6 h-6 bg-slate-600 rounded flex items-center justify-center">
                      <span className="text-white text-xs font-bold">R</span>
                    </div>
                    <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">Financial Information</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Purchase Price</p>
                      <p className="text-sm font-medium text-slate-900 mt-1">{selectedVehicle.purchase_price || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Retail Price</p>
                      <p className="text-sm text-slate-700 mt-1">{selectedVehicle.retail_price || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Monthly Premium</p>
                      <p className="text-sm text-slate-700 mt-1">{selectedVehicle.monthly_premium ? `R ${selectedVehicle.monthly_premium}` : '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Hourly Rate</p>
                      <p className="text-sm text-slate-700 mt-1">{selectedVehicle.hourly_rate ? `R ${selectedVehicle.hourly_rate}` : '-'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Cost Centres</p>
                      <p className="text-sm text-slate-700 mt-1">{selectedVehicle.cost_centres || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Assignment Information */}
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="w-6 h-6 bg-slate-600 rounded flex items-center justify-center">
                      <span className="text-white text-xs font-bold">A</span>
                    </div>
                    <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">Assignments</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Assigned Driver</p>
                      <p className="text-sm text-slate-700 mt-1">{
                        drivers.find(d => d.id === selectedVehicle.driver_id) 
                          ? `${drivers.find(d => d.id === selectedVehicle.driver_id)?.first_name} ${drivers.find(d => d.id === selectedVehicle.driver_id)?.surname}`
                          : 'Not Assigned'
                      }</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Assigned Technician</p>
                      <p className="text-sm text-slate-700 mt-1">{
                        technicians.find(t => t.id === selectedVehicle.tech_id)?.name || 'Not Assigned'
                      }</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="border-t border-slate-200 p-4 bg-white">
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsSheetOpen(false)}
                    className="text-slate-600 border-slate-300"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Equipment Sheet */}
      <Sheet open={isEquipmentSheetOpen} onOpenChange={setIsEquipmentSheetOpen}>
        <SheetContent className="w-[600px] max-w-[90vw] p-0 bg-white">
          <div className="bg-slate-50 border-b border-slate-200 p-6">
            <SheetTitle className="text-xl font-bold text-slate-900">
              Equipment for {equipmentVehicleReg}
            </SheetTitle>
          </div>
          
          <div className="overflow-y-auto h-[calc(100vh-140px)] p-6">
            {equipmentData.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                No equipment found for this vehicle
              </div>
            ) : (
              <div className="space-y-4">
                {equipmentData.map((equipment) => (
                  <Card key={equipment.id} className="bg-slate-50 border border-slate-200">
                    <CardContent className="p-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Registration</p>
                          <p className="text-sm font-medium text-slate-900 mt-1">{equipment.reg || '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Skylink Pro IP</p>
                          <p className="text-sm text-slate-700 mt-1">{equipment.skylink_pro_ip || '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Industrial Panic</p>
                          <p className="text-sm text-slate-700 mt-1">{equipment.industrial_panic || '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Keypad</p>
                          <p className="text-sm text-slate-700 mt-1">{equipment.keypad || '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Beame</p>
                          <p className="text-sm text-slate-700 mt-1">{equipment.beame_1 || '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Fuel Probe</p>
                          <p className="text-sm text-slate-700 mt-1">{equipment.fuel_probe_1 || '-'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
          
          <div className="border-t border-slate-200 p-4 bg-white">
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEquipmentSheetOpen(false)}
                className="text-slate-600 border-slate-300"
              >
                Close
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

    </div>
  );
}
