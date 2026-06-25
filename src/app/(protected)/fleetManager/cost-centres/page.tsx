"use client";

import React, { useState } from "react";
import { Car } from "lucide-react";
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
  trailer_no: string | null;
  trailer_name: string | null;
  trailer_no2: string | null;
  trailer_name2: string | null;
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
  cof_mh_date: string | null;
  pdp_date: string | null;
}

const inp = "h-[26px] text-[11px] bg-[#ffffcc] border border-gray-400 rounded-sm px-1.5 w-full outline-none";
const inpGreen = "h-[26px] text-[11px] bg-[#90ee90] border border-gray-400 rounded-sm px-1.5 w-full outline-none";
const inpPink = "h-[26px] text-[11px] bg-[#ffb6c1] border border-gray-400 rounded-sm px-1.5 w-full outline-none";
const inpCyan = "h-[26px] text-[11px] bg-[#afeeee] border border-gray-400 rounded-sm px-1.5 w-full outline-none";
const lbl = "text-[10px] font-semibold text-gray-700 whitespace-nowrap";

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
    <div className="min-h-screen bg-gray-100 p-2">
      <div className="max-w-[1100px] mx-auto">
        {/* Header Bar */}
        <div className="bg-gray-200 border border-gray-400 px-3 py-1 flex items-center gap-2 text-[11px] font-semibold">
          <Car className="w-3.5 h-3.5" />
          EPS COURIER SERVICES - Vehicles
        </div>

        {/* Vehicle Details Section */}
        <div className="bg-gray-100 border border-gray-300 border-t-0 p-3">
          <div className="text-[11px] font-bold mb-2">Vehicle Details</div>
          <div className="grid grid-cols-[80px_120px_1fr_100px_100px_100px_80px_80px_1fr] gap-1.5 items-end">
            <div>
              <label className={lbl}>Vehicle No</label>
              <input className={inp} value={v?.vehicle_number || v?.id || ""} readOnly />
            </div>
            <div>
              <label className={lbl}>Registration no</label>
              <input className={inp} value={v?.registration_number || ""} readOnly />
            </div>
            <div>
              <label className={lbl}>Make</label>
              <input className={inp} value={v?.make || ""} readOnly />
            </div>
            <div>
              <label className={lbl}>Category</label>
              <input className={inp} value={v?.vehicle_category || ""} readOnly />
            </div>
            <div>
              <label className={lbl}>Type</label>
              <input className={inp} value={v?.vehicle_type_descrip || v?.vehicle_type || ""} readOnly />
            </div>
            <div>
              <label className={lbl}>Model</label>
              <input className={inp} value={v?.model || ""} readOnly />
            </div>
            <div>
              <label className={lbl}>Year</label>
              <input className={inp} value={v?.manufactured_year || v?.vehicle_year || ""} readOnly />
            </div>
            <div>
              <label className={lbl}>Vehicle Call #</label>
              <input className={inp} value={v?.vehicle_call_number || ""} readOnly />
            </div>
          </div>
        </div>

        {/* Ledger / Project / Driver Row */}
        <div className="bg-gray-100 border border-gray-300 border-t-0 p-3">
          <div className="grid grid-cols-[1fr_2fr_1fr_1fr_2fr_auto] gap-1.5 items-end">
            <div>
              <label className={lbl}>Ledger</label>
              <input className={inp} value={v?.ledger_code || ""} readOnly />
            </div>
            <div>
              <label className={lbl}>&nbsp;</label>
              <input className={inpGreen} value={v?.ledger_description || ""} readOnly />
            </div>
            <div>
              <label className={lbl}>Driver One</label>
              <input className={inp} value={v?.driver_code || ""} readOnly />
            </div>
            <div>
              <label className={lbl}>Project</label>
              <input className={inp} value={v?.project_code || ""} readOnly />
            </div>
            <div>
              <label className={lbl}>Driver Two</label>
              <input className={inp} value={v?.driver_code_two || ""} readOnly />
            </div>
            <div className="flex items-center gap-4 pb-1">
              <label className="flex items-center gap-1 text-[10px]">
                <input type="checkbox" checked={v?.hazchem || false} readOnly className="w-3 h-3" />
                HazChem
              </label>
              <label className="flex items-center gap-1 text-[10px]">
                <input type="checkbox" checked={v?.veh_dormant_flag || false} readOnly className="w-3 h-3" />
                Dormant
              </label>
            </div>
          </div>
        </div>

        {/* Main Content: Left fields + Speedo */}
        <div className="grid grid-cols-[1fr_280px] border border-gray-300 border-t-0">
          {/* Left: Transporter / Leader / Follower / Genset / Location / VIN / Engine / Tare */}
          <div className="bg-gray-100 p-3 space-y-1.5">
            <div className="grid grid-cols-[100px_1fr_1fr] gap-1.5 items-end">
              <div>
                <label className={lbl}>Transporter No</label>
                <input className={inp} value={v?.transp_no || ""} readOnly />
              </div>
              <div>
                <label className={lbl}>&nbsp;</label>
                <input className={inpPink} value={v?.transp_descrip || ""} readOnly />
              </div>
            </div>
            <div className="grid grid-cols-[100px_1fr_1fr] gap-1.5 items-end">
              <div>
                <label className={lbl}>Leader</label>
                <input className={inp} value={v?.trailer_no || ""} readOnly />
              </div>
              <div>
                <label className={lbl}>&nbsp;</label>
                <input className={inpPink} value={v?.trailer_name || ""} readOnly />
              </div>
            </div>
            <div className="grid grid-cols-[100px_1fr_1fr] gap-1.5 items-end">
              <div>
                <label className={lbl}>Follower</label>
                <input className={inp} value={v?.trailer_no2 || ""} readOnly />
              </div>
              <div>
                <label className={lbl}>&nbsp;</label>
                <input className={inpPink} value={v?.trailer_name2 || ""} readOnly />
              </div>
            </div>
            <div className="grid grid-cols-[100px_1fr_1fr] gap-1.5 items-end">
              <div>
                <label className={lbl}>Genset</label>
                <input className={inp} value={v?.genset_code || ""} readOnly />
              </div>
              <div>
                <label className={lbl}>&nbsp;</label>
                <input className={inpPink} value={v?.genset_name || ""} readOnly />
              </div>
            </div>
            <div className="grid grid-cols-[100px_100px_1fr] gap-1.5 items-end">
              <div>
                <label className={lbl}>Location</label>
                <input className={inp} value={v?.veh_location || ""} readOnly />
              </div>
              <div>
                <label className={lbl}>Gen Location</label>
                <input className={inp} value={v?.gen_location || ""} readOnly />
              </div>
            </div>
            <div className="grid grid-cols-[100px_1fr_1fr_100px] gap-1.5 items-end">
              <div>
                <label className={lbl}>Vin Number</label>
                <input className={inpGreen} value={v?.vin_number || ""} readOnly />
              </div>
              <div>
                <label className={lbl}>Engine number</label>
                <input className={inp} value={v?.engine_number || ""} readOnly />
              </div>
              <div>
                <label className={lbl}>Tare</label>
                <div className="flex items-center gap-1">
                  <input className={inp} value={v?.tare || ""} readOnly />
                  <span className="text-[10px]">(Tons)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Speedo */}
          <div className="bg-gray-100 border-l border-gray-300 p-3">
            <div className="bg-[#ffb6c1] text-center py-1 rounded-sm mb-2 border border-gray-400">
              <span className="text-[11px] font-bold">Speedo</span>
            </div>
            <div className="space-y-3">
              <div>
                <label className={lbl}>Start Km (Diesel)</label>
                <div className="flex items-center gap-2">
                  <input className={inpPink} value={v?.speedo_start || ""} readOnly />
                  <span className="text-[10px] text-gray-500">km</span>
                </div>
              </div>
              <div>
                <label className={lbl}>Start Km (Loads)</label>
                <div className="flex items-center gap-2">
                  <input className={inpPink} value={v?.speedo_start_load || ""} readOnly />
                  <span className="text-[10px] text-gray-500">km</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Targets / Operator / Branch / Department / Agreed Km / Trailer Service / COF */}
        <div className="grid grid-cols-[1fr_1fr_1fr] border border-gray-300 border-t-0">
          {/* Targets */}
          <div className="bg-gray-100 p-3">
            <div className="grid grid-cols-2 gap-1.5">
              <div className="bg-[#90ee90] rounded-sm p-1.5 border border-gray-400 text-center">
                <label className="text-[10px] font-bold block">Target litres/100km</label>
                <input className={`${inpGreen} text-center font-bold`} value={v?.diesel_target_consumption || "0.00"} readOnly />
              </div>
              <div className="bg-[#90ee90] rounded-sm p-1.5 border border-gray-400 text-center">
                <label className="text-[10px] font-bold block">Target KM/Litre</label>
                <input className={`${inpGreen} text-center font-bold`} value={v?.diesel_recommended_litres || "0.000"} readOnly />
              </div>
            </div>
          </div>

          {/* Operator / Branch / Department */}
          <div className="bg-gray-100 p-3 space-y-1.5">
            <div className="grid grid-cols-[80px_1fr_80px] gap-1.5 items-end">
              <div>
                <label className={lbl}>Operator</label>
                <input className={inpCyan} value={v?.slmn_code || ""} readOnly />
              </div>
              <div>
                <label className={lbl}>Operator Name</label>
                <input className={inpCyan} value={v?.slmn_name || ""} readOnly />
              </div>
              <div>
                <label className={lbl}>Branch</label>
                <input className={inpCyan} value={v?.branch_code || ""} readOnly />
              </div>
            </div>
            <div className="grid grid-cols-[80px_1fr_80px] gap-1.5 items-end">
              <div>
                <label className={lbl}>Branch Name</label>
                <input className={inpCyan} value={v?.branch_name || ""} readOnly />
              </div>
              <div>
                <label className={lbl}>Department</label>
                <input className={inpCyan} value={v?.department_code || ""} readOnly />
              </div>
              <div>
                <label className={lbl}>Department Name</label>
                <input className={inpCyan} value={v?.department_name || ""} readOnly />
              </div>
            </div>
          </div>

          {/* Agreed Km / Trailer Service / COF */}
          <div className="bg-gray-100 p-3 space-y-1.5">
            <div>
              <label className={lbl}>Agreed Km</label>
              <div className="flex items-center gap-2">
                <input className={inp} value={v?.agreed_km || ""} readOnly />
                <span className="text-[10px] text-gray-500">km</span>
              </div>
            </div>
            <div>
              <label className={lbl}>Trailer Service</label>
              <input className={inp} type="date" value={v?.cof_mh_date || ""} readOnly />
            </div>
            <div>
              <label className={lbl}>COF</label>
              <input className={inp} type="date" value={v?.cof_date || ""} readOnly />
            </div>
          </div>
        </div>

        {/* Km Maintenance / Monthly Vehicle Expenses */}
        <div className="grid grid-cols-[1fr_350px] border border-gray-300 border-t-0">
          {/* Km Maintenance */}
          <div className="bg-gray-100 p-3">
            <div className="text-[11px] font-bold mb-1.5">Km Maintenance</div>
            <div className="grid grid-cols-[150px_1fr] gap-1 items-end">
              <div>
                <label className={lbl}>Current Speedo</label>
                <input className={inp} value={v?.speedo_current || ""} readOnly />
              </div>
              <div>
                <label className={lbl}>Km Before Service</label>
                <input className={inp} value={v?.km_before_service || ""} readOnly />
              </div>
              <div>
                <label className={lbl}>Service Interval</label>
                <input className={inp} value={v?.min_service_interval || v?.service_intervals || ""} readOnly />
              </div>
              <div>
                <label className={lbl}>Service Due At</label>
                <input className={inp} value={v?.service_due_in_kms || ""} readOnly />
              </div>
              <div>
                <label className={lbl}>Service Due In</label>
                <input className={inp} value={v?.service_due_in_kms || ""} readOnly />
              </div>
            </div>
          </div>

          {/* Monthly Vehicle Expenses */}
          <div className="bg-gray-100 border-l border-gray-300 p-3">
            <div className="bg-[#32cd32] text-center py-1 rounded-sm mb-2 border border-gray-400">
              <span className="text-[11px] font-bold">MONTHLY VEHICLE EXPENSES</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-1">
                <label className={`${lbl} flex-1 bg-[#90ee90] rounded-sm px-2 py-0.5 text-center border border-gray-400`}>Vehicle Lease Payments (VLP)</label>
                <input className={`${inpGreen} w-20 text-right`} value={v?.monthly_premium || "0.00"} readOnly />
              </div>
              <div className="flex items-center gap-1">
                <label className={`${lbl} flex-1 bg-[#90ee90] rounded-sm px-2 py-0.5 text-center border border-gray-400`}>Insurance (IN)</label>
                <input className={`${inpGreen} w-20 text-right`} value="0.00" readOnly />
              </div>
              <div className="flex items-center gap-1">
                <label className={`${lbl} flex-1 bg-[#90ee90] rounded-sm px-2 py-0.5 text-center border border-gray-400`}>Cell Phones (CP)</label>
                <input className={`${inpGreen} w-20 text-right`} value={v?.cell_phones_prd || "0.00"} readOnly />
              </div>
              <div className="flex items-center gap-1">
                <label className={`${lbl} flex-1 bg-[#90ee90] rounded-sm px-2 py-0.5 text-center border border-gray-400`}>Tracking (MHT)</label>
                <input className={`${inpGreen} w-20 text-right`} value={v?.tracking_prd || "0.00"} readOnly />
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar at bottom */}
        <div className="bg-gray-200 border border-gray-400 border-t-0 px-3 py-2 flex items-center gap-2">
          <span className="text-[10px] font-semibold">Registration:</span>
          <Input
            placeholder="Enter registration..."
            value={searchReg}
            onChange={(e) => setSearchReg(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="h-6 text-[11px] w-40"
          />
          <button
            onClick={handleSearch}
            className="h-6 px-3 bg-blue-500 hover:bg-blue-600 text-white text-[10px] font-semibold rounded"
          >
            Search
          </button>
          {loading && <span className="text-[10px] text-gray-500">Loading...</span>}
          {error && <span className="text-[10px] text-red-500">{error}</span>}
        </div>
      </div>
    </div>
  );
}
