"use client";

import React, { useState } from "react";
import { Search, Car, Truck, DollarSign } from "lucide-react";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

interface VehicleData {
  id: number;
  vehicle_number: string | null;
  registration_number: string | null;
  make: string | null;
  model: string | null;
  vehicle_type: string | null;
  vehicle_type_descrip: string | null;
  vehicle_category: string | null;
  manufactured_year: string | null;
  vehicle_year: string | null;
  vehicle_call_number: string | null;
  ledger_code: string | null;
  ledger_description: string | null;
  project_code: string | null;
  driver_code: string | null;
  driver_name: string | null;
  driver_code_two: string | null;
  driver_name_two: string | null;
  hazchem: boolean | null;
  veh_dormant_flag: boolean | null;
  transp_no: string | null;
  transp_descrip: string | null;
  slmn_code: string | null;
  slmn_name: string | null;
  driver_code_two: string | null;
  driver_name_two: string | null;
  trailer_no: string | null;
  trailer_name: string | null;
  trailer_no2: string | null;
  trailer_name2: string | null;
  trailer_type: string | null;
  trailer_type_desc: string | null;
  trailer2_type: string | null;
  trailer2_type_desc: string | null;
  genset_code: string | null;
  genset_name: string | null;
  veh_location: string | null;
  gen_location: string | null;
  vin_number: string | null;
  engine_number: string | null;
  tare: number | null;
  gvm: number | null;
  diesel_target_consumption: number | null;
  diesel_recommended_litres: number | null;
  agreed_km: number | null;
  cof_date: string | null;
  branch_code: string | null;
  branch_name: string | null;
  department_code: string | null;
  department_name: string | null;
  speedo_current: number | null;
  speedo_start: number | null;
  speedo_start_load: number | null;
  km_before_service: number | null;
  min_service_interval: number | null;
  service_intervals: string | null;
  service_due_in_kms: number | null;
  monthly_premium: number | null;
  cell_phones_prd: string | null;
  tracking_prd: string | null;
  equipment_prd: string | null;
}

const fieldClass = "h-7 text-xs bg-yellow-100 border border-gray-300 rounded px-2 w-full";
const labelClass = "text-[11px] font-semibold text-gray-700 whitespace-nowrap";
const sectionLabel = "text-[11px] font-bold text-gray-800 uppercase tracking-wide mb-1";

export default function CostCentresPage() {
  const [searchReg, setSearchReg] = useState("");
  const [vehicle, setVehicle] = useState<VehicleData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const handleSearch = async () => {
    if (!searchReg.trim()) return;
    setLoading(true);
    setError(null);
    setVehicle(null);

    const { data, error: dbError } = await supabase
      .from("vehiclesc")
      .select("*")
      .ilike("registration_number", searchReg.trim())
      .single();

    if (dbError || !data) {
      setError("Vehicle not found");
      setVehicle(null);
    } else {
      setVehicle(data as VehicleData);
    }
    setLoading(false);
  };

  const v = vehicle;

  return (
    <div className="p-6 space-y-4 w-full max-w-[1200px]">
      {/* Title */}
      <div className="flex items-center gap-3 mb-2">
        <Car className="h-6 w-6 text-blue-600" />
        <div>
          <h1 className="text-xl font-bold text-gray-900">Vehicle Details</h1>
          <p className="text-sm text-gray-500">EPS COURIER SERVICES - Vehicles</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Enter registration number..."
            value={searchReg}
            onChange={(e) => setSearchReg(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-9 h-8 text-sm"
          />
        </div>
        <button
          onClick={handleSearch}
          className="h-8 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded"
        >
          Search
        </button>
      </div>

      {loading && (
        <div className="text-center py-8 text-gray-500">Loading vehicle data...</div>
      )}

      {error && (
        <div className="text-center py-8 text-red-500">{error}</div>
      )}

      {v && (
        <div className="border-2 border-gray-300 rounded-lg bg-gray-50 p-4 space-y-4">
          {/* === ROW 1: Vehicle Details === */}
          <div className="bg-white border border-gray-200 rounded p-3">
            <div className={sectionLabel}>Vehicle Details</div>
            <div className="grid grid-cols-8 gap-2 items-end">
              <div className="col-span-1">
                <label className={labelClass}>Vehicle No</label>
                <input className={fieldClass} value={v.vehicle_number || v.id || ''} readOnly />
              </div>
              <div className="col-span-1">
                <label className={labelClass}>Registration no</label>
                <input className={fieldClass} value={v.registration_number || ''} readOnly />
              </div>
              <div className="col-span-1">
                <label className={labelClass}>Make</label>
                <input className={fieldClass} value={v.make || ''} readOnly />
              </div>
              <div className="col-span-1">
                <label className={labelClass}>Category</label>
                <input className={fieldClass} value={v.vehicle_category || ''} readOnly />
              </div>
              <div className="col-span-1">
                <label className={labelClass}>Type</label>
                <input className={fieldClass} value={v.vehicle_type_descrip || v.vehicle_type || ''} readOnly />
              </div>
              <div className="col-span-1">
                <label className={labelClass}>Model</label>
                <input className={fieldClass} value={v.model || ''} readOnly />
              </div>
              <div className="col-span-1">
                <label className={labelClass}>Year</label>
                <input className={fieldClass} value={v.manufactured_year || v.vehicle_year || ''} readOnly />
              </div>
              <div className="col-span-1">
                <label className={labelClass}>Vehicle Call #</label>
                <input className={fieldClass} value={v.vehicle_call_number || ''} readOnly />
              </div>
            </div>
          </div>

          {/* === ROW 2: Ledger / Project / Driver === */}
          <div className="bg-white border border-gray-200 rounded p-3">
            <div className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-2">
                <label className={labelClass}>Ledger</label>
                <input className={fieldClass} value={v.ledger_code || ''} readOnly />
              </div>
              <div className="col-span-3">
                <label className={labelClass}>Ledger Description</label>
                <input className={`${fieldClass} bg-green-100`} value={v.ledger_description || ''} readOnly />
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Project</label>
                <input className={fieldClass} value={v.project_code || ''} readOnly />
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Driver One</label>
                <input className={fieldClass} value={v.driver_code || ''} readOnly />
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Driver Name</label>
                <input className={`${fieldClass} bg-pink-100`} value={v.driver_name || ''} readOnly />
              </div>
              <div className="col-span-1 flex items-center gap-3 pt-4">
                <label className="flex items-center gap-1 text-[10px]">
                  <input type="checkbox" checked={v.hazchem || false} readOnly className="w-3 h-3" />
                  HazChem
                </label>
                <label className="flex items-center gap-1 text-[10px]">
                  <input type="checkbox" checked={v.veh_dormant_flag || false} readOnly className="w-3 h-3" />
                  Dormant
                </label>
              </div>
            </div>
          </div>

          {/* === ROW 3: Transporter / Driver Two === */}
          <div className="bg-white border border-gray-200 rounded p-3">
            <div className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-2">
                <label className={labelClass}>Transporter No</label>
                <input className={fieldClass} value={v.transp_no || ''} readOnly />
              </div>
              <div className="col-span-3">
                <label className={labelClass}>Transporter Name</label>
                <input className={`${fieldClass} bg-pink-100`} value={v.transp_descrip || ''} readOnly />
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Driver Two</label>
                <input className={fieldClass} value={v.driver_code_two || ''} readOnly />
              </div>
              <div className="col-span-3">
                <label className={labelClass}>Driver Two Name</label>
                <input className={`${fieldClass} bg-pink-100`} value={v.driver_name_two || ''} readOnly />
              </div>
            </div>
          </div>

          {/* === ROW 4: Leader / Follower / Genset / Location / Speedo === */}
          <div className="grid grid-cols-3 gap-3">
            {/* Left: Leader / Follower / Genset / Location / VIN / Engine / Tare */}
            <div className="bg-white border border-gray-200 rounded p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2 items-end">
                <div>
                  <label className={labelClass}>Leader</label>
                  <input className={fieldClass} value={v.trailer_no || ''} readOnly />
                </div>
                <div>
                  <label className={labelClass}>Leader Name</label>
                  <input className={`${fieldClass} bg-pink-100`} value={v.trailer_name || ''} readOnly />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 items-end">
                <div>
                  <label className={labelClass}>Follower</label>
                  <input className={fieldClass} value={v.trailer_no2 || ''} readOnly />
                </div>
                <div>
                  <label className={labelClass}>Follower Name</label>
                  <input className={`${fieldClass} bg-pink-100`} value={v.trailer_name2 || ''} readOnly />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 items-end">
                <div>
                  <label className={labelClass}>Genset</label>
                  <input className={fieldClass} value={v.genset_code || ''} readOnly />
                </div>
                <div>
                  <label className={labelClass}>Genset Name</label>
                  <input className={`${fieldClass} bg-pink-100`} value={v.genset_name || ''} readOnly />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 items-end">
                <div>
                  <label className={labelClass}>Location</label>
                  <input className={fieldClass} value={v.veh_location || ''} readOnly />
                </div>
                <div>
                  <label className={labelClass}>Gen Location</label>
                  <input className={fieldClass} value={v.gen_location || ''} readOnly />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 items-end">
                <div>
                  <label className={labelClass}>Vin Number</label>
                  <input className={`${fieldClass} bg-green-100`} value={v.vin_number || ''} readOnly />
                </div>
                <div>
                  <label className={labelClass}>Engine number</label>
                  <input className={fieldClass} value={v.engine_number || ''} readOnly />
                </div>
              </div>
              <div>
                <label className={labelClass}>Tare (Tons)</label>
                <input className={fieldClass} value={v.tare || ''} readOnly />
              </div>
            </div>

            {/* Middle: Speedo */}
            <div className="bg-white border border-gray-200 rounded p-3">
              <div className="bg-pink-200 text-center py-1 rounded mb-2">
                <span className="text-[11px] font-bold">Speedo</span>
              </div>
              <div className="space-y-2">
                <div>
                  <label className={labelClass}>Start Km (Diesel)</label>
                  <div className="flex items-center gap-2">
                    <input className={`${fieldClass} bg-pink-100`} value={v.speedo_start || ''} readOnly />
                    <span className="text-[10px] text-gray-500">km</span>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Start Km (Loads)</label>
                  <div className="flex items-center gap-2">
                    <input className={`${fieldClass} bg-pink-100`} value={v.speedo_start_load || ''} readOnly />
                    <span className="text-[10px] text-gray-500">km</span>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Current Speedo</label>
                  <div className="flex items-center gap-2">
                    <input className={fieldClass} value={v.speedo_current || ''} readOnly />
                    <span className="text-[10px] text-gray-500">km</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Agreed Km / Trailer Service / COF */}
            <div className="bg-white border border-gray-200 rounded p-3 space-y-2">
              <div>
                <label className={labelClass}>Agreed Km</label>
                <div className="flex items-center gap-2">
                  <input className={fieldClass} value={v.agreed_km || ''} readOnly />
                  <span className="text-[10px] text-gray-500">km</span>
                </div>
              </div>
              <div>
                <label className={labelClass}>Trailer Service</label>
                <input className={fieldClass} type="date" value={v.cof_date || ''} readOnly />
              </div>
              <div>
                <label className={labelClass}>COF</label>
                <input className={fieldClass} type="date" value={v.cof_date || ''} readOnly />
              </div>
            </div>
          </div>

          {/* === ROW 5: Targets / Operator / Branch / Department === */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white border border-gray-200 rounded p-3">
              <div className="grid grid-cols-2 gap-3 items-end">
                <div className="bg-green-200 rounded p-2 text-center">
                  <label className="text-[10px] font-bold">Target litres/100km</label>
                  <input className={`${fieldClass} bg-green-100 text-center font-bold`} value={v.diesel_target_consumption || '0.000'} readOnly />
                </div>
                <div className="bg-green-200 rounded p-2 text-center">
                  <label className="text-[10px] font-bold">Target KM/Litre</label>
                  <input className={`${fieldClass} bg-green-100 text-center font-bold`} value={v.diesel_recommended_litres || '0.000'} readOnly />
                </div>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded p-3 space-y-2">
              <div className="grid grid-cols-3 gap-2 items-end">
                <div>
                  <label className={labelClass}>Operator</label>
                  <input className={`${fieldClass} bg-cyan-100`} value={v.slmn_code || ''} readOnly />
                </div>
                <div>
                  <label className={labelClass}>Operator Name</label>
                  <input className={`${fieldClass} bg-cyan-100`} value={v.slmn_name || ''} readOnly />
                </div>
                <div>
                  <label className={labelClass}>Branch</label>
                  <input className={`${fieldClass} bg-cyan-100`} value={v.branch_code || ''} readOnly />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 items-end">
                <div>
                  <label className={labelClass}>Branch Name</label>
                  <input className={`${fieldClass} bg-cyan-100`} value={v.branch_name || ''} readOnly />
                </div>
                <div>
                  <label className={labelClass}>Department</label>
                  <input className={`${fieldClass} bg-cyan-100`} value={v.department_code || ''} readOnly />
                </div>
                <div>
                  <label className={labelClass}>Department Name</label>
                  <input className={`${fieldClass} bg-cyan-100`} value={v.department_name || ''} readOnly />
                </div>
              </div>
            </div>
          </div>

          {/* === ROW 6: Km Maintenance / Monthly Vehicle Expenses === */}
          <div className="grid grid-cols-2 gap-3">
            {/* Km Maintenance */}
            <div className="bg-white border border-gray-200 rounded p-3">
              <div className={sectionLabel}>Km Maintenance</div>
              <div className="grid grid-cols-2 gap-2 items-end">
                <div>
                  <label className={labelClass}>Current Speedo</label>
                  <input className={fieldClass} value={v.speedo_current || ''} readOnly />
                </div>
                <div>
                  <label className={labelClass}>Km Before Service</label>
                  <input className={fieldClass} value={v.km_before_service || ''} readOnly />
                </div>
                <div>
                  <label className={labelClass}>Service Interval</label>
                  <input className={fieldClass} value={v.min_service_interval || v.service_intervals || ''} readOnly />
                </div>
                <div>
                  <label className={labelClass}>Service Due At</label>
                  <input className={fieldClass} value={v.service_due_in_kms || ''} readOnly />
                </div>
                <div>
                  <label className={labelClass}>Service Due In</label>
                  <input className={fieldClass} value={v.service_due_in_kms || ''} readOnly />
                </div>
              </div>
            </div>

            {/* Monthly Vehicle Expenses */}
            <div className="bg-white border border-gray-200 rounded p-3">
              <div className="bg-green-300 text-center py-1 rounded mb-2">
                <span className="text-[11px] font-bold">MONTHLY VEHICLE EXPENSES</span>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <label className={`${labelClass} flex-1 bg-green-200 rounded px-2 py-0.5 text-center`}>Vehicle Lease Payments (VLP)</label>
                  <input className={`${fieldClass} w-24 text-right bg-green-100`} value={v.monthly_premium || '0.00'} readOnly />
                </div>
                <div className="flex items-center gap-2">
                  <label className={`${labelClass} flex-1 bg-green-200 rounded px-2 py-0.5 text-center`}>Insurance (IN)</label>
                  <input className={`${fieldClass} w-24 text-right bg-green-100`} value="0.00" readOnly />
                </div>
                <div className="flex items-center gap-2">
                  <label className={`${labelClass} flex-1 bg-green-200 rounded px-2 py-0.5 text-center`}>Cell Phones (CP)</label>
                  <input className={`${fieldClass} w-24 text-right bg-green-100`} value={v.cell_phones_prd || '0.00'} readOnly />
                </div>
                <div className="flex items-center gap-2">
                  <label className={`${labelClass} flex-1 bg-green-200 rounded px-2 py-0.5 text-center`}>Tracking (MHT)</label>
                  <input className={`${fieldClass} w-24 text-right bg-green-100`} value={v.tracking_prd || '0.00'} readOnly />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!v && !loading && !error && (
        <div className="text-center py-16 text-gray-400">
          <Car className="mx-auto mb-4 h-16 w-16" />
          <p className="text-lg font-medium">Enter a registration number to search</p>
          <p className="text-sm">Vehicle details will appear here</p>
        </div>
      )}
    </div>
  );
}
